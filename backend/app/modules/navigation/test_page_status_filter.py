from types import SimpleNamespace

from app.modules.navigation.page_status_filter import (
    filter_navigation_for_user_menu,
    navigation_item_visible_in_office_menu,
    resolve_navigation_page_id,
)


def _item(**kwargs):
    return SimpleNamespace(
        page_id=kwargs.get("page_id"),
        url=kwargs.get("url"),
        is_visible=kwargs.get("is_visible", True),
    )


def test_resolve_navigation_page_id_from_url() -> None:
    item = _item(url="/portal/1/page/42")
    assert resolve_navigation_page_id(item) == 42


def test_hidden_page_excluded_from_office_menu_even_with_page_id() -> None:
    item = _item(page_id=7, is_visible=True)
    page_status_map = {7: "hidden"}
    assert navigation_item_visible_in_office_menu(item, page_status_map) is False


def test_draft_page_excluded_from_office_menu() -> None:
    item = _item(page_id=7, is_visible=True)
    page_status_map = {7: "draft"}
    assert navigation_item_visible_in_office_menu(item, page_status_map) is False


def test_published_page_included_when_visible() -> None:
    item = _item(page_id=7, is_visible=True)
    page_status_map = {7: "published"}
    assert navigation_item_visible_in_office_menu(item, page_status_map) is True


def test_published_page_visible_even_when_navigation_item_hidden() -> None:
    item = _item(page_id=7, is_visible=False)
    page_status_map = {7: "published"}
    assert navigation_item_visible_in_office_menu(item, page_status_map) is True


def test_hidden_page_excluded_when_linked_only_by_url() -> None:
    item = _item(url="/portal/1/page/9", is_visible=True)
    page_status_map = {9: "hidden"}
    assert navigation_item_visible_in_office_menu(item, page_status_map) is False


def test_filter_navigation_for_user_menu_keeps_items_in_edit_mode(monkeypatch) -> None:
    hidden_item = _item(page_id=1, is_visible=True)
    draft_item = _item(page_id=2, is_visible=True)

    class FakeSession:
        pass

    def fake_load_page_status_map(_db, page_ids):
        return {1: "hidden", 2: "draft"}

    monkeypatch.setattr(
        "app.modules.navigation.page_status_filter.load_page_status_map",
        fake_load_page_status_map,
    )

    filtered = filter_navigation_for_user_menu(
        FakeSession(),
        [hidden_item, draft_item],
        for_edit_mode=True,
    )
    assert filtered == [hidden_item, draft_item]


def test_filter_navigation_for_user_menu_excludes_hidden_and_draft(monkeypatch) -> None:
    hidden_item = _item(page_id=1, is_visible=True)
    draft_item = _item(page_id=2, is_visible=True)
    published_item = _item(page_id=3, is_visible=True)

    class FakeSession:
        pass

    def fake_load_page_status_map(_db, page_ids):
        assert page_ids == {1, 2, 3}
        return {1: "hidden", 2: "draft", 3: "published"}

    monkeypatch.setattr(
        "app.modules.navigation.page_status_filter.load_page_status_map",
        fake_load_page_status_map,
    )

    filtered = filter_navigation_for_user_menu(
        FakeSession(),
        [hidden_item, draft_item, published_item],
    )
    assert filtered == [published_item]
