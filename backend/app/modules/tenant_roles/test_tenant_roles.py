"""Tests for tenant role and company owner model."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.portals.models import Portal
from app.modules.tenant_roles.access import (
    can_access_designer,
    can_access_tenant_administration,
    can_manage_tenant_users,
    is_company_owner,
    user_can_access_designer,
    user_can_access_tenant_administration,
    user_can_manage_tenant_users,
    user_can_manage_tenant_users_in_tenant,
)
from app.modules.tenant_roles.owner_service import transfer_company_ownership
from app.modules.tenant_users.membership_service import upsert_active_membership
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
            Role(id=1, name="superadmin", description="Суперадминистратор"),
            Role(id=2, name="admin", description="Администратор"),
            Role(id=3, name="user", description="Пользователь"),
            Portal(id=10, name="Tenant A", code="tenant_a"),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _make_user(db_session, *, role_name: str, is_owner: bool = False) -> User:
    role_id = {"superadmin": 1, "admin": 2, "user": 3}[role_name]
    user = User(
        email=f"{role_name}-{is_owner}@example.com",
        full_name=f"User {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=10,
        role_id=role_id,
        is_company_owner=is_owner,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_tenant_superadmin_has_designer_and_administration_access(db_session):
    user = _make_user(db_session, role_name="superadmin", is_owner=True)

    assert can_access_designer(user) is True
    assert can_access_tenant_administration(user) is True
    assert can_manage_tenant_users(user) is True
    assert is_company_owner(user) is True


def test_tenant_admin_has_designer_but_not_administration_access(db_session):
    user = _make_user(db_session, role_name="admin")

    assert can_access_designer(user) is True
    assert can_access_tenant_administration(user) is False
    assert can_manage_tenant_users(user) is False


def test_tenant_user_has_no_designer_or_administration_access(db_session):
    user = _make_user(db_session, role_name="user")

    assert can_access_designer(user) is False
    assert can_access_tenant_administration(user) is False
    assert can_manage_tenant_users(user) is False


def test_global_user_with_superadmin_membership_has_designer_access(db_session):
    user = User(
        email="global-superadmin@example.com",
        full_name="Global Superadmin",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
        role_id=3,
        is_company_owner=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key="superadmin",
    )
    db_session.commit()

    assert can_access_designer(user) is False
    assert user_can_access_designer(db_session, user) is True
    assert user_can_access_tenant_administration(db_session, user) is True
    assert user_can_manage_tenant_users(db_session, user) is True
    assert user_can_manage_tenant_users_in_tenant(db_session, user, 10) is True


def test_global_superadmin_on_other_tenant_cannot_manage_users(db_session):
    user = User(
        email="global-superadmin-other@example.com",
        full_name="Global Superadmin Other",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
        role_id=3,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key="superadmin",
    )
    db_session.commit()

    assert user_can_manage_tenant_users_in_tenant(db_session, user, 10) is True
    assert user_can_manage_tenant_users_in_tenant(db_session, user, 99) is False


def test_global_user_with_user_membership_has_no_designer_access(db_session):
    user = User(
        email="global-user@example.com",
        full_name="Global User",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
        role_id=3,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key="user",
    )
    db_session.commit()

    assert user_can_access_designer(db_session, user) is False
    assert user_can_access_tenant_administration(db_session, user) is False


def test_transfer_company_ownership_keeps_single_owner(db_session):
    old_owner = _make_user(db_session, role_name="superadmin", is_owner=True)
    new_owner = _make_user(db_session, role_name="superadmin", is_owner=False)

    transfer_company_ownership(
        db_session,
        tenant_id=10,
        new_owner_user_id=new_owner.id,
        commit=True,
    )

    db_session.refresh(old_owner)
    db_session.refresh(new_owner)

    assert old_owner.is_company_owner is False
    assert new_owner.is_company_owner is True


def test_transfer_company_ownership_rejects_foreign_user(db_session):
    foreign_user = User(
        email="foreign@example.com",
        full_name="Foreign",
        hashed_password="hash",
        is_active=True,
        tenant_id=99,
        role_id=1,
    )
    db_session.add(foreign_user)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        transfer_company_ownership(
            db_session,
            tenant_id=10,
            new_owner_user_id=foreign_user.id,
            commit=False,
        )

    assert exc.value.status_code == 404
