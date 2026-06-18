from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from app.modules.control_plane.tenant_registry.service import (
    get_tenant_registry_item,
    list_tenant_registry,
    summarize_tenant_registry,
)
from app.modules.tenant_environment.constants import TenantEnvironmentRole, TenantStatus, TenantType


def _portal(
    *,
    portal_id: int,
    name: str,
    tenant_type: str,
    template_version: str = "1.0.0",
    source_tenant_id: int | None = None,
    tenant_status: str = TenantStatus.ACTIVE.value,
    notes: str | None = None,
    environment_role: str | None = None,
):
    return SimpleNamespace(
        id=portal_id,
        name=name,
        original_name=name,
        tenant_type=tenant_type,
        template_version=template_version,
        source_tenant_id=source_tenant_id,
        tenant_status=tenant_status,
        notes=notes,
        description=None,
        code=None,
        public_slug=None,
        short_name=None,
        environment_role=environment_role,
    )


def test_list_tenant_registry_filters_by_type() -> None:
    portals = [
        _portal(portal_id=1, name="DEV", tenant_type=TenantType.DEV.value),
        _portal(
            portal_id=14,
            name="Михаил",
            tenant_type=TenantType.CLIENT.value,
            source_tenant_id=2,
        ),
    ]

    db = MagicMock()
    query = db.query.return_value
    query.order_by.return_value = query
    query.filter.return_value = query
    query.all.return_value = [portals[1]]

    from unittest.mock import patch

    with patch(
        "app.modules.control_plane.tenant_registry.service.build_active_platform_version_map",
        return_value={},
    ):
        items = list_tenant_registry(db, tenant_type=TenantType.CLIENT)

    assert len(items) == 1
    assert items[0].id == 14
    assert items[0].tenant_type == TenantType.CLIENT


def test_get_tenant_registry_detail_includes_notes() -> None:
    portal = _portal(
        portal_id=14,
        name="Михаил",
        tenant_type=TenantType.CLIENT.value,
        source_tenant_id=2,
        notes="Client tenant",
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.one_or_none.return_value = portal

    from unittest.mock import patch

    with patch(
        "app.modules.control_plane.tenant_registry.service.build_active_platform_version_map",
        return_value={},
    ):
        detail = get_tenant_registry_item(db, 14)

    assert detail is not None
    assert detail.notes == "Client tenant"
    assert detail.source_tenant_id == 2


def test_summarize_tenant_registry() -> None:
    portals = [
        _portal(portal_id=1, name="DEV", tenant_type=TenantType.DEV.value),
        _portal(
            portal_id=14,
            name="Михаил",
            tenant_type=TenantType.CLIENT.value,
            source_tenant_id=2,
        ),
    ]

    db = MagicMock()
    db.query.return_value.order_by.return_value.all.return_value = portals

    summary = summarize_tenant_registry(db)

    assert summary.total == 2
    assert summary.by_type[TenantType.CLIENT.value] == 1
    assert summary.by_status[TenantStatus.ACTIVE.value] == 2


def test_list_tenant_registry_clients_only_excludes_infrastructure() -> None:
    portals = [
        _portal(portal_id=1, name="DEV", tenant_type=TenantType.DEV.value),
        _portal(
            portal_id=2,
            name="Template",
            tenant_type=TenantType.TEMPLATE.value,
            environment_role=TenantEnvironmentRole.TEMPLATE.value,
        ),
        _portal(
            portal_id=21,
            name="ООО Розетка",
            tenant_type=TenantType.CLIENT.value,
            environment_role="DEMO_CLIENT",
        ),
        _portal(
            portal_id=42,
            name="ООО Альфа",
            tenant_type=TenantType.CLIENT.value,
            environment_role=None,
        ),
    ]

    db = MagicMock()
    query = db.query.return_value
    query.order_by.return_value = query
    query.filter.return_value = query
    query.all.return_value = [portals[2], portals[3]]

    from unittest.mock import patch

    with patch(
        "app.modules.control_plane.tenant_registry.service.build_active_platform_version_map",
        return_value={},
    ):
        items = list_tenant_registry(db, clients_only=True)

    assert len(items) == 2
    assert {item.id for item in items} == {21, 42}
