import cv2
import sys

print("Python version:", sys.version)
print("OpenCV version:", cv2.__version__)

found = False
for idx in [0, 1, 2, 3]:
    cap = cv2.VideoCapture(idx)
    if cap.isOpened():
        ret, frame = cap.read()
        print(f"Index {idx}: opened=True, read={ret}")
        if ret:
            cv2.imwrite("test_output.jpg", frame)
            print(f"Success! Saved frame from index {idx} to test_output.jpg")
            found = True
            cap.release()
            break
        cap.release()
    else:
        print(f"Index {idx}: opened=False")

if not found:
    print("Error: No working camera index found delivering frames.")
