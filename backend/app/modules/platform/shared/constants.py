"""Shared constants for the platform layer."""

DESIGNER_ROLES = frozenset(
    {
        "admin",
        "superadmin",
        "platform_designer",
        "platform_architect",
    }
)

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
        "designer_metadata_snapshots",
        "designer_publish_records",
        "runtime_entities",
        "runtime_entity_values",
        "runtime_relation_instances",
    }
)
