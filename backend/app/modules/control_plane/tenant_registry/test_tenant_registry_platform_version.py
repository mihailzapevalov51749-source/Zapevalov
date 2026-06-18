"""Tests for tenant registry platform version resolution."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.modules.control_plane.tenant_registry.service import list_tenant_registry
from app.modules.tenant_environment.constants import TenantStatus, TenantType


def _portal(
    *,
    portal_id: int,
    name: str,
    tenant_type: str,
    template_version: str = "legacy-9.9.9",
):
    return SimpleNamespace(
        id=portal_id,
        name=name,
        tenant_type=tenant_type,
        template_version=template_version,
        source_tenant_id=None,
        tenant_status=TenantStatus.ACTIVE.value,
    )


@patch("app.modules.control_plane.tenant_registry.service.build_active_platform_version_map")
def test_list_tenant_registry_uses_platform_version_registry(mock_version_map) -> None:
    mock_version_map.return_value = {1: "1.0.0-dev"}

    portals = [
        _portal(portal_id=1, name="DEV", tenant_type=TenantType.DEV.value),
    ]

    db = MagicMock()
    query = db.query.return_value
    query.order_by.return_value = query
    query.filter.return_value = query
    query.all.return_value = portals

    items = list_tenant_registry(db)

    assert len(items) == 1
    assert items[0].platform_version == "1.0.0-dev"
    assert items[0].template_version == "legacy-9.9.9"
