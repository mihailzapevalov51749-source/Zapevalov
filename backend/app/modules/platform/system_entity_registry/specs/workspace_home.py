"""Workspace Home system entity specs."""

from __future__ import annotations

from app.modules.platform.system_entity_registry.types import SystemEntitySpec

WORKSPACE_HOME_TAB_SPEC = SystemEntitySpec(
    system_type="workspace.home_tab",
    display_name="Workspace Home Tab",
    storage_layer="designer_workspace_tabs",
    structural_key="slug=home + is_system=true",
    unique_scope=("workspace_id", "slug", "is_system"),
    ensure_supported=True,
    reconcile_supported=True,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="user_visible_config",
    implementation_module="app.modules.platform.designer.workspaces.workspace_home.registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=False,
    adr_compliance_notes=(
        "Partial unique index on workspace home tab is not yet enforced at DB level."
    ),
)

WORKSPACE_HOME_PAGE_SPEC = SystemEntitySpec(
    system_type="workspace.home_page",
    display_name="Workspace Home Page",
    storage_layer="pages + designer_workspaces.home_page_id",
    structural_key="designer_workspaces.home_page_id",
    unique_scope=("workspace_id",),
    ensure_supported=True,
    reconcile_supported=False,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="user_visible_config",
    implementation_module="app.modules.platform.designer.workspaces.workspace_home.registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=True,
)

WORKSPACE_ROOT_SECTION_SPEC = SystemEntitySpec(
    system_type="workspace.root_section",
    display_name="Workspace Root Section",
    storage_layer="sections",
    structural_key="sort_order=0 on home page",
    unique_scope=("page_id", "sort_order"),
    ensure_supported=True,
    reconcile_supported=True,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="user_visible_config",
    implementation_module="app.modules.platform.designer.workspaces.workspace_home.registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=False,
    adr_compliance_notes=(
        "No dedicated system_key column; duplicates hidden via is_visible=false."
    ),
)
