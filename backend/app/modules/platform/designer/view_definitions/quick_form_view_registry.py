"""Structural registry and uniqueness guarantees for Default Quick Form views."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.platform.designer.view_definitions import repository
from app.modules.platform.designer.view_definitions.constants import (
    DEFAULT_QUICK_FORM_VIEW_KEY,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition

logger = logging.getLogger(__name__)


def default_quick_form_view_lock_key(tenant_id: int, object_type_id: UUID) -> int:
    payload = f"default_quick_form_view:{tenant_id}:{object_type_id}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return int(digest[:15], 16)


def acquire_default_quick_form_view_lock(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> None:
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {
            "lock_key": default_quick_form_view_lock_key(tenant_id, object_type_id),
        },
    )


def list_active_default_quick_form_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[DesignerViewDefinition]:
    return repository.list_by_key(
        db,
        tenant_id,
        object_type_id,
        DEFAULT_QUICK_FORM_VIEW_KEY,
    )


def _ensure_view_metadata(view: DesignerViewDefinition) -> None:
    changed = False

    if view.key != DEFAULT_QUICK_FORM_VIEW_KEY:
        view.key = DEFAULT_QUICK_FORM_VIEW_KEY
        changed = True

    if view.view_type != "quick_form":
        view.view_type = "quick_form"
        changed = True

    if not view.is_system:
        view.is_system = True
        changed = True

    if not view.is_active:
        view.is_active = True
        changed = True

    if changed:
        view.updated_at = datetime.now(timezone.utc)


def reconcile_duplicate_default_quick_form_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> DesignerViewDefinition | None:
    views = list_active_default_quick_form_views(db, tenant_id, object_type_id)

    if not views:
        return None

    canonical = views[0]
    _ensure_view_metadata(canonical)

    if len(views) == 1:
        return canonical

    now = datetime.now(timezone.utc)
    for duplicate in views[1:]:
        logger.warning(
            "Deactivating duplicate default quick form view tenant=%s object_type=%s "
            "duplicate=%s canonical=%s",
            tenant_id,
            object_type_id,
            duplicate.id,
            canonical.id,
        )
        duplicate.deleted_at = now
        duplicate.updated_at = now

    db.flush()
    return canonical


def audit_default_quick_form_views(db: Session) -> list[dict[str, object]]:
    rows = db.execute(
        text(
            """
            SELECT
                v.tenant_id,
                ot.key AS object_type_key,
                v.object_type_id::text AS object_type_id,
                COUNT(*) AS active_quick_form_count,
                ARRAY_AGG(v.id::text ORDER BY v.created_at ASC) AS view_ids
            FROM designer_view_definitions v
            JOIN designer_object_types ot ON ot.id = v.object_type_id
            WHERE v.deleted_at IS NULL
              AND v.key = :view_key
              AND ot.deleted_at IS NULL
            GROUP BY v.tenant_id, ot.key, v.object_type_id
            ORDER BY v.tenant_id, ot.key
            """
        ),
        {"view_key": DEFAULT_QUICK_FORM_VIEW_KEY},
    ).mappings().all()

    return [dict(row) for row in rows]
