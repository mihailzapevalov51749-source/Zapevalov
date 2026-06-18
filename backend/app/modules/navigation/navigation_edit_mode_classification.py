"""Classification and edit-mode filtering for Office runtime navigation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_navigation_reconcile import (
    find_canonical_runtime_protected_nav,
    is_broken_runtime_nav_artifact,
)
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_PROTECTED_SYSTEM_KEYS,
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.pages.models import Page
from app.modules.pages.protected_pages import resolve_protected_page_key
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.shared.object_type_settings import resolve_show_in_navigation

NavigationEntityKind = Literal[
    "home",
    "user_page",
    "module",
    "library",
    "workspace",
    "object",
    "administration",
    "duplicate",
    "orphan",
    "artifact",
    "legacy_hidden",
    "unknown",
]

OFFICE_RUNTIME_MENU_EXCLUDED_KINDS: frozenset[str] = frozenset(
    {
        "duplicate",
        "orphan",
        "artifact",
        "legacy_hidden",
        "administration",
    }
)

# Backward-compatible alias used by edit-mode cleanup docs/tests.
OFFICE_EDIT_MODE_EXCLUDED_KINDS = OFFICE_RUNTIME_MENU_EXCLUDED_KINDS

HOME_TITLES: frozenset[str] = frozenset(
    {"главная", "главная страница", "главная офиса"},
)

TENANT_ADMIN_TITLES: frozenset[str] = frozenset(
    {"администрирование", "настройка системы"},
)

RUNTIME_MODULE_SYSTEM_KEYS: frozenset[str] = frozenset(
    key for key in RUNTIME_PROTECTED_SYSTEM_KEYS if key != "runtime.office_home"
)


@dataclass(frozen=True)
class NavigationClassificationContext:
    pages_by_id: dict[int, Page]
    object_types_by_id: dict[UUID, DesignerObjectType]
    canonical_home_nav_id: int | None
    runtime_items: tuple[NavigationItem, ...]


def _norm(value: object | None) -> str:
    return str(value or "").strip()


def _norm_lower(value: object | None) -> str:
    return _norm(value).lower()


def _is_home_title(title: str | None) -> bool:
    return _norm_lower(title) in HOME_TITLES


def _resolve_runtime_key(nav: NavigationItem) -> str | None:
    system_key = _norm_lower(nav.system_key)
    if system_key.startswith("runtime."):
        return system_key
    derived = resolve_system_key_for_runtime_protected_title(nav.title)
    return _norm_lower(derived) if derived else None


def _is_canonical_home_nav(nav: NavigationItem, context: NavigationClassificationContext) -> bool:
    if _norm(nav.system_key) == "runtime.office_home":
        return True
    if context.canonical_home_nav_id is not None and int(nav.id) == context.canonical_home_nav_id:
        return True
    return False


def _is_duplicate_home_nav(nav: NavigationItem, context: NavigationClassificationContext) -> bool:
    if not _is_home_title(nav.title):
        return False
    return not _is_canonical_home_nav(nav, context)


def _is_duplicate_protected_nav(nav: NavigationItem, context: NavigationClassificationContext) -> bool:
    from app.modules.navigation.runtime_navigation_reconcile import (
        resolve_runtime_protected_system_key,
    )

    page = context.pages_by_id.get(int(nav.page_id)) if nav.page_id is not None else None
    runtime_key = resolve_runtime_protected_system_key(nav)
    if not runtime_key or runtime_key == "runtime.office_home":
        return False
    if page is None or _norm_lower(page.status) != "draft":
        return False

    for other in context.runtime_items:
        if int(other.id) == int(nav.id):
            continue
        if resolve_runtime_protected_system_key(other) != runtime_key:
            continue
        other_page = (
            context.pages_by_id.get(int(other.page_id)) if other.page_id is not None else None
        )
        if other_page is not None and _norm_lower(other_page.status) == "published":
            return True
    return False


def _has_valid_page_binding(nav: NavigationItem, context: NavigationClassificationContext) -> bool:
    if nav.page_id is None:
        return False
    page = context.pages_by_id.get(int(nav.page_id))
    return page is not None and page.deleted_at is None


def _has_valid_object_binding(nav: NavigationItem, context: NavigationClassificationContext) -> bool:
    if nav.object_type_id is None:
        return False
    object_type = context.object_types_by_id.get(nav.object_type_id)
    return object_type is not None and object_type.deleted_at is None


def _has_valid_source(nav: NavigationItem, context: NavigationClassificationContext) -> bool:
    if _has_valid_page_binding(nav, context):
        return True
    if _has_valid_object_binding(nav, context):
        return True
    if nav.library_id is not None:
        return True
    if _norm(nav.type) == "workspace":
        return True
    if _norm(nav.type) == "external_link" and _norm(nav.url):
        return True
    if _norm(nav.type) == "system_page" and _norm(nav.url):
        return True
    return False


def build_navigation_classification_context(
    db: Session,
    portal_id: int,
    items: list[NavigationItem],
) -> NavigationClassificationContext:
    page_ids = {int(item.page_id) for item in items if item.page_id is not None}
    pages_by_id: dict[int, Page] = {}
    if page_ids:
        pages_by_id = {
            int(page.id): page
            for page in db.query(Page)
            .filter(
                Page.portal_id == portal_id,
                Page.id.in_(page_ids),
                Page.deleted_at.is_(None),
            )
            .all()
        }

    object_type_ids = {item.object_type_id for item in items if item.object_type_id}
    object_types_by_id: dict[UUID, DesignerObjectType] = {}
    if object_type_ids:
        object_types_by_id = {
            row.id: row
            for row in db.query(DesignerObjectType)
            .filter(
                DesignerObjectType.id.in_(object_type_ids),
                DesignerObjectType.deleted_at.is_(None),
            )
            .all()
        }

    home_candidates = [
        item
        for item in items
        if _norm(item.system_key) == "runtime.office_home"
        or _is_home_title(item.title)
    ]
    canonical_home_nav_id: int | None = None
    canonical_home = find_canonical_runtime_protected_nav(
        db,
        portal_id=portal_id,
        system_key="runtime.office_home",
    )
    if canonical_home is not None:
        canonical_home_nav_id = int(canonical_home.id)
    elif home_candidates:
        canonical_home_nav_id = int(
            min(home_candidates, key=lambda nav: (nav.sort_order or 0, nav.id)).id
        )

    return NavigationClassificationContext(
        pages_by_id=pages_by_id,
        object_types_by_id=object_types_by_id,
        canonical_home_nav_id=canonical_home_nav_id,
        runtime_items=tuple(items),
    )


def classify_navigation_entity_kind(
    db: Session,
    nav: NavigationItem,
    *,
    context: NavigationClassificationContext,
) -> NavigationEntityKind:
    page = context.pages_by_id.get(int(nav.page_id)) if nav.page_id is not None else None

    if is_broken_runtime_nav_artifact(nav, page):
        return "artifact"

    if not _has_valid_source(nav, context):
        return "orphan"

    if _is_duplicate_home_nav(nav, context):
        return "duplicate"

    if _is_duplicate_protected_nav(nav, context):
        return "duplicate"

    if nav.object_type_id and nav.object_type_id in context.object_types_by_id:
        object_type = context.object_types_by_id[nav.object_type_id]
        if not resolve_show_in_navigation(object_type.settings_json):
            return "legacy_hidden"
        return "object"

    runtime_key = _resolve_runtime_key(nav)
    if runtime_key == "runtime.office_home" or _is_canonical_home_nav(nav, context):
        return "home"

    if page is not None:
        protected_key = resolve_protected_page_key(db, tenant_id=int(nav.portal_id), page=page)
        if protected_key in {"chat", "notifications", "calendar"}:
            return "module"
    if runtime_key in RUNTIME_MODULE_SYSTEM_KEYS:
        return "module"

    if _norm(nav.type) == "document_library" or nav.library_id is not None:
        return "library"

    if _norm(nav.type) == "workspace" or _norm(nav.system_key).startswith("designer.workspace."):
        return "workspace"

    if _norm_lower(nav.title) in TENANT_ADMIN_TITLES:
        return "administration"

    if nav.page_id is not None and page is not None:
        return "user_page"

    if _norm(nav.type) == "external_link" and _norm(nav.url):
        return "unknown"

    return "unknown"


def is_visible_in_office_runtime_menu(
    entity_kind: NavigationEntityKind,
    *,
    include_system: bool = False,
) -> bool:
    if include_system:
        return True
    return entity_kind not in OFFICE_RUNTIME_MENU_EXCLUDED_KINDS


def is_visible_in_office_edit_mode(
    entity_kind: NavigationEntityKind,
    *,
    include_system: bool = False,
) -> bool:
    return is_visible_in_office_runtime_menu(entity_kind, include_system=include_system)


def filter_navigation_for_office_runtime_menu(
    db: Session,
    portal_id: int,
    items: list[NavigationItem],
    *,
    include_system: bool = False,
) -> list[NavigationItem]:
    if not items:
        return items

    context = build_navigation_classification_context(db, portal_id, items)
    return [
        item
        for item in items
        if is_visible_in_office_runtime_menu(
            classify_navigation_entity_kind(db, item, context=context),
            include_system=include_system,
        )
    ]


def filter_navigation_for_office_edit_mode(
    db: Session,
    portal_id: int,
    items: list[NavigationItem],
    *,
    include_system: bool = False,
) -> list[NavigationItem]:
    return filter_navigation_for_office_runtime_menu(
        db,
        portal_id,
        items,
        include_system=include_system,
    )
