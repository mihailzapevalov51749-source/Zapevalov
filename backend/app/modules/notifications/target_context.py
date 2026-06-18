"""Canonical notification target payload helpers."""

from __future__ import annotations

from typing import Any


def build_notification_target(
    *,
    target_type: str,
    target_id: int | str,
    tenant_id: int,
    portal_id: int | None = None,
    runtime: str | None = None,
    object_type_key: str | None = None,
    action: str = "open",
) -> dict[str, Any]:
    resolved_portal_id = int(portal_id if portal_id is not None else tenant_id)

    payload: dict[str, Any] = {
        "type": str(target_type),
        "id": target_id,
        "tenant_id": int(tenant_id),
        "portal_id": resolved_portal_id,
        "action": action,
    }

    if runtime:
        payload["runtime"] = runtime

    if object_type_key:
        payload["object_type_key"] = object_type_key

    return payload


def merge_notification_context(
    *,
    tenant_id: int,
    portal_id: int | None = None,
    entity_type: str,
    entity_id: int | str,
    target: dict[str, Any],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    context: dict[str, Any] = {
        "tenant_id": int(tenant_id),
        "portal_id": int(portal_id if portal_id is not None else tenant_id),
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "target": target,
    }

    if extra:
        context.update(extra)

    return context
