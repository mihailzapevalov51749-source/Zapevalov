"""Platform Action Engine — categories, types, definitions, placements (foundation)."""

from app.modules.platform.action_engine.action_categories.registry import (
    action_category_registry,
    ensure_builtin_action_categories_registered,
)
from app.modules.platform.action_engine.action_placements.registry import (
    action_placement_registry,
    ensure_builtin_action_placements_registered,
)
from app.modules.platform.action_engine.action_types.registry import (
    action_type_registry,
    ensure_builtin_action_types_registered,
)

ensure_builtin_action_categories_registered()
ensure_builtin_action_types_registered()
ensure_builtin_action_placements_registered()

__all__ = [
    "action_category_registry",
    "action_placement_registry",
    "action_type_registry",
    "ensure_builtin_action_categories_registered",
    "ensure_builtin_action_placements_registered",
    "ensure_builtin_action_types_registered",
]
