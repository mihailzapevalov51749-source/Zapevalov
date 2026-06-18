"""Settings schema v1.0.0 for runtime.notifications."""

from __future__ import annotations

from app.modules.notifications.constants import (
    ALLOWED_NOTIFICATION_CATEGORIES,
    ALLOWED_NOTIFICATION_PRIORITIES,
)
from app.modules.platform_modules.settings_schema.builders import (
    build_permissions_block,
    build_settings_schema_envelope,
    build_templates_block,
    field_def,
    permission_action_def,
)

_NOTIFICATION_CATEGORIES = sorted(ALLOWED_NOTIFICATION_CATEGORIES | {"calendar"})
_NOTIFICATION_TARGETS = [
    "chat_mention",
    "chat_reply",
    "calendar_event_invite",
    "comment_mention",
    "note_mention",
    "library_file",
    "runtime_entity_card",
]

_SETTINGS_FIELDS = {
    "enabled_categories": field_def(
        field_type="array",
        default=_NOTIFICATION_CATEGORIES,
        owner="Tenant",
        validation={"subset_of": _NOTIFICATION_CATEGORIES},
    ),
    "enabled_target_types": field_def(
        field_type="array",
        default=_NOTIFICATION_TARGETS,
        owner="Mixed",
        validation={"subset_of": _NOTIFICATION_TARGETS},
    ),
    "default_priority": field_def(
        field_type="enum",
        default="normal",
        owner="Tenant",
        validation={"enum": sorted(ALLOWED_NOTIFICATION_PRIORITIES)},
    ),
    "digest_enabled": field_def(field_type="boolean", default=False, owner="Tenant"),
    "quiet_hours": field_def(
        field_type="object",
        required=False,
        default=None,
        owner="Tenant",
        validation={"format": "quiet_hours", "nullable": True},
    ),
    "delivery_channels": field_def(
        field_type="array",
        default=["in_app"],
        owner="Tenant",
        validation={"subset_of": ["in_app", "email", "push"]},
    ),
    "overlay_enabled": field_def(field_type="boolean", default=True, owner="Tenant"),
    "bell_enabled": field_def(field_type="boolean", default=True, owner="Tenant"),
    "retention_days": field_def(
        field_type="integer",
        required=False,
        default=90,
        owner="Tenant",
        validation={"min": 1, "max": 3650},
    ),
}

_SETTINGS_DEFAULTS = {key: definition["default"] for key, definition in _SETTINGS_FIELDS.items()}

_PERMISSION_ACTIONS = {
    "read_own": permission_action_def(),
    "mark_read_own": permission_action_def(),
    "broadcast_tenant": permission_action_def(owner="Tenant"),
    "manage_module_settings": permission_action_def(owner="Tenant"),
    "view_delivery_logs": permission_action_def(owner="Platform"),
}

_PERMISSION_DEFAULTS = {
    "user": {
        "read_own": True,
        "mark_read_own": True,
        "broadcast_tenant": False,
        "manage_module_settings": False,
        "view_delivery_logs": False,
    },
    "admin": {
        "read_own": True,
        "mark_read_own": True,
        "broadcast_tenant": True,
        "manage_module_settings": True,
        "view_delivery_logs": False,
    },
    "superadmin": {
        "read_own": True,
        "mark_read_own": True,
        "broadcast_tenant": True,
        "manage_module_settings": True,
        "view_delivery_logs": True,
    },
}

_VIEWS_FIELDS = {
    "group_by_date": field_def(field_type="boolean", default=True, owner="Tenant"),
    "show_priority_badges": field_def(field_type="boolean", default=True, owner="Tenant"),
    "overlay_auto_open": field_def(field_type="boolean", default=True, owner="Tenant"),
    "max_visible_in_bell": field_def(
        field_type="integer",
        required=False,
        default=20,
        owner="Tenant",
        validation={"min": 5, "max": 100},
    ),
}

_VIEWS_DEFAULTS = {key: definition["default"] for key, definition in _VIEWS_FIELDS.items()}

_RULES_FIELDS = {
    "skip_self_notify": field_def(field_type="boolean", default=True, owner="Platform"),
    "respect_quiet_hours": field_def(field_type="boolean", default=False, owner="Tenant"),
    "dedupe_window_seconds": field_def(
        field_type="integer",
        required=False,
        default=60,
        owner="Platform",
        validation={"min": 0, "max": 3600},
    ),
    "require_target_payload": field_def(field_type="boolean", default=True, owner="Platform"),
}

_RULES_DEFAULTS = {key: definition["default"] for key, definition in _RULES_FIELDS.items()}

_TEMPLATES = build_templates_block(
    seed_catalog=[
        {
            "seed_key": "notifications.category_enablement",
            "kind": "reference",
            "description": "Базовый набор включённых категорий",
            "payload": {"enabled_categories": _NOTIFICATION_CATEGORIES},
        },
        {
            "seed_key": "notifications.system_welcome",
            "kind": "notification_template",
            "description": "Приветственное системное уведомление tenant",
            "payload": {
                "type": "system_alert",
                "category": "system",
                "title": "Добро пожаловать",
            },
        },
    ],
)


def build_runtime_notifications_settings_schema() -> dict:
    return build_settings_schema_envelope(
        module_key="runtime.notifications",
        settings_fields=_SETTINGS_FIELDS,
        settings_defaults=_SETTINGS_DEFAULTS,
        permissions=build_permissions_block(
            actions=_PERMISSION_ACTIONS,
            defaults=_PERMISSION_DEFAULTS,
        ),
        views_fields=_VIEWS_FIELDS,
        views_defaults=_VIEWS_DEFAULTS,
        rules_fields=_RULES_FIELDS,
        rules_defaults=_RULES_DEFAULTS,
        templates=_TEMPLATES,
    )
