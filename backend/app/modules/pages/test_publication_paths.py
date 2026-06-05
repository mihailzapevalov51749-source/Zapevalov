from types import SimpleNamespace

from app.modules.platform.designer.pages.service import (
    _build_publication_path_segments,
    _contour_label,
    _page_is_published,
)


def test_contour_label_for_designer_scope() -> None:
    assert _contour_label("designer") == "Студия"
    assert _contour_label("runtime") == "Офис"


def test_navigation_publication_path_office() -> None:
    item = SimpleNamespace(menu_scope="runtime", title="Вторая")
    path = _build_publication_path_segments(
        kind="navigation",
        workspace_title=None,
        tab_title=None,
        navigation_item=item,
        page_title="Вторая",
    )
    assert path == ["Офис", "Навигация", "Вторая"]


def test_navigation_publication_path_studio() -> None:
    item = SimpleNamespace(menu_scope="designer", title="Страницы")
    path = _build_publication_path_segments(
        kind="navigation",
        workspace_title=None,
        tab_title=None,
        navigation_item=item,
        page_title="Страницы",
    )
    assert path == ["Студия", "Навигация", "Страницы"]


def test_workspace_home_publication_path() -> None:
    path = _build_publication_path_segments(
        kind="workspace_home",
        workspace_title="Проекты",
        tab_title=None,
        navigation_item=None,
        page_title="Главная",
    )
    assert path == ["Офис", "Рабочее пространство", "Проекты", "Главная страница"]


def test_workspace_tab_publication_path() -> None:
    path = _build_publication_path_segments(
        kind="workspace_tab",
        workspace_title="Проекты",
        tab_title="План",
        navigation_item=None,
        page_title="План",
    )
    assert path == ["Офис", "Рабочее пространство", "Проекты", "Вкладка", "План"]


def test_page_is_published_only_for_published_status() -> None:
    assert _page_is_published(SimpleNamespace(status="published")) is True
    assert _page_is_published(SimpleNamespace(status="hidden")) is False
    assert _page_is_published(SimpleNamespace(status="draft")) is False
