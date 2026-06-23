"""Residual platform scan scopes for full file coverage (WI-ARCH-COVERAGE-003).

Prefixes are relative to backend app root (…/app/) or frontend src (…/frontend/src/).
Merged into COMPONENT_SCAN_SCOPES after core/configuration/standards scopes.
"""

from __future__ import annotations

from typing import TypedDict


class ComponentScanScope(TypedDict, total=False):
    backend: list[str]
    frontend: list[str]


# Additional scopes for platform areas not covered by compositional registry prefixes.
RESIDUAL_SCAN_SCOPES: dict[str, ComponentScanScope] = {
    # --- Infrastructure (reference implementation) ---
    "constitution-norm-environment-isolation": {
        "backend": ["core/", "main.py", "init_db.py"],
    },
    "constitution-norm-company-isolated-runtime": {
        "backend": ["db/"],
    },
    # --- Core / runtime gaps ---
    "view-engine": {
        "backend": [
            "modules/platform/runtime/plan_tree/",
            "modules/platform/runtime/office_user_views/",
        ],
    },
    "relation-engine": {
        "backend": ["modules/platform/runtime/relation_field/"],
    },
    "config-group-navigation": {
        "backend": ["modules/platform/runtime/search/"],
    },
    "config-group-pages": {
        "backend": [
            "modules/platform/designer/pages/",
            "modules/platform/designer/trash/",
        ],
    },
    "object-types-engine": {
        "backend": ["modules/platform/designer/shared/"],
    },
    "config-group-module-placement": {
        "backend": [
            "modules/checklists/",
            "modules/notes/",
            "modules/quality_issues/",
            "modules/platform/designer/router.py",
            "modules/platform/designer/event_journal/",
            "modules/platform/__init__.py",
            "modules/platform/designer/__init__.py",
            "modules/platform/runtime/__init__.py",
            "modules/platform/shared/",
        ],
        "frontend": [
            "modules/admin/",
            "modules/editor/",
            "modules/blockTypes/",
            "modules/platformSetup/",
            "modules/objectTypeTable/",
        ],
    },
    # --- Domain modules (backend) — config-group-module-placement (CODE_OWNER) ---
    "journals-data": {
        "backend": ["modules/user_activity/"],
    },
    # --- Platform services / publication ---
    "standard-dev-doc-sync": {
        "backend": ["modules/platform_dashboard/"],
        "frontend": ["modules/platformDashboard/"],
    },
    "release-operations-data": {
        "backend": [
            "modules/platform_build_registry/",
            "modules/platform_version_registry/",
        ],
    },
    "publication-service": {
        "backend": [
            "modules/platform_release_provenance/",
            "modules/publication_guard/",
        ],
        "frontend": ["modules/platformReleases/"],
    },
    "deployment-execution": {
        "backend": ["modules/platform_migration_rollback/"],
    },
    "standard-dev-data-impact": {
        "backend": ["modules/platform_data_safety/"],
    },
    "config-module-tenant-settings": {
        "backend": [
            "modules/platform_modules/",
            "modules/tenant_bootstrap/",
            "modules/tenant_module_configuration_applies/",
            "modules/tenant_module_configuration_diffs/",
            "modules/tenant_module_configuration_rollbacks/",
            "modules/tenant_module_update_offers/",
            "modules/tenant_module_update_previews/",
        ],
    },
    "users-access-data": {
        "backend": ["modules/user_management/"],
    },
    "standard-dev-test-data-control": {
        "backend": ["modules/test_cleanup_registry/"],
    },
    "standard-data-identifiers": {
        "backend": ["shared/"],
    },
    # --- Services / CP ---
    "platform-identity": {
        "frontend": ["modules/controlPlane/"],
    },
    "portal-composition-engine": {
        "frontend": ["portal/"],
    },
    "config-group-action-placement": {
        "frontend": ["modules/runtimeActions/"],
    },
    "config-group-workspaces": {
        "frontend": ["modules/profileWorkspace/"],
    },
    "chats-module": {
        "frontend": ["modules/comments/"],
    },
    "standard-dev-architecture-audit": {
        "frontend": [
            "modules/platformArchitecture/",
            "modules/platformArchitectureGovernance/",
        ],
    },
    "standard-ui-navigation-shell": {
        "frontend": [
            "api/",
            "layouts/",
            "pages/",
        ],
    },
    "standard-ui-color-zones": {
        "frontend": [
            "App.jsx",
            "App.css",
            "main.jsx",
            "index.css",
            "styles/",
        ],
    },
    "config-group-platform-runtime": {
        "frontend": ["config/"],
    },
    "session-bridge": {
        "frontend": [
            "modules/runtimeReadGateway/",
            "modules/runtimeWriteGateway/",
        ],
    },
    "platform-drawer": {
        "frontend": ["profile/"],
    },
    "standard-ui-three-level-model": {
        "frontend": [
            "shared/",
            "components/",
            "hooks/",
            "utils/",
            "context/",
        ],
    },
}
