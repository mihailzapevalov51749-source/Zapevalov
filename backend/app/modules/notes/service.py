from sqlalchemy.orm import Session, joinedload

from app.modules.notifications.constants import (
    NOTIFICATION_CATEGORY_COMMENTS,
    NOTIFICATION_PRIORITY_NORMAL,
)
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User

from .models import Note, NoteMention
from .schemas import NotePublish


NOTIFICATION_TYPE_NOTE_MENTION = "note_mention"


def normalize_user_ids(user_ids: list[int] | None) -> list[int]:
    clean_ids = []

    for user_id in user_ids or []:
        if not user_id:
            continue

        clean_ids.append(user_id)

    return clean_ids


def normalize_mention_keys(
    mention_keys: list[str] | None,
    user_ids: list[int],
) -> list[str]:
    clean_keys = []

    for index, user_id in enumerate(user_ids):
        raw_key = ""

        if mention_keys and index < len(mention_keys):
            raw_key = str(mention_keys[index] or "").strip()

        mention_key = raw_key or f"note-mention-user-{user_id}-{index}"

        if mention_key in clean_keys:
            mention_key = f"{mention_key}-{index}"

        clean_keys.append(mention_key)

    return clean_keys


def build_note_notification_context(
    *,
    note: Note,
    payload: NotePublish,
    mention: NoteMention,
):
    table_id = (
        str(payload.table_id)
        if payload.table_id
        else None
    )

    published_runtime_ref = None
    if payload.published_runtime_ref:
        published_runtime_ref = {
            "object_type_key": payload.published_runtime_ref.object_type_key,
            "runtime_entity_id": payload.published_runtime_ref.runtime_entity_id,
            "view_key": payload.published_runtime_ref.view_key,
            "catalog_version": payload.published_runtime_ref.catalog_version,
            "runtime_route": payload.published_runtime_ref.runtime_route,
        }

    return {
        "source": "card_note",

        "entity_type": note.entity_type,
        "entity_id": note.entity_id,

        "table_id": table_id,
        "row_id": note.entity_id,

        "note_id": note.id,

        "tab": "notes",

        "highlight_id": mention.mention_key,

        "mention_user_id": mention.user_id,

        "published_runtime_ref": published_runtime_ref,
    }


def get_note_by_entity(
    db: Session,
    entity_type: str,
    entity_id: str,
) -> Note | None:
    return (
        db.query(Note)
        .options(joinedload(Note.mentions))
        .filter(
            Note.entity_type == entity_type,
            Note.entity_id == str(entity_id),
        )
        .first()
    )


def get_or_create_note(
    db: Session,
    payload: NotePublish,
) -> Note:
    note = get_note_by_entity(
        db=db,
        entity_type=payload.entity_type,
        entity_id=str(payload.entity_id),
    )

    if note:
        return note

    note = Note(
        entity_type=payload.entity_type,
        entity_id=str(payload.entity_id),
        content=payload.content or "",
        format=payload.format or "html",
        published_version=0,
    )

    db.add(note)
    db.flush()

    return note


def create_note_mention_notifications(
    db: Session,
    *,
    note: Note,
    payload: NotePublish,
    mention_rows: list[NoteMention],
    current_user: User,
):
    for mention in mention_rows:
        if not mention or not mention.user_id:
            continue

        if mention.user_id == current_user.id:
            continue

        author_name = (
            current_user.full_name
            or current_user.email
            or "Пользователь"
        )

        NotificationService.notify(
            db=db,
            type=NOTIFICATION_TYPE_NOTE_MENTION,
            category=NOTIFICATION_CATEGORY_COMMENTS,
            priority=NOTIFICATION_PRIORITY_NORMAL,
            title="Вас упомянули в заметке",
            message=f"{author_name} упомянул вас в заметке",
            recipients=[mention.user_id],
            created_by_id=current_user.id,
            created_by_user=current_user,
            entity_type=note.entity_type,
            entity_id=note.entity_id,
            context=build_note_notification_context(
                note=note,
                payload=payload,
                mention=mention,
            ),
        )


def publish_note_with_mentions(
    db: Session,
    *,
    payload: NotePublish,
    current_user: User,
) -> Note:
    clean_user_ids = normalize_user_ids(
        payload.mentioned_user_ids
    )

    mention_keys = normalize_mention_keys(
        payload.mention_keys,
        clean_user_ids,
    )

    note = get_or_create_note(
        db=db,
        payload=payload,
    )

    note.content = payload.content or ""
    note.format = payload.format or "html"

    note.published_version = (
        note.published_version or 0
    ) + 1

    existing_by_key = {
        mention.mention_key: mention
        for mention in list(note.mentions or [])
    }

    new_mentions_for_notification = []

    for index, user_id in enumerate(clean_user_ids):
        mention_key = mention_keys[index]

        existing_mention = existing_by_key.get(
            mention_key
        )

        if existing_mention:
            continue

        mention = NoteMention(
            note_id=note.id,
            user_id=user_id,
            mention_key=mention_key,
            is_notified=False,
            published_version=note.published_version,
        )

        db.add(mention)
        db.flush()

        new_mentions_for_notification.append(
            mention
        )

    create_note_mention_notifications(
        db=db,
        note=note,
        payload=payload,
        mention_rows=new_mentions_for_notification,
        current_user=current_user,
    )

    for mention in new_mentions_for_notification:
        mention.is_notified = True

    db.commit()

    return get_note_by_entity(
        db=db,
        entity_type=note.entity_type,
        entity_id=note.entity_id,
    )