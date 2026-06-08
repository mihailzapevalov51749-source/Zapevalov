"""Action Placement registry and catalog service."""

import pytest

from app.modules.platform.action_engine.action_placements.registry import (
    ActionPlacementKey,
    ActionPlacementRegistry,
    action_placement_registry,
    ensure_builtin_action_placements_registered,
)
from app.modules.platform.action_engine.action_placements.service import (
    list_placement_catalog,
)


def test_builtin_action_placements_registered() -> None:
    ensure_builtin_action_placements_registered()

    keys = {item.key for item in action_placement_registry.list()}
    assert keys == {"record_card", "table", "row_menu", "top_panel", "record_toolbar"}


def test_builtin_action_placements_have_labels_and_descriptions() -> None:
    ensure_builtin_action_placements_registered()

    record_card = action_placement_registry.get("record_card")
    assert record_card is not None
    assert record_card.name == "Карточка записи"
    assert "карточке записи" in record_card.description


def test_registry_rejects_duplicate_key() -> None:
    registry = ActionPlacementRegistry()
    registry.register(
        ActionPlacementKey(
            key="table",
            name="Таблица",
            description="Test.",
            sort_order=10,
        ),
    )

    with pytest.raises(ValueError, match="already registered"):
        registry.register(
            ActionPlacementKey(
                key="table",
                name="Таблица 2",
                description="Duplicate.",
                sort_order=20,
            ),
        )


def test_list_placement_catalog_service_returns_sorted_items() -> None:
    ensure_builtin_action_placements_registered()

    items = list_placement_catalog()
    keys = [item.key for item in items]

    assert keys == ["record_card", "table", "row_menu", "top_panel", "record_toolbar"]
    assert items[0].name == "Карточка записи"


def test_record_toolbar_placement_metadata() -> None:
    ensure_builtin_action_placements_registered()

    record_toolbar = action_placement_registry.get("record_toolbar")
    assert record_toolbar is not None
    assert record_toolbar.name == "Панель записи"
    assert "выбранной записи" in record_toolbar.description
