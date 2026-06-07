"""Object type settings_json helpers (Designer + Runtime navigation)."""

from __future__ import annotations

from typing import Any

SHOW_IN_NAVIGATION_KEY = "show_in_navigation"


def resolve_show_in_navigation(settings_json: dict[str, Any] | None) -> bool:
    if not isinstance(settings_json, dict):
        return False
    return settings_json.get(SHOW_IN_NAVIGATION_KEY) is True


def with_show_in_navigation(
    settings_json: dict[str, Any] | None,
    *,
    show_in_navigation: bool,
) -> dict[str, Any]:
    merged = dict(settings_json) if isinstance(settings_json, dict) else {}
    merged[SHOW_IN_NAVIGATION_KEY] = bool(show_in_navigation)
    return merged


def default_object_type_settings() -> dict[str, Any]:
    return {SHOW_IN_NAVIGATION_KEY: False}
