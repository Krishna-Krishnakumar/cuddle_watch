import cv2
import numpy as np
import matplotlib.pyplot as plt
from collections import deque,Counter

alert_queue=deque()
#popuate alert queue to length
sensitivity=10  #the larger the value of sensitivity, the greater the period of movement required for raising alert
for i in range(0,sensitivity):    
    alert_queue.append("calm")


plt.axis([0, 10, 0, 1])

def count_nonblack_np(img):
    return img.any(axis=-1).sum()

# Function to invert colors of an image
def motion_dection(image,flag):
    if flag==0:
        file_name = "template.jpg"
        cv2.imwrite(file_name, frame)
        template = cv2.imread('template.jpg') 
        op = cv2.absdiff(template, image) 
        
        flag=flag+1
        
        
    elif flag==10:
        template = cv2.imread('template.jpg') 
        #op = cv2.subtract(template, image) 
        op = cv2.absdiff(template, image) 
        
        flag=0
    else:
        template = cv2.imread('template.jpg') 
        #op = cv2.subtract(template, image) 
        op = cv2.absdiff(template, image) 
        
        flag=flag+1
    
    ret, op = cv2.threshold(op, 100, 255, cv2.THRESH_BINARY)  
    thresh=count_nonblack_np(op)
    
    # we use the alert queue to only raise alert if there is persistant movement
    alert_queue.popleft()
    if thresh >1000:
        alert_queue.append("alert")
    else:
        alert_queue.append("calm")
        
    c=Counter(alert_queue)
    print(c.most_common()[0][0])
        
    return op,flag,thresh

# Open the default camera (usually camera index 0)
cap = cv2.VideoCapture(1)

flag=0

plt.axis([0, 10, 0, 1])
i=0

while True:
    # Capture a frame from the camera
    ret, frame = cap.read()

    # Check if frame is successfully captured
    if not ret:
        print("Failed to capture frame")
        break

        
        
    # Invert colors of the frame
    inverted_frame,flag,thresh = motion_dection(frame,flag)

    plt.scatter(i, thresh)
    plt.pause(0.05)
    i=i+1
    
    # Concatenate original and inverted frames side by side
    output_frame = cv2.hconcat([frame, inverted_frame])

    # Display the combined frame
    cv2.imshow('Input (Original) vs Output (Inverted)', output_frame)

    # Check for 'q' key press to exit the loop
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the camera and close all OpenCV windows
cap.release()
cv2.destroyAllWindows()
