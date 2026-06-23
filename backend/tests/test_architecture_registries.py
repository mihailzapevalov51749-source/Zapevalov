"""Architecture registries tests (WI-ARCH-REG-002) — run from tests/ to avoid platform shadowing."""

from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform.architecture_navigator.catalog import CATALOG_COMPONENTS, CATALOG_LINKS
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.models import ArchitectureComponent, ArchitectureLink
from app.modules.platform.architecture_navigator.registry_catalog import REGISTRY_SUPPLEMENT_COMPONENTS
from app.modules.platform.architecture_navigator.registry_constants import (
    COMPOSITIONAL_REGISTRY_ORDER,
    REGISTRY_CORE,
    REGISTRY_LABELS,
    REGISTRY_ORDER,
    REGISTRY_PUBLICATION,
)


def test_registry_order_matches_v12_tabs():
    assert REGISTRY_ORDER[0] == "overview"
    assert REGISTRY_ORDER[1:] == COMPOSITIONAL_REGISTRY_ORDER
    assert len(REGISTRY_ORDER) == 9
    assert REGISTRY_PUBLICATION not in REGISTRY_ORDER


def test_registry_supplement_includes_publication_pipeline():
    keys = {row["component_key"] for row in REGISTRY_SUPPLEMENT_COMPONENTS}
    assert {"release-scope", "dirty-dev-check", "materialize"}.issubset(keys)
    assert "publication-pipeline" not in keys


def test_ensure_catalog_seeded_adds_supplement_and_links():
    existing_components: dict[str, ArchitectureComponent] = {}
    added_links: list[ArchitectureLink] = []
    commits: list[bool] = []

    class _ComponentQuery:
        def filter(self, *_args, **_kwargs):
            return self

        def all(self):
            return list(existing_components.values())

    class _LinkQuery:
        def all(self):
            return list(added_links)

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent:
                return _ComponentQuery()
            if model is ArchitectureLink:
                return _LinkQuery()
            raise AssertionError(f"unexpected query model: {model}")

        def add(self, obj):
            if isinstance(obj, ArchitectureComponent):
                existing_components[obj.component_key] = obj
            elif isinstance(obj, ArchitectureLink):
                added_links.append(obj)

        def flush(self):
            return None

        def commit(self):
            commits.append(True)

    service.ensure_catalog_seeded(_FakeSession())
    assert "release-scope" in existing_components
    assert len(added_links) == len(CATALOG_LINKS)
    assert commits == [True]


def test_list_registries_excludes_overview(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    class _CountQuery:
        def group_by(self, *_args, **_kwargs):
            return self

        def all(self):
            return [(REGISTRY_CORE, 11), (REGISTRY_PUBLICATION, 9)]

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            return _CountQuery()

    items = service.list_registries(_FakeSession())
    assert all(item.key != "overview" for item in items)
    assert all(item.key != REGISTRY_PUBLICATION for item in items)
    assert len(items) == 8
    assert items[0].title == REGISTRY_LABELS[REGISTRY_CORE]


def test_list_registry_elements_unknown_registry(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            raise AssertionError("query should not run for unknown registry")

    try:
        service.list_registry_elements(_FakeSession(), "unknown")
        raise AssertionError("expected HTTPException")
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 404


def test_list_registry_elements_returns_items(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)
    rows = [
        SimpleNamespace(
            id=1,
            component_key="entity-engine",
            title="Объекты",
            technical_name="Entity Engine",
            component_type="core_component",
            element_status="active",
            sort_order=10,
        )
    ]

    class _FilterQuery:
        def filter(self, *_args, **_kwargs):
            return self

        def order_by(self, *_args, **_kwargs):
            return self

        def all(self):
            return rows

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            return _FilterQuery()

    response = service.list_registry_elements(_FakeSession(), REGISTRY_CORE)
    assert response.registry_key == REGISTRY_CORE
    assert response.elements[0].key == "entity-engine"


def test_legacy_catalog_still_has_components():
    assert len(CATALOG_COMPONENTS) >= 30
