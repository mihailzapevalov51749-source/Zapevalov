from __future__ import annotations

from app.modules.platform.action_engine.action_categories.registry import (
    action_category_registry,
    ensure_builtin_action_categories_registered,
)
from app.modules.platform.action_engine.action_types.models import ActionType

_BUILTIN_ACTION_TYPES: tuple[ActionType, ...] = (
    ActionType(
        key="create_record",
        name="Создать запись",
        description="Создание новой записи в объекте платформы.",
        category_key="crud",
    ),
    ActionType(
        key="update_record",
        name="Изменить запись",
        description="Изменение полей существующей записи.",
        category_key="crud",
    ),
    ActionType(
        key="delete_record",
        name="Удалить запись",
        description="Удаление записи из объекта.",
        category_key="crud",
    ),
    ActionType(
        key="create_relation",
        name="Создать связь",
        description="Создание связи между записями.",
        category_key="relations",
    ),
    ActionType(
        key="delete_relation",
        name="Удалить связь",
        description="Удаление связи между записями.",
        category_key="relations",
    ),
)

_builtin_registered = False


class ActionTypeRegistry:
    """Extensible in-memory catalog of Action Types."""

    def __init__(self, category_registry=action_category_registry) -> None:
        self._types: dict[str, ActionType] = {}
        self._category_registry = category_registry

    def register(self, action_type: ActionType, *, overwrite: bool = False) -> None:
        key = str(action_type.key or "").strip()
        category_key = str(action_type.category_key or "").strip()

        if not key:
            raise ValueError("Action Type key is required")

        if not category_key:
            raise ValueError(f"Action Type '{key}' requires category_key")

        if self._category_registry.get(category_key) is None:
            raise ValueError(
                f"Action Type '{key}' references unknown category '{category_key}'",
            )

        if key in self._types and not overwrite:
            raise ValueError(f"Action Type already registered: {key}")

        self._types[key] = action_type

    def get(self, key: str) -> ActionType | None:
        normalized = str(key or "").strip()
        return self._types.get(normalized)

    def list(
        self,
        *,
        active_only: bool = True,
        category_key: str | None = None,
    ) -> list[ActionType]:
        items = list(self._types.values())

        if active_only:
            items = [item for item in items if item.is_active]

        if category_key is not None:
            normalized_category = str(category_key or "").strip()
            items = [
                item for item in items if item.category_key == normalized_category
            ]

        return sorted(items, key=lambda item: item.key)


action_type_registry = ActionTypeRegistry()


def ensure_builtin_action_types_registered() -> None:
    global _builtin_registered

    if _builtin_registered:
        return

    ensure_builtin_action_categories_registered()

    for action_type in _BUILTIN_ACTION_TYPES:
        action_type_registry.register(action_type)

    _builtin_registered = True
