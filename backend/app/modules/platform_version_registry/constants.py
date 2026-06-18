"""Constants for platform environment version registry."""

from __future__ import annotations

import re
from enum import StrEnum


class PlatformEnvironmentKey(StrEnum):
    DEV = "DEV"
    TEMPLATE = "TEMPLATE"
    CLIENT = "CLIENT"


class PlatformVersionInstallationStatus(StrEnum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    PLANNED = "planned"


PLATFORM_VERSION_PATTERN = re.compile(
    r"^\d+\.\d+\.\d+(-[A-Za-z0-9][A-Za-z0-9.-]*)?$",
)

DEFAULT_DEV_PLATFORM_VERSION = "1.0.0-dev"
DEFAULT_TEMPLATE_PLATFORM_VERSION = "1.0.0"
DEFAULT_CLIENT_PLATFORM_VERSION = "1.0.0"

ENVIRONMENT_DISPLAY_LABELS: dict[str, str] = {
    PlatformEnvironmentKey.DEV.value: "DEV",
    PlatformEnvironmentKey.TEMPLATE.value: "Template",
    PlatformEnvironmentKey.CLIENT.value: "Client",
}
