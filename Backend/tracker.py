import cv2
import mediapipe as mp
import time
import datetime
from pynput import keyboard, mouse
from models import ActivityLog, init_db
from apscheduler.schedulers.background import BackgroundScheduler

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.6, min_tracking_confidence=0.6)

last_input_time = time.time()
current_activity = "idle"

def on_input_activity(*args):
    global last_input_time
    last_input_time = time.time()

kb_listener = keyboard.Listener(on_press=on_input_activity)
mouse_listener = mouse.Listener(on_move=on_input_activity, on_click=on_input_activity)

def detect_pose_activity():
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return "unknown", 0.0
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)
    if results.pose_landmarks:
        confidence = results.pose_landmarks.landmark[0].visibility
        return "in_room", round(float(confidence), 2)
    return "away", 0.0

def log_activity():
    global current_activity
    idle_seconds = time.time() - last_input_time
    pose_status, confidence = detect_pose_activity()

    if idle_seconds < 30:
        activity_type = "active"
    elif pose_status == "in_room":
        activity_type = "in_room"
    else:
        activity_type = "away"

    ActivityLog.create(
        activity_type=activity_type,
        duration_seconds=300,
        note=f"pose:{pose_status} confidence:{confidence} idle:{int(idle_seconds)}s"
    )
    print(f"[{datetime.datetime.now().strftime('%H:%M')}] logged: {activity_type}")

def start_tracker():
    init_db()
    kb_listener.start()
    mouse_listener.start()
    scheduler = BackgroundScheduler()
    scheduler.add_job(log_activity, 'interval', minutes=5)
    scheduler.start()
    print("Tracker running — logging every 5 minutes")
    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()

if __name__ == "__main__":
    start_tracker()