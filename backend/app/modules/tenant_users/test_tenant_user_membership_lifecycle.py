"""Tests for tenant user membership lifecycle and profile isolation."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.portals.models import Portal
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN, TENANT_USER
from app.modules.tenant_users.administration_service import (
    create_tenant_user,
    dismiss_tenant_user,
    list_tenant_users,
    lookup_tenant_user_email,
    restore_tenant_user,
)
from app.modules.tenant_users.constants import (
    LOOKUP_OUTCOME_ALREADY_MEMBER,
    LOOKUP_OUTCOME_DISMISSED,
    LOOKUP_OUTCOME_FOUND_EXISTING,
    LOOKUP_OUTCOME_NEW,
    MEMBERSHIP_STATUS_ACTIVE,
    MEMBERSHIP_STATUS_DISMISSED,
)
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
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
            TenantUserProfile.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Portal(id=21, name="Company A", code="company_a"),
            Portal(id=22, name="Company B", code="company_b"),
            Role(id=1, name=TENANT_SUPERADMIN, description="superadmin"),
            Role(id=2, name="admin", description="admin"),
            Role(id=3, name=TENANT_USER, description="user"),
            User(
                id=100,
                email="owner@company-a.test",
                full_name="Owner A",
                hashed_password="hash",
                is_active=True,
                tenant_id=21,
                role_id=1,
                is_company_owner=True,
            ),
            User(
                id=300,
                email="owner@company-b.test",
                full_name="Owner B",
                hashed_password="hash",
                is_active=True,
                tenant_id=22,
                role_id=1,
                is_company_owner=True,
            ),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _cleanup_created_users(db_session, emails: list[str]) -> None:
    for email in emails:
        user = db_session.query(User).filter(User.email == email).one_or_none()
        if user is None:
            continue
        db_session.query(TenantUserProfile).filter(TenantUserProfile.user_id == user.id).delete()
        db_session.query(TenantUserMembership).filter(TenantUserMembership.user_id == user.id).delete()
        db_session.delete(user)
    db_session.commit()


def test_lookup_new_email(db_session):
    result = lookup_tenant_user_email(
        db_session,
        tenant_id=21,
        email="new.user@company-a.test",
    )
    assert result["outcome"] == LOOKUP_OUTCOME_NEW


def test_existing_user_added_to_second_company_with_isolated_profile(db_session):
    email = "ivan@mail.ru"
    try:
        user_a, _ = create_tenant_user(
            db_session,
            tenant_id=21,
            payload={
                "email": email,
                "full_name": "Ivan A",
                "role_id": 3,
                "position": "Manager A",
                "avatar_url": "https://example.com/a.png",
            },
        )
        user_b, _ = create_tenant_user(
            db_session,
            tenant_id=22,
            payload={
                "email": email,
                "full_name": "Ivan B",
                "role_id": 3,
                "position": "Manager B",
                "avatar_url": "https://example.com/b.png",
            },
        )

        assert user_a["id"] == user_b["id"]
        assert db_session.query(User).filter(User.email == email).count() == 1

        profile_a = (
            db_session.query(TenantUserProfile)
            .filter_by(tenant_id=21, user_id=user_a["id"])
            .one()
        )
        profile_b = (
            db_session.query(TenantUserProfile)
            .filter_by(tenant_id=22, user_id=user_b["id"])
            .one()
        )
        assert profile_a.position == "Manager A"
        assert profile_b.position == "Manager B"
        assert profile_a.avatar_url != profile_b.avatar_url

        company_a_users = list_tenant_users(db_session, 21)
        company_b_users = list_tenant_users(db_session, 22)
        assert any(item["email"] == email and item["position"] == "Manager A" for item in company_a_users)
        assert any(item["email"] == email and item["position"] == "Manager B" for item in company_b_users)
    finally:
        _cleanup_created_users(db_session, [email])


def test_duplicate_active_membership_conflict(db_session):
    email = "duplicate@company-a.test"
    try:
        create_tenant_user(
            db_session,
            tenant_id=21,
            payload={"email": email, "full_name": "Dup", "role_id": 3},
        )
        with pytest.raises(HTTPException) as exc:
            create_tenant_user(
                db_session,
                tenant_id=21,
                payload={"email": email, "full_name": "Dup", "role_id": 3},
            )
        assert exc.value.status_code == 409
        assert exc.value.detail["code"] == "membership_active"
    finally:
        _cleanup_created_users(db_session, [email])


def test_dismissed_user_restore_flow(db_session):
    email = "restore@company-a.test"
    try:
        created, _ = create_tenant_user(
            db_session,
            tenant_id=21,
            payload={"email": email, "full_name": "Restore Me", "role_id": 3},
        )
        dismiss_tenant_user(
            db_session,
            tenant_id=21,
            user_id=created["id"],
            current_user=db_session.query(User).filter_by(id=100).one(),
        )

        lookup = lookup_tenant_user_email(db_session, tenant_id=21, email=email)
        assert lookup["outcome"] == LOOKUP_OUTCOME_DISMISSED

        with pytest.raises(HTTPException) as exc:
            create_tenant_user(
                db_session,
                tenant_id=21,
                payload={"email": email, "full_name": "Restore Me", "role_id": 3},
            )
        assert exc.value.detail["code"] == "membership_dismissed"

        restored = restore_tenant_user(
            db_session,
            tenant_id=21,
            user_id=created["id"],
            role_id=3,
        )
        assert restored["membership_status"] == MEMBERSHIP_STATUS_ACTIVE
        assert db_session.query(TenantUserProfile).filter_by(tenant_id=21, user_id=created["id"]).count() == 1
    finally:
        _cleanup_created_users(db_session, [email])


def test_dismiss_from_company_a_keeps_company_b_active(db_session):
    email = "multi@mail.ru"
    try:
        created, _ = create_tenant_user(
            db_session,
            tenant_id=21,
            payload={"email": email, "full_name": "Multi", "role_id": 3},
        )
        create_tenant_user(
            db_session,
            tenant_id=22,
            payload={"email": email, "full_name": "Multi B", "role_id": 3},
        )

        dismiss_tenant_user(
            db_session,
            tenant_id=21,
            user_id=created["id"],
            current_user=db_session.query(User).filter_by(id=100).one(),
        )

        membership_a = (
            db_session.query(TenantUserMembership)
            .filter_by(tenant_id=21, user_id=created["id"])
            .one()
        )
        membership_b = (
            db_session.query(TenantUserMembership)
            .filter_by(tenant_id=22, user_id=created["id"])
            .one()
        )
        assert membership_a.membership_status == MEMBERSHIP_STATUS_DISMISSED
        assert membership_b.membership_status == MEMBERSHIP_STATUS_ACTIVE
        assert email in [item["email"] for item in list_tenant_users(db_session, 22)]
        assert email not in [item["email"] for item in list_tenant_users(db_session, 21)]
    finally:
        _cleanup_created_users(db_session, [email])


def test_lookup_existing_user_only_exposes_email(db_session):
    email = "ivan@mail.ru"
    try:
        create_tenant_user(
            db_session,
            tenant_id=21,
            payload={
                "email": email,
                "full_name": "Secret Name",
                "role_id": 3,
                "avatar_url": "https://example.com/secret.png",
            },
        )
        lookup = lookup_tenant_user_email(db_session, tenant_id=22, email=email)
        assert lookup["outcome"] == LOOKUP_OUTCOME_FOUND_EXISTING
        assert lookup["email"] == email
        assert "avatar_url" not in lookup
        assert "full_name" not in lookup
        assert "position" not in lookup
    finally:
        _cleanup_created_users(db_session, [email])
