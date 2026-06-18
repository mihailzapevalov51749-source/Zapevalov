"""Publication Guard — company constructor must work on CLIENT tenants."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_direct_module_config_write,
    assert_tenant_allows_direct_structure_write,
    assert_tenant_allows_publish_source,
)
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN, TENANT_USER
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.users.models import Role, User
from tests.support.committed_test_registry import (
    commit_test_data,
    purge_publication_test_pattern_leaks,
    purge_registered_test_data,
    register_committed_test_data,
)


@pytest.fixture(autouse=True)
def _cleanup_committed_company_constructor_data() -> None:
    yield
    purge_registered_test_data()
    purge_publication_test_pattern_leaks()


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


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


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_typed_portal(db: Session, *, tenant_type: TenantType) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"PubGuard CompanyCtor {tenant_type.value} {suffix}",
        code=f"pub-guard-company-ctor-{tenant_type.value.lower()}-{suffix}",
        tenant_type=tenant_type.value,
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
    email_prefix: str = "company_ctor",
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"{email_prefix}_{role_name}_{_suffix()}@test.local",
        full_name=f"Company Constructor {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


class TestCompanyConstructorPolicy:
    def test_client_structure_write_allowed(self, db: Session) -> None:
        client_portal = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
        assert_tenant_allows_direct_structure_write(
            db,
            client_portal.id,
            "company_constructor",
        )

    def test_template_structure_write_still_forbidden(self, db: Session) -> None:
        template = _create_typed_portal(db, tenant_type=TenantType.TEMPLATE)
        with pytest.raises(TenantWriteForbiddenError):
            assert_tenant_allows_direct_structure_write(db, template.id, "template_direct")

    def test_client_module_config_write_still_forbidden(self, db: Session) -> None:
        client_portal = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
        with pytest.raises(TenantWriteForbiddenError):
            assert_tenant_allows_direct_module_config_write(
                db,
                client_portal.id,
                "module_config_write",
            )

    def test_client_cannot_be_publish_source(self, db: Session) -> None:
        client_portal = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
        with pytest.raises(TenantWriteForbiddenError):
            assert_tenant_allows_publish_source(db, client_portal.id)


class TestCompanyConstructorApi:
    def test_client_superadmin_can_create_user(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
        superadmin = _create_user(
            db,
            role_name=TENANT_USER,
            tenant_id=None,
            email_prefix="client_superadmin",
        )
        upsert_active_membership(
            db,
            tenant_id=company.id,
            user_id=superadmin.id,
            role_key=TENANT_SUPERADMIN,
        )
        commit_test_data(db, portal_ids=[company.id], user_ids=[superadmin.id])

        response = client.post(
            f"/designer/tenants/{company.id}/administration/users",
            headers=_auth_headers(superadmin),
            json={
                "email": f"new_user_{_suffix()}@test.local",
                "full_name": "Новый пользователь",
                "role_id": superadmin.role_id,
            },
        )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body.get("email", "").endswith("@test.local")
        created_user_id = body.get("id")
        if created_user_id is not None:
            register_committed_test_data(user_ids=[int(created_user_id)])

    def test_client_can_create_object_type(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
        designer = _create_user(db, role_name="admin", tenant_id=company.id)
        upsert_active_membership(
            db,
            tenant_id=company.id,
            user_id=designer.id,
            role_key=TENANT_SUPERADMIN,
        )
        commit_test_data(db, portal_ids=[company.id], user_ids=[designer.id])

        object_key = f"test_obj_{_suffix()}"
        response = client.post(
            f"/designer/tenants/{company.id}/object-types",
            headers=_auth_headers(designer),
            json={
                "key": object_key,
                "name": "Тестовый объект",
                "description": "company constructor smoke",
            },
        )

        assert response.status_code == 201, response.text
        body = response.json()
        assert body.get("key") == object_key
