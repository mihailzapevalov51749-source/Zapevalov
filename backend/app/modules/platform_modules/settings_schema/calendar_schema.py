"""Settings schema v1.0.0 for runtime.calendar."""

from __future__ import annotations

from app.modules.calendar.constants import CALENDAR_EVENT_TYPES
from app.modules.platform_modules.settings_schema.builders import (
    build_permissions_block,
    build_settings_schema_envelope,
    build_templates_block,
    field_def,
    permission_action_def,
)

_CALENDAR_EVENT_TYPE_LIST = list(CALENDAR_EVENT_TYPES)

_SETTINGS_FIELDS = {
    "default_view": field_def(
        field_type="enum",
        default="week",
        owner="Tenant",
        validation={"enum": ["day", "week", "month", "list"]},
    ),
    "week_starts_on": field_def(
        field_type="enum",
        default="monday",
        owner="Tenant",
        validation={"enum": ["monday", "sunday"]},
    ),
    "timezone": field_def(
        field_type="string",
        default="Europe/Moscow",
        owner="Tenant",
        validation={"format": "iana_timezone"},
    ),
    "working_hours": field_def(
        field_type="object",
        required=False,
        default={"start": "09:00", "end": "18:00"},
        owner="Tenant",
        validation={"format": "working_hours"},
    ),
    "default_event_duration_minutes": field_def(
        field_type="integer",
        default=60,
        owner="Tenant",
        validation={"min": 5, "max": 1440},
    ),
    "default_reminder_offsets_minutes": field_def(
        field_type="array",
        required=False,
        default=[15, 60],
        owner="Tenant",
        validation={"item_type": "integer", "min_items": 0},
    ),
    "enabled_event_types": field_def(
        field_type="array",
        default=_CALENDAR_EVENT_TYPE_LIST,
        owner="Mixed",
        validation={"subset_of": _CALENDAR_EVENT_TYPE_LIST},
    ),
    "invite_policy": field_def(
        field_type="enum",
        default="notify_all",
        owner="Tenant",
        validation={"enum": ["notify_all", "creator_only", "disabled"]},
    ),
    "video_meeting_enabled": field_def(
        field_type="boolean",
        default=False,
        owner="Tenant",
    ),
}

_SETTINGS_DEFAULTS = {
    key: definition["default"]
    for key, definition in _SETTINGS_FIELDS.items()
}

_PERMISSION_ACTIONS = {
    "create_event": permission_action_def(),
    "edit_own_event": permission_action_def(),
    "edit_others_events": permission_action_def(),
    "delete_own_event": permission_action_def(),
    "delete_others_event": permission_action_def(),
    "invite_participants": permission_action_def(),
    "manage_calendar_settings": permission_action_def(owner="Tenant"),
}

_PERMISSION_DEFAULTS = {
    "user": {
        "create_event": True,
        "edit_own_event": True,
        "edit_others_events": False,
        "delete_own_event": True,
        "delete_others_event": False,
        "invite_participants": True,
        "manage_calendar_settings": False,
    },
    "admin": {
        "create_event": True,
        "edit_own_event": True,
        "edit_others_events": True,
        "delete_own_event": True,
        "delete_others_event": True,
        "invite_participants": True,
        "manage_calendar_settings": True,
    },
    "superadmin": {
        "create_event": True,
        "edit_own_event": True,
        "edit_others_events": True,
        "delete_own_event": True,
        "delete_others_event": True,
        "invite_participants": True,
        "manage_calendar_settings": True,
    },
}

_VIEWS_FIELDS = {
    "enabled_views": field_def(
        field_type="array",
        default=["day", "week", "month"],
        owner="Tenant",
        validation={"enum_items": ["day", "week", "month", "list"]},
    ),
    "default_view": field_def(
        field_type="enum",
        default="week",
        owner="Tenant",
        validation={"enum": ["day", "week", "month", "list"]},
    ),
    "show_mini_month_sidebar": field_def(
        field_type="boolean",
        default=True,
        owner="Tenant",
    ),
    "list_page_size": field_def(
        field_type="integer",
        required=False,
        default=50,
        owner="Tenant",
        validation={"min": 10, "max": 500},
    ),
}

_VIEWS_DEFAULTS = {key: definition["default"] for key, definition in _VIEWS_FIELDS.items()}

_RULES_FIELDS = {
    "allow_external_invites": field_def(field_type="boolean", default=False, owner="Tenant"),
    "require_invite_response": field_def(
        field_type="boolean",
        required=False,
        default=False,
        owner="Tenant",
    ),
    "allow_overlap": field_def(field_type="boolean", default=True, owner="Tenant"),
    "max_participants_per_event": field_def(
        field_type="integer",
        required=False,
        default=None,
        owner="Tenant",
        validation={"min": 1, "max": 500, "nullable": True},
    ),
}

_RULES_DEFAULTS = {key: definition["default"] for key, definition in _RULES_FIELDS.items()}

_TEMPLATES = build_templates_block(
    seed_catalog=[
        {
            "seed_key": "calendar.meeting",
            "kind": "event_preset",
            "description": "Стандартная встреча",
            "payload": {"event_type": "meeting", "duration_minutes": 60},
        },
        {
            "seed_key": "calendar.standup",
            "kind": "event_preset",
            "description": "Ежедневная планёрка",
            "payload": {"event_type": "standup", "duration_minutes": 15},
        },
        {
            "seed_key": "calendar.vacation",
            "kind": "event_preset",
            "description": "Отпуск / absence reminder",
            "payload": {"event_type": "reminder", "all_day": True},
        },
        {
            "seed_key": "calendar.business_trip",
            "kind": "event_preset",
            "description": "Командировка",
            "payload": {"event_type": "site_visit", "all_day": True},
        },
    ],
)


def build_runtime_calendar_settings_schema() -> dict:
    return build_settings_schema_envelope(
        module_key="runtime.calendar",
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
