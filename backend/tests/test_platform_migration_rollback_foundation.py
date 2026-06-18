"""Tests for migration rollback foundation."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_migration_rollback.constants import BASELINE_SCHEMA_REVISION
from app.modules.platform_migration_rollback.models import PlatformVersionSchemaCatalog
from app.modules.platform_migration_rollback.seed import seed_platform_version_schema_catalog
from app.modules.platform_migration_rollback.service import (
    get_foundation_summary,
    get_migration_rollback_policy,
)
from app.modules.platform_version_registry.constants import (
    DEFAULT_CLIENT_PLATFORM_VERSION,
    DEFAULT_DEV_PLATFORM_VERSION,
    DEFAULT_TEMPLATE_PLATFORM_VERSION,
)
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.users.models import User


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


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def test_schema_catalog_table_exists(db: Session) -> None:
    tables = set(inspect(db.bind).get_table_names())
    assert "platform_version_schema_catalog" in tables


def test_seed_platform_version_schema_catalog(db: Session) -> None:
    count = seed_platform_version_schema_catalog(db, commit=False)
    assert count == 2

    rows = (
        db.query(PlatformVersionSchemaCatalog)
        .order_by(PlatformVersionSchemaCatalog.platform_version.asc())
        .all()
    )
    versions = {row.platform_version: row.schema_revision for row in rows}
    assert versions[DEFAULT_DEV_PLATFORM_VERSION] == BASELINE_SCHEMA_REVISION
    assert versions[DEFAULT_TEMPLATE_PLATFORM_VERSION] == BASELINE_SCHEMA_REVISION
    assert DEFAULT_CLIENT_PLATFORM_VERSION == DEFAULT_TEMPLATE_PLATFORM_VERSION


def test_migration_rollback_policy_structure() -> None:
    policy = get_migration_rollback_policy()
    assert policy.policy_version == "1.0.0"
    assert len(policy.allowed_cases) >= 3
    assert len(policy.blocked_cases) >= 3
    assert len(policy.compatibility_algorithm_steps) >= 5
    assert len(policy.recovery_scenarios) == 3
    assert policy.backup_registry_status == "design_only_not_implemented"


def test_foundation_summary_includes_runtime_revision(db: Session) -> None:
    summary = get_foundation_summary(db)
    assert summary.baseline_schema_revision == BASELINE_SCHEMA_REVISION
    assert summary.runtime_schema_revision is not None
    assert len(summary.schema_catalog) >= 2


def test_migration_rollback_api_read_only(client: TestClient, db: Session) -> None:
    settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings is None or settings.platform_owner_user_id is None:
        pytest.skip("platform owner is not configured")

    owner = db.get(User, settings.platform_owner_user_id)
    if owner is None:
        pytest.skip("platform owner user is missing")

    headers = _auth_headers(owner)

    policy_response = client.get("/platform/migration-rollback/policy", headers=headers)
    assert policy_response.status_code == 200
    assert policy_response.json()["strategy"] == "hybrid_forward_only_with_backup_restore"

    catalog_response = client.get("/platform/migration-rollback/schema-catalog", headers=headers)
    assert catalog_response.status_code == 200
    assert len(catalog_response.json()) >= 2

    summary_response = client.get("/platform/migration-rollback/summary", headers=headers)
    assert summary_response.status_code == 200
    body = summary_response.json()
    assert body["runtime_schema_revision"] is not None
    assert len(body["schema_catalog"]) >= 2
