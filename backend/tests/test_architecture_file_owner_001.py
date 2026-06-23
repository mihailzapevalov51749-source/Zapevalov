"""Tests for Architecture File Owner Resolver (WI-ARCH-FILE-OWNER-001)."""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("APP_ENV", "DEV")

from app.modules.platform.architecture_navigator.architecture_file_owner import (
    normalize_platform_file_path,
    registry_for_component,
    resolve_file_owner,
    resolve_primary_owner,
    resolve_related_elements,
)
from app.modules.platform.architecture_navigator.ownership_policy import CODE_OWNER


@pytest.mark.parametrize(
    ("file_path", "expected_primary", "expected_confidence"),
    [
        (
            "frontend/src/api/navigationApi.js",
            "standard-ui-navigation-shell",
            "HIGH",
        ),
        (
            "backend/app/modules/platform/runtime/entities/service.py",
            "entity-engine",
            "HIGH",
        ),
        (
            "frontend/src/shared/platformModal/PlatformModal.jsx",
            "platform-modal",
            "HIGH",
        ),
        (
            "frontend/src/modules/yasii/NewWidget.jsx",
            "module-yasii",
            "MEDIUM",
        ),
        (
            "frontend/src/modules/designer/components/actions/resolveActionTypeIcon.js",
            "module-bpmn",
            "HIGH",
        ),
        (
            "backend/app/custom/orphan/foo.py",
            "config-group-module-placement",
            "LOW",
        ),
    ],
)
def test_resolve_file_owner_cases(file_path, expected_primary, expected_confidence):
    resolution = resolve_file_owner(file_path)
    assert resolution.primary_owner == expected_primary, (
        f"{file_path}: expected {expected_primary}, got {resolution.primary_owner}"
    )
    assert resolution.confidence == expected_confidence
    assert resolution.ownership_class == CODE_OWNER
    assert resolution.registry
    assert resolution.reason


def test_navigation_api_related_elements():
    resolution = resolve_file_owner("frontend/src/api/navigationApi.js")
    assert resolution.primary_owner == "standard-ui-navigation-shell"
    assert resolution.registry == "standards"


def test_entity_service_related_elements():
    resolution = resolve_file_owner("backend/app/modules/platform/runtime/entities/service.py")
    assert resolution.primary_owner == "entity-engine"
    assert "business-records-data" in resolution.related_elements or "decision-entity-sot" in resolution.related_elements


def test_platform_modal_related_elements():
    related = resolve_related_elements("frontend/src/shared/platformModal/PlatformModal.jsx")
    assert "standard-ui-modal" in related or "modal-zone" in related or "side-panel" in related


def test_new_yasii_file_via_residual():
    assert resolve_primary_owner("frontend/src/modules/yasii/NewWidget.jsx") == "module-yasii"


def test_new_yasii_file_canonical_scope_path():
    assert resolve_primary_owner("frontend/src/yasii/NewWidget.jsx") == "module-yasii"
    resolution = resolve_file_owner("frontend/src/yasii/NewWidget.jsx")
    assert resolution.confidence == "HIGH"


def test_unknown_file_fallback():
    resolution = resolve_file_owner("backend/app/custom/orphan/foo.py")
    assert resolution.primary_owner == "config-group-module-placement"
    assert resolution.confidence == "LOW"
    assert "Fallback" in resolution.reason


def test_normalize_platform_file_path():
    canonical, side, rel = normalize_platform_file_path("modules/navigation/router.py")
    assert side == "backend"
    assert rel == "modules/navigation/router.py"
    assert canonical == "backend/app/modules/navigation/router.py"

    canonical, side, rel = normalize_platform_file_path("frontend/src/api/navigationApi.js")
    assert side == "frontend"
    assert rel == "api/navigationApi.js"


def test_registry_for_component_core():
    assert registry_for_component("entity-engine") == "core"


def test_resolve_file_owner_json_shape():
    data = resolve_file_owner("backend/app/modules/yasii/router.py").to_dict()
    assert set(data) == {
        "file_path",
        "primary_owner",
        "registry",
        "ownership_class",
        "related_elements",
        "reason",
        "confidence",
        "side",
        "rel_path",
    }


def test_bare_frontend_path():
    resolution = resolve_file_owner("yasii/components/YasiiLauncher.jsx")
    assert resolution.primary_owner == "module-yasii"
    assert resolution.file_path.startswith("frontend/src/")
