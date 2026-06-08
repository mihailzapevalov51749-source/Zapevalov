from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ActionPlacementKey:
    key: str
    name: str
    description: str
    sort_order: int = 0
    is_active: bool = True
    is_system: bool = True


_BUILTIN_PLACEMENT_KEYS: tuple[ActionPlacementKey, ...] = (
    ActionPlacementKey(
        key="record_card",
        name="Карточка записи",
        description="Действие отображается в карточке записи.",
        sort_order=10,
    ),
    ActionPlacementKey(
        key="table",
        name="Таблица",
        description="Действие отображается в панели таблицы.",
        sort_order=20,
    ),
    ActionPlacementKey(
        key="row_menu",
        name="Меню строки",
        description="Действие отображается в меню строки таблицы.",
        sort_order=30,
    ),
    ActionPlacementKey(
        key="top_panel",
        name="Верхняя панель",
        description="Действие отображается в верхней панели объекта.",
        sort_order=40,
    ),
    ActionPlacementKey(
        key="record_toolbar",
        name="Панель записи",
        description="Действие отображается в панели выбранной записи.",
        sort_order=50,
    ),
)

_builtin_registered = False


class ActionPlacementRegistry:
    """Extensible in-memory catalog of Action Placement keys."""

    def __init__(self) -> None:
        self._placements: dict[str, ActionPlacementKey] = {}

    def register(
        self,
        placement: ActionPlacementKey,
        *,
        overwrite: bool = False,
    ) -> None:
        key = str(placement.key or "").strip()

        if not key:
            raise ValueError("Action Placement key is required")

        if key in self._placements and not overwrite:
            raise ValueError(f"Action Placement already registered: {key}")

        self._placements[key] = placement

    def get(self, key: str) -> ActionPlacementKey | None:
        normalized = str(key or "").strip()
        return self._placements.get(normalized)

    def list(self, *, active_only: bool = True) -> list[ActionPlacementKey]:
        items = list(self._placements.values())

        if active_only:
            items = [item for item in items if item.is_active]

        return sorted(items, key=lambda item: (item.sort_order, item.key))


action_placement_registry = ActionPlacementRegistry()


def ensure_builtin_action_placements_registered() -> None:
    global _builtin_registered

    if _builtin_registered:
        return

    for placement in _BUILTIN_PLACEMENT_KEYS:
        action_placement_registry.register(placement)

    _builtin_registered = True
