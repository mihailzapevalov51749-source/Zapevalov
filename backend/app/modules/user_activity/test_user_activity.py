from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.user_activity.timezone_utils import UTC
from app.modules.user_activity.models import UserActivitySession
from app.modules.user_activity.service import (
    IDLE_TIMEOUT,
    close_open_sessions,
    compute_activity_meta,
    compute_daily_stats,
    compute_weekly_stats,
    is_activity_source,
    record_presence_heartbeat,
    record_activity_heartbeat,
)
from app.modules.users.models import User

MOSCOW = timezone(timedelta(hours=3))


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_user(db: Session) -> User:
    user = db.query(User).order_by(User.id.asc()).first()
    if user is None:
        pytest.skip("No users in database for activity tracking tests")
    # Тесты опираются на "пустую" историю активности конкретного пользователя.
    # В dev-DB между запусками могут оставаться старые записи, поэтому перед
    # каждым тестом очищаем сессии активности выбранного пользователя.
    db.query(UserActivitySession).filter(UserActivitySession.user_id == user.id).delete()
    db.commit()
    return user


def test_first_heartbeat_creates_session(db: Session, sample_user: User):
    now = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
    session, created, previous_closed = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=now,
    )
    assert created is True
    assert previous_closed is False
    assert session.user_id == sample_user.id
    assert session.ended_at is None
    assert session.last_activity_at == now


def test_second_heartbeat_extends_same_session(db: Session, sample_user: User):
    start = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
    first, _, _ = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=start,
    )
    second, created, previous_closed = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="scroll",
        occurred_at=start + timedelta(minutes=5),
    )
    assert created is False
    assert previous_closed is False
    assert second.id == first.id


def test_idle_timeout_starts_new_session(db: Session, sample_user: User):
    start = datetime(2026, 6, 1, 11, 0, tzinfo=timezone.utc)
    first, _, _ = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=start,
    )
    after_idle = start + IDLE_TIMEOUT + timedelta(minutes=1)
    second, created, previous_closed = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=after_idle,
    )
    db.refresh(first)
    assert previous_closed is True
    assert created is True
    assert second.id != first.id
    assert first.ended_at == start
    assert first.close_reason == "timeout"


def test_close_open_sessions_on_logout(db: Session, sample_user: User):
    now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
    session, _, _ = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=2,
        source="navigation",
        occurred_at=now,
    )
    closed = close_open_sessions(
        db,
        user_id=sample_user.id,
        reason="logout",
        ended_at=now + timedelta(minutes=3),
    )
    db.commit()
    db.refresh(session)
    assert closed == 1
    assert session.ended_at is not None
    assert session.close_reason == "logout"


def test_daily_stats_aggregates_sessions(db: Session, sample_user: User):
    day = datetime(2026, 6, 2, tzinfo=timezone.utc).date()
    t0 = datetime(2026, 6, 2, 9, 0, tzinfo=timezone.utc)
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=t0,
    )
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="keypress",
        occurred_at=t0 + timedelta(minutes=10),
    )
    close_open_sessions(
        db,
        user_id=sample_user.id,
        reason="manual",
        ended_at=t0 + timedelta(minutes=10),
    )
    db.commit()

    stats = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=day,
        tz=UTC,
        now=t0 + timedelta(hours=1),
    )
    assert stats["session_count"] >= 1
    assert stats["active_seconds"] >= 600
    assert stats["first_action_at"] is not None
    assert stats["last_action_at"] is not None
    assert stats["longest_session_seconds"] >= 600


def test_weekly_stats_returns_seven_days(db: Session, sample_user: User):
    anchor = datetime(2026, 6, 4, tzinfo=timezone.utc).date()
    stats = compute_weekly_stats(
        db,
        user_id=sample_user.id,
        anchor_day=anchor,
        tz=UTC,
        now=datetime(2026, 6, 4, 18, 0, tzinfo=timezone.utc),
    )
    assert len(stats["days"]) == 7
    assert stats["week_start"] <= anchor <= stats["week_end"]


def test_activity_meta_returns_started_at(db: Session, sample_user: User):
    heartbeat_at = datetime(2026, 6, 3, 10, 0, tzinfo=timezone.utc)
    now = heartbeat_at + timedelta(minutes=1)
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=heartbeat_at,
    )
    meta = compute_activity_meta(
        db,
        user_id=sample_user.id,
        tz=UTC,
        now=now,
    )
    assert meta["stats_started_at"] is not None
    assert meta["current_streak_days"] >= 1


def test_last_action_never_exceeds_now(db: Session, sample_user: User):
    tz = MOSCOW
    now = datetime(2026, 6, 2, 5, 10, tzinfo=timezone.utc)
    t0 = datetime(2026, 6, 2, 5, 7, tzinfo=timezone.utc)
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=t0,
    )
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="scroll",
        occurred_at=t0 + timedelta(minutes=3),
    )
    stats = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=now.astimezone(tz).date(),
        tz=tz,
        now=now,
    )
    assert stats["last_action_at"] is not None
    assert stats["last_action_at"] <= now
    assert stats["first_action_at"] <= stats["last_action_at"]
    assert stats["active_seconds"] >= 180
    assert stats["session_count"] == 1


def test_moscow_day_boundary_excludes_previous_day_tail(db: Session, sample_user: User):
    tz = MOSCOW
    now = datetime(2026, 6, 2, 5, 10, tzinfo=timezone.utc)
    previous_day = datetime(2026, 6, 1, 18, 0, tzinfo=timezone.utc)
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=previous_day,
    )
    close_open_sessions(
        db,
        user_id=sample_user.id,
        reason="timeout",
        ended_at=previous_day + IDLE_TIMEOUT,
    )
    db.commit()

    today = datetime(2026, 6, 2, 5, 8, tzinfo=timezone.utc)
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=today,
    )
    stats = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=now.astimezone(tz).date(),
        tz=tz,
        now=now,
    )
    assert stats["session_count"] == 1
    assert stats["last_action_at"] <= now
    assert stats["active_seconds"] <= 480


def test_cutoff_excludes_entire_previous_day_from_stats(db: Session, sample_user: User):
    tz = MOSCOW
    cutoff_utc = datetime(2026, 6, 1, 21, 0, tzinfo=timezone.utc)  # 02.06 00:00 MSK

    # Сессия пересекает границу: активности 01.06 (до cutoff) и 02.06 (после cutoff).
    t0 = cutoff_utc - timedelta(hours=1)  # 23:00 MSK 01.06
    last = cutoff_utc + timedelta(hours=1, minutes=30)  # 02:30 MSK 02.06
    ended_at = last + timedelta(minutes=10)

    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=t0,
    )
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="scroll",
        occurred_at=last,
    )
    close_open_sessions(
        db,
        user_id=sample_user.id,
        reason="manual",
        ended_at=ended_at,
    )
    db.commit()

    # 01.06 не должен попадать в статистику вообще.
    stats_prev = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=datetime(2026, 6, 1, tzinfo=timezone.utc).astimezone(tz).date(),
        tz=tz,
        now=ended_at + timedelta(minutes=1),
    )
    assert stats_prev["session_count"] == 0
    assert stats_prev["active_seconds"] == 0

    # 02.06, наоборот, должен содержать активность.
    stats_today = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=datetime(2026, 6, 2, tzinfo=timezone.utc).astimezone(tz).date(),
        tz=tz,
        now=ended_at + timedelta(minutes=1),
    )
    assert stats_today["session_count"] == 1
    assert stats_today["active_seconds"] > 0


def test_stats_started_at_uses_last_activity_after_cutoff(db: Session, sample_user: User):
    tz = MOSCOW
    cutoff_utc = datetime(2026, 6, 1, 21, 0, tzinfo=timezone.utc)  # 02.06 00:00 MSK

    # Старт до границы, но последняя активность после границы.
    started = cutoff_utc - timedelta(hours=6)  # 19:00 MSK 01.06
    last_after = cutoff_utc + timedelta(hours=2)  # 23:00 MSK 01.06 -> 02.06, в зависимости от даты локально

    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=started,
    )
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="mousemove",
        occurred_at=last_after,
    )
    close_open_sessions(
        db,
        user_id=sample_user.id,
        reason="manual",
        ended_at=last_after + timedelta(minutes=5),
    )
    db.commit()

    now_local = datetime(2026, 6, 2, 10, 0, tzinfo=tz)
    now_utc = now_local.astimezone(timezone.utc)
    meta = compute_activity_meta(db, user_id=sample_user.id, tz=tz, now=now_utc)
    assert meta["stats_started_at"] == datetime(2026, 6, 2).date()


def test_heartbeat_is_presence_only_and_does_not_create_activity_session(
    db: Session,
    sample_user: User,
):
    t0 = datetime(2026, 6, 2, 9, 0, tzinfo=timezone.utc)
    record_presence_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        occurred_at=t0,
    )
    sessions = (
        db.query(UserActivitySession)
        .filter(UserActivitySession.user_id == sample_user.id)
        .all()
    )
    assert is_activity_source("heartbeat") is False
    assert len(sessions) == 0


def test_presence_stays_active_while_activity_times_out(
    db: Session,
    sample_user: User,
):
    t0 = datetime(2026, 6, 2, 9, 0, tzinfo=timezone.utc)
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=t0,
    )
    record_presence_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        occurred_at=t0 + timedelta(minutes=16),
    )
    _, created, previous_closed = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="scroll",
        occurred_at=t0 + timedelta(minutes=16),
    )
    assert created is True
    assert previous_closed is True
