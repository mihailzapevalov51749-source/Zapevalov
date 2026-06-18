"""Entity types and delete order for test cleanup registry."""

from __future__ import annotations

# Lower delete_order = deleted first (children before parents).
DELETE_ORDER_BY_ENTITY_TYPE: dict[str, int] = {
    "journal_entry": 10,
    "event": 20,
    "task": 30,
    "document": 40,
    "offer": 50,
    "deployment": 60,
    "environment_version": 70,
    "version_history": 80,
    "membership": 90,
    "user": 100,
    "page": 110,
    "navigation": 120,
    "object_type": 130,
    "field": 140,
    "view": 150,
    "form": 160,
    "workspace": 170,
    "process": 180,
    "package": 190,
    "build": 200,
    "portal": 210,
}

ENTITY_TYPE_TO_TABLE: dict[str, str] = {
    "portal": "portals",
    "user": "users",
    "membership": "tenant_user_memberships",
    "build": "platform_code_builds",
    "package": "platform_release_packages",
    "deployment": "platform_deployments",
    "offer": "tenant_update_offers",
    "environment_version": "platform_environment_versions",
    "version_history": "platform_version_history",
    "page": "pages",
    "navigation": "navigation_items",
    "object_type": "designer_object_types",
    "field": "designer_field_definitions",
    "view": "designer_view_definitions",
    "form": "designer_action_forms",
    "workspace": "designer_workspaces",
    "process": "designer_action_definitions",
    "document": "library_documents",
    "task": "runtime_entities",
    "event": "platform_event_journal_entries",
    "journal_entry": "platform_event_journal_entries",
}

RUN_STATUS_RUNNING = "running"
RUN_STATUS_CLEANED = "cleaned"
RUN_STATUS_FAILED = "failed"

RECORD_STATUS_PENDING = "pending"
RECORD_STATUS_DELETED = "deleted"
RECORD_STATUS_FAILED = "failed"
RECORD_STATUS_SKIPPED = "skipped"

PROTECTED_PORTAL_IDS = frozenset({1, 2, 21})
