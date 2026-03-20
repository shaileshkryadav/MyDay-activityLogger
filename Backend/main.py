from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
import cv2
import threading
import datetime
import time

from models import init_db, ActivityLog, DailySummary

# ── globals ──────────────────────────────────────────────────────────────────
latest_frame = None
frame_lock = threading.Lock()
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── camera thread ─────────────────────────────────────────────────────────────
def camera_loop():
    global latest_frame
    cap = cv2.VideoCapture(0)
    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (29, 158, 117), 2)
            cv2.putText(frame, "DETECTED", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (29, 158, 117), 1)

        h_f, w_f = frame.shape[:2]
        cv2.putText(frame, "MYDAY // CV ACTIVE", (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (29, 158, 117), 1)
        cv2.putText(frame, f"FACES: {len(faces)}", (10, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (29, 158, 117), 1)
        cv2.putText(frame, datetime.datetime.now().strftime("%H:%M:%S"), (w_f - 80, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (29, 158, 117), 1)
        cv2.rectangle(frame, (0, 0), (w_f - 1, h_f - 1), (29, 158, 117), 1)

        with frame_lock:
            latest_frame = frame.copy()

# ── startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()
    print("Camera thread started")

# ── routes: health ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "dashboard backend running"}

# ── routes: camera ────────────────────────────────────────────────────────────
@app.get("/cv/frame")
def get_frame():
    with frame_lock:
        if latest_frame is None:
            return Response(status_code=503)
        _, buffer = cv2.imencode('.jpg', latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        frame_bytes = buffer.tobytes()
    return Response(content=frame_bytes, media_type="image/jpeg")

@app.get("/cv/status")
def get_cv_status():
    with frame_lock:
        if latest_frame is None:
            return {"status": "away", "pose": "not_detected", "confidence": 0.0, "faces": 0}
        gray = cv2.cvtColor(latest_frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    if len(faces) > 0:
        return {"status": "in_room", "pose": "face_detected", "confidence": 0.95, "faces": int(len(faces))}
    return {"status": "away", "pose": "not_detected", "confidence": 0.0, "faces": 0}

# ── routes: activity ──────────────────────────────────────────────────────────
@app.get("/activity/today")
def get_today_activity():
    today = datetime.date.today()
    logs = (ActivityLog
            .select()
            .where(ActivityLog.timestamp >= today)
            .order_by(ActivityLog.timestamp.desc()))
    return [{"time": str(l.timestamp), "type": l.activity_type, "duration": l.duration_seconds} for l in logs]

@app.get("/activity/stats")
def get_stats():
    today = datetime.date.today()
    logs = list(ActivityLog.select().where(ActivityLog.timestamp >= today))
    total_active = sum(l.duration_seconds for l in logs if l.activity_type == "active")
    total_idle   = sum(l.duration_seconds for l in logs if l.activity_type in ("idle", "away"))
    idle_breaks  = len([l for l in logs if l.activity_type == "idle"])
    focus_score  = round((total_active / (total_active + total_idle + 1)) * 100)
    return {
        "active_seconds": total_active,
        "idle_breaks": idle_breaks,
        "focus_score": focus_score,
    }

@app.get("/activity/week")
def get_week_activity():
    today = datetime.date.today()
    week_ago = today - datetime.timedelta(days=6)
    logs = list(ActivityLog.select().where(ActivityLog.timestamp >= week_ago))
    days = {}
    for i in range(7):
        d = (week_ago + datetime.timedelta(days=i)).isoformat()
        days[d] = {"date": d, "active": 0, "idle": 0}
    for l in logs:
        d = l.timestamp.date().isoformat()
        if d in days:
            if l.activity_type == "active":
                days[d]["active"] += l.duration_seconds
            else:
                days[d]["idle"] += l.duration_seconds
    return list(days.values())

# ── routes: summary ───────────────────────────────────────────────────────────
@app.get("/summary/today")
def get_today_summary():
    today = datetime.date.today()
    summary = DailySummary.get_or_none(DailySummary.date == today)
    if summary:
        return {"date": str(today), "summary": summary.summary_text}
    return {"date": str(today), "summary": "No summary yet for today."}

@app.post("/summary/generate")
def trigger_summary():
    from summarizer import generate_daily_summary
    text = generate_daily_summary()
    return {"summary": text}