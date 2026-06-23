"""Tenant isolation gate for Comments API."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.comments.models import Comment
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    assert_runtime_actor_has_tenant_access,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.files.document_access import collect_portal_ids_for_document_file
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User

ENTITY_NOT_FOUND_DETAIL = "Сущность не найдена"
ENTITY_ACCESS_FORBIDDEN_DETAIL = "Нет доступа к сущности"
UNSUPPORTED_ENTITY_TYPE_DETAIL = "Неподдерживаемый тип сущности для комментариев"


def _normalize_entity_type(entity_type: str) -> str:
    return str(entity_type or "").strip()


def _normalize_entity_id(entity_id: str) -> str:
    return str(entity_id or "").strip()


def resolve_runtime_entity_tenant_id(db: Session, entity_id: str) -> int | None:
    try:
        entity_uuid = uuid.UUID(_normalize_entity_id(entity_id))
    except (TypeError, ValueError):
        return None

    row = (
        db.query(RuntimeEntity.tenant_id)
        .filter(
            RuntimeEntity.id == entity_uuid,
            RuntimeEntity.deleted_at.is_(None),
        )
        .first()
    )
    if row is None:
        return None
    return int(row[0])


def _require_tenant_membership(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    tenant_id: int,
) -> None:
    try:
        assert_runtime_actor_has_tenant_access(db, current_user, tenant_id)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ENTITY_ACCESS_FORBIDDEN_DETAIL,
            ) from exc
        raise


def _require_any_portal_membership(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    portal_ids: list[int],
) -> None:
    for portal_id in portal_ids:
        try:
            assert_runtime_actor_has_tenant_access(db, current_user, portal_id)
            return
        except HTTPException:
            continue
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ENTITY_ACCESS_FORBIDDEN_DETAIL,
    )


def assert_comment_entity_access(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    *,
    entity_type: str,
    entity_id: str,
    file_id: str | None = None,
) -> None:
    normalized_type = _normalize_entity_type(entity_type)
    normalized_id = _normalize_entity_id(entity_id)

    if not normalized_type or not normalized_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="entity_type и entity_id обязательны",
        )

    if normalized_type in {"runtime_entity", "entity"}:
        tenant_id = resolve_runtime_entity_tenant_id(db, normalized_id)
        if tenant_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ENTITY_NOT_FOUND_DETAIL,
            )
        _require_tenant_membership(db, current_user, tenant_id)
        return

    if normalized_type == "file":
        file_key = _normalize_entity_id(str(file_id or normalized_id))
        if not file_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ENTITY_NOT_FOUND_DETAIL,
            )

        portal_ids = collect_portal_ids_for_document_file(db, file_key)
        if not portal_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ENTITY_NOT_FOUND_DETAIL,
            )
        _require_any_portal_membership(db, current_user, portal_ids)
        return

    if normalized_type.startswith("universal_table:"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=UNSUPPORTED_ENTITY_TYPE_DETAIL,
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=UNSUPPORTED_ENTITY_TYPE_DETAIL,
    )


def assert_comment_row_access(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    comment: Comment,
) -> None:
    assert_comment_entity_access(
        db,
        current_user,
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        file_id=comment.file_id,
    )
