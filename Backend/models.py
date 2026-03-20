from peewee import *
import datetime

db = SqliteDatabase('dashboard.db')

class BaseModel(Model):
    class Meta:
        database = db

class ActivityLog(BaseModel):
    timestamp = DateTimeField(default=datetime.datetime.now)
    activity_type = CharField()  # 'active', 'idle', 'in_room', 'away'
    duration_seconds = IntegerField(default=0)
    note = TextField(null=True)

class DailySummary(BaseModel):
    date = DateField(default=datetime.date.today)
    summary_text = TextField()
    total_active_seconds = IntegerField(default=0)
    created_at = DateTimeField(default=datetime.datetime.now)

class WeeklySummary(BaseModel):
    week_start = DateField()
    summary_text = TextField()
    created_at = DateTimeField(default=datetime.datetime.now)

def init_db():
    if db.is_closed():
        db.connect()
    db.create_tables([ActivityLog, DailySummary, WeeklySummary], safe=True)
    print("Database ready")

if __name__ == '__main__':
    init_db()