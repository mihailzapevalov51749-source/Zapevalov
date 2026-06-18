"""Entity classification for Studio Pages Registry (P1 cleanup)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_PROTECTED_SYSTEM_KEYS,
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.pages.models import Page
from app.modules.pages.protected_pages import resolve_protected_page_key
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)

PageRegistryEntityKind = Literal[
    "home_page",
    "user_page",
    "module",
    "library",
    "workspace",
    "tenant_administration",
    "draft",
    "orphan",
    "unknown",
]

DEFAULT_VISIBLE_ENTITY_KINDS: frozenset[str] = frozenset({"home_page", "user_page"})

TENANT_ADMIN_TITLES: frozenset[str] = frozenset(
    {"администрирование", "настройка системы"},
)

RUNTIME_MODULE_SYSTEM_KEYS: frozenset[str] = frozenset(
    key for key in RUNTIME_PROTECTED_SYSTEM_KEYS if key != "runtime.office_home"
)


@dataclass(frozen=True)
class PageRegistryClassificationContext:
    nav_by_page: dict[int, list[NavigationItem]]
    workspace_home_page_ids: frozenset[int]
    workspace_tab_page_ids: frozenset[int]


def _norm(value: object | None) -> str:
    return str(value or "").strip()


def _norm_lower(value: object | None) -> str:
    return _norm(value).lower()


def _primary_nav(nav_items: list[NavigationItem]) -> NavigationItem | None:
    if not nav_items:
        return None
    return min(nav_items, key=lambda nav: (nav.sort_order or 0, nav.id))


def _resolve_runtime_key(nav: NavigationItem | None) -> str | None:
    if nav is None:
        return None
    system_key = _norm_lower(nav.system_key)
    if system_key.startswith("runtime."):
        return system_key
    derived = resolve_system_key_for_runtime_protected_title(nav.title)
    return _norm_lower(derived) if derived else None


def _nav_indicates_module(nav_items: list[NavigationItem]) -> bool:
    for nav in nav_items:
        runtime_key = _resolve_runtime_key(nav)
        if runtime_key in RUNTIME_MODULE_SYSTEM_KEYS:
            return True
        system_key = _norm_lower(nav.system_key)
        if system_key in RUNTIME_MODULE_SYSTEM_KEYS:
            return True
    return False


def _nav_indicates_library(nav_items: list[NavigationItem]) -> bool:
    for nav in nav_items:
        if _norm(nav.type) == "document_library":
            return True
        if nav.library_id is not None:
            return True
    return False


def build_page_registry_classification_context(
    db: Session,
    tenant_id: int,
) -> PageRegistryClassificationContext:
    nav_by_page: dict[int, list[NavigationItem]] = defaultdict(list)
    nav_items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.page_id.isnot(None),
        )
        .all()
    )
    for nav in nav_items:
        nav_by_page[int(nav.page_id)].append(nav)

    workspace_home_page_ids: set[int] = set()
    for workspace in (
        db.query(DesignerWorkspace)
        .filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .all()
    ):
        if workspace.home_page_id is not None:
            workspace_home_page_ids.add(int(workspace.home_page_id))

    workspace_tab_page_ids: set[int] = set()
    for tab in (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.tenant_id == tenant_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .all()
    ):
        if _norm(tab.tab_type) != "page":
            continue
        target_id = _norm(tab.target_id)
        if target_id.isdigit():
            workspace_tab_page_ids.add(int(target_id))

    return PageRegistryClassificationContext(
        nav_by_page=dict(nav_by_page),
        workspace_home_page_ids=frozenset(workspace_home_page_ids),
        workspace_tab_page_ids=frozenset(workspace_tab_page_ids),
    )


def classify_page_entity_kind(
    db: Session,
    tenant_id: int,
    page: Page,
    *,
    context: PageRegistryClassificationContext,
) -> PageRegistryEntityKind:
    page_id = int(page.id)
    nav_items = context.nav_by_page.get(page_id, [])
    primary_nav = _primary_nav(nav_items)
    runtime_key = _resolve_runtime_key(primary_nav)
    protected_key = resolve_protected_page_key(db, tenant_id=tenant_id, page=page)
    status = _norm_lower(page.status) or "draft"
    title_normalized = _norm_lower(page.title)

    is_workspace_home = page_id in context.workspace_home_page_ids
    is_workspace_tab = page_id in context.workspace_tab_page_ids
    has_nav = bool(nav_items)
    is_orphan = not has_nav and not is_workspace_home and not is_workspace_tab

    if is_orphan and status == "draft":
        return "draft"
    if is_orphan:
        return "orphan"

    if runtime_key == "runtime.office_home" or protected_key == "office_home":
        if status == "draft":
            return "draft"
        return "home_page"

    if protected_key in {"chat", "notifications", "calendar"}:
        return "module"
    if runtime_key in RUNTIME_MODULE_SYSTEM_KEYS or _nav_indicates_module(nav_items):
        return "module"

    if is_workspace_home or is_workspace_tab:
        return "workspace"

    if primary_nav and _norm(primary_nav.type) == "object_type":
        return "unknown"
    if _nav_indicates_library(nav_items):
        return "library"

    if title_normalized in TENANT_ADMIN_TITLES:
        return "tenant_administration"

    if status == "draft":
        return "draft"

    return "user_page"


def is_default_visible_entity_kind(entity_kind: PageRegistryEntityKind) -> bool:
    return entity_kind in DEFAULT_VISIBLE_ENTITY_KINDS
