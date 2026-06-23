"""WI-ARCH-CORE-002 / WI-ARCH-REG-DATA-002 — core registry normalization tests."""

from __future__ import annotations

from app.modules.platform.architecture_navigator.catalog import CATALOG_LINKS
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.models import ArchitectureComponent, ArchitectureLink
from app.modules.platform.architecture_navigator.registry_constants import (
    CORE_REGISTRY_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_CORE,
    REGISTRY_DATA,
    REGISTRY_SERVICES,
)


def _merged(component_key: str) -> dict:
    for row in service._all_seed_rows():
        if row["component_key"] == component_key:
            return service._merged_seed_row(row)
    raise KeyError(component_key)


def test_core_registry_migration_targets():
    assert REGISTRY_COMPONENT_MIGRATION["ai-context-engine"] == REGISTRY_SERVICES
    assert REGISTRY_COMPONENT_MIGRATION["published-catalog"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["event-journal-core"] == REGISTRY_ARCHIVED
    assert "entity-engine" not in REGISTRY_COMPONENT_MIGRATION
    assert "event-engine" not in REGISTRY_COMPONENT_MIGRATION
    assert "process-engine" not in REGISTRY_COMPONENT_MIGRATION


def test_merged_seed_core_includes_entity_and_event_engines():
    core_keys = {
        service._merged_seed_row(row)["component_key"]
        for row in service._all_seed_rows()
        if service._merged_seed_row(row).get("registry_key") == REGISTRY_CORE
    }
    assert core_keys == set(CORE_REGISTRY_COMPONENT_KEYS)
    assert "ai-context-engine" not in core_keys
    assert "published-catalog" not in core_keys
    assert "event-journal-core" not in core_keys
    assert "entity-engine" in core_keys
    assert "event-engine" in core_keys
    assert "process-engine" in core_keys
    assert len(core_keys) == 12


def test_disputed_elements_have_expected_registry_homes():
    assert _merged("ai-context-engine")["registry_key"] == REGISTRY_SERVICES
    assert _merged("entity-engine")["registry_key"] == REGISTRY_CORE
    assert _merged("event-engine")["registry_key"] == REGISTRY_CORE


def test_object_types_engine_in_core_with_metadata():
    row = _merged("object-types-engine")
    assert row["registry_key"] == REGISTRY_CORE
    assert row["title"] == "Объект"
    scope = COMPONENT_SCAN_SCOPES["object-types-engine"]
    assert "modules/platform/designer/object_types/" in scope["backend"]


def test_core_implementation_paths_use_platform_prefix():
    for key in CORE_REGISTRY_COMPONENT_KEYS:
        scope = COMPONENT_SCAN_SCOPES.get(key)
        assert scope is not None, key
        for path in scope.get("backend") or []:
            assert "modules/designer/" not in path, f"{key} has legacy path {path}"
            assert "modules/runtime_entity/" not in path, f"{key} has legacy path {path}"


def test_core_registry_links_present():
    link_keys = {(item["from"], item["to"], item["type"]) for item in CATALOG_LINKS}
    expected = {
        ("entity-engine", "business-records-data", "stores_data"),
        ("event-engine", "journals-data", "stores_data"),
        ("navigation-engine", "config-group-navigation", "uses"),
        ("config-group-published-catalog", "structure-metadata-data", "used_by"),
        ("decision-control-plane-not-tenant", "platform-identity", "used_by"),
        ("ai-context-engine", "permission-engine", "uses"),
        ("constitution-norm-system-entity-standard", "entity-engine", "used_by"),
        ("fields-engine", "object-types-engine", "uses"),
    }
    assert expected.issubset(link_keys)


def test_ensure_catalog_seeded_migrates_disputed_core_rows():
    components: dict[str, ArchitectureComponent] = {}

    class _ComponentQuery:
        def __init__(self, store: dict[str, ArchitectureComponent]):
            self._store = store
            self._filter_kwargs: dict = {}

        def filter(self, *_args, **_kwargs):
            return self

        def filter_by(self, **kwargs):
            self._filter_kwargs = kwargs
            return self

        def one_or_none(self):
            key = self._filter_kwargs.get("component_key")
            if key is None:
                return None
            return self._store.get(key)

        def all(self):
            return list(self._store.values())

    class _LinkQuery:
        def filter(self, *_args, **_kwargs):
            return self

        def all(self):
            return []

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent:
                return _ComponentQuery(components)
            if model is ArchitectureLink:
                return _LinkQuery()
            raise AssertionError(model)

        def add(self, obj):
            if isinstance(obj, ArchitectureComponent):
                components[obj.component_key] = obj

        def flush(self):
            return None

        def commit(self):
            return None

    for key in (
        "ai-context-engine",
        "event-journal-core",
        "entity-engine",
        "event-engine",
        "process-engine",
        "runtime-entities-data",
        "designer-metadata-data",
    ):
        registry = REGISTRY_DATA if key in {"event-journal-core", "runtime-entities-data", "designer-metadata-data"} else REGISTRY_CORE
        components[key] = ArchitectureComponent(
            component_key=key,
            technical_name=key,
            component_type="core_component",
            category_key="core" if registry == REGISTRY_CORE else "data",
            title=key,
            registry_key=registry,
            element_status="active",
            sort_order=1,
        )

    service.ensure_catalog_seeded(_FakeSession())

    assert components["ai-context-engine"].registry_key == REGISTRY_SERVICES
    assert components["event-journal-core"].registry_key == REGISTRY_ARCHIVED
    assert components["entity-engine"].registry_key == REGISTRY_CORE
    assert components["event-engine"].registry_key == REGISTRY_CORE
    assert components["process-engine"].registry_key == REGISTRY_CORE
    business_records = next(
        (row for row in components.values() if row.component_key == "business-records-data"),
        None,
    )
    assert business_records is not None
    assert business_records.registry_key == REGISTRY_DATA
    assert "object-types-engine" in components
    assert "company-model" in components
    assert "portal-composition-engine" in components
