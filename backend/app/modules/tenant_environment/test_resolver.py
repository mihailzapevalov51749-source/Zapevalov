"""Tests for tenant environment resolver."""

from __future__ import annotations

from types import SimpleNamespace

from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_environment.resolver import (
    build_tenant_environment_read,
    resolve_portal_tenant_type,
    resolve_tenant_type_from_id,
)


def test_resolve_tenant_type_from_id_legacy_mapping() -> None:
    assert resolve_tenant_type_from_id(1) == TenantType.DEV
    assert resolve_tenant_type_from_id(2) == TenantType.TEMPLATE
    assert resolve_tenant_type_from_id(3) == TenantType.DEMO
    assert resolve_tenant_type_from_id(13) == TenantType.LEGACY_TEMPLATE
    assert resolve_tenant_type_from_id(14) == TenantType.CLIENT


def test_resolve_portal_tenant_type_prefers_db_field() -> None:
    portal = SimpleNamespace(id=99, tenant_type="CLIENT")
    assert resolve_portal_tenant_type(portal) == TenantType.CLIENT

    portal_dev = SimpleNamespace(id=99, tenant_type="DEV")
    assert resolve_portal_tenant_type(portal_dev) == TenantType.DEV


def test_resolve_portal_tenant_type_falls_back_to_id() -> None:
    portal = SimpleNamespace(id=1, tenant_type=None)
    assert resolve_portal_tenant_type(portal) == TenantType.DEV


def test_build_tenant_environment_read() -> None:
    portal = SimpleNamespace(
        id=14,
        tenant_type="CLIENT",
        template_version="1.4.0",
        tenant_status="ACTIVE",
        source_tenant_id=2,
        notes="client tenant",
    )
    payload = build_tenant_environment_read(portal)
    assert payload["tenant_id"] == 14
    assert payload["tenant_type"] == "CLIENT"
    assert payload["template_version"] == "1.4.0"
    assert payload["source_tenant_id"] == 2
