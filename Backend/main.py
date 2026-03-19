from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import init_db, ActivityLog, DailySummary
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"status": "dashboard backend running"}

@app.get("/activity/today")
def get_today_activity():
    today = datetime.date.today()
    logs = (ActivityLog
            .select()
            .where(ActivityLog.timestamp >= today)
            .order_by(ActivityLog.timestamp.desc()))
    return [{"time": str(l.timestamp), "type": l.activity_type, "duration": l.duration_seconds} for l in logs]

@app.get("/summary/today")
def get_today_summary():
    today = datetime.date.today()
    summary = DailySummary.get_or_none(DailySummary.date == today)
    if summary:
        return {"date": str(today), "summary": summary.summary_text}
    return {"date": str(today), "summary": "No summary yet for today."}