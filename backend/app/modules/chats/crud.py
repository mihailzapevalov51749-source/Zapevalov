from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.modules.chats.models import (
    Chat,
    ChatMessage,
    ChatMessageAttachment,
    ChatMessageMention,
    ChatMessageReaction,
    ChatParticipant,
)


def get_user_chats(db: Session, user_id: int):
    return (
        db.query(Chat)
        .join(ChatParticipant, ChatParticipant.chat_id == Chat.id)
        .options(joinedload(Chat.created_by))
        .filter(ChatParticipant.user_id == user_id)
        .order_by(ChatParticipant.is_pinned.desc(), Chat.updated_at.desc())
        .all()
    )


def get_chat_by_id(db: Session, chat_id: int):
    return (
        db.query(Chat)
        .options(
            joinedload(Chat.participants).joinedload(ChatParticipant.user),
            joinedload(Chat.created_by),
        )
        .filter(Chat.id == chat_id)
        .first()
    )


def is_chat_participant(db: Session, chat_id: int, user_id: int) -> bool:
    return (
        db.query(ChatParticipant.id)
        .filter(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user_id,
        )
        .first()
        is not None
    )


def create_chat(
    db: Session,
    *,
    title: str,
    description: str | None,
    type: str,
    avatar_url: str | None,
    avatar_settings: dict | None = None,
    workspace_id: int | None,
    created_by_id: int,
    participant_ids: list[int],
):
    chat = Chat(
        title=title,
        description=description,
        type=type,
        avatar_url=avatar_url,
        avatar_settings=avatar_settings,
        workspace_id=workspace_id,
        created_by_id=created_by_id,
    )

    db.add(chat)
    db.flush()

    unique_participant_ids = set(participant_ids or [])
    unique_participant_ids.add(created_by_id)

    for user_id in unique_participant_ids:
        db.add(
            ChatParticipant(
                chat_id=chat.id,
                user_id=user_id,
                role="admin" if user_id == created_by_id else "member",
            )
        )

    db.commit()

    return get_chat_by_id(db, chat.id)


def update_chat(db: Session, chat: Chat, data: dict):
    for key, value in data.items():
        if value is not None and hasattr(chat, key):
            setattr(chat, key, value)

    chat.updated_at = datetime.utcnow()

    db.commit()

    return get_chat_by_id(db, chat.id)


def delete_chat(db: Session, *, chat_id: int):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()

    if not chat:
        return False

    db.delete(chat)
    db.commit()

    return True


def get_chat_messages(
    db: Session,
    *,
    chat_id: int,
    limit: int = 50,
    offset: int = 0,
):
    query = (
        db.query(ChatMessage)
        .options(
            joinedload(ChatMessage.created_by),
            joinedload(ChatMessage.attachments),
            joinedload(ChatMessage.reactions).joinedload(ChatMessageReaction.user),
            joinedload(ChatMessage.mentions).joinedload(ChatMessageMention.user),
            joinedload(ChatMessage.parent_message).joinedload(ChatMessage.created_by),
        )
        .filter(
            ChatMessage.chat_id == chat_id,
            ChatMessage.deleted_at.is_(None),
        )
    )

    total = query.count()

    items = (
        query.order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return items, total


def get_last_message(db: Session, chat_id: int):
    return (
        db.query(ChatMessage)
        .options(
            joinedload(ChatMessage.created_by),
            joinedload(ChatMessage.attachments),
            joinedload(ChatMessage.reactions).joinedload(ChatMessageReaction.user),
            joinedload(ChatMessage.mentions).joinedload(ChatMessageMention.user),
            joinedload(ChatMessage.parent_message).joinedload(ChatMessage.created_by),
        )
        .filter(
            ChatMessage.chat_id == chat_id,
            ChatMessage.deleted_at.is_(None),
        )
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .first()
    )


def get_chat_participants_count(db: Session, chat_id: int) -> int:
    return (
        db.query(func.count(ChatParticipant.id))
        .filter(ChatParticipant.chat_id == chat_id)
        .scalar()
        or 0
    )


def create_message(
    db: Session,
    *,
    chat_id: int,
    created_by_id: int,
    content: str | None,
    parent_message_id: int | None,
    attachments: list[dict],
    mentions: list[dict],
):
    message = ChatMessage(
        chat_id=chat_id,
        created_by_id=created_by_id,
        content=content,
        parent_message_id=parent_message_id,
    )

    db.add(message)
    db.flush()

    for attachment in attachments or []:
        db.add(
            ChatMessageAttachment(
                message_id=message.id,
                file_url=attachment.get("file_url"),
                file_name=attachment.get("file_name"),
                file_type=attachment.get("file_type"),
                file_size=attachment.get("file_size"),
            )
        )

    for mention in mentions or []:
        db.add(
            ChatMessageMention(
                message_id=message.id,
                user_id=mention.get("user_id"),
                mention_key=mention.get("mention_key"),
            )
        )

    chat = db.query(Chat).filter(Chat.id == chat_id).first()

    if chat:
        chat.updated_at = datetime.utcnow()

    db.commit()

    return get_message_by_id(db, message.id)


def get_message_by_id(db: Session, message_id: int):
    return (
        db.query(ChatMessage)
        .options(
            joinedload(ChatMessage.created_by),
            joinedload(ChatMessage.attachments),
            joinedload(ChatMessage.reactions).joinedload(ChatMessageReaction.user),
            joinedload(ChatMessage.mentions).joinedload(ChatMessageMention.user),
            joinedload(ChatMessage.parent_message).joinedload(ChatMessage.created_by),
        )
        .filter(ChatMessage.id == message_id)
        .first()
    )


def update_message(
    db: Session,
    message: ChatMessage,
    *,
    content: str | None,
    mentions: list[dict] | None = None,
):
    message.content = content
    message.edited_at = datetime.utcnow()

    if mentions is not None:
        db.query(ChatMessageMention).filter(
            ChatMessageMention.message_id == message.id
        ).delete()

        for mention in mentions:
            db.add(
                ChatMessageMention(
                    message_id=message.id,
                    user_id=mention.get("user_id"),
                    mention_key=mention.get("mention_key"),
                )
            )

    chat = db.query(Chat).filter(Chat.id == message.chat_id).first()

    if chat:
        chat.updated_at = datetime.utcnow()

    db.commit()

    return get_message_by_id(db, message.id)


def soft_delete_message(db: Session, message: ChatMessage):
    message.deleted_at = datetime.utcnow()

    chat = db.query(Chat).filter(Chat.id == message.chat_id).first()

    if chat:
        chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    return message


def add_reaction(
    db: Session,
    *,
    message_id: int,
    user_id: int,
    emoji: str,
):
    existing = (
        db.query(ChatMessageReaction)
        .filter(
            ChatMessageReaction.message_id == message_id,
            ChatMessageReaction.user_id == user_id,
            ChatMessageReaction.emoji == emoji,
        )
        .first()
    )

    if existing:
        return existing

    reaction = ChatMessageReaction(
        message_id=message_id,
        user_id=user_id,
        emoji=emoji,
    )

    db.add(reaction)
    db.commit()
    db.refresh(reaction)

    return reaction


def remove_reaction(
    db: Session,
    *,
    message_id: int,
    user_id: int,
    emoji: str,
):
    reaction = (
        db.query(ChatMessageReaction)
        .filter(
            ChatMessageReaction.message_id == message_id,
            ChatMessageReaction.user_id == user_id,
            ChatMessageReaction.emoji == emoji,
        )
        .first()
    )

    if reaction:
        db.delete(reaction)
        db.commit()

    return True


def get_chat_participants(db: Session, chat_id: int):
    return (
        db.query(ChatParticipant)
        .options(joinedload(ChatParticipant.user))
        .filter(ChatParticipant.chat_id == chat_id)
        .order_by(ChatParticipant.joined_at.asc())
        .all()
    )


def add_participant(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
    role: str = "member",
):
    existing = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user_id,
        )
        .first()
    )

    if existing:
        return existing

    participant = ChatParticipant(
        chat_id=chat_id,
        user_id=user_id,
        role=role,
    )

    db.add(participant)

    chat = db.query(Chat).filter(Chat.id == chat_id).first()

    if chat:
        chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(participant)

    return participant


def remove_participant(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
):
    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user_id,
        )
        .first()
    )

    if participant:
        db.delete(participant)

        chat = db.query(Chat).filter(Chat.id == chat_id).first()

        if chat:
            chat.updated_at = datetime.utcnow()

        db.commit()

    return True


def update_participant(
    db: Session,
    participant: ChatParticipant,
    data: dict,
):
    for key, value in data.items():
        if value is not None and hasattr(participant, key):
            setattr(participant, key, value)

    db.commit()
    db.refresh(participant)

    return participant


def get_participant(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
):
    return (
        db.query(ChatParticipant)
        .options(joinedload(ChatParticipant.user))
        .filter(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user_id,
        )
        .first()
    )


def update_read_state(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
    last_read_message_id: int,
):
    participant = get_participant(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    if not participant:
        return None

    participant.last_read_message_id = last_read_message_id

    db.commit()
    db.refresh(participant)

    return participant


def get_unread_count(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
):
    participant = get_participant(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    if not participant:
        return 0

    query = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.chat_id == chat_id,
        ChatMessage.deleted_at.is_(None),
        ChatMessage.created_by_id != user_id,
    )

    if participant.last_read_message_id:
        query = query.filter(ChatMessage.id > participant.last_read_message_id)

    return query.scalar() or 0


def search_user_chats(
    db: Session,
    *,
    user_id: int,
    search: str,
):
    query = (
        db.query(Chat)
        .join(ChatParticipant, ChatParticipant.chat_id == Chat.id)
        .filter(ChatParticipant.user_id == user_id)
    )

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(Chat.title.ilike(search_pattern))

    return (
        query.order_by(
            ChatParticipant.is_pinned.desc(),
            Chat.updated_at.desc(),
        )
        .all()
    )


def get_direct_chat_between_users(
    db: Session,
    *,
    user_a_id: int,
    user_b_id: int,
):
    direct_chats = (
        db.query(Chat)
        .join(ChatParticipant, ChatParticipant.chat_id == Chat.id)
        .filter(Chat.type == "direct")
        .filter(ChatParticipant.user_id.in_([user_a_id, user_b_id]))
        .all()
    )

    for chat in direct_chats:
        participant_ids = {participant.user_id for participant in chat.participants}

        if participant_ids == {user_a_id, user_b_id}:
            return chat

    return None


def get_or_create_direct_chat(
    db: Session,
    *,
    current_user_id: int,
    target_user_id: int,
):
    existing_chat = get_direct_chat_between_users(
        db,
        user_a_id=current_user_id,
        user_b_id=target_user_id,
    )

    if existing_chat:
        return existing_chat

    return create_chat(
        db,
        title="Личная переписка",
        description=None,
        type="direct",
        avatar_url=None,
        avatar_settings=None,
        workspace_id=None,
        created_by_id=current_user_id,
        participant_ids=[target_user_id],
    )