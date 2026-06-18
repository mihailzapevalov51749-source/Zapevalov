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
        email=f"{email_prefix}_{role_name}_{_suffix()}@example.com",
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
        candidate = _create_user(db, role_name="admin", tenant_id=None)
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
        assert candidate.is_company_owner is False
        assert candidate.tenant_id is None
        membership = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=candidate.id)
            .one()
        )
        assert membership.role_key == TENANT_SUPERADMIN
        assert membership.is_active is True
        assert membership.membership_status == "active"

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

    def test_invite_existing_global_user_creates_membership_without_new_user(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        existing_user = _create_user(
            db,
            role_name="admin",
            tenant_id=None,
            email_prefix="existing_global_admin",
        )
        users_before = (
            db.query(User)
            .filter(User.email == existing_user.email)
            .count()
        )
        memberships_before = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=existing_user.id)
            .count()
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": existing_user.full_name,
                "email": existing_user.email,
                "phone": "+79990001122",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["company_superadmin"]["user_id"] == existing_user.id
        assert body["company_superadmin"]["email"] == existing_user.email
        assert body["invitation_sent"] is False

        db.refresh(existing_user)
        assert (
            db.query(User)
            .filter(User.email == existing_user.email)
            .count()
            == users_before
        )
        assert (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=existing_user.id)
            .count()
            == memberships_before + 1
        )
        assert existing_user.tenant_id is None
        assert existing_user.is_company_owner is False

        membership = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=existing_user.id)
            .one()
        )
        assert membership.role_key == TENANT_SUPERADMIN
        assert membership.is_active is True

        profile = (
            db.query(TenantUserProfile)
            .filter_by(tenant_id=company.id, user_id=existing_user.id)
            .one_or_none()
        )
        assert profile is not None

    def test_invite_existing_platform_owner_as_company_admin(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        owner = _resolve_platform_owner(db)
        if owner is None:
            pytest.skip("platform owner is not configured in platform_settings")

        company = _create_company(db)
        users_before = (
            db.query(User)
            .filter(User.email == owner.email)
            .count()
        )
        db.commit()

        try:
            response = client.post(
                f"/control-plane/tenants/{company.id}/administrator/invite",
                headers=_auth_headers(owner),
                json={
                    "full_name": owner.full_name or "Platform Owner",
                    "email": owner.email,
                },
            )

            assert response.status_code == 201
            body = response.json()
            assert body["company_superadmin"]["user_id"] == owner.id
            assert (
                db.query(User)
                .filter(User.email == owner.email)
                .count()
                == users_before
            )

            db.refresh(owner)
            assert owner.tenant_id is None
            assert owner.is_company_owner is False
            membership = (
                db.query(TenantUserMembership)
                .filter_by(tenant_id=company.id, user_id=owner.id)
                .one_or_none()
            )
            assert membership is not None
            assert membership.role_key == TENANT_SUPERADMIN
        finally:
            guard = SessionLocal()
            try:
                from app.modules.tenant_management.demo_tenant_inventory import (
                    cleanup_test_tenant_leaks,
                )

                cleanup_test_tenant_leaks(guard)
            finally:
                guard.close()

    def test_invite_existing_member_rejected(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        member = _create_user(db, role_name="user", tenant_id=company.id)
        _add_membership(db, tenant_id=company.id, user_id=member.id, role_key="user")
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": member.full_name,
                "email": member.email,
            },
        )

        assert response.status_code == 409
        assert response.json()["detail"] == "В компании уже есть пользователи. Выберите существующего пользователя."

    def test_invite_existing_global_user_already_admin_rejected(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        owner = _create_user(
            db,
            role_name="superadmin",
            tenant_id=company.id,
            is_company_owner=True,
        )
        _add_membership(db, tenant_id=company.id, user_id=owner.id, role_key="superadmin")
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": owner.full_name,
                "email": owner.email,
            },
        )

        assert response.status_code == 409
        assert "уже" in str(response.json()["detail"]).lower()

    def test_invite_new_email_creates_user_membership_and_profile(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        invite_email = f"new_admin_{_suffix()}@example.com"
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": "Новый Администратор",
                "email": invite_email,
            },
        )

        assert response.status_code == 201

        created_user = db.query(User).filter(User.email == invite_email).one()
        assert created_user.tenant_id is None
        assert created_user.is_company_owner is False
        membership = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=created_user.id)
            .one_or_none()
        )
        assert membership is not None
        assert membership.role_key == TENANT_SUPERADMIN
        assert (
            db.query(TenantUserProfile)
            .filter_by(tenant_id=company.id, user_id=created_user.id)
            .one_or_none()
            is not None
        )

    def test_invite_existing_user_does_not_change_other_tenant_memberships(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        dev_company = _create_company(db)
        target_company = _create_company(db)
        existing_user = _create_user(
            db,
            role_name="user",
            tenant_id=dev_company.id,
            email_prefix="dev_member",
        )
        _add_membership(
            db,
            tenant_id=dev_company.id,
            user_id=existing_user.id,
            role_key="user",
        )
        dev_memberships_before = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=dev_company.id, user_id=existing_user.id)
            .count()
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            f"/control-plane/tenants/{target_company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": existing_user.full_name,
                "email": existing_user.email,
            },
        )

        assert response.status_code == 201
        dev_memberships_after = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=dev_company.id, user_id=existing_user.id)
            .count()
        )
        assert dev_memberships_after == dev_memberships_before == 1


class TestTenantScopedSuperadminAccess:
    def test_platform_owner_assigns_superadmin_membership_and_profile(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        global_user = _create_user(
            db,
            role_name="user",
            tenant_id=None,
            email_prefix="tenant_superadmin",
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
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
        body = response.json()
        assert body["company_superadmin"]["role"] == TENANT_SUPERADMIN
        assert body["company_superadmin"]["role_label"] == "Superadmin"

        membership = (
            db.query(TenantUserMembership)
            .filter_by(tenant_id=company.id, user_id=global_user.id)
            .one()
        )
        assert membership.role_key == TENANT_SUPERADMIN
        assert membership.membership_status == "active"
        assert membership.is_active is True
        assert (
            db.query(TenantUserProfile)
            .filter_by(tenant_id=company.id, user_id=global_user.id)
            .one_or_none()
            is not None
        )

    def test_assigned_superadmin_can_open_assigned_client_tenant(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        global_user = _create_user(
            db,
            role_name="user",
            tenant_id=None,
            email_prefix="assigned_superadmin",
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        invite_response = client.post(
            f"/control-plane/tenants/{company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": global_user.full_name,
                "email": global_user.email,
            },
        )
        assert invite_response.status_code == 201

        access_response = client.get(
            f"/portals/{company.id}",
            headers=_auth_headers(global_user),
        )
        assert access_response.status_code == 200

    def test_assigned_superadmin_cannot_open_other_client_tenant_without_membership(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        assigned_company = _create_company(db)
        other_company = _create_company(db)
        global_user = _create_user(
            db,
            role_name="user",
            tenant_id=None,
            email_prefix="scoped_superadmin",
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        invite_response = client.post(
            f"/control-plane/tenants/{assigned_company.id}/administrator/invite",
            headers=_auth_headers(platform_admin),
            json={
                "full_name": global_user.full_name,
                "email": global_user.email,
            },
        )
        assert invite_response.status_code == 201

        denied_response = client.get(
            f"/portals/{other_company.id}",
            headers=_auth_headers(global_user),
        )
        assert denied_response.status_code == 403

    def test_company_superadmin_read_uses_membership_not_company_owner_flag(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        global_user = _create_user(
            db,
            role_name="user",
            tenant_id=None,
            email_prefix="membership_superadmin",
            is_company_owner=False,
        )
        _add_membership(
            db,
            tenant_id=company.id,
            user_id=global_user.id,
            role_key=TENANT_SUPERADMIN,
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.get(
            f"/portals/{company.id}",
            headers=_auth_headers(platform_admin),
        )
        assert response.status_code == 200
        body = response.json()
        assert body["company_superadmin"]["user_id"] == global_user.id
        assert body["company_superadmin"]["role_label"] == "Superadmin"
        assert body["company_superadmin"]["is_owner"] is False

    def test_assign_superadmin_does_not_overwrite_global_user_tenant_id(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        company = _create_company(db)
        global_user = _create_user(
            db,
            role_name="user",
            tenant_id=None,
            email_prefix="global_scope_preserved",
        )
        platform_admin = _create_user(db, role_name="admin", tenant_id=None)
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
