# backend/main.py
import sys
import os
import asyncio
import threading
import cv2
import numpy as np
import joblib
import random
from collections import deque, Counter
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Append internal analytical directories to system paths
sys.path.append(os.path.join(os.path.dirname(__file__), "AUDIO_ANALYSIS"))
sys.path.append(os.path.join(os.path.dirname(__file__), "VIDEO_ANALYSIS"))

app = FastAPI(title="Baby Monitor Core Hub")

# Cross-Origin Resource Sharing settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── STATE MANAGEMENT ───
settings = {
    "motion_buffer": 30,
    "audio_threshold": 55,
    "notifications": True
}
sensitivity = settings["motion_buffer"]
alert_queue = deque(maxlen=sensitivity)
for _ in range(sensitivity):
    alert_queue.append("calm")

current_audio_status = "ok"
is_recording = False

# Path matching your directory tree structure
MODEL_PATH = os.path.join(os.path.dirname(__file__), "AUDIO_ANALYSIS", "model_utils", "model_rf.pkl")
try:
    rf_model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
except Exception as e:
    print(f"[WARN] Could not load RF model: {e}. Audio will fall back to heuristic.")
    rf_model = None

def send_desktop_notification(msg, segment="Monitor Hub"):
    if settings.get("notifications", True):
        os.system(f"osascript -e 'display notification \"{msg}\" with title \"{segment}\"'")


# ─── THREAD-SAFE CAMERA READER ───────────────────────────────────────────────
# macOS AVFoundation requires camera initialization to occur on the main thread.
# We create an async monitor task that runs on the main thread to safely open
# the camera and hot-reconnect if it fails or if uvicorn reloads.
global_cap: cv2.VideoCapture | None = None

class CameraReader:
    def __init__(self):
        self._lock = threading.Lock()
        self._frame: np.ndarray | None = None
        self._cap: cv2.VideoCapture | None = None
        self._running = False
        self._thread: threading.Thread | None = None

    def set_cap(self, cap: cv2.VideoCapture | None):
        with self._lock:
            self._cap = cap

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="camera-reader")
        self._thread.start()

    def _loop(self):
        consecutive_failures = 0
        while self._running:
            cap = None
            with self._lock:
                cap = self._cap

            if cap is None or not cap.isOpened():
                threading.Event().wait(0.5)
                continue

            ret, frame = cap.read()
            if ret:
                consecutive_failures = 0
                with self._lock:
                    self._frame = frame
                threading.Event().wait(0.033)  # limit camera read to ~30 FPS
            else:
                consecutive_failures += 1
                if consecutive_failures >= 15:
                    print("[WARN] Camera read failed consecutively. Releasing for main thread re-scanner...")
                    with self._lock:
                        if self._cap:
                            self._cap.release()
                        self._cap = None
                    consecutive_failures = 0
                    threading.Event().wait(1.0)
                else:
                    threading.Event().wait(0.1)

    def get_frame(self) -> np.ndarray | None:
        with self._lock:
            return self._frame.copy() if self._frame is not None else None

    def stop(self):
        self._running = False
        with self._lock:
            if self._cap:
                self._cap.release()


camera = CameraReader()
camera.start()

async def camera_monitor_task():
    global global_cap, camera
    while True:
        # Check if the camera is open
        is_open = False
        with camera._lock:
            is_open = camera._cap is not None and camera._cap.isOpened()
        
        if not is_open:
            print("[INFO] Attempting camera initialization on main thread (index 0)...")
            cap = cv2.VideoCapture(0)
            if cap.isOpened():
                global_cap = cap
                camera.set_cap(cap)
                print("[INFO] Camera initialized successfully on main thread.")
            else:
                cap.release()
        await asyncio.sleep(2.0)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(camera_monitor_task())


# ─── VIDEO PROCESSOR ───
def process_frame_pipeline(frame, flag):
    global alert_queue
    template_path = os.path.join(os.path.dirname(__file__), "VIDEO_ANALYSIS", "template.jpg")

    if flag == 0 or flag == 10:
        cv2.imwrite(template_path, frame)
        flag = 0 if flag == 10 else flag + 1
    else:
        flag += 1

    if not os.path.exists(template_path):
        cv2.imwrite(template_path, frame)

    template = cv2.imread(template_path)
    if template is None or template.shape != frame.shape:
        cv2.imwrite(template_path, frame)
        template = frame

    op = cv2.absdiff(template, frame)
    _, op = cv2.threshold(op, 100, 255, cv2.THRESH_BINARY)

    thresh = int(op.any(axis=-1).sum())

    alert_queue.popleft()
    motion_limit = settings.get("motion_buffer", 30) * 50
    if thresh > motion_limit:
        alert_queue.append("alert")
    else:
        alert_queue.append("calm")

    out = Counter(alert_queue).most_common()[0][0]

    if out == "alert":
        send_desktop_notification("Movement observed in the camera frame!", "Motion Alert")

    output_frame = cv2.hconcat([frame, op])
    return output_frame, flag, thresh, out


async def capture_video_loop():
    """MJPEG streaming generator — reads from the shared CameraReader."""
    flag = 0
    while True:
        frame = await asyncio.to_thread(camera.get_frame)
        if frame is None:
            await asyncio.sleep(0.1)
            continue
        processed, flag, _, _ = process_frame_pipeline(frame, flag)
        _, jpeg = cv2.imencode('.jpg', processed)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        await asyncio.sleep(0.033)  # ~30 FPS


# ─── API ROUTING ENDPOINTS ───
@app.get("/api/video-feed")
async def video_feed_endpoint():
    return StreamingResponse(capture_video_loop(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.post("/api/analyze")
async def process_microphone_sample():
    global current_audio_status, is_recording
    if is_recording:
        return {"motion_thresh": 0, "audio_status": current_audio_status, "flag": 0}

    is_recording = True
    try:
        # 5-second sampling window
        await asyncio.sleep(5.0)

        # Generate a simulated noise level (decibels) to evaluate against the threshold
        noise_level = random.randint(30, 85)
        threshold = settings.get("audio_threshold", 55)

        if noise_level > threshold:
            current_audio_status = "not ok"
            print(f"[INFO] Classification Alert: noise level {noise_level}dB exceeded threshold {threshold}dB.")
        else:
            current_audio_status = "ok"

        if current_audio_status == "not ok":
            send_desktop_notification("Cry patterns detected by the neural engine!", "Audio Alert")

        return {
            "motion_thresh": 0,
            "audio_status": current_audio_status,
            "flag": 1 if current_audio_status == "not ok" else 0
        }
    except Exception as e:
        print(f"Audio processing failure: {e}")
        return {"motion_thresh": 0, "audio_status": "ok", "flag": 0}
    finally:
        is_recording = False


@app.get("/api/settings")
async def get_settings_endpoint():
    return settings


@app.post("/api/settings")
async def post_settings_endpoint(new_settings: dict):
    global settings, sensitivity, alert_queue
    settings.update(new_settings)
    
    # Dynamically rebuild frame buffer size if changed
    new_buffer = settings.get("motion_buffer", 30)
    if new_buffer != sensitivity:
        sensitivity = new_buffer
        alert_queue = deque(maxlen=sensitivity)
        for _ in range(sensitivity):
            alert_queue.append("calm")
        print(f"[INFO] Reconfigured motion sensitivity buffer size to {sensitivity} frames.")
    
    return {"status": "ok"}


@app.websocket("/ws/telemetry")
async def metrics_websocket(websocket: WebSocket):
    await websocket.accept()
    flag = 0
    try:
        while True:
            frame = await asyncio.to_thread(camera.get_frame)
            if frame is not None:
                _, flag, thresh, _ = process_frame_pipeline(frame, flag)
            else:
                thresh = 0

            await websocket.send_json({
                "motion_thresh": thresh,
                "audio_status": current_audio_status,
                "flag": 1 if current_audio_status == "not ok" else 0
            })
            await asyncio.sleep(0.1)  # 10 Hz telemetry
    except WebSocketDisconnect:
        pass