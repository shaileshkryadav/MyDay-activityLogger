import ollama
import datetime
from models import ActivityLog, DailySummary

def build_prompt(logs):
    lines = []
    for log in logs:
        t = log.timestamp.strftime("%H:%M")
        lines.append(f"{t} — {log.activity_type} ({log.duration_seconds // 60}min)")

    return f"""You are a personal productivity assistant analyzing someone's daily activity log.

Here is today's activity data:
{chr(10).join(lines)}

Write a concise 2-3 sentence summary of what this person did today.
Mention total active time, any long focus periods, idle breaks, and overall productivity.
Be direct and specific. Do not use bullet points."""

def generate_daily_summary():
    today = datetime.date.today()
    logs = list(ActivityLog
                .select()
                .where(ActivityLog.timestamp >= today)
                .order_by(ActivityLog.timestamp))

    if not logs:
        return "No activity has been logged today yet. Start the tracker to begin recording."

    prompt = build_prompt(logs)

    try:
        response = ollama.chat(
            model="mistral",
            messages=[{"role": "user", "content": prompt}]
        )
        summary_text = response['message']['content']
    except Exception as e:
        return f"Ollama error: {str(e)} — make sure Ollama is running on port 11434."

    total_active = sum(l.duration_seconds for l in logs if l.activity_type == "active")

    DailySummary.create(
        date=today,
        summary_text=summary_text,
        total_active_seconds=total_active
    )

    return summary_text