import cv2
import numpy as np
import threading
import time
from ultralytics import YOLO
from ultralytics.utils.plotting import Annotator, colors

class TrafficAI:
    def __init__(self, model_path="runs/detect/yolo11_traffic_cctv/weights/best.pt", video_path="videos/video1.mp4"):
        self.model = YOLO(model_path)
        self.current_video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        if self.fps <= 0 or np.isnan(self.fps):
            self.fps = 30.0

        self.lock = threading.Lock()
        
        # إحصائيات التدفق والحارات
        self.total_crossed_count = 0
        self.lane_counts = {"lane_1": 0, "lane_2": 0, "lane_3": 0}
        self.class_counts = {"car": 0, "truck": 0, "bus": 0, "motorcycle": 0, "person": 0}
        self.current_frame_count = 0
        self.latest_density = "0%"
        self.latest_level = "LOW"
        self.speed_limit = 60.0
        self.speed_violations = 0
        self.current_avg_speed = 0.0
        self.latest_jpeg = None

        # سجل المسارات والسرعات
        self.vehicle_track_history = {}
        self.vehicle_speeds = {}
        self.counted_ids = set()

    def set_video(self, new_video_path):
        with self.lock:
            if self.current_video_path != new_video_path:
                self.current_video_path = new_video_path
                if self.cap is not None:
                    self.cap.release()
                self.cap = cv2.VideoCapture(new_video_path)
                self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
                
                self.total_crossed_count = 0
                self.lane_counts = {"lane_1": 0, "lane_2": 0, "lane_3": 0}
                self.class_counts = {k: 0 for k in self.class_counts}
                self.speed_violations = 0
                self.counted_ids.clear()
                self.vehicle_track_history.clear()
                self.vehicle_speeds.clear()

    def update_frame(self):
        with self.lock:
            if self.cap is None or not self.cap.isOpened():
                return False

            ret, frame = self.cap.read()
            if not ret:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
                if not ret:
                    return False

            h, w, _ = frame.shape
            current_time = time.time()
            
            # تشغيل YOLO مع محرك التتبع
            results = self.model.track(
                frame, 
                persist=True, 
                tracker="bytetrack.yaml", 
                verbose=False
            )

            # إعداد أداة الرسم الرسمية من YOLO للحفاظ على نفس الخطوط والألوان
            annotator = Annotator(frame, line_width=2, example=str(self.model.names))

            # تحديد خط العبور وتقسيم الـ 3 حارات
            line_y = int(h * 0.65)
            lane_w = w // 3
            lane_dividers = [0, lane_w, lane_w * 2, w]
            lane_colors = [(0, 165, 255), (0, 255, 0), (255, 0, 255)]  # برتقالي، أخضر، بنفسجي

            # رسم الحارات الثلاث مع أسماءها وعداد كل حارة
            for i in range(3):
                pt1 = (lane_dividers[i], line_y)
                pt2 = (lane_dividers[i+1], line_y)
                cv2.line(frame, pt1, pt2, lane_colors[i], 3)
                cv2.putText(frame, f"Lane {i+1}: {self.lane_counts[f'lane_{i+1}']}", 
                            (lane_dividers[i] + 15, line_y - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, lane_colors[i], 2)

            current_count = 0
            active_speeds = []
            meters_per_pixel = 25.0 / (h * 0.55)

            if results[0].boxes is not None and results[0].boxes.id is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                track_ids = results[0].boxes.id.int().cpu().numpy()
                class_indices = results[0].boxes.cls.int().cpu().numpy()
                confs = results[0].boxes.conf.cpu().numpy()
                names = self.model.names

                for box, track_id, cls_idx, conf in zip(boxes, track_ids, class_indices, confs):
                    current_count += 1
                    x1, y1, x2, y2 = box
                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    cls_name = names.get(cls_idx, "obj").lower()

                    # تحديث سجل الحركة الزمني
                    if track_id not in self.vehicle_track_history:
                        self.vehicle_track_history[track_id] = []
                    
                    self.vehicle_track_history[track_id].append((cy, y2, current_time))
                    if len(self.vehicle_track_history[track_id]) > 12:
                        self.vehicle_track_history[track_id].pop(0)

                    # حساب السرعة بالكيلومتر/ساعة
                    if len(self.vehicle_track_history[track_id]) >= 2:
                        y_init, _, t_init = self.vehicle_track_history[track_id][0]
                        y_curr, _, t_curr = self.vehicle_track_history[track_id][-1]
                        
                        dist_px = abs(y_curr - y_init)
                        dt = t_curr - t_init
                        if dt > 0:
                            spd = round(((dist_px * meters_per_pixel) / dt) * 3.6, 1)
                            if 5.0 <= spd <= 150.0:
                                self.vehicle_speeds[track_id] = spd
                                active_speeds.append(spd)

                    v_speed = self.vehicle_speeds.get(track_id, 0.0)

                    # تجهيز الليبل الموحد ليظهر بالكامل داخل نفس التاج الأصلي الخاص بـ YOLO
                    if v_speed > 0:
                        label = f"id:{track_id} {cls_name} {conf:.2f} | {v_speed}km/h"
                    else:
                        label = f"id:{track_id} {cls_name} {conf:.2f}"

                    # رسم البوكس الأصلي الملون والتسمية المدمجة
                    annotator.box_label(box, label, color=colors(cls_idx, True))

                    # فحص دقيق للعبور (يمنع تفويت أي عربية حتى لو عبرت مجموعة معاً)
                    if track_id not in self.counted_ids and len(self.vehicle_track_history[track_id]) >= 2:
                        prev_cy, prev_bottom, _ = self.vehicle_track_history[track_id][-2]
                        curr_cy, curr_bottom, _ = self.vehicle_track_history[track_id][-1]

                        # التحقق من أن أسفل السيارة أو مركزها قطع الخط
                        crossed = (prev_cy < line_y and curr_cy >= line_y) or (prev_bottom < line_y and curr_bottom >= line_y)
                        
                        if crossed:
                            self.total_crossed_count += 1
                            self.counted_ids.add(track_id)

                            if v_speed > self.speed_limit:
                                self.speed_violations += 1

                            if cls_name in self.class_counts:
                                self.class_counts[cls_name] += 1

                            # تصنيف الحارة التي عبرت فيها العربية
                            if cx < lane_w:
                                self.lane_counts["lane_1"] += 1
                            elif cx < lane_w * 2:
                                self.lane_counts["lane_2"] += 1
                            else:
                                self.lane_counts["lane_3"] += 1

            if active_speeds:
                self.current_avg_speed = round(float(np.mean(active_speeds)), 1)

            # تقييم الكثافة
            if current_count < 8:
                level = "LOW"
            elif current_count <= 20:
                level = "MODERATE"
            else:
                level = "HIGH"

            density_val = min(100, int((current_count / 25) * 100))
            self.current_frame_count = current_count
            self.latest_density = f"{density_val}%"
            self.latest_level = level

            # الحصول على الفريم النهائي
            final_frame = annotator.result()

            # شريط الإحصائيات العلوي
            info_text = f"Total Flow: {self.total_crossed_count} | Avg Speed: {self.current_avg_speed} km/h"
            cv2.putText(final_frame, info_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 255), 2)

            _, buffer = cv2.imencode('.jpg', final_frame)
            self.latest_jpeg = buffer.tobytes()
            return True

    def get_metrics(self):
        return {
            "vehicle_count": self.current_frame_count,
            "total_flow_count": self.total_crossed_count,
            "lane_1_flow": self.lane_counts["lane_1"],
            "lane_2_flow": self.lane_counts["lane_2"],
            "lane_3_flow": self.lane_counts["lane_3"],
            "class_breakdown": self.class_counts,
            "average_speed_kmh": self.current_avg_speed,
            "speed_violations_count": self.speed_violations,
            "traffic_density": self.latest_density,
            "congestion_level": self.latest_level
        }

    def get_jpeg_frame(self):
        return self.latest_jpeg