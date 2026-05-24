from sqlalchemy.orm import Session

from app.modules.chats import crud
from app.modules.notifications.models import (
    Notification,
    NotificationRecipient,
)


def create_chat_message(
    db: Session,
    *,
    chat_id: int,
    created_by_id: int,
    content: str | None,
    parent_message_id: int | None,
    attachments: list[dict],
    mentions: list[dict],
):
    message = crud.create_message(
        db,
        chat_id=chat_id,
        created_by_id=created_by_id,
        content=content,
        parent_message_id=parent_message_id,
        attachments=attachments,
        mentions=mentions,
    )

    process_mentions(
        db,
        message_id=message.id,
        chat_id=chat_id,
        mentions=mentions,
        sender_user_id=created_by_id,
    )

    process_reply_notification(
        db,
        chat_id=chat_id,
        message_id=message.id,
        parent_message_id=parent_message_id,
        sender_user_id=created_by_id,
    )

    return message


def process_mentions(
    db: Session,
    *,
    message_id: int,
    chat_id: int,
    mentions: list[dict],
    sender_user_id: int,
):
    if not mentions:
        return

    for mention in mentions:
        mentioned_user_id = mention.get("user_id")

        if not mentioned_user_id:
            continue

        mentioned_user_id = int(mentioned_user_id)
        sender_user_id = int(sender_user_id)

        if mentioned_user_id == sender_user_id:
            continue

        ensure_chat_participant(
            db,
            chat_id=chat_id,
            user_id=mentioned_user_id,
        )

        create_mention_notification(
            db,
            chat_id=chat_id,
            message_id=message_id,
            mentioned_user_id=mentioned_user_id,
            sender_user_id=sender_user_id,
        )


def process_reply_notification(
    db: Session,
    *,
    chat_id: int,
    message_id: int,
    parent_message_id: int | None,
    sender_user_id: int,
):
    if not parent_message_id:
        return

    parent_message = crud.get_message_by_id(
        db,
        parent_message_id,
    )

    if not parent_message:
        return

    recipient_user_id = parent_message.created_by_id

    if int(recipient_user_id) == int(sender_user_id):
        return

    ensure_chat_participant(
        db,
        chat_id=chat_id,
        user_id=recipient_user_id,
    )

    create_reply_notification(
        db,
        chat_id=chat_id,
        message_id=message_id,
        parent_message_id=parent_message_id,
        recipient_user_id=recipient_user_id,
        sender_user_id=sender_user_id,
    )


def ensure_chat_participant(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
):
    if crud.is_chat_participant(
        db,
        chat_id=chat_id,
        user_id=user_id,
    ):
        return

    crud.add_participant(
        db,
        chat_id=chat_id,
        user_id=user_id,
        role="member",
    )


def create_mention_notification(
    db: Session,
    *,
    chat_id: int,
    message_id: int,
    mentioned_user_id: int,
    sender_user_id: int,
):
    return create_chat_notification(
        db,
        type="chat_mention",
        title="Вас упомянули в чате",
        message="Пользователь упомянул вас в сообщении",
        chat_id=chat_id,
        message_id=message_id,
        recipient_user_id=mentioned_user_id,
        sender_user_id=sender_user_id,
        context_extra={},
    )


def create_reply_notification(
    db: Session,
    *,
    chat_id: int,
    message_id: int,
    parent_message_id: int,
    recipient_user_id: int,
    sender_user_id: int,
):
    return create_chat_notification(
        db,
        type="chat_reply",
        title="Ответ на ваше сообщение",
        message="Пользователь ответил на ваше сообщение в чате",
        chat_id=chat_id,
        message_id=message_id,
        recipient_user_id=recipient_user_id,
        sender_user_id=sender_user_id,
        context_extra={
            "parent_message_id": parent_message_id,
        },
    )


def create_chat_notification(
    db: Session,
    *,
    type: str,
    title: str,
    message: str,
    chat_id: int,
    message_id: int,
    recipient_user_id: int,
    sender_user_id: int,
    context_extra: dict | None = None,
):
    context = {
        "entity_type": "chat",
        "entity_id": str(chat_id),
        "chat_id": chat_id,
        "message_id": message_id,
        "highlight_id": f"chat-message-{message_id}",
        "tab": "chat",
    }

    if context_extra:
        context.update(context_extra)

    notification = Notification(
        type=type,
        category="chats",
        priority="normal",
        title=title,
        message=message,
        entity_type="chat",
        entity_id=str(chat_id),
        created_by_id=sender_user_id,
        context=context,
    )

    db.add(notification)
    db.flush()

    recipient = NotificationRecipient(
        notification_id=notification.id,
        user_id=recipient_user_id,
        is_read=False,
    )

    db.add(recipient)
    db.commit()
    db.refresh(notification)

    return notification