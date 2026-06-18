"""Settings schema v1.0.0 for runtime.chat."""

from __future__ import annotations

from app.modules.platform_modules.settings_schema.builders import (
    build_permissions_block,
    build_settings_schema_envelope,
    build_templates_block,
    field_def,
    permission_action_def,
)

_SETTINGS_FIELDS = {
    "direct_chat_enabled": field_def(field_type="boolean", default=True, owner="Platform"),
    "group_chat_enabled": field_def(field_type="boolean", default=True, owner="Platform"),
    "attachments_enabled": field_def(field_type="boolean", default=True, owner="Tenant"),
    "mentions_enabled": field_def(field_type="boolean", default=True, owner="Tenant"),
    "reactions_enabled": field_def(field_type="boolean", default=True, owner="Tenant"),
    "message_edit_window_minutes": field_def(
        field_type="integer",
        required=False,
        default=None,
        owner="Tenant",
        validation={"min": 0, "max": 10080, "nullable": True},
    ),
    "message_delete_window_minutes": field_def(
        field_type="integer",
        required=False,
        default=None,
        owner="Tenant",
        validation={"min": 0, "max": 10080, "nullable": True},
    ),
    "retention_days": field_def(
        field_type="integer",
        required=False,
        default=None,
        owner="Tenant",
        validation={"min": 1, "max": 3650, "nullable": True},
    ),
    "max_participants_per_chat": field_def(
        field_type="integer",
        required=False,
        default=100,
        owner="Tenant",
        validation={"min": 2, "max": 500},
    ),
    "allow_external_participants": field_def(
        field_type="boolean",
        default=False,
        owner="Tenant",
    ),
}

_SETTINGS_DEFAULTS = {key: definition["default"] for key, definition in _SETTINGS_FIELDS.items()}

_PERMISSION_ACTIONS = {
    "create_chat": permission_action_def(),
    "delete_chat": permission_action_def(),
    "manage_participants": permission_action_def(),
    "edit_chat_metadata": permission_action_def(),
    "send_message": permission_action_def(),
    "edit_own_message": permission_action_def(),
    "delete_own_message": permission_action_def(),
    "delete_others_messages": permission_action_def(),
    "manage_module_settings": permission_action_def(owner="Tenant"),
}

_PERMISSION_DEFAULTS = {
    "user": {
        "create_chat": True,
        "delete_chat": False,
        "manage_participants": False,
        "edit_chat_metadata": False,
        "send_message": True,
        "edit_own_message": True,
        "delete_own_message": True,
        "delete_others_messages": False,
        "manage_module_settings": False,
    },
    "admin": {
        "create_chat": True,
        "delete_chat": True,
        "manage_participants": True,
        "edit_chat_metadata": True,
        "send_message": True,
        "edit_own_message": True,
        "delete_own_message": True,
        "delete_others_messages": False,
        "manage_module_settings": True,
    },
    "superadmin": {
        "create_chat": True,
        "delete_chat": True,
        "manage_participants": True,
        "edit_chat_metadata": True,
        "send_message": True,
        "edit_own_message": True,
        "delete_own_message": True,
        "delete_others_messages": True,
        "manage_module_settings": True,
    },
}

_VIEWS_FIELDS = {
    "default_layout": field_def(
        field_type="enum",
        default="sidebar",
        owner="Tenant",
        validation={"enum": ["sidebar", "compact"]},
    ),
    "show_unread_counters": field_def(field_type="boolean", default=True, owner="Tenant"),
    "show_user_status": field_def(
        field_type="boolean",
        required=False,
        default=False,
        owner="Tenant",
    ),
    "sidebar_sort_default": field_def(
        field_type="enum",
        required=False,
        default="recent",
        owner="Tenant",
        validation={"enum": ["recent", "alphabetical", "pinned_first"]},
    ),
}

_VIEWS_DEFAULTS = {key: definition["default"] for key, definition in _VIEWS_FIELDS.items()}

_RULES_FIELDS = {
    "participants_must_belong_to_tenant": field_def(
        field_type="boolean",
        default=True,
        owner="Platform",
        apply=False,
    ),
    "allow_external_mentions": field_def(field_type="boolean", default=False, owner="Tenant"),
    "allow_cross_tenant_chat": field_def(
        field_type="boolean",
        default=False,
        owner="Platform",
        apply=False,
    ),
    "require_real_name": field_def(
        field_type="boolean",
        required=False,
        default=False,
        owner="Tenant",
    ),
    "mention_triggers_notification": field_def(field_type="boolean", default=True, owner="Tenant"),
    "reply_triggers_notification": field_def(field_type="boolean", default=True, owner="Tenant"),
}

_RULES_DEFAULTS = {key: definition["default"] for key, definition in _RULES_FIELDS.items()}

_TEMPLATES = build_templates_block(
    seed_catalog=[
        {
            "seed_key": "chat.welcome_room",
            "kind": "entity_template",
            "description": "Общий чат компании",
            "payload": {"title": "Общий чат", "type": "group"},
        },
        {
            "seed_key": "chat.support_room",
            "kind": "entity_template",
            "description": "Чат поддержки",
            "payload": {"title": "Поддержка", "type": "group"},
        },
        {
            "seed_key": "chat.announcement_room",
            "kind": "entity_template",
            "description": "Канал объявлений",
            "payload": {"title": "Объявления", "type": "group"},
        },
    ],
)


def build_runtime_chat_settings_schema() -> dict:
    return build_settings_schema_envelope(
        module_key="runtime.chat",
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
