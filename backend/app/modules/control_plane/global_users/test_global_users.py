"""Tests for global users registry."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.global_users.service import (
    get_global_user,
    list_global_users,
    update_global_user_status,
)
from app.modules.portals.models import Portal
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.user_activity.models import UserActivitySession
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            User.__table__,
            Role.__table__,
            TenantUserMembership.__table__,
            UserActivitySession.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Role(id=1, name="superadmin", description="Superadmin"),
            Portal(id=10, name="Client A", code="client-a"),
            Portal(id=11, name="Client B", code="client-b"),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _create_user(db_session, *, email: str, full_name: str | None, is_active: bool = True) -> User:
    user = User(
        email=email,
        full_name=full_name,
        hashed_password="hash",
        is_active=is_active,
        role_id=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def test_list_global_users_returns_all_visible_users(db_session):
    _create_user(db_session, email="alpha@example.com", full_name="Alpha User")
    _create_user(db_session, email="beta@example.com", full_name=None)

    users = list_global_users(db_session)
    assert len(users) == 2
    assert users[0]["display_name"] in {"Alpha User", "beta@example.com"}


def test_list_global_users_includes_tenant_scoped_users(db_session):
    tenant_user = User(
        email="tenant@example.com",
        full_name="Tenant Scoped",
        hashed_password="hash",
        is_active=True,
        role_id=1,
        tenant_id=10,
    )
    db_session.add(tenant_user)
    db_session.commit()

    platform_user = _create_user(
        db_session,
        email="platform@example.com",
        full_name="Platform Scoped",
    )

    users = list_global_users(db_session)
    emails = {item["email"] for item in users}

    assert platform_user.email in emails
    assert tenant_user.email in emails


def test_get_global_user_includes_memberships(db_session):
    user = _create_user(db_session, email="member@example.com", full_name="Member")
    upsert_active_membership(db_session, tenant_id=10, user_id=user.id, role_key="superadmin")
    upsert_active_membership(db_session, tenant_id=11, user_id=user.id, role_key="user")
    db_session.commit()

    payload = get_global_user(db_session, user.id)
    assert payload["companies_count"] == 2
    assert len(payload["companies"]) == 2
    assert payload["companies"][0]["tenant_name"] == "Client A"


def test_update_global_user_status_blocks_and_unblocks(db_session):
    user = _create_user(db_session, email="blocked@example.com", full_name="Blocked")

    blocked = update_global_user_status(db_session, user.id, is_active=False)
    assert blocked["is_active"] is False
    assert blocked["global_status"] == "blocked"

    unblocked = update_global_user_status(db_session, user.id, is_active=True)
    assert unblocked["is_active"] is True
    assert unblocked["global_status"] == "active"


def test_hidden_user_not_found(db_session):
    hidden = User(
        email="hidden@example.com",
        full_name="Hidden",
        hashed_password="hash",
        is_active=True,
        is_hidden_user=True,
        role_id=1,
    )
    db_session.add(hidden)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        get_global_user(db_session, hidden.id)

    assert exc.value.status_code == 404


def test_global_user_last_login_uses_activity_session(db_session):
    user = _create_user(db_session, email="active@example.com", full_name="Active")
    session_started = datetime(2026, 6, 13, 12, 30, tzinfo=timezone.utc)
    db_session.add(
        UserActivitySession(
            user_id=user.id,
            started_at=session_started,
            last_activity_at=session_started,
        )
    )
    db_session.commit()

    payload = get_global_user(db_session, user.id)
    assert _as_utc(payload["last_login_at"]) == session_started


def test_global_user_last_login_without_activity_is_null(db_session):
    user = _create_user(db_session, email="quiet@example.com", full_name="Quiet")

    payload = get_global_user(db_session, user.id)
    assert payload["last_login_at"] is None


def test_list_global_users_ignores_users_last_login_at(db_session):
    user = _create_user(db_session, email="listed@example.com", full_name="Listed")
    user.last_login_at = datetime(2026, 6, 10, 8, 0, tzinfo=timezone.utc)
    session_started = datetime(2026, 6, 14, 9, 15, tzinfo=timezone.utc)
    db_session.add(
        UserActivitySession(
            user_id=user.id,
            started_at=session_started,
            last_activity_at=session_started,
        )
    )
    db_session.commit()

    users = list_global_users(db_session)
    listed = next(item for item in users if item["email"] == "listed@example.com")
    assert _as_utc(listed["last_login_at"]) == session_started


def test_global_user_last_login_uses_latest_session_start(db_session):
    user = _create_user(db_session, email="multi@example.com", full_name="Multi")
    db_session.add_all(
        [
            UserActivitySession(
                user_id=user.id,
                started_at=datetime(2026, 6, 10, 8, 0, tzinfo=timezone.utc),
                last_activity_at=datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc),
            ),
            UserActivitySession(
                user_id=user.id,
                started_at=datetime(2026, 6, 12, 9, 15, tzinfo=timezone.utc),
                last_activity_at=datetime(2026, 6, 12, 10, 0, tzinfo=timezone.utc),
            ),
            UserActivitySession(
                user_id=user.id,
                started_at=datetime(2026, 6, 15, 3, 20, tzinfo=timezone.utc),
                last_activity_at=datetime(2026, 6, 15, 7, 6, tzinfo=timezone.utc),
            ),
        ]
    )
    db_session.commit()

    payload = get_global_user(db_session, user.id)
    assert _as_utc(payload["last_login_at"]) == datetime(2026, 6, 15, 3, 20, tzinfo=timezone.utc)
