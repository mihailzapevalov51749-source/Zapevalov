"""Default Quick Form View system entity spec."""

from __future__ import annotations

from app.modules.platform.system_entity_registry.types import SystemEntitySpec

DEFAULT_QUICK_FORM_SPEC = SystemEntitySpec(
    system_type="designer.default_quick_form",
    display_name="Default Quick Form View",
    storage_layer="designer_view_definitions",
    structural_key="key=default_quick_form",
    unique_scope=("tenant_id", "object_type_id", "key"),
    ensure_supported=True,
    reconcile_supported=True,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="studio_visible",
    implementation_module="app.modules.platform.designer.view_definitions.quick_form_view_registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=True,
)
