"""Structural registry and uniqueness guarantees for Plan Root Anchors."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.platform.runtime.entities import repository as ent_repo
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
)

logger = logging.getLogger(__name__)


def plan_root_anchor_lock_key(
    tenant_id: int,
    object_type_key: str,
    relation_key: str,
) -> int:
    payload = f"plan_root_anchor:{tenant_id}:{object_type_key}:{relation_key}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return int(digest[:15], 16)


def acquire_plan_root_anchor_lock(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    relation_key: str,
) -> None:
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {
            "lock_key": plan_root_anchor_lock_key(
                tenant_id,
                object_type_key,
                relation_key,
            ),
        },
    )


def list_active_plan_root_anchors(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    relation_key: str,
) -> list[RuntimeEntity]:
    normalized_relation_key = str(relation_key or "").strip()

    return (
        db.query(RuntimeEntity)
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_key == object_type_key,
            RuntimeEntity.plan_root_relation_key == normalized_relation_key,
            RuntimeEntity.deleted_at.is_(None),
            RuntimeEntity.is_system.is_(True),
        )
        .order_by(
            RuntimeEntity.created_at.asc(),
            RuntimeEntity.record_number.asc(),
            RuntimeEntity.id.asc(),
        )
        .all()
    )


def _ensure_anchor_metadata(
    anchor: RuntimeEntity,
    *,
    relation_key: str,
    object_type_id: UUID | None,
) -> None:
    normalized_relation_key = str(relation_key or "").strip()
    changed = False

    if anchor.plan_root_relation_key != normalized_relation_key:
        anchor.plan_root_relation_key = normalized_relation_key
        changed = True

    if not anchor.is_system:
        anchor.is_system = True
        changed = True

    if object_type_id is not None and anchor.object_type_id != object_type_id:
        anchor.object_type_id = object_type_id
        changed = True

    if changed:
        anchor.updated_at = datetime.now(timezone.utc)


def reconcile_duplicate_plan_root_anchors(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    relation_key: str,
    *,
    object_type_id: UUID | None = None,
) -> RuntimeEntity | None:
    anchors = list_active_plan_root_anchors(
        db,
        tenant_id,
        object_type_key,
        relation_key,
    )

    if not anchors:
        return None

    canonical = anchors[0]
    _ensure_anchor_metadata(
        canonical,
        relation_key=relation_key,
        object_type_id=object_type_id,
    )

    if len(anchors) == 1:
        return canonical

    now = datetime.now(timezone.utc)
    for duplicate in anchors[1:]:
        logger.warning(
            "Deactivating duplicate plan root anchor tenant=%s object_type=%s "
            "relation=%s duplicate=%s canonical=%s",
            tenant_id,
            object_type_key,
            relation_key,
            duplicate.id,
            canonical.id,
        )
        duplicate.deleted_at = now
        duplicate.updated_at = now

    deactivate_anchor_to_anchor_relations(
        db,
        tenant_id,
        relation_key,
        canonical_anchor_id=canonical.id,
        object_type_key=object_type_key,
    )

    return canonical


def deactivate_anchor_to_anchor_relations(
    db: Session,
    tenant_id: int,
    relation_key: str,
    *,
    canonical_anchor_id: UUID,
    object_type_key: str,
    relation_settings_json: dict | None = None,
) -> int:
    anchors = list_active_plan_root_anchors(
        db,
        tenant_id,
        object_type_key,
        relation_key,
    )
    anchor_ids = {str(anchor.id) for anchor in anchors}
    anchor_ids.add(str(canonical_anchor_id))

    if len(anchor_ids) < 2:
        return 0

    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    removed = 0

    for instance in rel_repo.list_by_relation_key(db, tenant_id, relation_key):
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if (
            str(parent_id) in anchor_ids
            and str(child_id) in anchor_ids
            and str(parent_id) != str(child_id)
        ):
            rel_repo.soft_delete_relation_instance(db, instance)
            removed += 1
            logger.warning(
                "Removed anchor-to-anchor relation tenant=%s relation=%s parent=%s child=%s",
                tenant_id,
                relation_key,
                parent_id,
                child_id,
            )

    return removed


def audit_plan_root_anchors(db: Session) -> list[dict[str, object]]:
    rows = db.execute(
        text(
            """
            SELECT
                re.tenant_id,
                re.object_type_key,
                re.object_type_id::text,
                re.plan_root_relation_key,
                COUNT(*) AS active_anchor_count,
                ARRAY_AGG(re.id::text ORDER BY re.created_at ASC) AS anchor_ids
            FROM runtime_entities re
            WHERE re.deleted_at IS NULL
              AND re.is_system = TRUE
              AND re.plan_root_relation_key IS NOT NULL
            GROUP BY
                re.tenant_id,
                re.object_type_key,
                re.object_type_id,
                re.plan_root_relation_key
            ORDER BY re.tenant_id, re.object_type_key, re.plan_root_relation_key
            """
        )
    ).mappings().all()

    return [dict(row) for row in rows]
