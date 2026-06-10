"""Structural registry and uniqueness guarantees for Navigation System Items."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.system_registry.constants import (
    DESIGNER_SYSTEM_NAV_ITEMS,
    NavigationSystemItemDefinition,
    workspace_navigation_system_key,
)
from app.modules.platform.designer.shared.soft_delete import apply_soft_delete

logger = logging.getLogger(__name__)


def navigation_system_lock_key(portal_id: int, system_key: str) -> int:
    payload = f"navigation_system:{portal_id}:{system_key}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return int(digest[:15], 16)


def acquire_navigation_system_lock(db: Session, portal_id: int, system_key: str) -> None:
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {"lock_key": navigation_system_lock_key(portal_id, system_key)},
    )


def list_active_navigation_items_by_system_key(
    db: Session,
    portal_id: int,
    system_key: str,
) -> list[NavigationItem]:
    return (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.system_key == system_key,
            NavigationItem.deleted_at.is_(None),
        )
        .order_by(NavigationItem.id.asc())
        .all()
    )


def _find_revivable_navigation_item(
    db: Session,
    portal_id: int,
    system_key: str,
) -> NavigationItem | None:
    return (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.system_key == system_key,
            NavigationItem.deleted_at.isnot(None),
        )
        .order_by(NavigationItem.id.asc())
        .first()
    )


def reconcile_duplicate_navigation_items(
    db: Session,
    portal_id: int,
    system_key: str,
) -> NavigationItem | None:
    items = list_active_navigation_items_by_system_key(db, portal_id, system_key)

    if len(items) > 1:
        canonical = items[0]
        now = datetime.now(timezone.utc)
        for duplicate in items[1:]:
            logger.warning(
                "Deactivating duplicate navigation system item portal=%s key=%s "
                "duplicate=%s canonical=%s",
                portal_id,
                system_key,
                duplicate.id,
                canonical.id,
            )
            duplicate.deleted_at = now
        db.flush()
        return canonical

    if items:
        return items[0]

    revivable = _find_revivable_navigation_item(db, portal_id, system_key)
    if revivable is None:
        return None

    logger.warning(
        "Reviving soft-deleted navigation system item portal=%s key=%s item=%s",
        portal_id,
        system_key,
        revivable.id,
    )
    revivable.deleted_at = None
    revivable.deleted_by = None
    db.flush()
    return revivable


def _repair_designer_system_item(
    item: NavigationItem,
    *,
    definition: NavigationSystemItemDefinition,
    route: str,
) -> bool:
    changed = False

    if item.system_key != definition.system_key:
        item.system_key = definition.system_key
        changed = True
    if item.menu_scope != definition.menu_scope:
        item.menu_scope = definition.menu_scope
        changed = True
    if item.type != definition.nav_type:
        item.type = definition.nav_type
        changed = True
    if item.url != route:
        item.url = route
        changed = True
    if item.title != definition.title:
        item.title = definition.title
        changed = True
    if item.sort_order != definition.sort_order:
        item.sort_order = definition.sort_order
        changed = True
    if item.is_system is not True:
        item.is_system = True
        changed = True
    if item.is_protected is not True:
        item.is_protected = True
        changed = True
    if not item.is_visible:
        item.is_visible = True
        changed = True
    if item.parent_id is not None:
        item.parent_id = None
        changed = True

    return changed


def ensure_navigation_system_item(
    db: Session,
    portal_id: int,
    system_key: str,
    *,
    apply_metadata: Callable[[NavigationItem], bool],
    create_item: Callable[[], NavigationItem],
) -> NavigationItem:
    acquire_navigation_system_lock(db, portal_id, system_key)

    canonical = reconcile_duplicate_navigation_items(db, portal_id, system_key)
    if canonical is not None:
        if apply_metadata(canonical):
            db.flush()
        return canonical

    item = create_item()
    try:
        with db.begin_nested():
            db.add(item)
            db.flush()
    except IntegrityError:
        canonical = reconcile_duplicate_navigation_items(db, portal_id, system_key)
        if canonical is not None:
            if apply_metadata(canonical):
                db.flush()
            return canonical
        raise

    return item


def ensure_designer_system_navigation_items(db: Session, portal_id: int) -> bool:
    changed = False

    for definition in DESIGNER_SYSTEM_NAV_ITEMS:
        route = definition.route_template.format(tenant_id=portal_id)

        def apply_metadata(item: NavigationItem, _definition=definition, _route=route) -> bool:
            return _repair_designer_system_item(item, definition=_definition, route=_route)

        def create_item(_definition=definition, _route=route) -> NavigationItem:
            return NavigationItem(
                portal_id=portal_id,
                parent_id=None,
                type=_definition.nav_type,
                title=_definition.title,
                url=_route,
                sort_order=_definition.sort_order,
                is_visible=True,
                icon=None,
                icon_type=None,
                icon_file_url=None,
                color=None,
                is_bold=False,
                is_italic=False,
                menu_scope=_definition.menu_scope,
                system_key=_definition.system_key,
                is_system=True,
                is_protected=True,
            )

        item = ensure_navigation_system_item(
            db,
            portal_id,
            definition.system_key,
            apply_metadata=apply_metadata,
            create_item=create_item,
        )
        if apply_metadata(item):
            db.flush()
            changed = True

    return changed


def _repair_workspace_menu_placement(
    item: NavigationItem,
    *,
    tenant_id: int,
    workspace_id: int,
    menu_scope: str,
    parent_id: int | None,
    sort_order: int,
    is_visible: bool,
    title: str,
    url: str,
    icon: str | None,
) -> bool:
    changed = False
    expected_key = workspace_navigation_system_key(workspace_id, menu_scope)

    if item.system_key != expected_key:
        item.system_key = expected_key
        changed = True
    if item.portal_id != tenant_id:
        item.portal_id = tenant_id
        changed = True
    if item.menu_scope != menu_scope:
        item.menu_scope = menu_scope
        changed = True
    if item.type != "workspace":
        item.type = "workspace"
        changed = True
    if item.parent_id != parent_id:
        item.parent_id = parent_id
        changed = True
    if item.sort_order != sort_order:
        item.sort_order = sort_order
        changed = True
    if item.is_visible != is_visible:
        item.is_visible = is_visible
        changed = True
    if item.title != title:
        item.title = title
        changed = True
    if item.url != url:
        item.url = url
        changed = True
    if item.icon != icon:
        item.icon = icon
        changed = True

    return changed


def ensure_workspace_menu_placement(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    menu_scope: str,
    parent_id: int | None,
    sort_order: int,
    is_visible: bool,
    title: str,
    url: str,
    icon: str | None,
) -> NavigationItem:
    system_key = workspace_navigation_system_key(workspace_id, menu_scope)

    def apply_metadata(item: NavigationItem) -> bool:
        return _repair_workspace_menu_placement(
            item,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            menu_scope=menu_scope,
            parent_id=parent_id,
            sort_order=sort_order,
            is_visible=is_visible,
            title=title,
            url=url,
            icon=icon,
        )

    def create_item() -> NavigationItem:
        return NavigationItem(
            portal_id=tenant_id,
            parent_id=parent_id,
            type="workspace",
            title=title,
            url=url,
            sort_order=sort_order,
            is_visible=is_visible,
            icon=icon,
            icon_type=None,
            icon_file_url=None,
            color=None,
            is_bold=False,
            is_italic=False,
            menu_scope=menu_scope,
            system_key=system_key,
            is_system=False,
            is_protected=False,
        )

    return ensure_navigation_system_item(
        db,
        tenant_id,
        system_key,
        apply_metadata=apply_metadata,
        create_item=create_item,
    )


def deactivate_orphan_workspace_placements(db: Session, portal_id: int) -> int:
    rows = db.execute(
        text(
            """
            SELECT ni.id
            FROM navigation_items ni
            LEFT JOIN designer_workspaces w
                ON w.id = CAST(
                    substring(ni.system_key FROM 'designer\\.workspace\\.(\\d+)\\.') AS INTEGER
                )
                AND w.tenant_id = ni.portal_id
                AND w.deleted_at IS NULL
            WHERE ni.portal_id = :portal_id
              AND ni.deleted_at IS NULL
              AND ni.system_key LIKE 'designer.workspace.%'
              AND w.id IS NULL
            """
        ),
        {"portal_id": portal_id},
    ).scalars().all()

    removed = 0
    for item_id in rows:
        item = db.query(NavigationItem).filter(NavigationItem.id == item_id).first()
        if item is None or item.deleted_at is not None:
            continue
        logger.warning(
            "Deactivating orphan workspace navigation placement portal=%s item=%s key=%s",
            portal_id,
            item.id,
            item.system_key,
        )
        apply_soft_delete(item)
        removed += 1

    if removed:
        db.flush()
    return removed


def audit_navigation_system_items(db: Session) -> list[dict[str, object]]:
    rows = db.execute(
        text(
            """
            SELECT
                portal_id,
                system_key,
                menu_scope,
                COUNT(*) AS active_count,
                ARRAY_AGG(id ORDER BY id ASC) AS item_ids
            FROM navigation_items
            WHERE deleted_at IS NULL
              AND system_key IS NOT NULL
              AND system_key <> ''
            GROUP BY portal_id, system_key, menu_scope
            ORDER BY portal_id, system_key, menu_scope
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]
