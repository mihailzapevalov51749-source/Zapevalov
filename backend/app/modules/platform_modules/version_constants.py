"""Constants for platform module versions registry."""

from __future__ import annotations


class PlatformModuleVersionStatus:
    DRAFT = "draft"
    RELEASED = "released"
    DEPRECATED = "deprecated"
    SUPERSEDED = "superseded"


ACTIVE_RUNTIME_MODULE_KEYS_FOR_VERSION_BACKFILL: frozenset[str] = frozenset(
    {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
    }
)

DEFAULT_INITIAL_MODULE_VERSION = "1.0.0"
