"""Platform owner recovery and membership-based tenant access regression tests."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token, hash_password
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.recover_owner_service import recover_platform_owner
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_management.tenant_user_purge_guards import delete_or_detach_tenant_scoped_users
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN
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
        is_protected=False,
    )
    db.add(portal)
    db.flush()
    return portal


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _configure_platform_owner_settings(db: Session, *, email: str, user: User | None = None) -> None:
    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    assert row is not None
    row.platform_owner_email = email
    row.platform_owner_full_name = "Михаил Запевалов"
    row.platform_owner_phone = "89959987006"
    row.platform_owner_user_id = user.id if user is not None else None
    db.flush()


class TestPlatformOwnerRecovery:
    def test_recover_platform_owner_creates_global_user(self, db: Session) -> None:
        email = f"owner_recover_{_suffix()}@example.com"
        _configure_platform_owner_settings(db, email=email)

        result = recover_platform_owner(
            db,
            temporary_password="RecoveryPass123!",
            commit=False,
        )
        db.flush()

        user = db.query(User).filter(User.email.ilike(email)).one()
        row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
        assert result.created is True
        assert user.tenant_id is None
        assert row is not None
        assert row.platform_owner_user_id == user.id
        assert db.query(PlatformUser).filter(PlatformUser.user_id == user.id).count() == 1


class TestMembershipBasedTenantAccess:
    def test_invite_existing_global_user_keeps_tenant_id_null(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        role = _ensure_role(db, "admin")
        global_user = User(
            email=f"global_admin_{_suffix()}@example.com",
            full_name="Global Admin",
            hashed_password="hash",
            is_active=True,
            tenant_id=None,
            role_id=role.id,
        )
        db.add(global_user)
        platform_admin = User(
            email=f"platform_admin_{_suffix()}@example.com",
            full_name="Platform Admin",
            hashed_password="hash",
            is_active=True,
            tenant_id=None,
            role_id=role.id,
        )
        db.add(platform_admin)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": global_user.full_name,
                "email": global_user.email,
            },
        )

        assert response.status_code == 201
        db.refresh(global_user)
        assert global_user.tenant_id is None
        membership = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=global_user.id)
            .one()
        )
        assert membership.role_key == TENANT_SUPERADMIN
        assert (
            db.query(TenantUserProfile)
            .filter_by(tenant_id=company.id, user_id=global_user.id)
            .one_or_none()
            is not None
        )

    def test_invite_new_email_creates_global_user_with_membership(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        role = _ensure_role(db, "admin")
        platform_admin = User(
            email=f"platform_admin_{_suffix()}@example.com",
            full_name="Platform Admin",
            hashed_password="hash",
            is_active=True,
            tenant_id=None,
            role_id=role.id,
        )
        db.add(platform_admin)
        invite_email = f"new_company_admin_{_suffix()}@example.com"
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": "Новый Админ",
                "email": invite_email,
            },
        )

        assert response.status_code == 201
        created = db.query(User).filter(User.email == invite_email).one()
        assert created.tenant_id is None
        assert (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=created.id)
            .one()
            .role_key
            == TENANT_SUPERADMIN
        )


class TestPurgeProtectsPlatformOwner:
    def test_protected_owner_with_legacy_tenant_id_is_detached_not_deleted(
        self,
        db: Session,
    ) -> None:
        company = _create_company(db)
        email = f"protected_owner_{_suffix()}@example.com"
        superadmin = _ensure_role(db, TENANT_SUPERADMIN)
        owner = User(
            email=email,
            full_name="Protected Owner",
            hashed_password=hash_password("ProtectedOwner123!"),
            is_active=True,
            tenant_id=company.id,
            role_id=superadmin.id,
            is_company_owner=True,
        )
        db.add(owner)
        db.flush()
        _configure_platform_owner_settings(db, email=email, user=owner)

        disposable = User(
            email=f"disposable_{_suffix()}@example.com",
            full_name="Disposable",
            hashed_password="hash",
            is_active=True,
            tenant_id=company.id,
            role_id=superadmin.id,
        )
        db.add(disposable)
        db.flush()
        db.commit()

        deleted, detached = delete_or_detach_tenant_scoped_users(db, company.id)
        db.commit()

        assert deleted == 1
        assert detached == 1
        assert db.get(User, owner.id) is not None
        db.refresh(owner)
        assert owner.tenant_id is None
        assert db.get(User, disposable.id) is None

    def test_global_owner_with_membership_survives_membership_purge(
        self,
        db: Session,
    ) -> None:
        company = _create_company(db)
        email = f"global_owner_{_suffix()}@example.com"
        superadmin = _ensure_role(db, TENANT_SUPERADMIN)
        owner = User(
            email=email,
            full_name="Global Owner",
            hashed_password=hash_password("GlobalOwner123!"),
            is_active=True,
            tenant_id=None,
            role_id=superadmin.id,
            is_company_owner=True,
        )
        db.add(owner)
        db.flush()
        _configure_platform_owner_settings(db, email=email, user=owner)
        db.add(
            TenantUserMembership(
                tenant_id=company.id,
                user_id=owner.id,
                role_key=TENANT_SUPERADMIN,
                is_active=True,
            )
        )
        db.commit()

        db.query(TenantUserMembership).filter(
            TenantUserMembership.tenant_id == company.id
        ).delete(synchronize_session=False)
        delete_or_detach_tenant_scoped_users(db, company.id)
        db.commit()

        row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
        refreshed = db.get(User, owner.id)
        assert refreshed is not None
        assert refreshed.email == email
        assert row is not None
        assert row.platform_owner_user_id == owner.id


class TestAntiPatternGuard:
    def test_company_administrator_service_has_no_tenant_id_assignment(self) -> None:
        from pathlib import Path

        source = (
            Path(__file__).resolve().parents[1]
            / "app/modules/control_plane/company_administrator/service.py"
        ).read_text(encoding="utf-8")
        assert "user.tenant_id = tenant_id" not in source
