from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from app.modules.user_activity.models import UserActivitySession
from app.modules.user_activity.models import UserPresenceState
from app.modules.user_activity.timezone_utils import (
    UTC,
    local_day_bounds,
    local_today,
    resolve_timezone,
    to_local_date,
    utc_now,
)

IDLE_TIMEOUT = timedelta(minutes=15)
PRESENCE_ONLINE_TIMEOUT = timedelta(minutes=2)
ACTIVITY_ALLOWED_SOURCES = {
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
    "navigation",
    "scroll",
    "mousemove",
}

# Сброс истории активности: любые активности до даты считаются невалидными.
# По смыслу задачи "02.06.2026 00:00" трактуем как полуночь по локальному времени
# (МСК, UTC+3), после которой начинается корректный учёт.
USER_ACTIVITY_VALID_FROM = date(2026, 6, 2)
USER_ACTIVITY_VALID_FROM_TZ = timezone(timedelta(hours=3))  # Moscow time (UTC+3)
USER_ACTIVITY_VALID_FROM_UTC = datetime(
    USER_ACTIVITY_VALID_FROM.year,
    USER_ACTIVITY_VALID_FROM.month,
    USER_ACTIVITY_VALID_FROM.day,
    0,
    0,
    tzinfo=USER_ACTIVITY_VALID_FROM_TZ,
).astimezone(UTC)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_activity_source(source: str) -> bool:
    return source in ACTIVITY_ALLOWED_SOURCES


def _presence_is_online(*, last_heartbeat_at: datetime, now: datetime) -> bool:
    return (_ensure_utc(now) - _ensure_utc(last_heartbeat_at)) <= PRESENCE_ONLINE_TIMEOUT


def record_presence_heartbeat(
    db: Session,
    *,
    user_id: int,
    tenant_id: int | None,
    occurred_at: datetime | None = None,
) -> UserPresenceState:
    now = _ensure_utc(occurred_at or utc_now())
    state = (
        db.query(UserPresenceState)
        .filter(UserPresenceState.user_id == user_id)
        .first()
    )
    if state is None:
        state = UserPresenceState(
            user_id=user_id,
            tenant_id=tenant_id,
            last_heartbeat_at=now,
            last_visit_at=now,
            is_online=True,
        )
        db.add(state)
    else:
        state.last_heartbeat_at = now
        state.last_visit_at = max(_ensure_utc(state.last_visit_at), now)
        state.is_online = _presence_is_online(last_heartbeat_at=now, now=now)
        if tenant_id is not None:
            state.tenant_id = tenant_id
    db.commit()
    db.refresh(state)
    return state


def _close_session(
    session: UserActivitySession,
    ended_at: datetime,
    reason: str,
) -> None:
    ended_at = _ensure_utc(ended_at)
    session.ended_at = ended_at
    session.close_reason = reason
    session.duration_seconds = max(
        0,
        int((ended_at - _ensure_utc(session.started_at)).total_seconds()),
    )


def _session_effective_end(session: UserActivitySession, now: datetime) -> datetime:
    """Activity interval ends at last recorded activity, capped at now."""
    now = _ensure_utc(now)
    last_activity = _ensure_utc(session.last_activity_at)
    if session.ended_at is not None:
        ended = _ensure_utc(session.ended_at)
        return min(ended, last_activity, now)
    return min(last_activity, now)


def _session_day_overlap(
    session: UserActivitySession,
    *,
    range_start: datetime,
    range_end: datetime,
    now: datetime,
) -> tuple[datetime, datetime, int]:
    """Clip session activity interval to [range_start, range_end) for one calendar day."""
    return _session_activity_window(
        session,
        range_start=range_start,
        range_end=range_end,
        now=now,
    )


def _get_open_session(db: Session, user_id: int) -> UserActivitySession | None:
    return (
        db.query(UserActivitySession)
        .filter(
            UserActivitySession.user_id == user_id,
            UserActivitySession.ended_at.is_(None),
        )
        .order_by(UserActivitySession.last_activity_at.desc())
        .first()
    )


def close_open_sessions(
    db: Session,
    *,
    user_id: int,
    reason: str,
    ended_at: datetime | None = None,
) -> int:
    now = _ensure_utc(ended_at or utc_now())
    open_sessions = (
        db.query(UserActivitySession)
        .filter(
            UserActivitySession.user_id == user_id,
            UserActivitySession.ended_at.is_(None),
        )
        .all()
    )
    closed = 0
    for session in open_sessions:
        last_activity = _ensure_utc(session.last_activity_at)
        effective_end = last_activity if reason == "timeout" else now
        _close_session(session, effective_end, reason)
        closed += 1
    return closed


def record_activity_heartbeat(
    db: Session,
    *,
    user_id: int,
    tenant_id: int | None,
    source: str,
    occurred_at: datetime | None = None,
) -> tuple[UserActivitySession, bool, bool]:
    now = _ensure_utc(occurred_at or utc_now())
    previous_closed = False
    session_created = False

    open_session = _get_open_session(db, user_id)
    if open_session is not None:
        gap = now - _ensure_utc(open_session.last_activity_at)
        if gap > IDLE_TIMEOUT:
            _close_session(
                open_session,
                _ensure_utc(open_session.last_activity_at),
                "timeout",
            )
            previous_closed = True
            open_session = None

    if open_session is None:
        open_session = UserActivitySession(
            user_id=user_id,
            tenant_id=tenant_id,
            started_at=now,
            last_activity_at=now,
        )
        db.add(open_session)
        session_created = True
    else:
        open_session.last_activity_at = now
        if tenant_id is not None:
            open_session.tenant_id = tenant_id

    db.commit()
    db.refresh(open_session)
    return open_session, session_created, previous_closed


def _session_activity_window(
    session: UserActivitySession,
    *,
    range_start: datetime,
    range_end: datetime,
    now: datetime,
) -> tuple[datetime, datetime, int]:
    """Return clipped start/end and active seconds for session lifetime."""
    started = _ensure_utc(session.started_at)
    effective_end = _session_effective_end(session, now)
    start = max(started, range_start)
    end = min(effective_end, range_end)
    if end <= start:
        return start, end, 0
    return start, end, int((end - start).total_seconds())


def _sessions_in_range(
    db: Session,
    *,
    user_id: int,
    range_start: datetime,
    range_end: datetime,
) -> list[UserActivitySession]:
    return (
        db.query(UserActivitySession)
        .filter(
            UserActivitySession.user_id == user_id,
            UserActivitySession.started_at < range_end,
            UserActivitySession.last_activity_at >= range_start,
        )
        .order_by(UserActivitySession.started_at.asc())
        .all()
    )


def _pick_latest_timestamp(*values: datetime | None) -> datetime | None:
    normalized = [_ensure_utc(value) for value in values if value is not None]
    if not normalized:
        return None
    return max(normalized)


def get_last_session_started_at(db: Session, user_id: int) -> datetime | None:
    return (
        db.query(func.max(UserActivitySession.started_at))
        .filter(UserActivitySession.user_id == user_id)
        .scalar()
    )


def get_last_session_started_at_map(
    db: Session,
    user_ids: Iterable[int],
) -> dict[int, datetime]:
    ids = sorted({int(user_id) for user_id in user_ids})
    if not ids:
        return {}

    rows = (
        db.query(UserActivitySession.user_id, func.max(UserActivitySession.started_at))
        .filter(UserActivitySession.user_id.in_(ids))
        .group_by(UserActivitySession.user_id)
        .all()
    )
    return {
        int(user_id): _ensure_utc(started_at)
        for user_id, started_at in rows
        if started_at is not None
    }


def resolve_user_last_login_at(
    *,
    stored_last_login_at: datetime | None,
    last_session_started_at: datetime | None,
) -> datetime | None:
    """Last login from user activity sessions, with users.last_login_at as fallback."""
    if last_session_started_at is not None:
        return _pick_latest_timestamp(last_session_started_at, stored_last_login_at)
    return stored_last_login_at


def _iter_dates(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def compute_daily_stats(
    db: Session,
    *,
    user_id: int,
    day: date,
    tz: ZoneInfo | None = None,
    now: datetime | None = None,
) -> dict:
    tz = tz or UTC
    now = _ensure_utc(now or utc_now())
    range_start, range_end = local_day_bounds(day, tz)
    # Граница учёта: для любых вычислений считаем только активность начиная
    # с указанного момента (в UTC), чтобы "01.06" не появлялся в отчётах.
    range_start = max(range_start, USER_ACTIVITY_VALID_FROM_UTC)
    sessions = _sessions_in_range(
        db,
        user_id=user_id,
        range_start=range_start,
        range_end=range_end,
    )

    active_seconds = 0
    longest_session_seconds = 0
    first_action_at: datetime | None = None
    last_action_at: datetime | None = None
    session_count = 0

    for session in sessions:
        start, end, seconds = _session_day_overlap(
            session,
            range_start=range_start,
            range_end=range_end,
            now=now,
        )
        if seconds <= 0:
            continue

        session_count += 1
        active_seconds += seconds
        longest_session_seconds = max(longest_session_seconds, seconds)
        first_action_at = start if first_action_at is None else min(first_action_at, start)
        action_end = end
        if action_end == range_end and seconds > 0:
            action_end = range_end - timedelta(microseconds=1)
        last_action_at = action_end if last_action_at is None else max(last_action_at, action_end)

    return {
        "date": day,
        "first_action_at": first_action_at,
        "last_action_at": last_action_at,
        "active_seconds": active_seconds,
        "session_count": session_count,
        "longest_session_seconds": longest_session_seconds,
    }


def compute_weekly_stats(
    db: Session,
    *,
    user_id: int,
    anchor_day: date,
    tz: ZoneInfo | None = None,
    now: datetime | None = None,
) -> dict:
    tz = tz or UTC
    now = _ensure_utc(now or utc_now())
    week_start = anchor_day - timedelta(days=anchor_day.weekday())
    week_end = week_start + timedelta(days=6)

    days: list[dict] = []
    total_active_seconds = 0
    active_days_count = 0
    session_count = 0

    for day in _iter_dates(week_start, week_end):
        daily = compute_daily_stats(db, user_id=user_id, day=day, tz=tz, now=now)
        days.append(
            {
                "date": day,
                "active_seconds": daily["active_seconds"],
            },
        )
        total_active_seconds += daily["active_seconds"]
        session_count += daily["session_count"]
        if daily["active_seconds"] > 0:
            active_days_count += 1

    average = total_active_seconds // active_days_count if active_days_count else 0

    return {
        "week_start": week_start,
        "week_end": week_end,
        "days": days,
        "total_active_seconds": total_active_seconds,
        "average_active_seconds_per_day": average,
        "active_days_count": active_days_count,
        "session_count": session_count,
    }


def compute_monthly_stats(
    db: Session,
    *,
    user_id: int,
    year: int,
    month: int,
    tz: ZoneInfo | None = None,
    now: datetime | None = None,
) -> dict:
    tz = tz or UTC
    now = _ensure_utc(now or utc_now())
    last_day = monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    days: list[dict] = []
    total_active_seconds = 0
    active_days_count = 0
    session_count = 0

    for day in _iter_dates(month_start, month_end):
        daily = compute_daily_stats(db, user_id=user_id, day=day, tz=tz, now=now)
        days.append(
            {
                "date": day,
                "active_seconds": daily["active_seconds"],
            },
        )
        total_active_seconds += daily["active_seconds"]
        session_count += daily["session_count"]
        if daily["active_seconds"] > 0:
            active_days_count += 1

    average = total_active_seconds // active_days_count if active_days_count else 0

    return {
        "year": year,
        "month": month,
        "days": days,
        "total_active_seconds": total_active_seconds,
        "average_active_seconds_per_day": average,
        "active_days_count": active_days_count,
        "session_count": session_count,
    }


def _day_has_activity(
    db: Session,
    *,
    user_id: int,
    day: date,
    tz: ZoneInfo,
    now: datetime,
) -> bool:
    return compute_daily_stats(db, user_id=user_id, day=day, tz=tz, now=now)["active_seconds"] > 0


def get_stats_started_at(
    db: Session,
    *,
    user_id: int,
    tz: ZoneInfo | None = None,
) -> date | None:
    tz = tz or UTC
    # "Первая валидная активность" определяется по самой ранней
    # зафиксированной активности после границы (last_activity_at),
    # так как сессия может пересекать границу и стартовать раньше.
    first_activity_after_cutoff = (
        db.query(func.min(UserActivitySession.last_activity_at))
        .filter(UserActivitySession.user_id == user_id)
        .filter(UserActivitySession.last_activity_at >= USER_ACTIVITY_VALID_FROM_UTC)
        .scalar()
    )
    if first_activity_after_cutoff is None:
        return None
    return to_local_date(_ensure_utc(first_activity_after_cutoff), tz)


def _count_streak_from_day(
    db: Session,
    *,
    user_id: int,
    start_day: date,
    tz: ZoneInfo,
    now: datetime,
    workdays_only: bool,
) -> int:
    streak = 0
    day = start_day
    for _ in range(3660):
        if workdays_only and day.weekday() >= 5:
            day -= timedelta(days=1)
            continue
        if not _day_has_activity(db, user_id=user_id, day=day, tz=tz, now=now):
            break
        streak += 1
        day -= timedelta(days=1)
    return streak


def compute_activity_meta(
    db: Session,
    *,
    user_id: int,
    tz: ZoneInfo | None = None,
    now: datetime | None = None,
) -> dict:
    tz = tz or UTC
    now = _ensure_utc(now or utc_now())
    today = local_today(tz, now=now)
    stats_started_at = get_stats_started_at(db, user_id=user_id, tz=tz)

    streak_anchor = today
    if not _day_has_activity(db, user_id=user_id, day=today, tz=tz, now=now):
        streak_anchor = today - timedelta(days=1)

    current_streak_days = _count_streak_from_day(
        db,
        user_id=user_id,
        start_day=streak_anchor,
        tz=tz,
        now=now,
        workdays_only=False,
    )
    current_workday_streak_days = _count_streak_from_day(
        db,
        user_id=user_id,
        start_day=streak_anchor,
        tz=tz,
        now=now,
        workdays_only=True,
    )

    return {
        "stats_started_at": stats_started_at,
        "current_streak_days": current_streak_days,
        "current_workday_streak_days": current_workday_streak_days,
    }
