"""Action Type registry and catalog service."""

import pytest

from app.modules.platform.action_engine.action_categories.models import ActionCategory
from app.modules.platform.action_engine.action_categories.registry import (
    ActionCategoryRegistry,
)
from app.modules.platform.action_engine.action_types.models import ActionType
from app.modules.platform.action_engine.action_types.registry import (
    ActionTypeRegistry,
    action_type_registry,
    ensure_builtin_action_types_registered,
)
from app.modules.platform.action_engine.action_types.service import list_action_types


def test_builtin_action_types_registered() -> None:
    ensure_builtin_action_types_registered()

    keys = {item.key for item in action_type_registry.list()}
    assert keys == {
        "create_record",
        "update_record",
        "delete_record",
        "create_relation",
        "delete_relation",
    }


def test_builtin_action_types_are_linked_to_categories() -> None:
    ensure_builtin_action_types_registered()

    assert action_type_registry.get("create_record").category_key == "crud"
    assert action_type_registry.get("update_record").category_key == "crud"
    assert action_type_registry.get("delete_record").category_key == "crud"
    assert action_type_registry.get("create_relation").category_key == "relations"
    assert action_type_registry.get("delete_relation").category_key == "relations"


def test_builtin_action_types_are_system_and_active() -> None:
    ensure_builtin_action_types_registered()

    for action_type in action_type_registry.list():
        assert action_type.is_system is True
        assert action_type.is_active is True
        assert action_type.name
        assert action_type.description
        assert action_type.category_key


def test_registry_requires_existing_category() -> None:
    category_registry = ActionCategoryRegistry()
    category_registry.register(
        ActionCategory(
            key="notifications",
            name="Уведомления",
            description="Notifications.",
            sort_order=10,
        ),
    )

    type_registry = ActionTypeRegistry(category_registry=category_registry)
    type_registry.register(
        ActionType(
            key="send_notification",
            name="Отправить уведомление",
            description="Отправка уведомления пользователю.",
            category_key="notifications",
        ),
    )

    assert type_registry.get("send_notification") is not None

    with pytest.raises(ValueError, match="unknown category"):
        type_registry.register(
            ActionType(
                key="ask_ai",
                name="Спросить ИИ",
                description="Запрос к ИИ.",
                category_key="ai",
            ),
        )


def test_list_action_types_service_returns_category_key() -> None:
    ensure_builtin_action_types_registered()

    response = list_action_types()
    keys = [item.key for item in response.items]

    assert keys == sorted(keys)
    assert response.items[0].category_key in {"crud", "relations"}
