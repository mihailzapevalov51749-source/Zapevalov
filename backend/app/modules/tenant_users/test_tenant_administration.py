"""Tests for tenant-scoped user administration."""

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
    list_tenant_users,
)
from app.modules.tenant_users.models import TenantUserMembership
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
            Role(id=99, name="platform_designer", description="platform"),
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
                id=200,
                email="platform@yasnopro.test",
                full_name="Platform User",
                hashed_password="hash",
                is_active=True,
                tenant_id=None,
                role_id=99,
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


def test_list_tenant_users_returns_only_current_tenant(db_session):
    users = list_tenant_users(db_session, 21)

    assert len(users) == 1
    assert users[0].email == "owner@company-a.test"


def test_create_tenant_user_assigns_tenant_scope(db_session):
    user, _ = create_tenant_user(
        db_session,
        tenant_id=21,
        payload={
            "email": "employee@company-a.test",
            "full_name": "Employee A",
            "role_id": 3,
            "is_active": True,
        },
    )

    assert user.tenant_id == 21
    assert user.role.name == TENANT_USER
    assert user.is_company_owner is False

    membership = (
        db_session.query(TenantUserMembership)
        .filter_by(tenant_id=21, user_id=user.id)
        .one()
    )
    assert membership.role_key == TENANT_USER


def test_create_tenant_user_rejects_platform_role(db_session):
    with pytest.raises(HTTPException) as exc:
        create_tenant_user(
            db_session,
            tenant_id=21,
            payload={
                "email": "bad@company-a.test",
                "full_name": "Bad Role",
                "role_id": 99,
            },
        )

    assert exc.value.status_code == 400
