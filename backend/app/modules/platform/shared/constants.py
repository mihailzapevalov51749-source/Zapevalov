"""Shared constants for the platform layer."""

from app.modules.tenant_roles.constants import PLATFORM_DESIGNER_ROLES, TENANT_DESIGNER_ROLES

# Backward-compatible union used by legacy imports.
DESIGNER_ROLES = PLATFORM_DESIGNER_ROLES | TENANT_DESIGNER_ROLES

OBJECT_TYPE_KEY_MAX_LENGTH = 64
OBJECT_TYPE_NAME_MAX_LENGTH = 255
FIELD_DEFINITION_KEY_MAX_LENGTH = 64
FIELD_DEFINITION_NAME_MAX_LENGTH = 255
RELATION_DEFINITION_KEY_MAX_LENGTH = 64
RELATION_DEFINITION_NAME_MAX_LENGTH = 255
VIEW_DEFINITION_KEY_MAX_LENGTH = 64
VIEW_DEFINITION_NAME_MAX_LENGTH = 255

# Platform designer/runtime tables — schema source of truth is Alembic, not init_db create_all.
PLATFORM_ALEMBIC_TABLE_NAMES = frozenset(
    {
        "designer_object_types",
        "designer_field_definitions",
        "designer_relation_definitions",
        "designer_view_definitions",
        "designer_action_definitions",
        "designer_action_placements",
        "designer_metadata_snapshots",
        "designer_publish_records",
        "runtime_entities",
        "runtime_entity_values",
        "runtime_relation_instances",
    }
)
