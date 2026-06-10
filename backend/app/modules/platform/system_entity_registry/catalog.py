"""System Entity catalog — single registry of ADR-007 entities."""

from __future__ import annotations

from app.modules.platform.system_entity_registry.specs.default_quick_form import (
    DEFAULT_QUICK_FORM_SPEC,
)
from app.modules.platform.system_entity_registry.specs.navigation import (
    NAVIGATION_SYSTEM_ITEM_SPEC,
    WORKSPACE_NAVIGATION_PLACEMENT_SPEC,
)
from app.modules.platform.system_entity_registry.specs.plan_root import PLAN_ROOT_ANCHOR_SPEC
from app.modules.platform.system_entity_registry.specs.workspace_home import (
    WORKSPACE_HOME_PAGE_SPEC,
    WORKSPACE_HOME_TAB_SPEC,
    WORKSPACE_ROOT_SECTION_SPEC,
)
from app.modules.platform.system_entity_registry.types import SystemEntitySpec

SYSTEM_ENTITY_CATALOG: tuple[SystemEntitySpec, ...] = (
    PLAN_ROOT_ANCHOR_SPEC,
    DEFAULT_QUICK_FORM_SPEC,
    WORKSPACE_HOME_TAB_SPEC,
    WORKSPACE_HOME_PAGE_SPEC,
    WORKSPACE_ROOT_SECTION_SPEC,
    NAVIGATION_SYSTEM_ITEM_SPEC,
    WORKSPACE_NAVIGATION_PLACEMENT_SPEC,
)

SYSTEM_ENTITY_CATALOG_BY_TYPE: dict[str, SystemEntitySpec] = {
    spec.system_type: spec for spec in SYSTEM_ENTITY_CATALOG
}


def get_system_entity_spec(system_type: str) -> SystemEntitySpec | None:
    return SYSTEM_ENTITY_CATALOG_BY_TYPE.get(system_type)
