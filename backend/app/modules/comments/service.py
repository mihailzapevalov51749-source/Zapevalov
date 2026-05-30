import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.modules.comments.constants import (
    COMMENT_KIND_SYSTEM,
    COMMENT_KIND_USER,
)
from app.modules.comments.models import (
    Comment,
    CommentAttachment,
    CommentMention,
    CommentReaction,
)
from app.modules.comments.schemas import (
    CommentCreate,
    CommentReactionCreate,
    CommentUpdate,
    SystemCommentCreate,
)
from app.modules.document_libraries.models import LibraryDocument
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.notifications.constants import (
    NOTIFICATION_CATEGORY_COMMENTS,
    NOTIFICATION_PRIORITY_NORMAL,
    NOTIFICATION_TYPE_COMMENT_MENTION,
    NOTIFICATION_TYPE_COMMENT_REPLY,
)
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User


def build_author_snapshot(user: User | None) -> dict:
    if not user:
        return {}

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "avatar_settings": user.avatar_settings,
    }


def get_comments(
    db: Session,
    entity_type: str,
    entity_id: str,
):
    return (
        db.query(Comment)
        .options(
            joinedload(Comment.author),
            joinedload(Comment.attachments),
            joinedload(Comment.mentions),
            joinedload(Comment.reactions),
        )
        .filter(
            Comment.entity_type == entity_type,
            Comment.entity_id == entity_id,
            Comment.deleted_at.is_(None),
        )
        .order_by(Comment.created_at.asc())
        .all()
    )


def get_comment_by_id(
    db: Session,
    comment_id: int,
):
    return (
        db.query(Comment)
        .options(
            joinedload(Comment.author),
            joinedload(Comment.attachments),
            joinedload(Comment.mentions),
            joinedload(Comment.reactions),
        )
        .filter(
            Comment.id == comment_id,
            Comment.deleted_at.is_(None),
        )
        .first()
    )


def resolve_root_comment_id(
    parent_comment: Comment | None,
):
    if not parent_comment:
        return None

    if parent_comment.root_comment_id:
        return parent_comment.root_comment_id

    return parent_comment.id


def normalize_user_ids(user_ids: list[int] | None):
    clean_ids = []

    for user_id in user_ids or []:
        if not user_id:
            continue

        if user_id in clean_ids:
            continue

        clean_ids.append(user_id)

    return clean_ids


def resolve_file_notification_source(
    db: Session,
    *,
    entity_type: str,
    file_id: str | None = None,
):
    if entity_type != "file":
        return "card_comment"

    if not file_id:
        return "uploaded_file"

    normalized_file_id = str(file_id).strip()

    if normalized_file_id.isdigit():
        library_document = (
            db.query(LibraryDocument)
            .filter(LibraryDocument.id == int(normalized_file_id))
            .first()
        )

        if library_document:
            return "library_file"

    return "uploaded_file"


def resolve_published_runtime_ref_for_comment_entity(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
) -> dict | None:
    if entity_type != "runtime_entity":
        return None

    try:
        entity_uuid = uuid.UUID(str(entity_id).strip())
    except (TypeError, ValueError):
        return None

    entity = (
        db.query(RuntimeEntity)
        .filter(
            RuntimeEntity.id == entity_uuid,
            RuntimeEntity.deleted_at.is_(None),
        )
        .first()
    )

    if not entity:
        return None

    return {
        "object_type_key": entity.object_type_key,
        "runtime_entity_id": str(entity.id),
        "view_key": None,
        "catalog_version": entity.catalog_version,
        "runtime_route": (
            f"/portal/{entity.tenant_id}/object-types/{entity.object_type_key}"
        ),
    }


def build_comment_notification_context(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    file_id: str | None = None,
    comment_id: int | None = None,
    parent_comment_id: int | None = None,
):
    is_file_comment = entity_type == "file"

    published_runtime_ref = resolve_published_runtime_ref_for_comment_entity(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    return {
        "source": resolve_file_notification_source(
            db=db,
            entity_type=entity_type,
            file_id=file_id,
        ),

        "entity_type": entity_type,

        "entity_id": entity_id,

        "file_id": file_id if is_file_comment else None,

        "table_id": None,

        "row_id": None,

        "comment_id": comment_id,

        "parent_comment_id": parent_comment_id,

        "tab": "comments",

        "highlight_id": (
            f"comment-{comment_id}"
            if comment_id
            else None
        ),

        "published_runtime_ref": published_runtime_ref,
    }


def create_mentions(
    db: Session,
    comment_id: int,
    mentioned_user_ids: list[int] | None,
):
    clean_user_ids = normalize_user_ids(mentioned_user_ids)

    if not clean_user_ids:
        return

    mentions = [
        CommentMention(
            comment_id=comment_id,
            mentioned_user_id=user_id,
        )
        for user_id in clean_user_ids
    ]

    db.add_all(mentions)


def create_mention_notifications(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    file_id: str | None = None,
    comment_id: int | None,
    mentioned_user_ids: list[int] | None,
    current_user: User,
):
    recipient_ids = normalize_user_ids(mentioned_user_ids)

    if current_user.id in recipient_ids:
        recipient_ids.remove(current_user.id)

    if not recipient_ids:
        return

    author_name = (
        current_user.full_name
        or current_user.email
        or "Пользователь"
    )

    NotificationService.notify(
        db=db,
        type=NOTIFICATION_TYPE_COMMENT_MENTION,
        category=NOTIFICATION_CATEGORY_COMMENTS,
        priority=NOTIFICATION_PRIORITY_NORMAL,
        title="Вас упомянули в комментарии",
        message=f"{author_name} упомянул вас в комментарии",
        recipients=recipient_ids,
        created_by_id=current_user.id,
        created_by_user=current_user,
        entity_type=entity_type,
        entity_id=entity_id,
        context=build_comment_notification_context(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            file_id=file_id,
            comment_id=comment_id,
        ),
    )


def create_reply_notification(
    db: Session,
    *,
    parent_comment: Comment | None,
    new_comment: Comment,
    current_user: User,
):
    if not parent_comment:
        return

    if not parent_comment.author_user_id:
        return

    if parent_comment.author_user_id == current_user.id:
        return

    author_name = (
        current_user.full_name
        or current_user.email
        or "Пользователь"
    )

    NotificationService.notify(
        db=db,
        type=NOTIFICATION_TYPE_COMMENT_REPLY,
        category=NOTIFICATION_CATEGORY_COMMENTS,
        priority=NOTIFICATION_PRIORITY_NORMAL,
        title="Новый ответ на комментарий",
        message=f"{author_name} ответил на ваш комментарий",
        recipients=[parent_comment.author_user_id],
        created_by_id=current_user.id,
        created_by_user=current_user,
        entity_type=new_comment.entity_type,
        entity_id=new_comment.entity_id,
        context=build_comment_notification_context(
            db=db,
            entity_type=new_comment.entity_type,
            entity_id=new_comment.entity_id,
            file_id=new_comment.file_id,
            comment_id=new_comment.id,
            parent_comment_id=parent_comment.id,
        ),
    )


def sync_comment_attachments(
    db: Session,
    *,
    comment: Comment,
    incoming_attachments,
    current_user: User,
):
    if incoming_attachments is None:
        return

    normalized_items = []

    for item in incoming_attachments:
        file_url = getattr(item, "file_url", None)
        file_name = getattr(item, "file_name", None)

        if not file_url:
            continue

        normalized_items.append(
            {
                "file_url": str(file_url),
                "file_name": file_name or "Файл",
                "file_type": getattr(item, "file_type", None),
                "file_size": getattr(item, "file_size", None),
            }
        )

    incoming_urls = {
        item["file_url"]
        for item in normalized_items
    }

    existing_attachments = list(comment.attachments or [])

    for attachment in existing_attachments:
        if str(attachment.file_url) not in incoming_urls:
            db.delete(attachment)

    existing_urls = {
        str(attachment.file_url)
        for attachment in existing_attachments
    }

    for item in normalized_items:
        if item["file_url"] in existing_urls:
            continue

        attachment = CommentAttachment(
            comment_id=comment.id,
            file_url=item["file_url"],
            file_name=item["file_name"],
            file_type=item["file_type"],
            file_size=item["file_size"],
            uploaded_by_user_id=current_user.id,
        )

        db.add(attachment)


def create_comment(
    db: Session,
    payload: CommentCreate,
    current_user: User,
):
    parent_comment = None

    if payload.parent_comment_id:
        parent_comment = (
            db.query(Comment)
            .filter(
                Comment.id == payload.parent_comment_id,
                Comment.deleted_at.is_(None),
            )
            .first()
        )

        if not parent_comment:
            raise ValueError("Родительский комментарий не найден")

    root_comment_id = resolve_root_comment_id(parent_comment)

    comment = Comment(
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        file_id=payload.file_id,
        parent_comment_id=payload.parent_comment_id,
        root_comment_id=root_comment_id,
        kind=COMMENT_KIND_USER,
        body=payload.body,
        body_format=payload.body_format,
        author_user_id=current_user.id,
        author_snapshot=build_author_snapshot(current_user),
    )

    db.add(comment)
    db.flush()

    create_reply_notification(
        db=db,
        parent_comment=parent_comment,
        new_comment=comment,
        current_user=current_user,
    )

    create_mentions(
        db=db,
        comment_id=comment.id,
        mentioned_user_ids=payload.mentioned_user_ids,
    )

    create_mention_notifications(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        file_id=payload.file_id,
        comment_id=comment.id,
        mentioned_user_ids=payload.mentioned_user_ids,
        current_user=current_user,
    )

    db.commit()

    return get_comment_by_id(
        db=db,
        comment_id=comment.id,
    )


def create_system_comment(
    db: Session,
    payload: SystemCommentCreate,
):
    comment = Comment(
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        file_id=payload.file_id,
        kind=COMMENT_KIND_SYSTEM,
        system_event_key=payload.system_event_key,
        system_payload=payload.system_payload,
        body="",
        body_format="plain",
        author_user_id=None,
        author_snapshot=None,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


def update_comment(
    db: Session,
    comment_id: int,
    payload: CommentUpdate,
    current_user: User,
):
    comment = (
        db.query(Comment)
        .options(joinedload(Comment.attachments))
        .filter(
            Comment.id == comment_id,
            Comment.deleted_at.is_(None),
        )
        .first()
    )

    if not comment:
        return None

    comment.body = payload.body
    comment.body_format = payload.body_format
    comment.edited_at = datetime.now(timezone.utc)
    comment.edited_by_user_id = current_user.id
    comment.version += 1

    db.query(CommentMention).filter(
        CommentMention.comment_id == comment.id
    ).delete()

    create_mentions(
        db=db,
        comment_id=comment.id,
        mentioned_user_ids=payload.mentioned_user_ids,
    )

    create_mention_notifications(
        db=db,
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        file_id=comment.file_id,
        comment_id=comment.id,
        mentioned_user_ids=payload.mentioned_user_ids,
        current_user=current_user,
    )

    incoming_attachments = (
        payload.attachments
        if payload.attachments is not None
        else payload.files
    )

    sync_comment_attachments(
        db=db,
        comment=comment,
        incoming_attachments=incoming_attachments,
        current_user=current_user,
    )

    db.commit()

    return get_comment_by_id(
        db=db,
        comment_id=comment.id,
    )


def delete_comment(
    db: Session,
    comment_id: int,
    current_user: User,
):
    comment = (
        db.query(Comment)
        .filter(
            Comment.id == comment_id,
            Comment.deleted_at.is_(None),
        )
        .first()
    )

    if not comment:
        return None

    comment.deleted_at = datetime.now(timezone.utc)
    comment.deleted_by_user_id = current_user.id
    comment.delete_reason = "user"
    comment.version += 1

    db.commit()

    return True


def toggle_reaction(
    db: Session,
    comment_id: int,
    payload: CommentReactionCreate,
    current_user: User,
):
    existing_reaction = (
        db.query(CommentReaction)
        .filter(
            CommentReaction.comment_id == comment_id,
            CommentReaction.user_id == current_user.id,
        )
        .first()
    )

    if existing_reaction:
        if existing_reaction.emoji_key == payload.emoji_key:
            db.delete(existing_reaction)
            db.commit()

            return {
                "removed": True,
                "replaced": False,
                "emoji_key": payload.emoji_key,
            }

        existing_reaction.emoji_key = payload.emoji_key

        db.commit()

        return {
            "removed": False,
            "replaced": True,
            "emoji_key": payload.emoji_key,
        }

    reaction = CommentReaction(
        comment_id=comment_id,
        user_id=current_user.id,
        emoji_key=payload.emoji_key,
    )

    db.add(reaction)
    db.commit()

    return {
        "removed": False,
        "replaced": False,
        "emoji_key": payload.emoji_key,
    }


def add_attachment(
    db: Session,
    comment_id: int,
    file_url: str,
    file_name: str,
    file_type: str | None,
    file_size: int | None,
    current_user: User,
):
    comment = get_comment_by_id(
        db=db,
        comment_id=comment_id,
    )

    if not comment:
        return None

    attachment = CommentAttachment(
        comment_id=comment_id,
        file_url=file_url,
        file_name=file_name,
        file_type=file_type,
        file_size=file_size,
        uploaded_by_user_id=current_user.id,
    )

    db.add(attachment)
    db.commit()

    return get_comment_by_id(
        db=db,
        comment_id=comment_id,
    )