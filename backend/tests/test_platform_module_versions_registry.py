"""Platform module versions registry MVP tests."""

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
from app.modules.platform_modules.manifest_models import PlatformModuleManifest
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_constants import (
    ACTIVE_RUNTIME_MODULE_KEYS_FOR_VERSION_BACKFILL,
    PlatformModuleVersionStatus,
)
from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.platform_release.models import PlatformRelease
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
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
        email=f"module_versions_{role_name}_{_suffix()}@test.local",
        full_name=f"Module Versions Test {role_name}",
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


def _create_portal(db: Session) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Module versions {suffix}",
        code=f"module-versions-{suffix}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _cleanup_test_versions(db: Session, module_key: str) -> None:
    if not str(module_key).startswith("test-"):
        return
    db.query(PlatformReleaseModule).filter(
        PlatformReleaseModule.module_key == module_key
    ).delete(synchronize_session=False)
    db.query(PlatformModuleVersion).filter(
        PlatformModuleVersion.module_key == module_key
    ).delete(synchronize_session=False)
    db.query(PlatformModule).filter(PlatformModule.module_key == module_key).delete(
        synchronize_session=False
    )
    db.flush()


def test_platform_module_versions_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "platform_module_versions" in inspector.get_table_names()
    assert "platform_release_modules" in inspector.get_table_names()


def test_platform_module_versions_fk_to_platform_modules(db: Session) -> None:
    seed_platform_modules(db, commit=False)

    db.add(
        PlatformModuleVersion(
            module_key=f"test-invalid-fk-{_suffix()}",
            version="1.0.0",
            status=PlatformModuleVersionStatus.DRAFT,
            manifest_version="1.0.0",
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()


def test_platform_module_versions_unique_module_version(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    module_key = "runtime.chat"

    db.add(
        PlatformModuleVersion(
            module_key=module_key,
            version="9.9.9",
            status=PlatformModuleVersionStatus.DRAFT,
            manifest_version="9.9.9",
        )
    )
    db.flush()

    db.add(
        PlatformModuleVersion(
            module_key=module_key,
            version="9.9.9",
            status=PlatformModuleVersionStatus.DRAFT,
            manifest_version="9.9.9",
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()
    db.query(PlatformModuleVersion).filter(
        PlatformModuleVersion.module_key == module_key,
        PlatformModuleVersion.version == "9.9.9",
    ).delete(synchronize_session=False)
    db.flush()


def test_initial_backfill_creates_runtime_versions(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    result = seed_platform_module_versions(db, commit=False)
    assert result["created"] + result["skipped"] >= 3

    for module_key in ACTIVE_RUNTIME_MODULE_KEYS_FOR_VERSION_BACKFILL:
        row = (
            db.query(PlatformModuleVersion)
            .filter(
                PlatformModuleVersion.module_key == module_key,
                PlatformModuleVersion.version == "1.0.0",
            )
            .one_or_none()
        )
        assert row is not None
        assert row.status == PlatformModuleVersionStatus.RELEASED
        assert row.manifest_version == "1.0.0"


def test_manifest_linkage_works(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)

    version_row = (
        db.query(PlatformModuleVersion)
        .filter(
            PlatformModuleVersion.module_key == "runtime.calendar",
            PlatformModuleVersion.version == "1.0.0",
        )
        .one()
    )
    manifest = (
        db.query(PlatformModuleManifest)
        .filter(
            PlatformModuleManifest.module_key == version_row.module_key,
            PlatformModuleManifest.manifest_version == version_row.manifest_version,
        )
        .one()
    )

    assert manifest.module_version == version_row.version


def test_release_linkage_works(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    release = PlatformRelease(
        version=f"test-release-{_suffix()}",
        title="Test release modules",
        status="draft",
        source_tenant_id=portal.id,
    )
    db.add(release)
    db.flush()

    db.add(
        PlatformReleaseModule(
            release_id=release.id,
            module_key="runtime.chat",
            from_version="1.0.0",
            to_version="1.0.1",
            change_summary="Test summary",
        )
    )
    db.flush()

    row = (
        db.query(PlatformReleaseModule)
        .filter(PlatformReleaseModule.release_id == release.id)
        .one()
    )
    assert row.module_key == "runtime.chat"
    assert row.from_version == "1.0.0"
    assert row.to_version == "1.0.1"

    db.query(PlatformReleaseModule).filter(PlatformReleaseModule.release_id == release.id).delete(
        synchronize_session=False
    )
    db.query(PlatformRelease).filter(PlatformRelease.id == release.id).delete(
        synchronize_session=False
    )
    db.flush()


def test_get_platform_module_versions_api(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_manifests(db, commit=True)
    seed_platform_module_versions(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get("/platform/module-versions", headers=_auth_headers(admin))
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 3


def test_get_module_versions_and_latest_api(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_manifests(db, commit=True)
    seed_platform_module_versions(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    headers = _auth_headers(admin)
    versions_response = client.get(
        "/platform/modules/runtime.chat/versions",
        headers=headers,
    )
    latest_response = client.get(
        "/platform/modules/runtime.chat/latest-version",
        headers=headers,
    )

    assert versions_response.status_code == 200
    assert latest_response.status_code == 200
    assert versions_response.json()[0]["module_key"] == "runtime.chat"
    assert latest_response.json()["version"] == "1.0.0"
    assert latest_response.json()["manifest_version"] == "1.0.0"


def test_get_release_modules_api(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    release = PlatformRelease(
        version=f"test-release-api-{_suffix()}",
        title="API release modules",
        status="draft",
        source_tenant_id=portal.id,
    )
    db.add(release)
    db.flush()
    db.add(
        PlatformReleaseModule(
            release_id=release.id,
            module_key="runtime.notifications",
            from_version="1.0.0",
            to_version="1.0.1",
            change_summary="Notifications patch",
        )
    )
    db.commit()

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get(
        f"/platform/releases/{release.id}/modules",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["module_key"] == "runtime.notifications"

    db.query(PlatformReleaseModule).filter(PlatformReleaseModule.release_id == release.id).delete(
        synchronize_session=False
    )
    db.query(PlatformRelease).filter(PlatformRelease.id == release.id).delete(
        synchronize_session=False
    )
    db.commit()


def test_module_versions_api_is_read_only(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_versions(db, commit=True)
    admin = _create_user(db, role_name="admin")
    db.commit()

    headers = _auth_headers(admin)
    assert client.post("/platform/module-versions", headers=headers, json={}).status_code == 405
    assert client.patch("/platform/module-versions", headers=headers, json={}).status_code == 405
    assert client.delete("/platform/module-versions", headers=headers).status_code == 405


def test_existing_routing_unchanged(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    admin = _create_user(db, role_name="admin")
    db.commit()
    headers = _auth_headers(admin)

    assert client.get("/platform/modules", headers=headers).status_code == 200
    assert client.get("/platform/module-manifests", headers=headers).status_code == 200
    assert client.get("/platform/releases", headers=headers).status_code == 200


def test_existing_navigation_seed_unchanged(db: Session) -> None:
    before_count = db.query(NavigationItem).count()
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)
    after_count = db.query(NavigationItem).count()
    assert before_count == after_count


def test_existing_module_registry_unchanged(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get("/platform/modules/runtime.chat", headers=_auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["module_key"] == "runtime.chat"


def test_existing_tenant_modules_unchanged(client: TestClient, db: Session) -> None:
    from app.modules.tenant_modules.models import TenantModule

    before_count = db.query(TenantModule).count()
    seed_platform_module_versions(db, commit=True)
    after_count = db.query(TenantModule).count()
    assert before_count == after_count
