from ultralytics import YOLO

# 1. تحميل نموذج YOLOv11
model = YOLO("yolo11n.pt")

# 2. تشغيل الكشف على فيديو المرور وحفظ النتيجة
results = model.predict(source="My_Traffic1.mp4", save=True, conf=0.25)
print("Processing complete! Check the 'runs/detect' folder for your output video.")