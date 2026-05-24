from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.notifications.constants import (
    NOTIFICATION_PRIORITY_NORMAL,
)
from app.modules.notifications.models import (
    Notification,
    NotificationRecipient,
)


class NotificationService:
    @staticmethod
    def build_actor_snapshot(user):
        if not user:
            return None

        return {
            "id": getattr(user, "id", None),
            "full_name": getattr(user, "full_name", None)
            or getattr(user, "name", None)
            or "Пользователь",
            "email": getattr(user, "email", None),
            "avatar_url": getattr(user, "avatar_url", None),
            "avatar_settings": getattr(user, "avatar_settings", None),
        }

    @staticmethod
    def notify(
        db: Session,
        *,
        type: str,
        title: str,
        message: str | None = None,
        recipients: list[int],
        created_by_id: int | None = None,
        created_by_user=None,
        category: str | None = None,
        priority: str = NOTIFICATION_PRIORITY_NORMAL,
        entity_type: str | None = None,
        entity_id: str | int | None = None,
        context: dict[str, Any] | None = None,
        actor_snapshot: dict[str, Any] | None = None,
    ):
        clean_recipients = []

        for user_id in recipients or []:
            if not user_id:
                continue

            if user_id == created_by_id:
                continue

            if user_id in clean_recipients:
                continue

            clean_recipients.append(user_id)

        if not clean_recipients:
            return None

        final_actor_snapshot = actor_snapshot

        if final_actor_snapshot is None and created_by_user is not None:
            final_actor_snapshot = NotificationService.build_actor_snapshot(
                created_by_user
            )

        notification = Notification(
            type=type,
            category=category,
            priority=priority or NOTIFICATION_PRIORITY_NORMAL,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            context=context,
            actor_snapshot=final_actor_snapshot,
            created_by_id=created_by_id,
        )

        db.add(notification)
        db.flush()

        recipient_models = [
            NotificationRecipient(
                notification_id=notification.id,
                user_id=user_id,
                is_read=False,
            )
            for user_id in clean_recipients
        ]

        db.add_all(recipient_models)
        db.flush()

        return notification

    @staticmethod
    def get_user_notifications(
        db: Session,
        *,
        user_id: int,
        limit: int = 30,
        category: str | None = None,
        only_unread: bool = False,
    ):
        query = (
            db.query(NotificationRecipient)
            .join(Notification)
            .filter(NotificationRecipient.user_id == user_id)
        )

        if category:
            query = query.filter(Notification.category == category)

        if only_unread:
            query = query.filter(NotificationRecipient.is_read.is_(False))

        rows = (
            query.order_by(
                NotificationRecipient.is_read.asc(),
                Notification.created_at.desc(),
            )
            .limit(limit)
            .all()
        )

        return [
            {
                "id": row.notification.id,
                "type": row.notification.type,
                "category": row.notification.category,
                "priority": row.notification.priority,
                "title": row.notification.title,
                "message": row.notification.message,
                "entity_type": row.notification.entity_type,
                "entity_id": row.notification.entity_id,
                "context": row.notification.context,
                "actor_snapshot": row.notification.actor_snapshot,
                "is_read": row.is_read,
                "created_at": row.notification.created_at,
            }
            for row in rows
        ]

    @staticmethod
    def mark_as_read(
        db: Session,
        *,
        notification_id: int,
        user_id: int,
    ):
        recipient = (
            db.query(NotificationRecipient)
            .filter(
                NotificationRecipient.notification_id == notification_id,
                NotificationRecipient.user_id == user_id,
            )
            .first()
        )

        if not recipient:
            return None

        if recipient.is_read:
            return recipient

        recipient.is_read = True
        recipient.read_at = datetime.utcnow()

        db.commit()
        db.refresh(recipient)

        return recipient

    @staticmethod
    def mark_all_as_read(
        db: Session,
        *,
        user_id: int,
    ):
        now = datetime.utcnow()

        recipients = (
            db.query(NotificationRecipient)
            .filter(
                NotificationRecipient.user_id == user_id,
                NotificationRecipient.is_read.is_(False),
            )
            .all()
        )

        for recipient in recipients:
            recipient.is_read = True
            recipient.read_at = now

        db.commit()

        return len(recipients)

    @staticmethod
    def get_unread_count(
        db: Session,
        *,
        user_id: int,
    ):
        return (
            db.query(NotificationRecipient)
            .filter(
                NotificationRecipient.user_id == user_id,
                NotificationRecipient.is_read.is_(False),
            )
            .count()
        )