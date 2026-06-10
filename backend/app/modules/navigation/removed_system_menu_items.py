from __future__ import annotations

import re

from app.modules.navigation.models import NavigationItem

_REMOVED_OFFICE_MENU_TITLES = {"мои задачи"}

_REMOVED_DESIGNER_SYSTEM_KEYS = {
    "designer.relations",
    "designer.views",
    "designer.navigation",
    "designer.publishing",
}

_REMOVED_DESIGNER_MENU_TITLES = {
    "связи",
    "вкладки",
    "навигация",
    "публикация",
    "представления",
}

_DESIGNER_ROUTE_SUFFIXES = (
    "/relations",
    "/views",
    "/navigation",
    "/publishing",
)


def _normalized_title(item: NavigationItem) -> str:
    return str(item.title or "").strip().lower()


def _normalized_url(item: NavigationItem) -> str:
    return str(item.url or "").strip().lower()


def is_removed_office_navigation_item(item: NavigationItem) -> bool:
    title = _normalized_title(item)
    url = _normalized_url(item)

    if title in _REMOVED_OFFICE_MENU_TITLES:
        return True

    if item.system_key in {"office.my_tasks", "runtime.my_tasks"}:
        return True

    if "/my-tasks" in url:
        return True

    if item.type == "universal_table" and title in _REMOVED_OFFICE_MENU_TITLES:
        return True

    return False


def is_removed_designer_navigation_item(item: NavigationItem) -> bool:
    if item.menu_scope != "designer":
        return False

    system_key = str(item.system_key or "").strip().lower()
    if system_key in _REMOVED_DESIGNER_SYSTEM_KEYS:
        return True

    title = _normalized_title(item)
    url = _normalized_url(item)

    if title in _REMOVED_DESIGNER_MENU_TITLES and (
        item.type == "system_page"
        or item.is_system is True
        or item.is_protected is True
        or system_key.startswith("designer.")
    ):
        return True

    if item.type == "system_page" or item.is_system is True:
        for suffix in _DESIGNER_ROUTE_SUFFIXES:
            if re.search(rf"{re.escape(suffix)}(?:/|$|\?)", url):
                return True

    return False


def filter_removed_navigation_items(
    items: list[NavigationItem],
    *,
    menu_scope: str | None,
) -> list[NavigationItem]:
    if not items:
        return items

    if menu_scope == "designer":
        predicate = is_removed_designer_navigation_item
    elif menu_scope in {None, "runtime"}:
        predicate = is_removed_office_navigation_item
    else:
        return items

    return [item for item in items if not predicate(item)]
