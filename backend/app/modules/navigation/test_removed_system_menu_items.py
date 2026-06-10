from app.modules.navigation.models import NavigationItem
from app.modules.navigation.removed_system_menu_items import (
    filter_removed_navigation_items,
    is_removed_designer_navigation_item,
    is_removed_office_navigation_item,
)


def _item(**kwargs) -> NavigationItem:
    return NavigationItem(**kwargs)


def test_is_removed_office_navigation_item_my_tasks() -> None:
    item = _item(title="Мои задачи", type="universal_table", menu_scope="runtime")
    assert is_removed_office_navigation_item(item) is True


def test_is_removed_designer_navigation_item_relations() -> None:
    item = _item(
        title="Связи",
        type="system_page",
        menu_scope="designer",
        system_key="designer.relations",
        url="/designer/tenant/1/relations",
        is_system=True,
    )
    assert is_removed_designer_navigation_item(item) is True


def test_filter_removed_navigation_items_runtime() -> None:
    items = [
        _item(title="Договоры", type="page", menu_scope="runtime"),
        _item(title="Мои задачи", type="universal_table", menu_scope="runtime"),
    ]
    filtered = filter_removed_navigation_items(items, menu_scope="runtime")
    assert [item.title for item in filtered] == ["Договоры"]
