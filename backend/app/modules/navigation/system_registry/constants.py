"""Navigation system item structural keys and catalog definitions."""

from __future__ import annotations

from dataclasses import dataclass

WORKSPACE_NAVIGATION_SYSTEM_KEY_PREFIX = "designer.workspace."


@dataclass(frozen=True, slots=True)
class NavigationSystemItemDefinition:
    system_key: str
    title: str
    route_template: str
    sort_order: int
    menu_scope: str = "designer"
    nav_type: str = "system_page"


DESIGNER_SYSTEM_NAV_ITEMS: tuple[NavigationSystemItemDefinition, ...] = (
    NavigationSystemItemDefinition(
        system_key="designer.objects",
        title="Объекты",
        route_template="/designer/tenant/{tenant_id}/object-types",
        sort_order=0,
    ),
    NavigationSystemItemDefinition(
        system_key="designer.users",
        title="Пользователи",
        route_template="/designer/tenant/{tenant_id}/users",
        sort_order=1,
    ),
    NavigationSystemItemDefinition(
        system_key="designer.settings",
        title="Системные настройки",
        route_template="/designer/tenant/{tenant_id}/settings",
        sort_order=2,
    ),
)


def workspace_navigation_system_key(workspace_id: int, menu_scope: str) -> str:
    return f"{WORKSPACE_NAVIGATION_SYSTEM_KEY_PREFIX}{workspace_id}.{menu_scope}"
