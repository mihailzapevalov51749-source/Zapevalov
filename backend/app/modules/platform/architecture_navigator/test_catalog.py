from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform.architecture_navigator.catalog import CATALOG_COMPONENTS, CATALOG_LINKS
from app.modules.platform.architecture_navigator.constants import (
    CATEGORY_ORDER,
    ArchitectureComponentType,
)
from app.modules.platform.architecture_navigator.models import ArchitectureComponent, ArchitectureLink
from app.modules.platform.architecture_navigator import service


PLATFORM_COMPONENT_KEYS = {
    "platform-modal",
    "platform-page",
    "platform-table",
    "platform-form",
    "platform-tree",
    "platform-card",
    "platform-tabs",
    "platform-drawer",
    "platform-toolbar",
    "platform-notification",
}

PLATFORM_UI_ELEMENT_KEYS = {
    "avatar",
    "user-menu",
    "settings-button",
    "notification-bell",
    "global-search",
    "top-navigation",
    "side-navigation",
    "breadcrumbs",
}


def _catalog_by_key():
    return {row["component_key"]: row for row in CATALOG_COMPONENTS}


def test_category_order_places_platform_ui_after_core_before_modules():
    keys = list(CATEGORY_ORDER)
    core_idx = keys.index("core")
    pc_idx = keys.index("platform_components")
    ui_idx = keys.index("platform_ui_elements")
    modules_idx = keys.index("modules")
    assert core_idx < pc_idx < ui_idx < modules_idx


def test_platform_components_catalog_entries():
    by_key = _catalog_by_key()
    for key in PLATFORM_COMPONENT_KEYS:
        row = by_key[key]
        assert row["category_key"] == "platform_components"
        assert row["component_type"] == ArchitectureComponentType.PLATFORM_COMPONENT.value


def test_platform_ui_elements_catalog_entries():
    by_key = _catalog_by_key()
    for key in PLATFORM_UI_ELEMENT_KEYS:
        row = by_key[key]
        assert row["category_key"] == "platform_ui_elements"
        assert row["component_type"] == ArchitectureComponentType.PLATFORM_UI_ELEMENT.value


def test_platform_ui_categories_do_not_overlap():
    by_key = _catalog_by_key()
    platform_keys = {k for k, r in by_key.items() if r["category_key"] == "platform_components"}
    ui_keys = {k for k, r in by_key.items() if r["category_key"] == "platform_ui_elements"}
    module_keys = {k for k, r in by_key.items() if r["category_key"] == "modules"}
    assert platform_keys == PLATFORM_COMPONENT_KEYS
    assert ui_keys == PLATFORM_UI_ELEMENT_KEYS
    assert platform_keys.isdisjoint(ui_keys)
    assert platform_keys.isdisjoint(module_keys)
    assert ui_keys.isdisjoint(module_keys)


def test_catalog_links_reference_existing_keys():
    keys = {row["component_key"] for row in CATALOG_COMPONENTS}
    for link in CATALOG_LINKS:
        assert link["from"] in keys, link
        assert link["to"] in keys, link


def test_ensure_catalog_seeded_syncs_missing_components():
    existing_keys = {"dev-environment"}
    added_components: list[ArchitectureComponent] = []
    added_links: list[ArchitectureLink] = []
    commits: list[bool] = []

    class _KeyQuery:
        def all(self):
            return [SimpleNamespace(component_key=key) for key in existing_keys]

    class _LinkQuery:
        def all(self):
            return list(added_links)

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent.component_key:
                return _KeyQuery()
            if model is ArchitectureLink:
                return _LinkQuery()
            raise AssertionError(f"unexpected query model: {model}")

        def add(self, obj):
            if isinstance(obj, ArchitectureComponent):
                added_components.append(obj)
                existing_keys.add(obj.component_key)
            elif isinstance(obj, ArchitectureLink):
                added_links.append(obj)

        def flush(self):
            return None

        def commit(self):
            commits.append(True)

    service.ensure_catalog_seeded(_FakeSession())

    added_keys = {row.component_key for row in added_components}
    assert PLATFORM_COMPONENT_KEYS.issubset(added_keys)
    assert PLATFORM_UI_ELEMENT_KEYS.issubset(added_keys)
    assert len(added_links) == len(CATALOG_LINKS)
    assert commits == [True]

    commits.clear()
    service.ensure_catalog_seeded(_FakeSession())
    assert commits == []


def test_get_architecture_tree_includes_platform_categories(monkeypatch):
    rows = [
        SimpleNamespace(
            id=index,
            component_key=row["component_key"],
            title=row["title"],
            technical_name=row["technical_name"],
            component_type=row["component_type"],
            category_key=row["category_key"],
            parent_key=row.get("parent_key"),
            sort_order=row.get("sort_order", 0),
        )
        for index, row in enumerate(CATALOG_COMPONENTS, start=1)
    ]

    class _ComponentQuery:
        def order_by(self, *_args, **_kwargs):
            return self

        def all(self):
            return rows

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent:
                return _ComponentQuery()
            raise AssertionError(f"unexpected query model: {model}")

    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)
    tree = service.get_architecture_tree(_FakeSession())
    category_keys = [category.key for category in tree.categories]

    assert "platform_components" in category_keys
    assert "platform_ui_elements" in category_keys
    assert category_keys.index("core") < category_keys.index("platform_components")
    assert category_keys.index("platform_components") < category_keys.index("platform_ui_elements")
    assert category_keys.index("platform_ui_elements") < category_keys.index("modules")
