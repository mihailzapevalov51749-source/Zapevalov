from types import SimpleNamespace

from app.modules.navigation.page_navigation_visibility import (
    apply_page_status_visibility_update,
    effective_navigation_is_visible,
)


def _item(**kwargs):
    return SimpleNamespace(
        page_id=kwargs.get("page_id"),
        url=kwargs.get("url"),
        is_visible=kwargs.get("is_visible", True),
    )


def test_effective_visibility_for_page_uses_status_not_is_visible() -> None:
    item = _item(page_id=5, is_visible=False)
    page_status_map = {5: "published"}
    assert effective_navigation_is_visible(item, page_status_map) is True


def test_effective_visibility_for_non_page_uses_is_visible() -> None:
    item = _item(page_id=None, is_visible=False)
    assert effective_navigation_is_visible(item, {}) is False


def test_apply_page_status_visibility_update_maps_eye_toggle() -> None:
    class FakeQuery:
        def __init__(self, page):
            self._page = page

        def filter(self, *args, **kwargs):
            return self

        def first(self):
            return self._page

    class FakeSession:
        def __init__(self, page):
            self._page = page

        def query(self, model):
            return FakeQuery(self._page)

        def commit(self):
            return None

    page = SimpleNamespace(id=9, status="published", deleted_at=None)
    session = FakeSession(page)

    handled = apply_page_status_visibility_update(
        session,
        _item(page_id=9),
        is_visible=False,
    )
    assert handled is True
    assert page.status == "hidden"
