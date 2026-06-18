"""Tests for tenant menu setting key alias resolution."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.runtime.menu_settings.key_resolution import (
    merge_tenant_setting_records,
    resolve_tenant_menu_settings_aliases,
)
from app.modules.platform.runtime.menu_settings.schemas import TenantRuntimeMenuSettingRead
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _create_portal(db: Session) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Menu settings key resolution {suffix}",
        code=f"menu-key-res-{suffix}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _setting(
    item_key: str,
    *,
    navigation_item_id: int | None = None,
    sort_order: int | None = None,
    icon_file_url: str | None = None,
    block_id: int | None = None,
) -> TenantRuntimeMenuSettingRead:
    return TenantRuntimeMenuSettingRead(
        item_key=item_key,
        navigation_item_id=navigation_item_id,
        sort_order=sort_order,
        icon_file_url=icon_file_url,
        block_id=block_id,
    )


def test_merge_tenant_setting_records_preserves_icon_and_sort():
    merged = merge_tenant_setting_records(
        _setting(
            "runtime.calendar",
            navigation_item_id=452,
            sort_order=0,
            icon_file_url="/uploads/icons/calendar.png",
        ),
        _setting(
            "nav:12",
            navigation_item_id=12,
            sort_order=30,
            block_id=2,
        ),
        canonical_key="runtime.calendar",
    )

    assert merged["item_key"] == "runtime.calendar"
    assert merged["icon_file_url"] == "/uploads/icons/calendar.png"
    assert merged["sort_order"] == 30
    assert merged["block_id"] == 2


def test_resolve_nav_legacy_key_to_system_key(db):
    portal = _create_portal(db)
    tenant_id = int(portal.id)

    legacy_page = Page(portal_id=tenant_id, title="Календарь", status="published")
    canonical_page = Page(portal_id=tenant_id, title="Календарь", status="published")
    db.add_all([legacy_page, canonical_page])
    db.flush()

    legacy_nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Календарь",
        page_id=legacy_page.id,
        sort_order=0,
        is_visible=True,
        menu_scope="runtime",
    )
    canonical_nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Календарь",
        page_id=canonical_page.id,
        sort_order=1,
        is_visible=True,
        menu_scope="runtime",
        system_key="runtime.calendar",
        is_system=True,
        is_protected=True,
    )
    db.add_all([legacy_nav, canonical_nav])
    db.flush()

    resolved = resolve_tenant_menu_settings_aliases(
        db,
        tenant_id,
        {
            f"nav:{legacy_nav.id}": _setting(
                f"nav:{legacy_nav.id}",
                navigation_item_id=int(legacy_nav.id),
                sort_order=30,
            ),
            "runtime.calendar": _setting(
                "runtime.calendar",
                navigation_item_id=int(canonical_nav.id),
                icon_file_url="/uploads/icons/calendar.png",
                sort_order=10,
            ),
        },
    )

    assert f"nav:{legacy_nav.id}" not in resolved
    assert "runtime.calendar" in resolved
    calendar = resolved["runtime.calendar"]
    assert calendar.icon_file_url == "/uploads/icons/calendar.png"
    assert calendar.sort_order == 10
    assert calendar.navigation_item_id == int(canonical_nav.id)


def test_resolve_legacy_only_nav_key(db):
    portal = _create_portal(db)
    tenant_id = int(portal.id)

    legacy_page = Page(portal_id=tenant_id, title="Календарь", status="published")
    canonical_page = Page(portal_id=tenant_id, title="Календарь", status="published")
    db.add_all([legacy_page, canonical_page])
    db.flush()

    legacy_nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Календарь",
        page_id=legacy_page.id,
        sort_order=0,
        is_visible=True,
        menu_scope="runtime",
    )
    canonical_nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Календарь",
        page_id=canonical_page.id,
        sort_order=1,
        is_visible=True,
        menu_scope="runtime",
        system_key="runtime.calendar",
        is_system=True,
        is_protected=True,
    )
    db.add_all([legacy_nav, canonical_nav])
    db.flush()

    resolved = resolve_tenant_menu_settings_aliases(
        db,
        tenant_id,
        {
            f"nav:{legacy_nav.id}": _setting(
                f"nav:{legacy_nav.id}",
                navigation_item_id=int(legacy_nav.id),
                sort_order=30,
                icon_file_url="/uploads/icons/legacy.png",
            ),
        },
    )

    assert list(resolved.keys()) == ["runtime.calendar"]
    assert resolved["runtime.calendar"].sort_order == 30
    assert resolved["runtime.calendar"].icon_file_url == "/uploads/icons/legacy.png"
