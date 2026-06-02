from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

ActivityCloseReason = Literal["timeout", "logout", "manual", "system"]
ActivitySource = Literal[
    "click",
    "dblclick",
    "keypress",
    "input",
    "submit",
    "create_object",
    "update_object",
    "delete_object",
    "status_change",
    "upload_file",
    "open_object_card",
    "open_view",
    "scroll",
    "mousemove",
    "navigation",
    "api",
    "heartbeat",
    "presence_ping",
    "polling",
    "auto_refresh",
    "reload_notifications",
    "reload_dashboard",
    "state_update",
    "token_refresh",
    "session_refresh",
    "autosave",
    "keepalive",
    "prefetch",
    "preload",
    "unknown",
]


class ActivityHeartbeatRequest(BaseModel):
    tenant_id: int | None = None
    source: ActivitySource = "unknown"
    occurred_at: datetime | None = None


class ActivityCloseRequest(BaseModel):
    reason: ActivityCloseReason = "manual"
    occurred_at: datetime | None = None


class ActivitySessionRead(BaseModel):
    id: int
    user_id: int
    tenant_id: int | None
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    close_reason: ActivityCloseReason | None
    last_activity_at: datetime

    model_config = {"from_attributes": True}


class ActivityHeartbeatResponse(BaseModel):
    session: ActivitySessionRead | None
    session_created: bool
    previous_session_closed: bool
    source_is_activity: bool
    presence_online: bool
    last_heartbeat_at: datetime


class DailyActivityStats(BaseModel):
    date: date
    first_action_at: datetime | None
    last_action_at: datetime | None
    active_seconds: int
    session_count: int
    longest_session_seconds: int


class PeriodDayBreakdown(BaseModel):
    date: date
    active_seconds: int


class WeeklyActivityStats(BaseModel):
    week_start: date
    week_end: date
    days: list[PeriodDayBreakdown]
    total_active_seconds: int
    average_active_seconds_per_day: int
    active_days_count: int
    session_count: int


class MonthlyActivityStats(BaseModel):
    year: int
    month: int
    days: list[PeriodDayBreakdown]
    total_active_seconds: int
    average_active_seconds_per_day: int
    active_days_count: int
    session_count: int


class ActivityStatsMeta(BaseModel):
    stats_started_at: date | None
    current_streak_days: int
    current_workday_streak_days: int
