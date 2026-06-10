import re

import pytest

from app.db.session import SessionLocal
from app.modules.platform_dashboard.owner_dashboard_catalog import (
    COMMUNICATION_ENGINE_KEY,
    DEVELOPMENT_STAGE_KEYS,
    FORBIDDEN_OWNER_LABEL_PATTERNS,
    OWNER_DASHBOARD_CATALOG_VERSION,
    OWNER_SECTION_KEYS,
    OWNER_SECTIONS,
    PLATFORM_ENGINE_KEYS,
    PRIMARY_COMPONENT_OWNER,
    OwnerSourceKind,
    StepDataKind,
    primary_components_for_engine,
    stage_by_key,
    validate_owner_catalog,
)
from app.modules.platform_dashboard.owner_read_adapter import (
    OwnerDashboardView,
    _sanitize_owner_text,
    build_owner_dashboard_view,
)


def test_catalog_version():
    assert OWNER_DASHBOARD_CATALOG_VERSION == "1.0.1"


def test_validate_owner_catalog_has_no_errors():
    assert validate_owner_catalog() == []


def test_section_keys_unique_and_complete():
    keys = [section.key for section in OWNER_SECTIONS]
    assert keys == list(OWNER_SECTION_KEYS)
    assert len(keys) == len(set(keys))


def test_stage_keys_unique():
    stage_keys = [stage.key for section in OWNER_SECTIONS for stage in section.stages]
    assert len(stage_keys) == len(set(stage_keys))


def test_communication_engine_present():
    assert COMMUNICATION_ENGINE_KEY in PLATFORM_ENGINE_KEYS
    stage = stage_by_key(COMMUNICATION_ENGINE_KEY)
    assert stage is not None
    assert stage.meta.get("governance_slug") == "notifications"


def test_tenant_management_absent():
    stage_keys = {stage.key for section in OWNER_SECTIONS for stage in section.stages}
    assert "tenant-management" not in stage_keys


def test_deprecated_development_stages_absent():
    stage_keys = {stage.key for section in OWNER_SECTIONS for stage in section.stages}
    assert "dev-object-platform" not in stage_keys
    assert "dev-legacy-transition" not in stage_keys
    assert "dev-platform-transition" in stage_keys
    assert "dev-relation-field-type" in stage_keys


def test_development_stage_keys_match_addendum():
    dev_keys = [stage.key for section in OWNER_SECTIONS if section.key == "development" for stage in section.stages]
    assert tuple(dev_keys) == DEVELOPMENT_STAGE_KEYS


def test_primary_component_owner_matrix():
    expected = {
        "object-platform": "platform-core",
        "object-type": "object-engine",
        "publish": "object-engine",
        "runtime-entity": "object-engine",
        "object-card": "views-engine",
        "relations": "relations-engine",
        "search": "search-engine",
        "permissions": "permission-engine",
        "ai-context": "ai-engine",
        "control-plane": "control-plane",
    }
    assert PRIMARY_COMPONENT_OWNER == expected


def test_each_component_has_single_primary_engine_in_catalog():
    for component_slug, engine_key in PRIMARY_COMPONENT_OWNER.items():
        primary = primary_components_for_engine(engine_key)
        assert component_slug in primary


def test_no_forbidden_labels_in_catalog_titles():
    pattern = re.compile(
        "|".join(p.replace("(?i)", "") for p in FORBIDDEN_OWNER_LABEL_PATTERNS),
        re.IGNORECASE,
    )
    for section in OWNER_SECTIONS:
        for stage in section.stages:
            assert not pattern.search(stage.title), stage.key
            for step in stage.steps:
                assert not pattern.search(step.title), step.key


def test_source_ref_kinds_valid():
    for section in OWNER_SECTIONS:
        for stage in section.stages:
            for step in stage.steps:
                assert isinstance(step.source_ref.kind, OwnerSourceKind)
                assert step.source_ref.key


def test_static_steps_use_static_or_facet_sources():
    for section in OWNER_SECTIONS:
        for stage in section.stages:
            for step in stage.steps:
                if step.data_kind == StepDataKind.STATIC_DATA:
                    assert step.source_ref.kind in (
                        OwnerSourceKind.STATIC,
                        OwnerSourceKind.COMPANY_FACET,
                    )


def test_sanitize_owner_text_strips_wi_keys():
    assert "P1-W06" not in _sanitize_owner_text("Focus P1-W06 next")
    assert "ACE" not in _sanitize_owner_text("ACE track update")


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_build_owner_dashboard_view_smoke(db):
    view = build_owner_dashboard_view(db)
    assert isinstance(view, OwnerDashboardView)
    assert view.catalog_version == "1.0.1"
    assert len(view.sections) == 4

    platform = next(section for section in view.sections if section.key == "platform")
    assert len(platform.stages) >= 9
    ai_stage = next(stage for stage in platform.stages if stage.id == "ai-engine")
    assert ai_stage.readiness is None or isinstance(ai_stage.readiness, int)

    development = next(section for section in view.sections if section.key == "development")
    assert any(stage.id == "dev-yasii" for stage in development.stages)
    yasii = next(stage for stage in development.stages if stage.id == "dev-yasii")
    relation_field = next(
        stage for stage in development.stages if stage.id == "dev-relation-field-type"
    )
    assert relation_field.title == 'Тип поля "Связи"'
    assert yasii.readiness is None or isinstance(yasii.readiness, int)

    history = next(section for section in view.sections if section.key == "history")
    assert history.kind == "timeline"
