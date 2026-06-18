"""Constants for tenant module configurations."""

from __future__ import annotations

DEFAULT_CONFIG_VERSION = "1.0.0"
MANIFEST_DEFAULTS_SOURCE = "manifest_defaults"

ACTIVE_CONFIGURATION_MODULE_KEYS: frozenset[str] = frozenset(
    {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
    }
)
