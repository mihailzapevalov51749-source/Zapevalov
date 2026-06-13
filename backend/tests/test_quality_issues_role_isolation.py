"""HTTP integration tests for Quality Issues API role isolation."""

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
from app.modules.portals.models import Portal
from app.modules.quality_issues.constants import QualityIssueStatus
from app.modules.quality_issues.models import QualityIssue
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


def _ensure_portal(db: Session, portal_id: int = 1) -> None:
    existing = db.query(Portal).filter(Portal.id == portal_id).first()
    if existing is None:
        db.add(
            Portal(
                id=portal_id,
                name=f"Quality Issues ISO {_suffix()}",
                code=f"quality_iso_{portal_id}_{_suffix()}",
            )
        )
        db.flush()


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
    email_prefix: str = "quality_iso",
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"{email_prefix}_{role_name}_{_suffix()}@test.local",
        full_name=f"Quality ISO {role_name}",
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


def _resolve_platform_owner(db: Session) -> User | None:
    row = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if row is None or row.platform_owner_user_id is None:
        return None
    return db.query(User).filter(User.id == row.platform_owner_user_id).first()


def _seed_quality_issue(db: Session, *, title: str = "Secret platform issue") -> QualityIssue:
    issue = QualityIssue(
        title=title,
        area="other",
        detected_place="Studio",
        priority="medium",
        status=QualityIssueStatus.NEW.value,
    )
    db.add(issue)
    db.flush()
    return issue


def _issue_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": f"Issue {_suffix()}",
        "area": "other",
        "detected_place": "Studio",
        "priority": "medium",
        "status": "new",
    }
    payload.update(overrides)
    return payload


class TestQualityIssuesRoleIsolation:
    def test_tenant_user_blocked_from_list(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_user = _create_user(db, role_name="user", tenant_id=1)
        _seed_quality_issue(db)
        db.commit()

        response = client.get("/quality-issues", headers=_auth_headers(tenant_user))

        assert response.status_code == 403

    def test_tenant_admin_blocked_from_read(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_admin = _create_user(db, role_name="admin", tenant_id=1)
        issue = _seed_quality_issue(db)
        db.commit()

        response = client.get(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(tenant_admin),
        )

        assert response.status_code == 403

    def test_platform_designer_allowed_read_and_list(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        designer = _create_user(db, role_name="platform_designer", tenant_id=None)
        issue = _seed_quality_issue(db, title="Designer visible")
        db.commit()

        list_response = client.get("/quality-issues", headers=_auth_headers(designer))
        assert list_response.status_code == 200
        assert any(row["id"] == issue.id for row in list_response.json())

        read_response = client.get(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(designer),
        )
        assert read_response.status_code == 200
        assert read_response.json()["title"] == "Designer visible"

    def test_platform_admin_allowed_crud(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        create_response = client.post(
            "/quality-issues",
            headers=_auth_headers(admin),
            json=_issue_payload(title="Admin created"),
        )
        assert create_response.status_code == 201
        issue_id = create_response.json()["id"]

        patch_response = client.patch(
            f"/quality-issues/{issue_id}",
            headers=_auth_headers(admin),
            json={"title": "Admin updated", "status": "closed"},
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["title"] == "Admin updated"
        assert patch_response.json()["status"] == "closed"

        history_response = client.get(
            f"/quality-issues/{issue_id}/status-history",
            headers=_auth_headers(admin),
        )
        assert history_response.status_code == 200

        delete_response = client.delete(
            f"/quality-issues/{issue_id}",
            headers=_auth_headers(admin),
        )
        assert delete_response.status_code == 204

    def test_platform_owner_allowed_when_configured(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        owner = _resolve_platform_owner(db)
        if owner is None:
            pytest.skip("platform owner is not configured in platform_settings")

        issue = _seed_quality_issue(db, title="Owner visible")
        db.commit()

        response = client.get(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(owner),
        )

        assert response.status_code == 200

    def test_tenant_user_blocked_from_create_update_delete(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_user = _create_user(db, role_name="user", tenant_id=1)
        issue = _seed_quality_issue(db)
        db.commit()

        create_response = client.post(
            "/quality-issues",
            headers=_auth_headers(tenant_user),
            json=_issue_payload(),
        )
        assert create_response.status_code == 403

        patch_response = client.patch(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(tenant_user),
            json={"title": "blocked"},
        )
        assert patch_response.status_code == 403

        delete_response = client.delete(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(tenant_user),
        )
        assert delete_response.status_code == 403

    def test_tenant_user_blocked_from_workflow(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_user = _create_user(db, role_name="user", tenant_id=1)
        issue = _seed_quality_issue(db)
        db.commit()

        prepare_response = client.post(
            f"/quality-issues/{issue.id}/prepare-fix",
            headers=_auth_headers(tenant_user),
        )
        assert prepare_response.status_code == 403

        approve_response = client.post(
            f"/quality-issues/{issue.id}/approve-fix",
            headers=_auth_headers(tenant_user),
        )
        assert approve_response.status_code == 403

        close_response = client.patch(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(tenant_user),
            json={"status": "closed"},
        )
        assert close_response.status_code == 403

        reopen_response = client.patch(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(tenant_user),
            json={"status": "new"},
        )
        assert reopen_response.status_code == 403

    def test_platform_designer_allowed_workflow(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        designer = _create_user(db, role_name="platform_designer", tenant_id=None)
        issue = _seed_quality_issue(db, title="Workflow issue")
        db.commit()

        prepare_response = client.post(
            f"/quality-issues/{issue.id}/prepare-fix",
            headers=_auth_headers(designer),
        )
        assert prepare_response.status_code == 200
        assert prepare_response.json()["ai_fix_status"] == "plan_ready"

        approve_response = client.post(
            f"/quality-issues/{issue.id}/approve-fix",
            headers=_auth_headers(designer),
        )
        assert approve_response.status_code == 200
        assert approve_response.json()["ai_fix_status"] == "approved"
        assert approve_response.json()["status"] == "in_progress"

        close_response = client.patch(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(designer),
            json={"status": "closed"},
        )
        assert close_response.status_code == 200
        assert close_response.json()["status"] == "closed"

        reopen_response = client.patch(
            f"/quality-issues/{issue.id}",
            headers=_auth_headers(designer),
            json={"status": "new"},
        )
        assert reopen_response.status_code == 200
        assert reopen_response.json()["status"] == "new"
