"""Scanner directory scopes for standards registry (WI-ARCH-REG-STD-002)."""

from __future__ import annotations

from typing import TypedDict


class ComponentScanScope(TypedDict, total=False):
    backend: list[str]
    frontend: list[str]


STANDARDS_SCAN_SCOPES: dict[str, ComponentScanScope] = {
    # --- Constitution (12) ---
    "constitution-norm-ten-categories": {
        "backend": [
            "modules/platform/architecture_navigator/registry_constants.py",
            "modules/platform/architecture_navigator/service.py",
        ],
    },
    "constitution-norm-one-primary-category": {
        "backend": ["modules/platform/architecture_navigator/service.py", "modules/platform/architecture_navigator/catalog.py"],
    },
    "constitution-norm-classification-methodology": {
        "backend": ["modules/platform/architecture_navigator/", "modules/platform/architecture_governance/"],
    },
    "constitution-norm-display-not-id": {
        "backend": ["modules/portals/models.py", "modules/control_plane/"],
        "frontend": ["modules/designer/"],
    },
    "constitution-norm-single-sot": {
        "backend": ["modules/platform/architecture_navigator/service.py"],
    },
    "constitution-norm-platform-tenant-separation": {
        "backend": ["modules/control_plane/", "modules/portals/"],
    },
    "constitution-norm-dev-template-company": {
        "backend": [
            "modules/platform_publish_orchestrator/",
            "modules/platform_deployment_registry/",
            "modules/tenant_environment/",
        ],
    },
    "constitution-norm-environment-isolation": {
        "backend": ["modules/tenant_environment/", "modules/control_plane/platform_environments/"],
    },
    "constitution-norm-company-isolated-runtime": {
        "backend": [
            "modules/control_plane/platform_environments/",
            "modules/platform_deployment_registry/",
        ],
    },
    "constitution-norm-no-logic-duplication": {
        "backend": ["modules/platform/architecture_navigator/"],
    },
    "constitution-norm-system-entity-standard": {
        "backend": ["modules/platform/system_entity_registry/", "modules/navigation/"],
    },
    "constitution-norm-entity-identity-contract": {
        "backend": ["modules/platform/runtime/entities/", "modules/comments/"],
    },
    # --- Architectural principles (3) ---
    "decision-control-plane-not-tenant": {
        "backend": ["modules/control_plane/", "modules/portals/models.py"],
    },
    "decision-platform-owner-not-tenant-user": {
        "backend": [
            "modules/control_plane/platform_identity/",
            "modules/auth/",
        ],
    },
    "decision-entity-sot": {
        "backend": ["modules/platform/runtime/entities/", "modules/platform/runtime/catalog/"],
    },
    # --- Development standards (10) ---
    "standard-dev-prompt-preparation": {
        "backend": ["modules/platform/architecture_governance/"],
    },
    "standard-dev-journal": {
        "backend": [
            "modules/platform_event_journal/",
        ],
    },
    "standard-dev-doc-sync": {
        "backend": ["modules/platform_dashboard_analyzer/"],
    },
    "standard-dev-architecture-audit": {
        "backend": ["modules/platform/architecture_navigator/", "modules/platform/architecture_governance/"],
    },
    "standard-dev-test-data-control": {
        "backend": ["modules/control_plane/customer_companies/"],
    },
    "standard-dev-cleanup-control": {
        "backend": ["modules/control_plane/customer_companies/legacy_cleanup.py"],
    },
    "standard-dev-data-impact": {
        "backend": ["modules/platform_event_journal/"],
    },
    "standard-dev-demo-readiness": {
        "backend": ["modules/control_plane/"],
    },
    "standard-dev-manual-smoke": {
        "backend": ["modules/platform/architecture_navigator/router.py"],
    },
    "standard-dev-test-data-ownership": {
        "backend": ["modules/control_plane/customer_companies/legacy_cleanup.py"],
    },
    # --- Interface standards (5) ---
    "standard-ui-modal": {
        "backend": [],
        "frontend": ["shared/platformModal/"],
    },
    "standard-ui-color-zones": {
        "frontend": ["shared/shell/", "App.jsx"],
    },
    "standard-ui-three-level-model": {
        "backend": ["modules/platform/architecture_navigator/"],
        "frontend": ["shared/", "modules/designer/"],
    },
    "standard-ui-card-structure": {
        "frontend": ["modules/objectViews/entity/"],
    },
    "standard-ui-navigation-shell": {
        "backend": ["modules/navigation/"],
        "frontend": ["shared/shell/"],
    },
    # --- Data standards (2) ---
    "standard-data-identifiers": {
        "backend": ["modules/portals/models.py", "modules/platform/designer/object_types/"],
    },
    "standard-data-event-journal": {
        "backend": ["modules/platform_event_journal/"],
    },
    # --- Publication standards (3) ---
    "standard-pub-release-package": {
        "backend": [
            "modules/platform_publish_orchestrator/",
            "modules/platform_deployment_registry/",
        ],
    },
    "standard-pub-release-scope": {
        "backend": ["modules/platform_deployment_registry/"],
    },
    "standard-pub-governance-discipline": {
        "backend": [
            "modules/platform_publish_orchestrator/",
            "modules/platform_deployment_registry/",
            "modules/control_plane/platform_environments/",
        ],
    },
}
