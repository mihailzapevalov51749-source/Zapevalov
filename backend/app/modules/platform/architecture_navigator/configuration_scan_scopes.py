"""Scanner directory scopes for configuration registry (WI-ARCH-REG-CONF-002)."""

from __future__ import annotations

from typing import TypedDict


class ComponentScanScope(TypedDict, total=False):
    backend: list[str]
    frontend: list[str]


CONFIGURATION_SCAN_SCOPES: dict[str, ComponentScanScope] = {
    # --- Navigation ---
    "config-group-navigation": {
        "backend": ["modules/navigation/", "modules/platform/runtime/menu_settings/"],
        "frontend": ["modules/navigation/", "shared/shell/sidebar/"],
    },
    "config-nav-structure": {
        "backend": ["modules/navigation/service.py", "modules/navigation/runtime_navigation_reconcile.py"],
        "frontend": ["modules/navigation/hooks/useNavigationTree.js", "modules/navigation/components/MenuTree.jsx"],
    },
    "config-nav-menu-items": {
        "backend": ["modules/navigation/models.py", "modules/navigation/schemas.py"],
        "frontend": ["modules/navigation/components/MenuItem.jsx", "modules/navigation/components/CreateMenuItemModal.jsx"],
    },
    "config-nav-order-hierarchy": {
        "backend": ["modules/navigation/", "modules/platform/runtime/menu_settings/"],
        "frontend": ["modules/navigation/hooks/useMenuDragAndDrop.js"],
    },
    "config-nav-icons-labels": {
        "backend": ["modules/navigation/models.py", "modules/platform/runtime/menu_settings/models.py"],
        "frontend": [
            "modules/navigation/components/MenuItemEditor.jsx",
            "shared/shell/sidebar/components/SidebarNavigationItemIcon.jsx",
        ],
    },
    "config-nav-module-entry-points": {
        "backend": ["modules/navigation/", "modules/tenant_modules/"],
        "frontend": ["modules/navigation/entityLocationRegistry.js"],
    },
    # --- Pages ---
    "config-group-pages": {
        "backend": ["modules/pages/", "modules/sections/", "modules/blocks/"],
        "frontend": ["modules/designer/pages/DesignerPagesPage.jsx", "portal/PortalPageView.jsx"],
    },
    "config-pages-catalog": {
        "backend": ["modules/pages/", "modules/pages/runtime_access.py"],
        "frontend": ["modules/designer/components/pages/PagesRegistryTable.jsx"],
    },
    "config-pages-composition": {
        "backend": ["modules/sections/", "modules/blocks/"],
        "frontend": ["modules/sections/", "modules/blocks/", "portal/components/PortalPageRuntimeContent.jsx"],
    },
    "config-pages-home": {
        "backend": ["modules/pages/models.py", "modules/tenant_bootstrap/minimal_runtime_shell.py"],
        "frontend": ["portal/utils/resolvePortalHomePage.js", "shared/workspaceTabs/"],
    },
    "config-pages-layout-templates": {
        "backend": ["modules/sections/models.py", "modules/blocks/models.py"],
        "frontend": ["modules/sections/components/SectionLayoutSelector.jsx", "portal/resolvePortalPageViewLayoutContract.js"],
    },
    # --- Workspaces ---
    "config-group-workspaces": {
        "backend": ["modules/platform/designer/workspaces/", "modules/platform/workspace_tabs/"],
        "frontend": ["modules/designer/pages/DesignerWorkspacesPage.jsx", "shared/workspaceTabs/"],
    },
    "config-workspaces": {
        "backend": ["modules/platform/designer/workspaces/models.py", "modules/platform/designer/workspaces/service.py"],
        "frontend": ["modules/designer/pages/DesignerWorkspaceDetailPage.jsx"],
    },
    "config-workspace-tabs": {
        "backend": ["modules/platform/designer/workspaces/", "modules/platform/workspace_tabs/"],
        "frontend": ["shared/workspaceTabs/GlobalWorkspaceTabsBar.jsx", "shared/workspaceTabs/workspaceTabsApi.js"],
    },
    "config-system-tabs": {
        "backend": ["modules/platform/workspace_tabs/registry.py", "modules/platform/system_entity_registry/"],
        "frontend": ["portal/components/WorkspaceRuntimeTabsBar.jsx", "portal/services/resolvePublishedObjectTabs.js"],
    },
    # --- Object placement ---
    "config-group-object-placement": {
        "backend": [
            "modules/platform/designer/object_types/",
            "modules/platform/designer/view_definitions/",
            "modules/platform/designer/publish/",
        ],
        "frontend": ["modules/designer/components/objectTypes/", "modules/objectViews/"],
    },
    "config-object-type-publication": {
        "backend": [
            "modules/platform/designer/object_types/service.py",
            "modules/platform/designer/publish/snapshot_builder.py",
        ],
        "frontend": ["modules/designer/utils/objectTypePublishState.js"],
    },
    "config-view-publication": {
        "backend": ["modules/platform/designer/view_definitions/", "modules/platform/designer/publish/object_view_contract.py"],
        "frontend": ["modules/designer/components/views/", "modules/objectViews/ObjectViewHost.jsx"],
    },
    "config-object-nav-binding": {
        "backend": ["modules/platform/designer/object_types/menu_placements/", "modules/navigation/models.py"],
        "frontend": ["modules/designer/components/objectTypes/ObjectTypePublishToMenuDialog.jsx"],
    },
    "config-quick-forms": {
        "backend": ["modules/platform/designer/view_definitions/quick_form_view_registry.py"],
        "frontend": ["shared/quickCreate/", "modules/objectViews/entity/ObjectCreateEntityDialog.jsx"],
    },
    # --- Module placement ---
    "config-group-module-placement": {
        "backend": [
            "modules/tenant_modules/",
            "modules/tenant_module_configurations/",
            "modules/platform_module_publications/",
        ],
        "frontend": ["modules/controlPlane/pages/ControlPlaneTenantModuleConfigurationsPage.jsx"],
    },
    "config-module-publication": {
        "backend": ["modules/tenant_modules/", "modules/platform_module_publications/snapshot.py"],
        "frontend": ["modules/controlPlane/pages/ControlPlaneModulePublicationsPage.jsx"],
    },
    "config-module-tenant-settings": {
        "backend": ["modules/tenant_module_configurations/"],
        "frontend": ["modules/controlPlane/pages/ControlPlaneTenantModuleConfigurationsPage.jsx"],
    },
    # --- UI placement ---
    "config-group-ui-placement": {
        "backend": ["modules/platform/runtime/menu_settings/", "modules/portals/"],
        "frontend": ["shared/shell/AppShellFrame.jsx", "shared/shell/header/", "shared/shell/sidebar/"],
    },
    "config-shell-layout": {
        "backend": ["modules/platform/designer/system_menu_settings/", "modules/tenant_bootstrap/minimal_runtime_shell.py"],
        "frontend": ["shared/shell/AppShellFrame.jsx", "shared/shell/shellLayoutMode.js"],
    },
    "config-top-bar-zones": {
        "backend": ["modules/platform/runtime/menu_settings/", "modules/platform/search/", "modules/notifications/"],
        "frontend": ["shared/shell/header/components/AppHeaderRenderer.jsx"],
    },
    "config-ui-visibility": {
        "backend": ["modules/navigation/page_navigation_visibility.py", "modules/platform/runtime/menu_settings/"],
        "frontend": ["shared/shell/shellFeatureFlags.ts", "shared/shell/sidebar/designerSystemMenuSettings.js"],
    },
    "config-portal-branding": {
        "backend": ["modules/portals/models.py", "modules/portals/general_settings.py"],
        "frontend": ["shared/tenantEnvironment/tenantBranding.test.js", "api/authApi.js"],
    },
    # --- Action placement ---
    "config-group-action-placement": {
        "backend": ["modules/platform/action_engine/action_placements/", "modules/platform/runtime/actions/"],
        "frontend": ["modules/designer/components/actions/", "shared/entityCardShell/"],
    },
    "config-list-toolbar-actions": {
        "backend": ["modules/platform/action_engine/action_placements/", "modules/platform/runtime/actions/resolver.py"],
        "frontend": [
            "modules/objectViews/table/components/ObjectTableBulkActionsBar.jsx",
            "shared/shell/actions/",
        ],
    },
    "config-card-actions": {
        "backend": ["modules/platform/action_engine/action_placements/", "modules/platform/designer/publish/snapshot_builder.py"],
        "frontend": ["shared/entityCardShell/components/EntityCardToolbar.jsx"],
    },
    "config-context-actions": {
        "backend": ["modules/platform/action_engine/action_placements/", "modules/platform/runtime/actions/"],
        "frontend": ["shared/objectPlatform/objectContextMenu/", "modules/objectViews/plan/PlanTreeContextMenu.jsx"],
    },
    "config-action-groups-order": {
        "backend": ["modules/platform/action_engine/action_placements/models.py", "modules/platform/action_engine/action_categories/"],
        "frontend": ["modules/designer/components/actions/syncActionPlacements.js"],
    },
    # --- Startup & published catalog ---
    "config-group-startup-roles": {
        "backend": ["modules/tenant_roles/", "modules/users/bootstrap_owner_service.py"],
        "frontend": ["modules/controlPlane/usersRoles/", "modules/controlPlane/platformRoles/"],
    },
    "config-group-startup-company": {
        "backend": [
            "modules/company_database_provisioning/",
            "modules/tenant_bootstrap/clone_tenant_structure.py",
            "modules/portals/create_with_first_admin.py",
        ],
        "frontend": ["modules/controlPlane/companies/CreateCompanyModal.jsx", "modules/controlPlane/companies/CloneCompanyModal.jsx"],
    },
    "config-group-published-catalog": {
        "backend": [
            "modules/platform/designer/publish/",
            "modules/platform/runtime/catalog/",
            "modules/platform_publish_orchestrator/",
        ],
        "frontend": ["modules/designer/api/runtimeCatalogApi.js", "portal/services/resolvePublishedObjectTabs.js"],
    },
}
