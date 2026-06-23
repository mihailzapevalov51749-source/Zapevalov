"""Tenant isolation gate for Notifications API."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.modules.comments.tenant_access import resolve_runtime_entity_tenant_id
from app.modules.files.document_access import collect_portal_ids_for_document_file
from app.modules.notifications.models import Notification
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
    infrastructure_bridge_actor_matches_tenant,
    is_infrastructure_bridge_actor,
)
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User

_PORTAL_ROUTE_RE = re.compile(r"/portal/(\d+)(?:/|$)")


def _append_portal_id(target: list[int], portal_id: Any) -> None:
    try:
        normalized = int(portal_id)
    except (TypeError, ValueError):
        return
    if normalized <= 0 or normalized in target:
        return
    target.append(normalized)


def _append_portal_ids(target: list[int], portal_ids: list[int]) -> None:
    for portal_id in portal_ids:
        _append_portal_id(target, portal_id)


def _portal_ids_from_mapping(context: dict[str, Any]) -> list[int]:
    portal_ids: list[int] = []
    for key in ("tenant_id", "tenantId", "portal_id", "portalId"):
        if key in context:
            _append_portal_id(portal_ids, context.get(key))
    return portal_ids


def _portal_ids_from_runtime_route(context: dict[str, Any]) -> list[int]:
    portal_ids: list[int] = []
    published_runtime_ref = context.get("published_runtime_ref")
    if not isinstance(published_runtime_ref, dict):
        return portal_ids

    runtime_route = published_runtime_ref.get("runtime_route")
    if not runtime_route:
        return portal_ids

    match = _PORTAL_ROUTE_RE.search(str(runtime_route))
    if match is not None:
        _append_portal_id(portal_ids, match.group(1))
    return portal_ids


def resolve_notification_portal_ids(db: Session, notification: Notification) -> list[int]:
    """Resolve tenant/portal ids referenced by a notification payload."""
    portal_ids: list[int] = []
    context = notification.context if isinstance(notification.context, dict) else {}

    _append_portal_ids(portal_ids, _portal_ids_from_mapping(context))
    _append_portal_ids(portal_ids, _portal_ids_from_runtime_route(context))

    entity_type = str(notification.entity_type or "").strip()
    entity_id = str(notification.entity_id or "").strip()

    if entity_type in {"runtime_entity", "entity"} and entity_id:
        tenant_id = resolve_runtime_entity_tenant_id(db, entity_id)
        if tenant_id is not None:
            _append_portal_id(portal_ids, tenant_id)

    if entity_type == "file" or context.get("source") in {"library_file", "uploaded_file", "card_comment"}:
        file_key = str(context.get("file_id") or entity_id or "").strip()
        if file_key:
            _append_portal_ids(portal_ids, collect_portal_ids_for_document_file(db, file_key))

    return portal_ids


def user_can_view_notification(
    db: Session,
    current_user: RuntimeDesignerActor,
    notification: Notification,
) -> bool:
    """
    Notifications are user-scoped via NotificationRecipient; this gate hides
    payloads that reference tenants the current user cannot access.
    """
    portal_ids = resolve_notification_portal_ids(db, notification)
    if not portal_ids:
        return True
    if is_infrastructure_bridge_actor(current_user):
        return any(
            infrastructure_bridge_actor_matches_tenant(current_user, portal_id)
            for portal_id in portal_ids
        )
    return any(
        user_has_tenant_access(db, current_user, portal_id)
        for portal_id in portal_ids
    )
