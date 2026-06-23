from contextlib import contextmanager
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.user_activity.activity_context import (
    UserActivityContext,
    resolve_user_activity_context,
)
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

router = APIRouter(
    prefix="/user-activity",
    tags=["User Activity"],
)


def _resolve_tz(tz: str | None):
    return resolve_timezone(tz)


@contextmanager
def _user_activity_scope(tenant_db: Session, actor: RuntimeDesignerActor):
    ctx = resolve_user_activity_context(tenant_db, actor)
    try:
        yield ctx
    finally:
        if ctx.owns_db:
            ctx.db.close()


@router.post("/heartbeat", response_model=ActivityHeartbeatResponse)
def post_activity_heartbeat(
    payload: ActivityHeartbeatRequest,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    with _user_activity_scope(db, current_actor) as ctx:
        presence_state = record_presence_heartbeat(
            ctx.db,
            user_id=ctx.user_id,
            tenant_id=payload.tenant_id,
            occurred_at=payload.occurred_at,
        )
        source_is_activity = is_activity_source(payload.source)
        session = None
        session_created = False
        previous_closed = False
        if source_is_activity:
            session, session_created, previous_closed = record_activity_heartbeat(
                ctx.db,
                user_id=ctx.user_id,
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
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    with _user_activity_scope(db, current_actor) as ctx:
        closed = close_open_sessions(
            ctx.db,
            user_id=ctx.user_id,
            reason=payload.reason,
            ended_at=payload.occurred_at,
        )
        ctx.db.commit()
        return {"closed_sessions": closed}


@router.get("/stats/day", response_model=DailyActivityStats)
def get_daily_activity_stats(
    day: date | None = Query(default=None),
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    zone = _resolve_tz(tz)
    target_day = day or local_today(zone)
    with _user_activity_scope(db, current_actor) as ctx:
        stats = compute_daily_stats(ctx.db, user_id=ctx.user_id, day=target_day, tz=zone)
        return DailyActivityStats(**stats)


@router.get("/stats/week", response_model=WeeklyActivityStats)
def get_weekly_activity_stats(
    day: date | None = Query(default=None),
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    zone = _resolve_tz(tz)
    anchor_day = day or local_today(zone)
    with _user_activity_scope(db, current_actor) as ctx:
        stats = compute_weekly_stats(
            ctx.db,
            user_id=ctx.user_id,
            anchor_day=anchor_day,
            tz=zone,
        )
        return WeeklyActivityStats(**stats)


@router.get("/stats/month", response_model=MonthlyActivityStats)
def get_monthly_activity_stats(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    zone = _resolve_tz(tz)
    now_local = utc_now().astimezone(zone)
    target_year = year or now_local.year
    target_month = month or now_local.month
    with _user_activity_scope(db, current_actor) as ctx:
        stats = compute_monthly_stats(
            ctx.db,
            user_id=ctx.user_id,
            year=target_year,
            month=target_month,
            tz=zone,
        )
        return MonthlyActivityStats(**stats)


@router.get("/stats/meta", response_model=ActivityStatsMeta)
def get_activity_stats_meta(
    tz: str | None = Query(default=None, description="IANA timezone, e.g. Europe/Moscow"),
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    zone = _resolve_tz(tz)
    with _user_activity_scope(db, current_actor) as ctx:
        meta = compute_activity_meta(ctx.db, user_id=ctx.user_id, tz=zone)
        return ActivityStatsMeta(**meta)
