"""Tests for platform module manifest registry MVP."""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_modules.manifest_constants import (
    PLATFORM_MODULE_MANIFEST_SEED,
    PlatformModuleManifestStatus,
)
from app.modules.platform_modules.manifest_models import PlatformModuleManifest
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
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
        email=f"manifest_test_{role_name}_{_suffix()}@test.local",
        full_name=f"Manifest Test {role_name}",
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


def _cleanup_test_manifest(db: Session, module_key: str, manifest_version: str) -> None:
    if not str(module_key).startswith("test-"):
        return
    db.query(PlatformModuleManifest).filter(
        PlatformModuleManifest.module_key == module_key,
        PlatformModuleManifest.manifest_version == manifest_version,
    ).delete(synchronize_session=False)
    db.flush()


def test_platform_module_manifests_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "platform_module_manifests" in inspector.get_table_names()


def test_manifest_seed_runtime_chat(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    manifest = (
        db.query(PlatformModuleManifest)
        .filter(PlatformModuleManifest.module_key == "runtime.chat")
        .one_or_none()
    )
    assert manifest is not None
    assert manifest.status == PlatformModuleManifestStatus.ACTIVE
    assert "app.modules.chats.router" in manifest.backend_routers


def test_manifest_seed_runtime_calendar(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    manifest = (
        db.query(PlatformModuleManifest)
        .filter(PlatformModuleManifest.module_key == "runtime.calendar")
        .one_or_none()
    )
    assert manifest is not None
    assert "calendar_events" in manifest.db_tables
    assert "runtime.chat" in manifest.dependencies


def test_manifest_seed_runtime_notifications(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    manifest = (
        db.query(PlatformModuleManifest)
        .filter(PlatformModuleManifest.module_key == "runtime.notifications")
        .one_or_none()
    )
    assert manifest is not None
    assert any(item.get("type") == "overlay" for item in manifest.entry_points)


def test_manifest_references_existing_platform_modules(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    for item in PLATFORM_MODULE_MANIFEST_SEED:
        parent = (
            db.query(PlatformModule)
            .filter(PlatformModule.module_key == item["module_key"])
            .one_or_none()
        )
        assert parent is not None

        manifest = (
            db.query(PlatformModuleManifest)
            .filter(
                PlatformModuleManifest.module_key == item["module_key"],
                PlatformModuleManifest.manifest_version == item["manifest_version"],
            )
            .one_or_none()
        )
        assert manifest is not None


def test_manifest_unique_module_key_version(db: Session) -> None:
    seed_platform_modules(db, commit=False)

    module_key = "test-manifest-unique"
    manifest_version = "9.9.9"
    _cleanup_test_manifest(db, module_key, manifest_version)

    db.add(
        PlatformModule(
            module_key=module_key,
            title="Test manifest parent",
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

    base_payload = {
        "module_key": module_key,
        "manifest_version": manifest_version,
        "module_version": "0.0.0",
        "frontend_components": [],
        "frontend_routes": [],
        "backend_routers": [],
        "backend_services": [],
        "backend_models": [],
        "db_tables": [],
        "entry_points": [],
        "permissions": [],
        "dependencies": [],
        "notification_targets": [],
        "settings_schema": {},
        "status": PlatformModuleManifestStatus.DRAFT,
    }

    db.add(PlatformModuleManifest(**base_payload))
    db.flush()

    db.add(PlatformModuleManifest(**base_payload))
    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()
    _cleanup_test_manifest(db, module_key, manifest_version)
    db.query(PlatformModule).filter(PlatformModule.module_key == module_key).delete(
        synchronize_session=False
    )
    db.commit()


def test_get_module_manifest_api(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_manifests(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get(
        "/platform/modules/runtime.chat/manifest",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["module_key"] == "runtime.chat"
    assert payload["manifest_version"] == "1.0.0"
    assert "runtime.notifications" in payload["dependencies"]


def test_get_all_manifests_api(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_manifests(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get("/platform/module-manifests", headers=_auth_headers(admin))
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    keys = {item["module_key"] for item in payload}
    assert keys == {"runtime.chat", "runtime.calendar", "runtime.notifications"}


def test_manifest_api_is_read_only(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_manifests(db, commit=True)
    admin = _create_user(db, role_name="admin")
    db.commit()

    headers = _auth_headers(admin)
    assert client.post("/platform/module-manifests", json={}, headers=headers).status_code == 405
    assert (
        client.patch("/platform/modules/runtime.chat/manifest", json={}, headers=headers).status_code
        == 405
    )
    assert (
        client.delete("/platform/modules/runtime.chat/manifest", headers=headers).status_code == 405
    )


def test_planned_modules_do_not_require_manifests(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    planned_keys = {
        "runtime.bpmn",
    }
    manifests = (
        db.query(PlatformModuleManifest)
        .filter(PlatformModuleManifest.module_key.in_(planned_keys))
        .all()
    )
    assert manifests == []


def test_runtime_routing_contract_unchanged() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    portal_page_view = (
        repo_root / "frontend" / "src" / "portal" / "PortalPageView.jsx"
    ).read_text(encoding="utf-8")

    assert "CorporateChatPage" in portal_page_view
    assert "CorporateCalendarPage" in portal_page_view
    assert "resolveIsCorporateChatPage" in portal_page_view
    assert "resolveIsCorporateCalendarPage" in portal_page_view
