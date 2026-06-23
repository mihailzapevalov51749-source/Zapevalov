"""Tenant-aware access checks for files in uploads/documents."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.pages.models import Page
from app.modules.sections.models import Section
from app.modules.chats.models import ChatMessage, ChatMessageAttachment, ChatParticipant
from app.modules.comments.models import Comment, CommentAttachment
from app.modules.document_libraries.tenant_access import (
    find_library_document_by_storage_name,
    portal_ids_for_library,
)
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.shared.enums import FieldType
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    assert_runtime_actor_has_tenant_access,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
    is_infrastructure_bridge_actor,
)
from app.modules.users.models import User

DOCUMENT_FILE_FORBIDDEN_DETAIL = "Нет доступа к файлу"
DOCUMENT_FILE_ORPHAN_DETAIL = "Файл недоступен (не привязан к tenant)"


def _normalized_storage_name(file_name: str) -> str:
    return str(file_name or "").strip()


def _file_reference_pattern(file_name: str) -> str:
    return f"%/{_normalized_storage_name(file_name)}"


def _append_portal_ids(target: list[int], portal_ids: list[int]) -> None:
    for portal_id in portal_ids:
        normalized = int(portal_id)
        if normalized > 0 and normalized not in target:
            target.append(normalized)


def portal_ids_for_library_document(db: Session, file_name: str) -> list[int]:
    document = find_library_document_by_storage_name(db, file_name)
    if document is None:
        return []
    return portal_ids_for_library(db, document.library_id)


def portal_ids_for_runtime_entity_file(db: Session, file_name: str) -> list[int]:
    normalized_name = _normalized_storage_name(file_name)
    if not normalized_name:
        return []

    needle = normalized_name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    rows = (
        db.query(RuntimeEntityValue.tenant_id)
        .filter(
            RuntimeEntityValue.field_type == FieldType.FILE.value,
            cast(RuntimeEntityValue.value_json, String).like(f"%{needle}%", escape="\\"),
        )
        .distinct()
        .all()
    )

    portal_ids: list[int] = []
    for (tenant_id,) in rows:
        if tenant_id is not None:
            _append_portal_ids(portal_ids, [int(tenant_id)])
    return portal_ids


def portal_ids_for_comment_attachment(db: Session, file_name: str) -> list[int]:
    normalized_name = _normalized_storage_name(file_name)
    if not normalized_name:
        return []

    pattern = _file_reference_pattern(normalized_name)
    rows = (
        db.query(RuntimeEntity.tenant_id)
        .join(
            Comment,
            (Comment.entity_type == "runtime_entity")
            & (Comment.entity_id == cast(RuntimeEntity.id, String)),
        )
        .join(CommentAttachment, CommentAttachment.comment_id == Comment.id)
        .filter(
            Comment.deleted_at.is_(None),
            CommentAttachment.deleted_at.is_(None),
            or_(
                CommentAttachment.file_url.ilike(pattern),
                Comment.file_id == normalized_name,
            ),
        )
        .distinct()
        .all()
    )

    portal_ids: list[int] = []
    for (tenant_id,) in rows:
        if tenant_id is not None:
            _append_portal_ids(portal_ids, [int(tenant_id)])
    return portal_ids


def portal_ids_for_block_content_file(db: Session, file_name: str) -> list[int]:
    normalized_name = _normalized_storage_name(file_name)
    if not normalized_name:
        return []

    pattern = f"%{normalized_name}%"
    rows = (
        db.query(Page.portal_id)
        .join(Section, Section.page_id == Page.id)
        .join(Block, Block.section_id == Section.id)
        .filter(cast(Block.content, String).ilike(pattern))
        .distinct()
        .all()
    )

    portal_ids: list[int] = []
    for (portal_id,) in rows:
        if portal_id is not None:
            _append_portal_ids(portal_ids, [int(portal_id)])
    return portal_ids


def user_has_chat_attachment_access(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    file_name: str,
) -> bool:
    if is_infrastructure_bridge_actor(current_user):
        return False
    normalized_name = _normalized_storage_name(file_name)
    if not normalized_name:
        return False

    pattern = _file_reference_pattern(normalized_name)
    row = (
        db.query(ChatParticipant.id)
        .join(ChatMessage, ChatMessage.chat_id == ChatParticipant.chat_id)
        .join(ChatMessageAttachment, ChatMessageAttachment.message_id == ChatMessage.id)
        .filter(
            ChatParticipant.user_id == current_user.id,
            ChatMessageAttachment.file_url.ilike(pattern),
        )
        .first()
    )
    return row is not None


def collect_portal_ids_for_document_file(db: Session, file_name: str) -> list[int]:
    portal_ids: list[int] = []
    _append_portal_ids(portal_ids, portal_ids_for_library_document(db, file_name))
    _append_portal_ids(portal_ids, portal_ids_for_runtime_entity_file(db, file_name))
    _append_portal_ids(portal_ids, portal_ids_for_comment_attachment(db, file_name))
    _append_portal_ids(portal_ids, portal_ids_for_block_content_file(db, file_name))
    return portal_ids


def assert_document_file_access(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    file_name: str,
) -> None:
    normalized_name = _normalized_storage_name(file_name)
    if not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректное имя файла",
        )

    if user_has_chat_attachment_access(db, current_user, normalized_name):
        return

    portal_ids = collect_portal_ids_for_document_file(db, normalized_name)
    if not portal_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=DOCUMENT_FILE_ORPHAN_DETAIL,
        )

    library_document = find_library_document_by_storage_name(db, normalized_name)
    if library_document is not None and not portal_ids_for_library(db, library_document.library_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Файл библиотеки недоступен (orphan library)",
        )

    if any(
        _runtime_actor_can_access_portal(db, current_user, portal_id)
        for portal_id in portal_ids
    ):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=DOCUMENT_FILE_FORBIDDEN_DETAIL,
    )


def _runtime_actor_can_access_portal(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    portal_id: int,
) -> bool:
    try:
        assert_runtime_actor_has_tenant_access(db, current_user, portal_id)
    except HTTPException:
        return False
    return True
