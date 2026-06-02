from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.user_activity.schemas import (
    ActivityCloseRequest,
    ActivityHeartbeatRequest,
    ActivityHeartbeatResponse,
    ActivitySessionRead,
    ActivityStatsMeta,
    DailyActivityStats,
    MonthlyActivityStats,
    WeeklyActivityStats,
)
from app.modules.user_activity.service import (
    close_open_sessions,
    compute_activity_meta,
    compute_daily_stats,
    compute_monthly_stats,
    compute_weekly_stats,
    is_activity_source,
    record_presence_heartbeat,
    record_activity_heartbeat,
)
from app.modules.user_activity.timezone_utils import local_today, resolve_timezone, utc_now
from app.modules.users.models import User

router = APIRouter(
    prefix="/user-activity",
    tags=["User Activity"],
)


def _resolve_tz(tz: str | None):
    return resolve_timezone(tz)


@router.post("/heartbeat", response_model=ActivityHeartbeatResponse)
def post_activity_heartbeat(
    payload: ActivityHeartbeatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    presence_state = record_presence_heartbeat(
        db,
        user_id=current_user.id,
        tenant_id=payload.tenant_id,
        occurred_at=payload.occurred_at,
    )
    source_is_activity = is_activity_source(payload.source)
    session = None
    session_created = False
    previous_closed = False
    if source_is_activity:
        session, session_created, previous_closed = record_activity_heartbeat(
            db,
            user_id=current_user.id,
            tenant_id=payload.tenant_id,
            source=payload.source,
            occurred_at=payload.occurred_at,
        )
    return ActivityHeartbeatResponse(
        session=ActivitySessionRead.model_validate(session) if session is not None else None,
        session_created=session_created,
        previous_session_closed=previous_closed,
        source_is_activity=source_is_activity,
        presence_online=presence_state.is_online,
        last_heartbeat_at=presence_state.last_heartbeat_at,
    )


@router.post("/close")
def post_activity_close(
    payload: ActivityCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    closed = close_open_sessions(
        db,
        user_id=current_user.id,
        reason=payload.reason,
        ended_at=payload.occurred_at,
    )
    db.commit()
    return {"closed_sessions": closed}


@router.get("/stats/day", response_model=DailyActivityStats)
def get_daily_activity_stats(
    day: date | None = Query(default=None),
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zone = _resolve_tz(tz)
    target_day = day or local_today(zone)
    stats = compute_daily_stats(db, user_id=current_user.id, day=target_day, tz=zone)
    return DailyActivityStats(**stats)


@router.get("/stats/week", response_model=WeeklyActivityStats)
def get_weekly_activity_stats(
    day: date | None = Query(default=None),
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zone = _resolve_tz(tz)
    anchor_day = day or local_today(zone)
    stats = compute_weekly_stats(db, user_id=current_user.id, anchor_day=anchor_day, tz=zone)
    return WeeklyActivityStats(**stats)


@router.get("/stats/month", response_model=MonthlyActivityStats)
def get_monthly_activity_stats(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zone = _resolve_tz(tz)
    now_local = utc_now().astimezone(zone)
    target_year = year or now_local.year
    target_month = month or now_local.month
    stats = compute_monthly_stats(
        db,
        user_id=current_user.id,
        year=target_year,
        month=target_month,
        tz=zone,
    )
    return MonthlyActivityStats(**stats)


@router.get("/stats/meta", response_model=ActivityStatsMeta)
def get_activity_stats_meta(
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zone = _resolve_tz(tz)
    meta = compute_activity_meta(db, user_id=current_user.id, tz=zone)
    return ActivityStatsMeta(**meta)
