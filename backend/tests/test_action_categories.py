"""Action Category registry and catalog service."""

from app.modules.platform.action_engine.action_categories.models import ActionCategory
from app.modules.platform.action_engine.action_categories.registry import (
    ActionCategoryRegistry,
    action_category_registry,
    ensure_builtin_action_categories_registered,
)
from app.modules.platform.action_engine.action_categories.service import (
    list_action_categories,
)


def test_builtin_action_categories_registered() -> None:
    ensure_builtin_action_categories_registered()

    keys = {item.key for item in action_category_registry.list()}
    assert keys == {
        "crud",
        "relations",
        "notifications",
        "automation",
        "ai",
        "bpmn",
    }


def test_builtin_action_categories_are_system_and_active() -> None:
    ensure_builtin_action_categories_registered()

    for action_category in action_category_registry.list():
        assert action_category.is_system is True
        assert action_category.is_active is True
        assert action_category.name
        assert action_category.description


def test_action_categories_sorted_by_sort_order() -> None:
    ensure_builtin_action_categories_registered()

    sort_orders = [item.sort_order for item in action_category_registry.list()]
    assert sort_orders == sorted(sort_orders)
    assert action_category_registry.list()[0].key == "crud"


def test_registry_is_extensible_without_overwrite() -> None:
    registry = ActionCategoryRegistry()
    registry.register(
        ActionCategory(
            key="custom",
            name="Custom",
            description="Custom category.",
            sort_order=999,
        ),
    )

    assert registry.get("custom") is not None
    assert len(registry.list()) == 1


def test_list_action_categories_service() -> None:
    ensure_builtin_action_categories_registered()

    response = list_action_categories()
    assert len(response.items) == 6
    assert response.items[0].key == "crud"
