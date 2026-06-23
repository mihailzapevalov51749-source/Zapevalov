"""WI-ARCH-REG-SERV-002 — services registry normalization tests."""

from __future__ import annotations

from app.modules.platform.architecture_navigator.catalog import CATALOG_COMPONENTS
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.registry_catalog import (
    REGISTRY_FIELD_OVERRIDES,
    REGISTRY_SUPPLEMENT_COMPONENTS,
)
from app.modules.platform.architecture_navigator.registry_constants import (
    DEPLOYMENT_PHASE_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_CONFIGURATION,
    REGISTRY_SERVICES,
    SERVICES_REGISTRY_COMPONENT_KEYS,
)
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row


def _effective_services_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_SERVICES
    }


def test_services_registry_has_exactly_nine_active_elements():
    keys = _effective_services_keys()
    assert keys == set(SERVICES_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 9


def test_services_registry_excludes_deployment_phases_and_dirty_dev_check():
    keys = _effective_services_keys()
    assert not DEPLOYMENT_PHASE_COMPONENT_KEYS.intersection(keys)
    assert "dirty-dev-check" not in keys
    assert "publication-pipeline" not in keys


def test_deployment_phases_migrated_to_archived():
    for phase_key in DEPLOYMENT_PHASE_COMPONENT_KEYS:
        assert REGISTRY_COMPONENT_MIGRATION[phase_key] == REGISTRY_ARCHIVED


def test_dirty_dev_check_migrated_to_archived():
    assert REGISTRY_COMPONENT_MIGRATION["dirty-dev-check"] == REGISTRY_ARCHIVED


def test_published_catalog_migrated_to_archived():
    assert REGISTRY_COMPONENT_MIGRATION["published-catalog"] == REGISTRY_ARCHIVED


def test_publication_pipeline_legacy_archived():
    assert REGISTRY_COMPONENT_MIGRATION["publication-pipeline"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["publication-service"] == REGISTRY_SERVICES


def test_component_scan_scopes_cover_all_nine_services():
    missing = SERVICES_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_catalog_services_match_document_names():
    by_key = {row["component_key"]: row for row in CATALOG_COMPONENTS}
    assert by_key["publication-service"]["technical_name"] == "Publication Service"
    assert by_key["deployment-execution"]["technical_name"] == "Deployment Execution Service"
    assert by_key["ai-context-engine"]["technical_name"] == "AI Context Service"
    assert by_key["notification-dispatch"]["technical_name"] == "Notification Dispatch Service"


def test_deployment_phase_rows_are_children_of_deployment_execution():
    supplement_by_key = {row["component_key"]: row for row in REGISTRY_SUPPLEMENT_COMPONENTS}
    for phase_key in DEPLOYMENT_PHASE_COMPONENT_KEYS:
        row = supplement_by_key[phase_key]
        assert row.get("parent_key") == "deployment-execution"
        override = REGISTRY_FIELD_OVERRIDES[phase_key]
        assert override["registry_key"] == REGISTRY_ARCHIVED
        assert override["parent_key"] == "deployment-execution"


def test_search_service_not_duplicated_in_supplement():
    supplement_service_keys = {
        row["component_key"]
        for row in REGISTRY_SUPPLEMENT_COMPONENTS
        if row.get("registry_key") == REGISTRY_SERVICES
        or REGISTRY_COMPONENT_MIGRATION.get(row["component_key"]) == REGISTRY_SERVICES
    }
    assert "search-service" not in supplement_service_keys
