from __future__ import annotations

from app.modules.platform.action_engine.action_categories.models import ActionCategory

_BUILTIN_ACTION_CATEGORIES: tuple[ActionCategory, ...] = (
    ActionCategory(
        key="crud",
        name="CRUD",
        description="Операции создания, изменения и удаления записей.",
        sort_order=10,
    ),
    ActionCategory(
        key="relations",
        name="Связи",
        description="Управление связями между объектами.",
        sort_order=20,
    ),
    ActionCategory(
        key="notifications",
        name="Уведомления",
        description="Оповещение пользователей и внешних систем.",
        sort_order=30,
    ),
    ActionCategory(
        key="automation",
        name="Автоматизация",
        description="Автоматические действия и интеграции.",
        sort_order=40,
    ),
    ActionCategory(
        key="ai",
        name="ИИ",
        description="Действия, использующие искусственный интеллект.",
        sort_order=50,
    ),
    ActionCategory(
        key="bpmn",
        name="Процессы",
        description="Запуск и управление бизнес-процессами.",
        sort_order=60,
    ),
)

_builtin_registered = False


class ActionCategoryRegistry:
    """Extensible in-memory catalog of Action Categories."""

    def __init__(self) -> None:
        self._categories: dict[str, ActionCategory] = {}

    def register(
        self,
        action_category: ActionCategory,
        *,
        overwrite: bool = False,
    ) -> None:
        key = str(action_category.key or "").strip()

        if not key:
            raise ValueError("Action Category key is required")

        if key in self._categories and not overwrite:
            raise ValueError(f"Action Category already registered: {key}")

        self._categories[key] = action_category

    def get(self, key: str) -> ActionCategory | None:
        normalized = str(key or "").strip()
        return self._categories.get(normalized)

    def list(self, *, active_only: bool = True) -> list[ActionCategory]:
        items = list(self._categories.values())

        if active_only:
            items = [item for item in items if item.is_active]

        return sorted(items, key=lambda item: (item.sort_order, item.key))


action_category_registry = ActionCategoryRegistry()


def ensure_builtin_action_categories_registered() -> None:
    global _builtin_registered

    if _builtin_registered:
        return

    for action_category in _BUILTIN_ACTION_CATEGORIES:
        action_category_registry.register(action_category)

    _builtin_registered = True
