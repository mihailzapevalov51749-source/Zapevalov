"""Tests for Platform Identity Store catalog session routing."""

from __future__ import annotations

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.control_plane.platform_identity.platform_identity_store_session import (
    platform_identity_catalog_database_name,
)
from app.modules.company_database_provisioning.database_urls import build_database_url


def test_platform_identity_catalog_database_is_dev_registry() -> None:
    assert platform_identity_catalog_database_name() == ENVIRONMENT_MATRIX["DEV"].database


def test_platform_identity_catalog_url_uses_runtime_host_not_tenant_db_name() -> None:
    catalog_url = build_database_url(platform_identity_catalog_database_name())
    assert catalog_url.endswith(f"/{ENVIRONMENT_MATRIX['DEV'].database}")
    assert not catalog_url.endswith(f"/{ENVIRONMENT_MATRIX['TEMPLATE'].database}")
