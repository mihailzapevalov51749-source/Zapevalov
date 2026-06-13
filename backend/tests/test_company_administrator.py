"""Security and behavior tests for company administrator change API."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN
from app.modules.tenant_users.models import TenantUserMembership
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


def _create_user(
    db: Session,
    *,
    role_name: str,
    tenant_id: int | None = None,
    email_prefix: str = "company_admin",
    is_company_owner: bool = False,
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"{email_prefix}_{role_name}_{_suffix()}@test.local",
        full_name=f"Company Admin {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
        is_company_owner=is_company_owner,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _resolve_platform_owner(db: Session) -> User | None:
    row = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if row is None or row.platform_owner_user_id is None:
        return None
    return db.query(User).filter(User.id == row.platform_owner_user_id).first()


def _create_company(db: Session, *, portal_id: int | None = None) -> Portal:
    portal = Portal(
        name=f"ООО Тест {_suffix()}",
        code=f"company_{_suffix()}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    if portal_id is not None:
        portal.id = portal_id
    db.add(portal)
    db.flush()
    return portal


def _add_membership(db: Session, *, tenant_id: int, user_id: int, role_key: str) -> None:
    db.add(
        TenantUserMembership(
            tenant_id=tenant_id,
            user_id=user_id,
            role_key=role_key,
            is_active=True,
        )
    )
    db.flush()


class TestCompanyAdministratorAccess:
    def test_tenant_user_blocked_from_list_users(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        tenant_user = _create_user(db, role_name="user", tenant_id=company.id)
        db.commit()

        response = client.get(
            f"/control-plane/tenants/{company.id}/users",
            headers=_auth_headers(tenant_user),
        )

        assert response.status_code == 403

    def test_tenant_admin_blocked_from_change(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        tenant_admin = _create_user(db, role_name="admin", tenant_id=company.id)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/change",
            headers=_auth_headers(tenant_admin),
            json={"user_id": tenant_admin.id},
        )

        assert response.status_code == 403

    def test_platform_admin_allowed_change(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        old_owner = _create_user(
            db,
            role_name="superadmin",
            tenant_id=company.id,
            is_company_owner=True,
        )
        candidate = _create_user(db, role_name="admin", tenant_id=company.id)
        _add_membership(db, tenant_id=company.id, user_id=old_owner.id, role_key="superadmin")
        _add_membership(db, tenant_id=company.id, user_id=candidate.id, role_key="admin")
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/change",
            headers=_auth_headers(platform_admin),
            json={"user_id": candidate.id},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["company_superadmin"]["user_id"] == candidate.id

        db.refresh(old_owner)
        db.refresh(candidate)
        assert old_owner.is_company_owner is False
        assert candidate.is_company_owner is True
        assert candidate.role.name == TENANT_SUPERADMIN

    def test_platform_owner_allowed_invite(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        owner = _resolve_platform_owner(db)
        if owner is None:
            pytest.skip("platform owner is not configured in platform_settings")

        company = _create_company(db)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(owner),
            json={
                "full_name": "Иван Иванов",
                "email": f"invite_{_suffix()}@example.com",
                "phone": "+79990001122",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["company_superadmin"]["full_name"] == "Иван Иванов"
        assert body["company_superadmin"]["email"].startswith("invite_")

    def test_cannot_choose_user_from_another_tenant(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        other_company = _create_company(db)
        _create_user(
            db,
            role_name="superadmin",
            tenant_id=company.id,
            is_company_owner=True,
        )
        foreign_user = _create_user(db, role_name="admin", tenant_id=other_company.id)
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/change",
            headers=_auth_headers(platform_admin),
            json={"user_id": foreign_user.id},
        )

        assert response.status_code == 404

    def test_invite_invalid_email_rejected(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={"full_name": "Иван Иванов", "email": "not-an-email"},
        )

        assert response.status_code == 422

    def test_change_creates_event_journal_entry(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        old_owner = _create_user(
            db,
            role_name="superadmin",
            tenant_id=company.id,
            is_company_owner=True,
        )
        candidate = _create_user(db, role_name="user", tenant_id=company.id)
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/change",
            headers=_auth_headers(platform_admin),
            json={"user_id": candidate.id},
        )

        assert response.status_code == 200

        entry = (
            db.query(PlatformEventJournalEntry)
            .filter(PlatformEventJournalEntry.event_type == "company_administrator_changed")
            .order_by(PlatformEventJournalEntry.id.desc())
            .first()
        )
        assert entry is not None
        assert entry.company_id == company.id
        assert entry.metadata_json.get("new_admin_user_id") == candidate.id

    def test_invite_when_users_exist_rejected(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        _create_user(db, role_name="user", tenant_id=company.id)
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": "Иван Иванов",
                "email": f"blocked_{_suffix()}@example.com",
            },
        )

        assert response.status_code == 409
