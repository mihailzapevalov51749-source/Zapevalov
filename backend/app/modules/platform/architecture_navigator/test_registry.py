from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform.architecture_navigator.registry_constants import (
    COMPOSITIONAL_REGISTRY_ORDER,
    REGISTRY_ARCHIVED,
    REGISTRY_CONFIGURATION,
    REGISTRY_CORE,
    REGISTRY_DATA,
    REGISTRY_MODULES,
    REGISTRY_LABELS,
    REGISTRY_ORDER,
    REGISTRY_PUBLICATION,
    REGISTRY_RULES,
    REGISTRY_SERVICES,
    REGISTRY_COMPONENT_MIGRATION,
    SERVICES_REGISTRY_COMPONENT_KEYS,
    resolve_registry_key,
)
from app.modules.platform.architecture_navigator.configuration_registry_catalog import (
    CONFIGURATION_REGISTRY_COMPONENTS,
)
from app.modules.platform.architecture_navigator import service


def test_registry_order_matches_v12_compositional_tabs():
    assert REGISTRY_ORDER[0] == "overview"
    assert REGISTRY_ORDER[1:] == COMPOSITIONAL_REGISTRY_ORDER
    assert "publication" not in REGISTRY_ORDER
    assert "rules" not in REGISTRY_ORDER
    assert "runtime" not in REGISTRY_ORDER
    assert len(COMPOSITIONAL_REGISTRY_ORDER) == 8


def test_registry_labels_russian_compositional_only():
    assert REGISTRY_LABELS["core"] == "Ядро"
    assert REGISTRY_LABELS["configuration"] == "Конфигурация"
    assert "publication" not in REGISTRY_LABELS
    assert "rules" not in REGISTRY_LABELS
    assert "runtime" not in REGISTRY_LABELS


def test_resolve_registry_key_runtime_alias():
    assert resolve_registry_key("runtime") == REGISTRY_CONFIGURATION
    assert resolve_registry_key("configuration") == REGISTRY_CONFIGURATION


def test_registry_component_migration_covers_publication_and_rules():
    assert REGISTRY_COMPONENT_MIGRATION["release-package"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["materialize"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["verify"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["publication-service"] == REGISTRY_SERVICES
    assert REGISTRY_COMPONENT_MIGRATION["deployment-execution"] == REGISTRY_SERVICES
    assert REGISTRY_COMPONENT_MIGRATION["company-provisioning"] == REGISTRY_SERVICES
    assert REGISTRY_COMPONENT_MIGRATION["dirty-dev-check"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["version-pin"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["rule-dev-only-development"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["restriction-no-display-as-id"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["ai-context-engine"] == REGISTRY_SERVICES
    assert REGISTRY_COMPONENT_MIGRATION["published-catalog"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["event-journal-core"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["object-schema-data"] == REGISTRY_ARCHIVED
    assert "entity-engine" not in REGISTRY_COMPONENT_MIGRATION
    assert "event-engine" not in REGISTRY_COMPONENT_MIGRATION
    assert "process-engine" not in REGISTRY_COMPONENT_MIGRATION
    assert REGISTRY_COMPONENT_MIGRATION["module-crm"] == REGISTRY_ARCHIVED


def test_services_registry_component_keys_count():
    assert len(SERVICES_REGISTRY_COMPONENT_KEYS) == 9


def test_configuration_registry_has_ten_groups_and_elements():
    group_keys = {
        row["component_key"]
        for row in CONFIGURATION_REGISTRY_COMPONENTS
        if row.get("metadata_json", {}).get("configuration_group")
    }
    assert len(group_keys) == 10
    assert len(CONFIGURATION_REGISTRY_COMPONENTS) == 36


def test_registry_supplement_still_seeds_delivery_and_governance_rows():
    from app.modules.platform.architecture_navigator.registry_catalog import REGISTRY_SUPPLEMENT_COMPONENTS

    keys = {row["component_key"] for row in REGISTRY_SUPPLEMENT_COMPONENTS}
    assert "release-scope" in keys
    assert "dirty-dev-check" in keys
    assert "materialize" in keys
    assert "rule-dev-only-development" in keys


def test_list_registries_excludes_overview_and_legacy(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    class _CountQuery:
        def group_by(self, *_args, **_kwargs):
            return self

        def all(self):
            return [
                (REGISTRY_CORE, 9),
                (REGISTRY_PUBLICATION, 9),
                (REGISTRY_RULES, 7),
                (REGISTRY_ARCHIVED, 12),
            ]

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            return _CountQuery()

    items = service.list_registries(_FakeSession())
    assert all(item.key != "overview" for item in items)
    assert all(item.key not in {REGISTRY_PUBLICATION, REGISTRY_RULES, REGISTRY_ARCHIVED} for item in items)
    assert len(items) == 8
    assert items[0].key == REGISTRY_CORE
    assert items[0].title == "Ядро"


def test_list_registry_elements_unknown_registry(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            raise AssertionError("query should not run for unknown registry")

    try:
        service.list_registry_elements(_FakeSession(), "unknown")
        assert False, "expected HTTPException"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 404


def test_list_registry_elements_rejects_legacy_publication(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            raise AssertionError("query should not run for legacy registry")

    try:
        service.list_registry_elements(_FakeSession(), REGISTRY_PUBLICATION)
        assert False, "expected HTTPException"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 404


def test_list_registry_elements_returns_sorted_items(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)
    rows = [
        SimpleNamespace(
            id=2,
            component_key="b",
            title="Beta",
            technical_name="Beta",
            component_type="core_engine",
            element_status="active",
            sort_order=20,
        ),
        SimpleNamespace(
            id=1,
            component_key="a",
            title="Alpha",
            technical_name="Alpha",
            component_type="core_engine",
            element_status="active",
            sort_order=10,
        ),
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
    assert response.registry_label == "Ядро"
    assert [item.key for item in response.elements] == ["b", "a"]


def test_list_registry_elements_resolves_runtime_alias(monkeypatch):
    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    class _FilterQuery:
        def filter(self, *_args, **_kwargs):
            return self

        def order_by(self, *_args, **_kwargs):
            return self

        def all(self):
            return [
                SimpleNamespace(
                    id=1,
                    component_key="config-group-navigation",
                    title="Навигация",
                    technical_name="Navigation Configuration",
                    component_type="configuration",
                    element_status="active",
                    sort_order=10,
                ),
            ]

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            return _FilterQuery()

    response = service.list_registry_elements(_FakeSession(), "runtime")
    assert response.registry_key == REGISTRY_CONFIGURATION
    assert response.registry_label == "Конфигурация"
    assert response.elements[0].key == "config-group-navigation"
