"""Navigation system entity specs."""

from __future__ import annotations

from app.modules.platform.system_entity_registry.types import SystemEntitySpec

NAVIGATION_SYSTEM_ITEM_SPEC = SystemEntitySpec(
    system_type="navigation.system_item",
    display_name="Navigation System Item",
    storage_layer="navigation_items",
    structural_key="system_key",
    unique_scope=("portal_id", "system_key"),
    ensure_supported=True,
    reconcile_supported=True,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="studio_visible",
    implementation_module="app.modules.navigation.system_registry.registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=True,
    adr_compliance_notes=(
        "Legacy keys designer.relations / designer.views may remain outside ensure catalog."
    ),
)

WORKSPACE_NAVIGATION_PLACEMENT_SPEC = SystemEntitySpec(
    system_type="navigation.workspace_placement",
    display_name="Workspace Navigation Placement",
    storage_layer="navigation_items",
    structural_key="system_key=designer.workspace.{workspace_id}.{menu_scope}",
    unique_scope=("portal_id", "system_key"),
    ensure_supported=True,
    reconcile_supported=True,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="user_visible_config",
    implementation_module="app.modules.navigation.system_registry.registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=True,
)
