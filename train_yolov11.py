from ultralytics import YOLO

model = YOLO("yolo11s.pt")

results = model.train(
    data="traffic_dataset/data.yaml", 
    epochs=50, 
    imgsz=416, 
    batch=8,              # خفضنا الـ batch قليلاً لأن حجم الموديل أكبر
    name="yolo11s_traffic_cctv"
)

print("Training YOLO11s complete!")