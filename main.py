import cv2
import numpy as np
import cv2 as cv


if __name__ == '__main__':
    # taking input from user
    path = input('Enter path to the input image :')
    img = cv2.imread(path)

    # defining net
    net = cv2.dnn.readNetFromDarknet("yolo-obj.cfg","yolo-obj_4000.weights")

    classes = []
    with open("obj.names", "r") as f:
        classes = [line.strip() for line in f.readlines()]
    
    layer_names = net.getLayerNames()
    output_layers = [layer_names[i[0] - 1] for i in net.getUnconnectedOutLayers()]
    colors = np.random.uniform(0, 255, size=(len(classes), 3))

    height,width,ch = img.shape

    blob = cv.dnn.blobFromImage(img, 1.0/255.0, (416, 416), True, crop=False)

    net.setInput(blob)

    # Run the preprocessed input blog through the network
    predictions = net.forward(output_layers)
    probability_index=5
  
    # Sets the minimum confidence we accept 
    min_confidence=0.14


    class_ids = []
    confidences = []
    boxes = []
    for out in predictions:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            if confidence > 0.5:
                # Object detected
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
                # Rectangle coordinates
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)

    indexes = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

    n = 0
    c = []
    v = ['car','motorbike','bicycle','bus','truck']
    font = cv2.FONT_HERSHEY_PLAIN
    for i in range(len(boxes)):
        if i in indexes:
            label = str(classes[class_ids[i]])
            if label in v:
                n += 1
                x, y, w, h = boxes[i]
            
                c.append(label)
                color = colors[i]
                cv2.rectangle(img, (x, y), (x + w, y + h), color, 1)
                cv2.putText(img, label, (x, y + 30), font, 3, color, 1)
    cv2.imwrite('results.jpg',img)
    print(n)
    print(c)
    
