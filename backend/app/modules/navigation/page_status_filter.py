from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.pages.runtime_access import (
    is_page_visible_in_office_navigation,
    normalize_page_status,
)

_PAGE_ID_IN_URL_RE = re.compile(r"(?:^|/)page/(\d+)(?:/|$|\?)")


def resolve_navigation_page_id(item: NavigationItem) -> int | None:
    if item.page_id is not None:
        return int(item.page_id)

    for candidate in (item.url,):
        text = str(candidate or "").strip()
        if not text:
            continue
        match = _PAGE_ID_IN_URL_RE.search(text)
        if match:
            return int(match.group(1))
    return None


def collect_navigation_page_ids(items: list[NavigationItem]) -> set[int]:
    page_ids: set[int] = set()
    for item in items:
        page_id = resolve_navigation_page_id(item)
        if page_id is not None:
            page_ids.add(page_id)
    return page_ids


def load_page_status_map(db: Session, page_ids: set[int]) -> dict[int, str]:
    if not page_ids:
        return {}
    rows = (
        db.query(Page.id, Page.status)
        .filter(Page.id.in_(page_ids), Page.deleted_at.is_(None))
        .all()
    )
    return {int(page_id): normalize_page_status(status) for page_id, status in rows}


def navigation_item_visible_in_office_menu(
    item: NavigationItem,
    page_status_map: dict[int, str],
) -> bool:
    page_id = resolve_navigation_page_id(item)
    if page_id is not None:
        page_status = page_status_map.get(page_id, "draft")
        return is_page_visible_in_office_navigation(page_status)

    if item.is_visible is False:
        return False
    return True


def filter_navigation_for_office_menu(
    db: Session,
    items: list[NavigationItem],
) -> list[NavigationItem]:
    page_ids = collect_navigation_page_ids(items)
    page_status_map = load_page_status_map(db, page_ids)
    return [
        item
        for item in items
        if navigation_item_visible_in_office_menu(item, page_status_map)
    ]


def filter_navigation_for_user_menu(
    db: Session,
    items: list[NavigationItem],
    *,
    for_edit_mode: bool = False,
) -> list[NavigationItem]:
    """Exclude draft/hidden page links from user menus; keep all items in edit mode."""
    if for_edit_mode:
        return items
    return filter_navigation_for_office_menu(db, items)
