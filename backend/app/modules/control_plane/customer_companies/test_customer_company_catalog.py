from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.modules.control_plane.customer_companies.catalog_service import (
    get_customer_company_catalog_item,
    list_customer_company_catalog,
)
from app.modules.tenant_environment.constants import TenantStatus, TenantType


def _company(**kwargs):
    defaults = {
        "id": 1,
        "name": "ООО Розетка",
        "status": "active",
        "primary_portal_id": None,
        "portal_id": 21,
        "database_name": "yasnopro_client",
        "code": "ooo_rozetka",
        "tenant_type": TenantType.CLIENT.value,
        "environment_role": "DEMO_CLIENT",
        "tenant_status": TenantStatus.ACTIVE.value,
        "original_name": "ООО Розетка",
        "short_name": None,
        "public_slug": "rozetka",
        "template_version": "1.0.0",
        "platform_version": "1.0.0",
        "home_page_id": 1067,
        "frontend_base_url": None,
        "api_base_url": None,
        "users_limit": 10,
        "created_at": datetime.now(timezone.utc),
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_list_customer_company_catalog_returns_portal_id_as_id() -> None:
    db = MagicMock()
    db.scalars.return_value.all.return_value = [_company()]

    items = list_customer_company_catalog(db)

    assert len(items) == 1
    assert items[0].id == 21
    assert items[0].catalog_id == 1
    assert items[0].code == "ooo_rozetka"
    assert items[0].database_name == "yasnopro_client"
    assert items[0].tenant_type == TenantType.CLIENT
    assert items[0].portal_id == 21
    assert items[0].home_page_id == 1067
    assert items[0].frontend_base_url == "http://localhost:5175"
    assert items[0].api_base_url == "http://localhost:8012"
    assert items[0].open_url == "http://localhost:5175/portal/21/page/1067"


def test_list_customer_company_catalog_skips_incomplete_rows() -> None:
    db = MagicMock()
    db.scalars.return_value.all.return_value = [_company(portal_id=None, database_name=None)]

    items = list_customer_company_catalog(db)

    assert items == []


def test_get_customer_company_catalog_item_by_portal_id() -> None:
    db = MagicMock()
    query = db.query.return_value
    query.filter.return_value = query
    query.order_by.return_value = query
    query.first.return_value = _company()

    item = get_customer_company_catalog_item(db, portal_id=21)

    assert item is not None
    assert item.id == 21
    assert item.environment_role == "DEMO_CLIENT"
