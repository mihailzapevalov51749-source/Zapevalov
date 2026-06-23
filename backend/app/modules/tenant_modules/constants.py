"""Constants for tenant modules registry."""

from __future__ import annotations

BACKFILL_SOURCE = "backfill"

RUNTIME_MODULE_KEYS_FOR_BACKFILL: frozenset[str] = frozenset(
    {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
    }
)

PLANNED_RUNTIME_MODULE_KEYS: frozenset[str] = frozenset(
    {
        "runtime.bpmn",
    }
)

TENANT_MODULE_READER_ROLES: frozenset[str] = frozenset({"superadmin", "admin"})
