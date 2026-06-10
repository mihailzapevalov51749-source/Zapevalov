"""Plan Root Anchor system entity spec."""

from __future__ import annotations

from app.modules.platform.system_entity_registry.types import SystemEntitySpec

PLAN_ROOT_ANCHOR_SPEC = SystemEntitySpec(
    system_type="runtime.plan_root_anchor",
    display_name="Plan Root Anchor",
    storage_layer="runtime_entities",
    structural_key="plan_root_relation_key",
    unique_scope=("tenant_id", "object_type_key", "plan_root_relation_key"),
    ensure_supported=True,
    reconcile_supported=True,
    recovery_supported=True,
    audit_supported=True,
    visibility_policy="hidden_runtime",
    implementation_module="app.modules.platform.runtime.plan_tree.anchor_registry",
    advisory_lock_supported=True,
    unique_scope_db_enforced=True,
)
