from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.pages.runtime_access import (
    PAGE_STATUS_HIDDEN,
    PAGE_STATUS_PUBLISHED,
    is_page_visible_in_office_navigation,
    normalize_page_status,
)
from app.modules.navigation.page_status_filter import (
    collect_navigation_page_ids,
    load_page_status_map,
    resolve_navigation_page_id,
)


def is_page_linked_navigation_item(item: NavigationItem) -> bool:
    return resolve_navigation_page_id(item) is not None


def page_status_for_navigation_item(
    item: NavigationItem,
    page_status_map: dict[int, str],
) -> str | None:
    page_id = resolve_navigation_page_id(item)
    if page_id is None:
        return None
    return page_status_map.get(page_id, "draft")


def effective_navigation_is_visible(
    item: NavigationItem,
    page_status_map: dict[int, str],
) -> bool:
    page_id = resolve_navigation_page_id(item)
    if page_id is not None:
        page_status = page_status_map.get(page_id, "draft")
        return is_page_visible_in_office_navigation(page_status)
    return item.is_visible is not False


def apply_page_status_visibility_update(
    db: Session,
    item: NavigationItem,
    *,
    is_visible: bool,
) -> bool:
    """Map eye toggle for page-linked items to pages.status. Returns True if handled."""
    page_id = resolve_navigation_page_id(item)
    if page_id is None:
        return False

    page = (
        db.query(Page)
        .filter(Page.id == page_id, Page.deleted_at.is_(None))
        .first()
    )
    if page is None:
        return False

    current = normalize_page_status(page.status)
    if is_visible:
        if current != PAGE_STATUS_PUBLISHED:
            page.status = PAGE_STATUS_PUBLISHED
    else:
        if current == PAGE_STATUS_PUBLISHED:
            page.status = PAGE_STATUS_HIDDEN
        elif current == PAGE_STATUS_HIDDEN:
            pass
        else:
            page.status = PAGE_STATUS_HIDDEN
    return True


def load_page_status_map_for_items(
    db: Session,
    items: list[NavigationItem],
) -> dict[int, str]:
    page_ids = collect_navigation_page_ids(items)
    return load_page_status_map(db, page_ids)
