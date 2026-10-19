import os
import time
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from traffic_v11_ai import TrafficAI

app = FastAPI(title="Smart Traffic Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

traffic_detector = TrafficAI(model_path="yolo11s.pt", video_path="videos/video1.mp4")

# تحميل موديل XGBoost المُدرّب مسبقاً
xgb_model = None
model_path = "traffic_xgb_model.pkl"
if os.path.exists(model_path):
    try:
        xgb_model = joblib.load(model_path)
        print("[INFO] XGBoost model loaded successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to load XGBoost: {e}")

# تخزين آخر 5 قراءات للكثافة لدعم الـ Lag Features
history_counts = [10, 12, 14, 15, 15]

def predict_future_traffic(current_count):
    global history_counts, xgb_model
    history_counts.append(current_count)
    if len(history_counts) > 5:
        history_counts.pop(0)

    if xgb_model is not None and len(history_counts) == 5:
        try:
            input_df = pd.DataFrame([{
                'lag_1': history_counts[-1],
                'lag_2': history_counts[-2],
                'lag_3': history_counts[-3],
                'lag_4': history_counts[-4],
                'lag_5': history_counts[-5],
            }])
            pred = xgb_model.predict(input_df)[0]
            predicted_val = max(0, int(round(pred)))
        except Exception:
            predicted_val = current_count
    else:
        predicted_val = current_count

    # حساب زمن الإشارة الخضراء التكيفي (15 ثانية إلى 60 ثانية)
    green_time = int(np.clip(15 + (predicted_val * 1.5), 15, 60))
    return predicted_val, green_time

class VideoRequest(BaseModel):
    video_name: str

@app.get("/")
def root():
    return {"status": "Traffic API is running"}

@app.get("/traffic-data")
def get_traffic_data():
    metrics = traffic_detector.get_metrics()
    current_count = metrics.get("vehicle_count", 0)
    
    # حساب التنبؤ المستقبلي وزمن الإشارة الخضراء
    pred_count, green_time = predict_future_traffic(current_count)
    
    # تحديد مستوى الازدحام المتوقع كنص ونسبة
    if pred_count < 8:
        pred_level = "LOW"
    elif pred_count <= 20:
        pred_level = "MODERATE"
    else:
        pred_level = "HIGH"

    pred_density = f"{min(100, int((pred_count / 25) * 100))}%"

    # إضافة كافة المسميات المحتملة التي قد يقرأها App.jsx
    metrics["predicted_vehicle_count"] = pred_count
    metrics["predicted_congestion"] = pred_level
    metrics["predicted_congestion_level"] = pred_level
    metrics["predicted_density"] = pred_density
    metrics["recommended_green_time_seconds"] = green_time
    metrics["forecast_alert"] = "CONGESTION_EXPECTED" if pred_count > 20 else "NORMAL_FLOW"
    
    return metrics

@app.post("/change-video")
def change_video(req: VideoRequest):
    traffic_detector.set_video(req.video_name)
    return {"message": f"Switched to {req.video_name}"}

def generate_mjpeg():
    while True:
        success = traffic_detector.update_frame()
        if not success:
            time.sleep(0.1)
            continue
        frame_bytes = traffic_detector.get_jpeg_frame()
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.get("/video-feed")
def video_feed():
    return StreamingResponse(generate_mjpeg(), media_type="multipart/x-mixed-replace; boundary=frame")