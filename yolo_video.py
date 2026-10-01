import cv2
import numpy as np
import time

if __name__ == '__main__':
    name = 'coco.names' 
    cfg = 'yolov3.cfg'
    weights = 'yolov3.weights' 

    LABELS = open(name).read().strip().split("\n")

    net = cv2.dnn.readNetFromDarknet(cfg, weights)
    
    # السطرين دول بيجبروا الموديل يشتغل بكفاءة على معالج الجهاز عشان يطلع المربعات
    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

    ln = net.getLayerNames()
    ln = [ln[i - 1] for i in net.getUnconnectedOutLayers()]
    
    np.random.seed(42)
    COLORS = np.random.randint(0, 255, size=(len(LABELS), 3), dtype="uint8")

    video = 'sb1.mp4'

    vs = cv2.VideoCapture(video)
    writer = None
    (W, H) = (None, None)

    try:
        total = int(vs.get(cv2.CAP_PROP_FRAME_COUNT))
    except:
        total = -1

    while True:
        (grabbed, frame) = vs.read()
        if not grabbed:
            break
        if W is None or H is None:
            (H, W) = frame.shape[:2]

        blob = cv2.dnn.blobFromImage(frame, 1 / 255.0, (416, 416), swapRB=True, crop=False)
        net.setInput(blob)
        layerOutputs = net.forward(ln)

        boxes = []
        confidences = []
        classIDs = []

        for output in layerOutputs:
            for detection in output:
                scores = detection[5:]
                classID = np.argmax(scores)
                confidence = scores[classID]

                # قللنا نسبة التأكد شوية عشان يلقط كل حاجة في الفيديو بوضوح
                if confidence > 0.1:
                    box = detection[0:4] * np.array([W, H, W, H])
                    (centerX, centerY, width, height) = box.astype("int")

                    x = int(centerX - (width / 2))
                    y = int(centerY - (height / 2))

                    boxes.append([x, y, int(width), int(height)])
                    confidences.append(float(confidence))
                    classIDs.append(classID)
                    
        idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.1, 0.3)

        if len(idxs) > 0:
            # السطر ده هيطبعلك في الشاشة السودا إنه لقى كائنات عشان تبقي مطمنة
            print(f"[DEBUG] Found {len(idxs)} objects in this frame!")
            for i in idxs.flatten():
                (x, y) = (boxes[i][0], boxes[i][1])
                (w, h) = (boxes[i][2], boxes[i][3])

                color = [int(c) for c in COLORS[classIDs[i]]]
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                text = "{}: {:.4f}".format(LABELS[classIDs[i]], confidences[i])
                cv2.putText(frame, text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        if writer is None:
            fourcc = cv2.VideoWriter_fourcc(*"MJPG")
            writer = cv2.VideoWriter('result.avi', fourcc, 30, (frame.shape[1], frame.shape[0]), True)

        writer.write(frame)

    print("[INFO] cleaning up...")
    writer.release()
    vs.release()