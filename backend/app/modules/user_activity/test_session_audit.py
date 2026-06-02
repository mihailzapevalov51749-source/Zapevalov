"""Audit: session splitting, active time sum, longest session semantics."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.modules.user_activity.service import (
    close_open_sessions,
    compute_daily_stats,
    record_activity_heartbeat,
)
from app.modules.user_activity.timezone_utils import UTC
from app.modules.user_activity.models import UserActivitySession
from app.modules.users.models import User


@pytest.fixture
def db():
    from app.db.session import SessionLocal

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
    # Тесты вычисляют точные длительности, поэтому нужна "чистая"
    # история активности выбранного пользователя.
    db.query(UserActivitySession).filter(UserActivitySession.user_id == user.id).delete()
    db.commit()
    return user


def test_continuous_work_is_single_session_and_active_time_matches_windows(
    db: Session,
    sample_user: User,
):
    """08:19 → 08:53 style window: heartbeats every 5 min, no explicit close."""
    day = datetime(2026, 6, 10, tzinfo=timezone.utc).date()
    t0 = datetime(2026, 6, 10, 8, 19, tzinfo=timezone.utc)
    now = datetime(2026, 6, 10, 8, 53, tzinfo=timezone.utc)

    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=t0,
    )
    cursor = t0
    while cursor < now:
        cursor += timedelta(minutes=5)
        if cursor > now:
            cursor = now
        _, created, _ = record_activity_heartbeat(
            db,
            user_id=sample_user.id,
            tenant_id=1,
            source="heartbeat",
            occurred_at=cursor,
        )
        assert created is False

    stats = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=day,
        tz=UTC,
        now=now,
    )

    assert stats["session_count"] == 1
    assert stats["active_seconds"] == int((now - t0).total_seconds())
    assert stats["longest_session_seconds"] == stats["active_seconds"]


def test_short_tab_switch_without_close_keeps_single_session(
    db: Session,
    sample_user: User,
):
    """Tab switch/minimize <= 15 min must not split session."""
    day = datetime(2026, 6, 11, tzinfo=timezone.utc).date()
    t0 = datetime(2026, 6, 11, 8, 19, tzinfo=timezone.utc)
    # Минимизирование/heartbeat считается "не разрывающим" сессию,
    # поэтому t2 должно быть в пределах IDLE_TIMEOUT до now.
    t2 = datetime(2026, 6, 11, 8, 43, tzinfo=timezone.utc)
    now = datetime(2026, 6, 11, 8, 53, tzinfo=timezone.utc)

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
        occurred_at=t0 + timedelta(minutes=10),
    )
    _, created, _ = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="heartbeat",
        occurred_at=t2,
    )
    assert created is False
    record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=now,
    )

    stats = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=day,
        tz=UTC,
        now=now,
    )

    assert stats["session_count"] == 1
    assert stats["active_seconds"] == int((now - t0).total_seconds())
    assert stats["longest_session_seconds"] == stats["active_seconds"]


def test_longest_session_uses_full_session_duration(db: Session, sample_user: User):
    """Longest session follows session lifetime: ended_at - started_at."""
    day = datetime(2026, 6, 12, tzinfo=timezone.utc).date()
    t0 = datetime(2026, 6, 12, 9, 0, tzinfo=timezone.utc)

    session, _, _ = record_activity_heartbeat(
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
        source="click",
        occurred_at=t0 + timedelta(minutes=8),
    )
    close_open_sessions(
        db,
        user_id=sample_user.id,
        reason="logout",
        ended_at=t0 + timedelta(minutes=20),
    )
    db.commit()
    db.refresh(session)

    stats = compute_daily_stats(
        db,
        user_id=sample_user.id,
        day=day,
        tz=UTC,
        now=t0 + timedelta(hours=2),
    )

    assert session.duration_seconds == 20 * 60
    assert stats["longest_session_seconds"] == 20 * 60
    assert stats["active_seconds"] == 20 * 60


def test_timeout_gap_creates_new_session_and_longest_is_per_session(db: Session, sample_user: User):
    """08:00-08:10, gap 20 min, 08:30-08:40 => 2 sessions, max 10 min."""
    day = datetime(2026, 6, 13, tzinfo=timezone.utc).date()
    a0 = datetime(2026, 6, 13, 8, 0, tzinfo=timezone.utc)
    a1 = datetime(2026, 6, 13, 8, 10, tzinfo=timezone.utc)
    b0 = datetime(2026, 6, 13, 8, 30, tzinfo=timezone.utc)
    b1 = datetime(2026, 6, 13, 8, 40, tzinfo=timezone.utc)

    record_activity_heartbeat(db, user_id=sample_user.id, tenant_id=1, source="click", occurred_at=a0)
    record_activity_heartbeat(db, user_id=sample_user.id, tenant_id=1, source="scroll", occurred_at=a1)
    second, created, previous_closed = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=b0,
    )
    assert created is True
    assert previous_closed is True
    assert second.started_at == b0
    record_activity_heartbeat(db, user_id=sample_user.id, tenant_id=1, source="keypress", occurred_at=b1)

    stats = compute_daily_stats(db, user_id=sample_user.id, day=day, tz=UTC, now=b1)
    assert stats["session_count"] == 2
    assert stats["longest_session_seconds"] == 10 * 60
    assert stats["active_seconds"] == 20 * 60


def test_logout_closes_session_with_logout_reason(db: Session, sample_user: User):
    t0 = datetime(2026, 6, 14, 9, 0, tzinfo=timezone.utc)
    t1 = datetime(2026, 6, 14, 9, 12, tzinfo=timezone.utc)
    session, _, _ = record_activity_heartbeat(
        db,
        user_id=sample_user.id,
        tenant_id=1,
        source="click",
        occurred_at=t0,
    )
    closed = close_open_sessions(db, user_id=sample_user.id, reason="logout", ended_at=t1)
    db.commit()
    db.refresh(session)
    assert closed == 1
    assert session.close_reason == "logout"
    assert session.ended_at == t1
