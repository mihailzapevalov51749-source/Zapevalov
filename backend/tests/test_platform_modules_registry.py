"""Platform modules registry MVP tests."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.navigation.models import NavigationItem
from app.modules.platform_modules.constants import (
    PLATFORM_MODULE_SEED,
    PlatformModuleStatus,
)
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.seed import seed_platform_modules
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


def _create_user(db: Session, *, role_name: str) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"platform_modules_{role_name}_{_suffix()}@test.local",
        full_name=f"Platform Modules Test {role_name}",
        hashed_password="hash",
        is_active=True,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _cleanup_test_module(db: Session, module_key: str) -> None:
    if not str(module_key).startswith("test-"):
        return
    db.query(PlatformModule).filter(PlatformModule.module_key == module_key).delete(
        synchronize_session=False
    )
    db.flush()


def test_platform_modules_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "platform_modules" in inspector.get_table_names()


def test_seed_creates_runtime_chat(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == "runtime.chat")
        .one_or_none()
    )
    assert module is not None
    assert module.status == PlatformModuleStatus.ACTIVE
    assert module.entry_system_key == "runtime.chat"


def test_seed_creates_runtime_calendar(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == "runtime.calendar")
        .one_or_none()
    )
    assert module is not None
    assert module.status == PlatformModuleStatus.ACTIVE
    assert module.entry_system_key == "runtime.calendar"


def test_seed_creates_runtime_notifications(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == "runtime.notifications")
        .one_or_none()
    )
    assert module is not None
    assert module.status == PlatformModuleStatus.ACTIVE
    assert module.entry_system_key == "runtime.notifications"


def test_planned_modules_do_not_create_navigation_or_pages(db: Session) -> None:
    planned_keys = {
        item["module_key"]
        for item in PLATFORM_MODULE_SEED
        if item["status"] == PlatformModuleStatus.PLANNED
    }
    assert planned_keys == {"runtime.bpmn"}

    before_nav_count = db.query(NavigationItem).count()
    before_planned_nav = (
        db.query(NavigationItem)
        .filter(NavigationItem.system_key.in_(planned_keys))
        .count()
    )

    seed_platform_modules(db, commit=False)

    after_nav_count = db.query(NavigationItem).count()
    after_planned_nav = (
        db.query(NavigationItem)
        .filter(NavigationItem.system_key.in_(planned_keys))
        .count()
    )

    assert before_nav_count == after_nav_count
    assert before_planned_nav == after_planned_nav
    assert after_planned_nav == 0


def test_module_key_unique_constraint(db: Session) -> None:
    module_key = f"test-unique-{_suffix()}"
    _cleanup_test_module(db, module_key)

    db.add(
        PlatformModule(
            module_key=module_key,
            title="Test module",
            module_type="runtime",
            status="planned",
            version="0.0.0",
            is_runtime=True,
            is_tenant_installable=False,
            is_enabled_by_default=False,
            is_core=False,
        )
    )
    db.flush()

    db.add(
        PlatformModule(
            module_key=module_key,
            title="Duplicate module",
            module_type="runtime",
            status="planned",
            version="0.0.0",
            is_runtime=True,
            is_tenant_installable=False,
            is_enabled_by_default=False,
            is_core=False,
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()
    _cleanup_test_module(db, module_key)
    db.commit()


def test_get_platform_modules_returns_catalog(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get("/platform/modules", headers=_auth_headers(admin))
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    keys = {item["module_key"] for item in payload}
    active_or_planned = {
        item["module_key"]
        for item in payload
        if item["status"] in {PlatformModuleStatus.ACTIVE, PlatformModuleStatus.PLANNED}
    }
    assert active_or_planned == {item["module_key"] for item in PLATFORM_MODULE_SEED}
    assert "runtime.chat" in keys
    assert "runtime.calendar" in keys
    assert "runtime.notifications" in keys
    assert "runtime.documents" in keys
    assert "runtime.yasii" in keys
    assert "runtime.bpmn" in keys
    deprecated = {
        item["module_key"]
        for item in payload
        if item["status"] == PlatformModuleStatus.DEPRECATED
    }
    assert "runtime.processes" not in active_or_planned
    assert "runtime.org_structure" not in active_or_planned
    if "runtime.processes" in keys:
        assert "runtime.processes" in deprecated
    if "runtime.org_structure" in keys:
        assert "runtime.org_structure" in deprecated

    chat = next(item for item in payload if item["module_key"] == "runtime.chat")
    assert chat["entry_system_key"] == "runtime.chat"
    assert "notifications" in chat["dependencies"]


def test_get_platform_module_by_key(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get(
        "/platform/modules/runtime.calendar",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["module_key"] == "runtime.calendar"
    assert payload["status"] == "active"
    assert payload["entry_system_key"] == "runtime.calendar"


def test_platform_modules_api_is_read_only(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    admin = _create_user(db, role_name="admin")
    db.commit()

    headers = _auth_headers(admin)
    assert client.post("/platform/modules", json={}, headers=headers).status_code == 405
    assert client.patch("/platform/modules/runtime.chat", json={}, headers=headers).status_code == 405
    assert client.delete("/platform/modules/runtime.chat", headers=headers).status_code == 405


def test_platform_modules_api_requires_platform_admin(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    user = _create_user(db, role_name="user")
    db.commit()

    response = client.get("/platform/modules", headers=_auth_headers(user))
    assert response.status_code == 403


def test_runtime_resolver_contract_unchanged() -> None:
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    chat_resolver = (
        repo_root / "frontend" / "src" / "portal" / "resolveCorporateChatPage.js"
    ).read_text(encoding="utf-8")
    calendar_resolver = (
        repo_root / "frontend" / "src" / "portal" / "resolveCorporateCalendarPage.js"
    ).read_text(encoding="utf-8")
    portal_page_view = (
        repo_root / "frontend" / "src" / "portal" / "PortalPageView.jsx"
    ).read_text(encoding="utf-8")

    assert 'RUNTIME_CHAT_SYSTEM_KEY = "runtime.chat"' in chat_resolver
    assert 'RUNTIME_CALENDAR_SYSTEM_KEY = "runtime.calendar"' in calendar_resolver
    assert "resolveIsCorporateChatPage" in portal_page_view
    assert "resolveIsCorporateCalendarPage" in portal_page_view
    assert "CorporateChatPage" in portal_page_view
    assert "CorporateCalendarPage" in portal_page_view
