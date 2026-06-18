"""Daily stats: midnight session split (in-memory, no dev DB)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.user_activity.models import UserActivitySession
from app.modules.user_activity.service import compute_daily_stats
from app.modules.users.models import Role, User

MOSCOW = timezone(timedelta(hours=3))


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[Role.__table__, User.__table__, UserActivitySession.__table__],
    )
    session = sessionmaker(bind=engine)()
    session.add(Role(id=1, name="user", description="User"))
    user = User(
        id=1,
        email="midnight@example.com",
        hashed_password="hash",
        is_active=True,
        role_id=1,
    )
    session.add(user)
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _add_session(
    db_session,
    *,
    started_at: datetime,
    last_activity_at: datetime,
    ended_at: datetime | None = None,
) -> None:
    db_session.add(
        UserActivitySession(
            user_id=1,
            started_at=started_at,
            last_activity_at=last_activity_at,
            ended_at=ended_at,
        )
    )
    db_session.commit()


def test_session_crossing_midnight_splits_active_seconds(db_session):
    session_start = datetime(2026, 6, 15, 20, 10, tzinfo=timezone.utc)  # 23:10 MSK
    session_end = datetime(2026, 6, 15, 22, 30, tzinfo=timezone.utc)  # 01:30 MSK
    _add_session(
        db_session,
        started_at=session_start,
        last_activity_at=session_end,
        ended_at=session_end,
    )

    stats_15 = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 15),
        tz=MOSCOW,
        now=session_end,
    )
    stats_16 = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 16),
        tz=MOSCOW,
        now=session_end,
    )

    assert stats_15["session_count"] == 1
    assert stats_16["session_count"] == 1
    assert stats_15["active_seconds"] == 50 * 60
    assert stats_16["active_seconds"] == 90 * 60
    assert stats_15["last_action_at"] == datetime(2026, 6, 15, 20, 59, 59, tzinfo=timezone.utc)
    assert stats_16["first_action_at"] == datetime(2026, 6, 15, 21, 0, tzinfo=timezone.utc)
    assert stats_16["last_action_at"] == session_end


def test_open_session_crossing_midnight(db_session):
    session_start = datetime(2026, 6, 15, 20, 10, tzinfo=timezone.utc)
    now = datetime(2026, 6, 15, 21, 40, tzinfo=timezone.utc)  # 00:40 MSK
    _add_session(
        db_session,
        started_at=session_start,
        last_activity_at=now,
        ended_at=None,
    )

    stats_15 = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 15),
        tz=MOSCOW,
        now=now,
    )
    stats_16 = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 16),
        tz=MOSCOW,
        now=now,
    )

    assert stats_15["active_seconds"] == 50 * 60
    assert stats_16["active_seconds"] == 40 * 60


def test_single_day_session_unchanged(db_session):
    t0 = datetime(2026, 6, 15, 7, 0, tzinfo=timezone.utc)
    t1 = datetime(2026, 6, 15, 9, 0, tzinfo=timezone.utc)
    _add_session(db_session, started_at=t0, last_activity_at=t1, ended_at=t1)

    stats_15 = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 15),
        tz=MOSCOW,
        now=t1,
    )
    stats_16 = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 16),
        tz=MOSCOW,
        now=t1,
    )

    assert stats_15["active_seconds"] == 2 * 60 * 60
    assert stats_16["active_seconds"] == 0


def test_no_sessions_returns_empty(db_session):
    stats = compute_daily_stats(
        db_session,
        user_id=1,
        day=date(2026, 6, 15),
        tz=MOSCOW,
        now=datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc),
    )
    assert stats["active_seconds"] == 0
    assert stats["session_count"] == 0
    assert stats["first_action_at"] is None
    assert stats["last_action_at"] is None
