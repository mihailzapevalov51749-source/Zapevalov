"""Directory scopes for Architecture Scanner (WI-ARCH-NAV-UI-001 … WI-ARCH-OWNERSHIP-003).

These prefixes define *where* to scan — not the resulting file lists.
File lists are produced at scan time with tier-priority Primary Owner selection
(see ownership_policy.py and YASNOPRO_CODE_OWNERSHIP_POLICY_v1.md).
"""

from __future__ import annotations

from typing import TypedDict

from app.modules.platform.architecture_navigator.configuration_scan_scopes import (
    CONFIGURATION_SCAN_SCOPES,
)
from app.modules.platform.architecture_navigator.standards_scan_scopes import (
    STANDARDS_SCAN_SCOPES,
)


class ComponentScanScope(TypedDict, total=False):
    backend: list[str]
    frontend: list[str]


# Prefixes are relative to backend app root (…/app/) or frontend src (…/frontend/src/).
COMPONENT_SCAN_SCOPES: dict[str, ComponentScanScope] = {
    "company-model": {
        "backend": [
            "modules/portals/",
            "modules/tenant_management/",
        ],
    },
    "object-types-engine": {
        "backend": ["modules/platform/designer/object_types/"],
        "frontend": ["modules/designer/components/objectTypes/"],
    },
    "fields-engine": {
        "backend": ["modules/platform/designer/field_definitions/"],
        "frontend": ["modules/designer/fields/"],
    },
    "view-engine": {
        "backend": [
            "modules/platform/designer/view_definitions/",
            "modules/platform/runtime/query/",
        ],
        "frontend": ["modules/runtime/views/"],
    },
    "navigation-engine": {
        "backend": ["modules/navigation/"],
        "frontend": ["modules/navigation/"],
    },
    "permission-engine": {
        "backend": [
            "modules/auth/",
            "modules/ai_context/permission_boundary.py",
        ],
    },
    "portal-composition-engine": {
        "backend": [
            "modules/pages/",
            "modules/sections/",
            "modules/blocks/",
        ],
        "frontend": [
            "modules/pages/",
            "modules/sections/",
            "modules/blocks/",
        ],
    },
    "entity-engine": {
        "backend": [
            "modules/platform/runtime/entities/",
            "modules/platform/runtime/catalog/",
        ],
    },
    "relation-engine": {
        "backend": [
            "modules/platform/designer/relation_definitions/",
            "modules/platform/runtime/relation_instances/",
        ],
    },
    "action-engine": {
        "backend": [
            "modules/platform/action_engine/",
            "modules/platform/runtime/actions/",
        ],
    },
    "process-engine": {
        "backend": [
            "modules/platform/action_engine/",
            "modules/platform/runtime/actions/",
        ],
    },
    "event-engine": {
        "backend": ["modules/platform_event_journal/"],
    },
    "event-journal-core": {
        "backend": ["modules/platform_event_journal/"],
    },
    # --- Platform services (WI-ARCH-REG-SERV-002) ---
    "platform-identity": {
        "backend": [
            "modules/control_plane/platform_identity/",
        ],
    },
    "session-bridge": {
        "backend": [
            "modules/control_plane/platform_identity/session_bridge/",
        ],
    },
    "company-provisioning": {
        "backend": [
            "modules/company_database_provisioning/",
        ],
    },
    "publication-service": {
        "backend": [
            "modules/platform/designer/publish/",
            "modules/platform_publish_orchestrator/orchestrator.py",
            "modules/platform_publish_orchestrator/service.py",
        ],
    },
    "deployment-execution": {
        "backend": [
            "modules/platform_publish_orchestrator/",
            "modules/platform_deployment_registry/",
        ],
    },
    "file-service": {
        "backend": ["modules/files/"],
    },
    "search-service": {
        "backend": ["modules/platform/search/"],
        "frontend": [
            "shared/search/",
            "api/platformSearchApi.js",
        ],
    },
    "notification-dispatch": {},
    "ai-context-engine": {
        "backend": ["modules/ai_context/"],
    },
    "release-package": {
        "backend": [
            "modules/platform_release/",
            "modules/platform_release_package_registry/",
        ],
    },
    "release-scope": {
        "backend": ["modules/platform_release_scope/"],
    },
    "dirty-dev-check": {
        "backend": ["modules/platform_release_dirty_check/"],
    },
    # --- Platform modules (WI-ARCH-REG-MOD-002) ---
    "chats-module": {
        "backend": ["modules/chats/"],
        "frontend": ["modules/chats/"],
    },
    "calendar-module": {
        "backend": ["modules/calendar/"],
        "frontend": ["modules/calendar/"],
    },
    "document-libraries-module": {
        "backend": ["modules/document_libraries/"],
        "frontend": ["modules/documentLibraries/"],
    },
    "notifications-module": {
        "backend": ["modules/notifications/"],
        "frontend": ["modules/notifications/"],
    },
    "module-bpmn": {
        "frontend": [
            "modules/designer/components/actions/",
        ],
    },
    "module-yasii": {
        "backend": ["modules/yasii/"],
        "frontend": ["yasii/"],
    },
    # --- Platform data (WI-ARCH-REG-DATA-002) ---
    "structure-metadata-data": {
        "backend": [
            "modules/platform/designer/object_types/",
            "modules/platform/designer/field_definitions/",
            "modules/platform/designer/relation_definitions/",
            "modules/platform/designer/view_definitions/",
            "modules/platform/runtime/catalog/",
        ],
        "frontend": [
            "modules/designer/",
        ],
    },
    "business-records-data": {
        "frontend": [
            "modules/runtime/",
        ],
    },
    "relation-instances-data": {
        "backend": [
            "modules/platform/runtime/relation_instances/",
        ],
    },
    "users-access-data": {
        "backend": [
            "modules/users/",
            "modules/auth/",
            "modules/tenant_users/",
            "modules/control_plane/platform_identity/",
        ],
    },
    "tenant-configuration-data": {
        "backend": [
            "modules/portals/",
            "modules/tenant_modules/",
            "modules/tenant_module_configurations/",
        ],
    },
    "user-settings-data": {
        "backend": [
            "modules/tenant_users/",
            "modules/users/",
        ],
    },
    "module-domain-data": {
        "backend": [
            "modules/chats/",
            "modules/calendar/",
            "modules/document_libraries/",
            "modules/notifications/",
            "modules/yasii/",
            "modules/platform/action_engine/",
        ],
        "frontend": [
            "modules/chats/",
            "modules/calendar/",
            "modules/documentLibraries/",
            "modules/notifications/",
            "yasii/",
        ],
    },
    "platform-catalog-data": {
        "backend": [
            "modules/platform_modules/",
            "modules/portals/",
            "modules/control_plane/",
        ],
    },
    "release-operations-data": {
        "backend": [
            "modules/platform_release/",
            "modules/platform_release_package_registry/",
            "modules/platform_release_scope/",
            "modules/platform_deployment_registry/",
        ],
    },
    "journals-data": {
        "backend": [
            "modules/platform_event_journal/",
        ],
    },
    "file-metadata-data": {
        "frontend": [
            "modules/files/",
        ],
    },
    # --- Platform components (WI-ARCH-REG-COMP-002) ---
    "platform-modal": {
        "frontend": ["shared/platformModal/"],
    },
    "platform-page": {
        "backend": [
            "modules/pages/",
            "modules/sections/",
        ],
        "frontend": [
            "portal/PortalPageView.jsx",
            "portal/components/",
            "shared/appShell/",
        ],
    },
    "platform-table": {
        "backend": [
            "modules/platform/designer/view_definitions/",
            "modules/platform/runtime/query/",
        ],
        "frontend": ["modules/objectViews/table/"],
    },
    "platform-form": {
        "backend": ["modules/platform/designer/field_definitions/"],
        "frontend": [
            "shared/quickCreate/",
            "shared/fieldEditors/",
        ],
    },
    "platform-tree": {
        "backend": ["modules/navigation/"],
        "frontend": [
            "modules/navigation/",
            "modules/objectViews/plan/",
        ],
    },
    "platform-card": {
        "backend": ["modules/platform/runtime/entities/"],
        "frontend": [
            "shared/entityCardShell/",
            "modules/objectEntities/",
        ],
    },
    "platform-tabs": {
        "backend": ["modules/platform/workspace_tabs/"],
        "frontend": [
            "shared/workspaceTabs/",
            "modules/objectEntities/components/ObjectEntityCardTabsBlock.jsx",
        ],
    },
    "platform-drawer": {
        "frontend": [
            "profile/ProfileSidePanelProvider.jsx",
            "profile/components/",
        ],
    },
    "platform-toolbar": {
        "backend": [
            "modules/platform/action_engine/",
            "modules/platform/runtime/actions/",
        ],
        "frontend": [
            "shared/entityCardShell/components/EntityCardToolbar.jsx",
            "modules/objectViews/table/components/ObjectTableBulkActionsBar.jsx",
        ],
    },
    "platform-notification": {
        "frontend": ["shared/platformNotification/"],
    },
    "platform-sidebar": {
        "backend": ["modules/navigation/"],
        "frontend": ["shared/shell/sidebar/"],
    },
    "platform-breadcrumbs": {
        "backend": ["modules/navigation/"],
        "frontend": [
            "shared/shell/header/components/AppHeaderRenderer.jsx",
            "portal/utils/portalObjectViewHeaderBridge.js",
        ],
    },
    "platform-context-menu": {
        "backend": [
            "modules/platform/action_engine/",
            "modules/platform/runtime/actions/",
        ],
        "frontend": [
            "shared/objectPlatform/objectContextMenu/",
            "modules/objectViews/plan/PlanTreeContextMenu.jsx",
        ],
    },
    "user-picker": {
        "backend": [
            "modules/users/",
            "modules/tenant_users/",
        ],
        "frontend": [
            "shared/users/UserPicker.jsx",
            "shared/fieldEditors/editors/UserFieldEditor.jsx",
        ],
    },
    "object-picker": {
        "backend": [
            "modules/platform/runtime/relation_instances/",
            "modules/platform/runtime/query/",
        ],
        "frontend": [
            "shared/fieldEditors/editors/RelationFieldPeerSelect.jsx",
            "modules/objectViews/table/viewSettings/RelationFilterPeerSelect.jsx",
        ],
    },
    "file-picker": {
        "backend": ["modules/files/"],
        "frontend": [
            "shared/files/attachments/",
            "shared/fieldTypes/file/",
        ],
    },
    "platform-kanban": {
        "backend": ["modules/platform/designer/view_definitions/"],
        "frontend": [
            "modules/objectViews/services/objectViewRoleDefinitions.js",
            "modules/objectViews/services/getObjectViewAdapterLabel.js",
        ],
    },
    "platform-calendar": {
        "backend": ["modules/platform/designer/view_definitions/"],
        "frontend": [
            "modules/objectViews/services/objectViewRoleDefinitions.js",
            "modules/objectViews/services/getObjectViewAdapterLabel.js",
        ],
    },
    # --- Platform interface (WI-ARCH-REG-UI-002) ---
    "side-navigation": {
        "backend": ["modules/navigation/"],
        "frontend": [
            "modules/navigation/",
            "shared/shell/sidebar/",
        ],
    },
    "top-navigation": {
        "frontend": [
            "shared/shell/header/",
            "shared/appShell/",
        ],
    },
    "breadcrumbs": {
        "backend": ["modules/navigation/"],
        "frontend": [
            "shared/shell/header/",
            "portal/PortalPageView.jsx",
            "modules/designer/components/shell/",
        ],
    },
    "avatar": {
        "backend": [
            "modules/users/",
            "modules/tenant_users/",
        ],
        "frontend": [
            "shared/shell/header/",
            "profile/",
        ],
    },
    "user-menu": {
        "backend": [
            "modules/auth/",
            "modules/control_plane/platform_identity/",
        ],
        "frontend": [
            "profile/",
            "shared/shell/header/",
        ],
    },
    "global-search": {
        "backend": ["modules/platform/search/"],
        "frontend": ["shared/search/"],
    },
    "notification-center": {
        "frontend": [
            "modules/notifications/components/",
        ],
    },
    "settings-entry": {
        "frontend": [
            "portal/components/",
            "shared/appShell/",
            "modules/objectViews/table/viewSettings/",
        ],
    },
    "workspace-tabs": {
        "backend": ["modules/platform/workspace_tabs/"],
        "frontend": ["shared/workspaceTabs/"],
    },
    "favorites-recent": {
        "backend": ["modules/navigation/"],
        "frontend": [
            "shared/navigation/",
            "modules/objectViews/table/preferences/",
        ],
    },
    "context-switcher": {
        "frontend": [
            "shared/shell/sidebar/components/SidebarModeSwitcher.jsx",
            "shared/appMode/",
            "pages/sessionBridge/",
        ],
    },
    "entity-card": {
        "frontend": [
            "modules/objectEntities/",
            "shared/entityCardShell/",
        ],
    },
    "view-surface": {
        "backend": [
            "modules/platform/designer/view_definitions/",
            "modules/platform/runtime/query/",
        ],
        "frontend": ["modules/objectViews/"],
    },
    "action-panel": {
        "backend": [
            "modules/platform/action_engine/",
            "modules/platform/runtime/actions/",
        ],
        "frontend": [
            "shared/entityCardShell/components/EntityCardToolbar.jsx",
            "modules/objectViews/table/components/ObjectTableBulkActionsBar.jsx",
            "shared/appShell/",
        ],
    },
    "properties-panel": {
        "frontend": [
            "modules/editor/components/",
            "modules/objectViews/plan/",
        ],
    },
    "modal-zone": {
        "frontend": [],
    },
    "side-panel": {
        "frontend": [
            "profile/",
            "shared/platformModal/",
        ],
    },
    "context-menu": {
        "frontend": [
            "portal/hooks/",
            "portal/components/",
            "modules/objectViews/plan/",
        ],
    },
    "quick-create": {
        "frontend": [
            "modules/objectViews/entity/ObjectCreateEntityDialog.jsx",
            "modules/objectViews/entity/getQuickCreateFields.js",
        ],
    },
    "picker-panel": {
        "backend": [
            "modules/platform/runtime/relation_instances/",
        ],
        "frontend": [
            "modules/objectViews/table/viewSettings/RelationFilterPeerSelect.jsx",
            "modules/objectViews/entity/relationFormValueUtils.js",
        ],
    },
    **CONFIGURATION_SCAN_SCOPES,
    **STANDARDS_SCAN_SCOPES,
}

from app.modules.platform.architecture_navigator.residual_scan_scopes import RESIDUAL_SCAN_SCOPES

for _residual_key, _residual_scope in RESIDUAL_SCAN_SCOPES.items():
    if _residual_key not in COMPONENT_SCAN_SCOPES:
        COMPONENT_SCAN_SCOPES[_residual_key] = _residual_scope
        continue
    _merged = dict(COMPONENT_SCAN_SCOPES[_residual_key])
    for _side in ("backend", "frontend"):
        _existing = list(_merged.get(_side) or [])
        for _prefix in _residual_scope.get(_side) or []:
            if _prefix not in _existing:
                _existing.append(_prefix)
        if _existing:
            _merged[_side] = _existing
    COMPONENT_SCAN_SCOPES[_residual_key] = _merged
