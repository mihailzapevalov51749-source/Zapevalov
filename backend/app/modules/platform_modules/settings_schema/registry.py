"""Registry of canonical module settings_schema contracts."""

from __future__ import annotations

from typing import Any

from app.modules.platform_modules.settings_schema.calendar_schema import (
    build_runtime_calendar_settings_schema,
)
from app.modules.platform_modules.settings_schema.chat_schema import build_runtime_chat_settings_schema
from app.modules.platform_modules.settings_schema.constants import ACTIVE_RUNTIME_MODULE_KEYS
from app.modules.platform_modules.settings_schema.notifications_schema import (
    build_runtime_notifications_settings_schema,
)

_MODULE_BUILDERS = {
    "runtime.chat": build_runtime_chat_settings_schema,
    "runtime.calendar": build_runtime_calendar_settings_schema,
    "runtime.notifications": build_runtime_notifications_settings_schema,
}


def get_module_settings_schema(module_key: str) -> dict[str, Any] | None:
    builder = _MODULE_BUILDERS.get(module_key)
    if builder is None:
        return None
    return builder()


def list_active_module_settings_schemas() -> dict[str, dict[str, Any]]:
    return {module_key: builder() for module_key, builder in _MODULE_BUILDERS.items()}


def is_active_runtime_module(module_key: str) -> bool:
    return module_key in ACTIVE_RUNTIME_MODULE_KEYS
