"""Tests for Primary Owner policy and scanner ownership (WI-ARCH-OWNERSHIP-003)."""

from __future__ import annotations

from pathlib import Path

from app.modules.platform.architecture_navigator.ownership_policy import (
    AGGREGATOR,
    CODE_OWNER,
    CONCEPTUAL,
    OWNERSHIP_ROLE_PRIMARY,
    OWNERSHIP_ROLE_RELATED,
    can_be_primary_owner,
    ownership_class,
    partition_file_owners,
    pick_primary_owner,
)
from app.modules.platform.architecture_navigator.scanner import (
    ScanFindingDraft,
    _append_file_ownership_findings,
)


def test_entity_engine_beats_business_records_data():
    rel = "modules/platform/runtime/entities/service.py"
    primary = pick_primary_owner(
        ["business-records-data", "entity-engine"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "entity-engine"


def test_navigation_engine_beats_config_group_navigation():
    rel = "modules/navigation/router.py"
    primary = pick_primary_owner(
        ["config-group-navigation", "navigation-engine", "breadcrumbs"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "navigation-engine"


def test_platform_modal_beats_modal_zone():
    rel = "shared/platformModal/PlatformModal.jsx"
    primary = pick_primary_owner(
        ["modal-zone", "platform-modal", "standard-ui-modal"],
        rel_path=rel,
        side="frontend",
    )
    assert primary == "platform-modal"


def test_platform_context_menu_beats_context_menu():
    rel = "shared/objectPlatform/objectContextMenu/ObjectContextMenu.jsx"
    primary = pick_primary_owner(
        ["context-menu", "platform-context-menu"],
        rel_path=rel,
        side="frontend",
    )
    assert primary == "platform-context-menu"


def test_portal_composition_beats_config_pages_composition():
    rel = "modules/sections/service.py"
    primary = pick_primary_owner(
        ["config-pages-composition", "portal-composition-engine", "config-group-pages"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "portal-composition-engine"


def test_session_bridge_beats_context_switcher():
    rel = "modules/control_plane/platform_identity/session_bridge/router.py"
    primary = pick_primary_owner(
        ["context-switcher", "session-bridge", "platform-identity"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "session-bridge"


def test_platform_identity_beats_decision_platform_owner():
    rel = "modules/control_plane/platform_identity/router.py"
    primary = pick_primary_owner(
        ["decision-platform-owner-not-tenant-user", "platform-identity"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "platform-identity"


def test_notifications_module_beats_notification_center():
    rel = "modules/notifications/router.py"
    primary = pick_primary_owner(
        ["notification-center", "notifications-module"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "notifications-module"


def test_file_service_beats_file_metadata_data():
    rel = "modules/files/router.py"
    primary = pick_primary_owner(
        ["file-metadata-data", "file-service"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "file-service"


def test_aggregator_never_primary():
    assert can_be_primary_owner("business-records-data") is False
    assert can_be_primary_owner("modal-zone") is False
    assert ownership_class("view-surface") == AGGREGATOR


def test_conceptual_norm_never_primary():
    assert can_be_primary_owner("decision-entity-sot") is False
    assert ownership_class("standard-ui-modal") == CONCEPTUAL


def test_reference_standard_may_be_primary():
    assert can_be_primary_owner("standard-dev-architecture-audit") is True
    assert ownership_class("standard-dev-architecture-audit") == CODE_OWNER


def test_partition_file_owners_emits_related():
    primary, related = partition_file_owners(
        ["entity-engine", "business-records-data"],
        rel_path="modules/platform/runtime/entities/service.py",
        side="backend",
    )
    assert primary == "entity-engine"
    assert related == ["business-records-data"]


def test_scanner_finding_details_include_ownership_roles():
    findings: list[ScanFindingDraft] = []
    _append_file_ownership_findings(
        findings,
        rel="modules/platform/runtime/entities/service.py",
        side="backend",
        path=Path("service.py"),
        finding_kind="backend_file",
    )
    roles = {(f.component_key, f.details.get("ownership_role")) for f in findings}
    assert ("entity-engine", OWNERSHIP_ROLE_PRIMARY) in roles
    assert any(role == OWNERSHIP_ROLE_RELATED for _, role in roles)


def test_module_yasii_beats_ai_context_on_yasii_paths():
    rel = "modules/yasii/router.py"
    primary = pick_primary_owner(
        ["ai-context-engine", "module-yasii"],
        rel_path=rel,
        side="backend",
    )
    assert primary == "module-yasii"
