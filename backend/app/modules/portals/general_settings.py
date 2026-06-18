"""Portal general settings serialization (tenant scope)."""

from __future__ import annotations

from app.modules.control_plane.platform_profile.constants import (
    PLATFORM_DATE_FORMAT_LABELS,
    PLATFORM_LANGUAGE_OPTIONS,
    PLATFORM_TIME_FORMAT_LABELS,
)
from app.modules.portals.models import Portal


def _language_label(code: str) -> str:
    for item_code, label in PLATFORM_LANGUAGE_OPTIONS:
        if item_code == code:
            return label
    return code


def serialize_portal_general_settings(portal: Portal) -> dict[str, str | None]:
    return {
        "timezone": portal.timezone,
        "date_format": PLATFORM_DATE_FORMAT_LABELS.get(portal.date_format, portal.date_format),
        "time_format": PLATFORM_TIME_FORMAT_LABELS.get(portal.time_format, portal.time_format),
        "week_start_day": portal.week_start_day,
        "default_language": _language_label(portal.default_language),
    }
