"""Constants for platform module settings_schema contracts."""

from __future__ import annotations

SETTINGS_SCHEMA_VERSION = "1.0.0"

SCHEMA_BLOCKS: tuple[str, ...] = (
    "settings",
    "permissions",
    "views",
    "rules",
    "templates",
)

PERMISSION_ROLES: tuple[str, ...] = ("user", "admin", "superadmin")

FIELD_OWNERS: frozenset[str] = frozenset({"Platform", "Template", "Tenant", "Mixed"})

FIELD_TYPES: frozenset[str] = frozenset(
    {
        "boolean",
        "string",
        "integer",
        "enum",
        "time",
        "object",
        "array",
        "null",
    }
)

TEMPLATE_KINDS: frozenset[str] = frozenset(
    {
        "entity_template",
        "event_preset",
        "reference",
        "notification_template",
    }
)

ACTIVE_RUNTIME_MODULE_KEYS: frozenset[str] = frozenset(
    {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
    }
)
