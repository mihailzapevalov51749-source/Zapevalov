"""API access tests for tenant administration users list."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN, TENANT_USER
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import Role, User


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_company(db: Session) -> Portal:
    portal = Portal(
        name=f"ООО Тест {_suffix()}",
        code=f"company_{_suffix()}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _create_user(
    db: Session,
    *,
    role_name: str,
    tenant_id: int | None = None,
    email_prefix: str = "tenant_users_api",
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"{email_prefix}_{role_name}_{_suffix()}@example.com",
        full_name=f"Tenant User {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
        is_company_owner=False,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


class TestTenantUsersApiAccess:
    def test_membership_superadmin_can_list_own_tenant_users(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        global_superadmin = _create_user(
            db,
            role_name=TENANT_USER,
            tenant_id=None,
            email_prefix="membership_superadmin",
        )
        upsert_active_membership(
            db,
            tenant_id=company.id,
            user_id=global_superadmin.id,
            role_key=TENANT_SUPERADMIN,
        )
        db.commit()

        response = client.get(
            f"/designer/tenants/{company.id}/administration/users",
            headers=_auth_headers(global_superadmin),
        )

        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        emails = [item["email"] for item in body]
        assert global_superadmin.email in emails
        matched = next(item for item in body if item["email"] == global_superadmin.email)
        assert matched["role"] == TENANT_SUPERADMIN
        assert matched["membership_status"] == "active"

    def test_membership_superadmin_cannot_list_other_tenant_users(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        assigned_company = _create_company(db)
        other_company = _create_company(db)
        global_superadmin = _create_user(
            db,
            role_name=TENANT_USER,
            tenant_id=None,
            email_prefix="scoped_superadmin_users",
        )
        upsert_active_membership(
            db,
            tenant_id=assigned_company.id,
            user_id=global_superadmin.id,
            role_key=TENANT_SUPERADMIN,
        )
        db.commit()

        response = client.get(
            f"/designer/tenants/{other_company.id}/administration/users",
            headers=_auth_headers(global_superadmin),
        )

        assert response.status_code == 403

    def test_membership_user_cannot_list_tenant_users(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        member = _create_user(
            db,
            role_name=TENANT_USER,
            tenant_id=None,
            email_prefix="tenant_member_users",
        )
        upsert_active_membership(
            db,
            tenant_id=company.id,
            user_id=member.id,
            role_key=TENANT_USER,
        )
        db.commit()

        response = client.get(
            f"/designer/tenants/{company.id}/administration/users",
            headers=_auth_headers(member),
        )

        assert response.status_code == 403
