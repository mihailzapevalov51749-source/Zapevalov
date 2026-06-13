"""HTTP integration tests for Platform Event Journal API role isolation."""

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
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalKind,
    PlatformEventJournalScope,
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.models import Portal
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
                name=f"Journal ISO {_suffix()}",
                code=f"journal_iso_{portal_id}_{_suffix()}",
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
    email_prefix: str = "journal_iso",
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"{email_prefix}_{role_name}_{_suffix()}@test.local",
        full_name=f"Journal ISO {role_name}",
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


def _seed_platform_journal_entry(
    db: Session,
    *,
    title: str = "Secret platform audit event",
) -> PlatformEventJournalEntry:
    entry = PlatformEventJournalEntry(
        slug=f"journal-iso-{_suffix()}",
        title=title,
        description="provisioning audit",
        event_type="company_created",
        scope=PlatformEventJournalScope.PLATFORM.value,
        journal_kind=PlatformEventJournalKind.PLATFORM_AUDIT.value,
        event_category="company",
        status=PlatformEventJournalStatus.DONE.value,
        author="System",
        source=PlatformEventJournalSource.MANUAL.value,
    )
    db.add(entry)
    db.flush()
    return entry


def _entry_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": f"Journal entry {_suffix()}",
        "description": "created via API test",
        "event_type": "architecture",
        "status": "done",
        "slug": f"journal-create-{_suffix()}",
    }
    payload.update(overrides)
    return payload


class TestPlatformEventJournalRoleIsolationRead:
    def test_tenant_user_blocked_from_list(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_user = _create_user(db, role_name="user", tenant_id=1)
        _seed_platform_journal_entry(db)
        db.commit()

        response = client.get(
            "/platform-event-journal/entries",
            headers=_auth_headers(tenant_user),
        )

        assert response.status_code == 403

    def test_tenant_admin_blocked_from_list(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_admin = _create_user(db, role_name="admin", tenant_id=1)
        _seed_platform_journal_entry(db)
        db.commit()

        response = client.get(
            "/platform-event-journal/entries",
            headers=_auth_headers(tenant_admin),
        )

        assert response.status_code == 403

    def test_tenant_scoped_designer_blocked_from_filter_options(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_admin = _create_user(db, role_name="admin", tenant_id=1)
        db.commit()

        response = client.get(
            "/platform-event-journal/filter-options",
            headers=_auth_headers(tenant_admin),
        )

        assert response.status_code == 403

    def test_platform_designer_allowed_read(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        designer = _create_user(db, role_name="platform_designer", tenant_id=None)
        entry = _seed_platform_journal_entry(db, title="Designer visible audit")
        db.commit()

        list_response = client.get(
            "/platform-event-journal/entries",
            headers=_auth_headers(designer),
        )
        assert list_response.status_code == 200
        assert any(row["id"] == entry.id for row in list_response.json()["items"])

        filter_response = client.get(
            "/platform-event-journal/filter-options",
            headers=_auth_headers(designer),
        )
        assert filter_response.status_code == 200
        assert len(filter_response.json()["categories"]) > 0

    def test_platform_admin_allowed_read(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        admin = _create_user(db, role_name="admin", tenant_id=None)
        _seed_platform_journal_entry(db)
        db.commit()

        response = client.get(
            "/platform-event-journal/entries",
            headers=_auth_headers(admin),
        )

        assert response.status_code == 200

    def test_platform_owner_allowed_read_when_configured(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        owner = _resolve_platform_owner(db)
        if owner is None:
            pytest.skip("platform owner is not configured in platform_settings")

        _seed_platform_journal_entry(db, title="Owner visible audit")
        db.commit()

        response = client.get(
            "/platform-event-journal/entries",
            headers=_auth_headers(owner),
        )

        assert response.status_code == 200


class TestPlatformEventJournalRoleIsolationWrite:
    def test_tenant_user_blocked_from_create(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_user = _create_user(db, role_name="user", tenant_id=1)
        db.commit()

        response = client.post(
            "/platform-event-journal/entries",
            headers=_auth_headers(tenant_user),
            json=_entry_payload(),
        )

        assert response.status_code == 403

    def test_tenant_admin_blocked_from_create(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        _ensure_portal(db)
        tenant_admin = _create_user(db, role_name="admin", tenant_id=1)
        db.commit()

        response = client.post(
            "/platform-event-journal/entries",
            headers=_auth_headers(tenant_admin),
            json=_entry_payload(),
        )

        assert response.status_code == 403

    def test_platform_designer_blocked_from_create(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        designer = _create_user(db, role_name="platform_designer", tenant_id=None)
        db.commit()

        response = client.post(
            "/platform-event-journal/entries",
            headers=_auth_headers(designer),
            json=_entry_payload(),
        )

        assert response.status_code == 403

    def test_platform_admin_allowed_create(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        admin = _create_user(db, role_name="admin", tenant_id=None)
        db.commit()

        response = client.post(
            "/platform-event-journal/entries",
            headers=_auth_headers(admin),
            json=_entry_payload(title="Admin journal entry"),
        )

        assert response.status_code == 201
        assert response.json()["title"] == "Admin journal entry"

    def test_platform_owner_allowed_create_when_configured(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        owner = _resolve_platform_owner(db)
        if owner is None:
            pytest.skip("platform owner is not configured in platform_settings")

        response = client.post(
            "/platform-event-journal/entries",
            headers=_auth_headers(owner),
            json=_entry_payload(title="Owner journal entry"),
        )

        assert response.status_code == 201
        assert response.json()["title"] == "Owner journal entry"
