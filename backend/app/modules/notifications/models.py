from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base

from app.modules.notifications.constants import (
    NOTIFICATION_PRIORITY_NORMAL,
)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    type = Column(
        String(100),
        nullable=False,
        index=True,
    )

    category = Column(
        String(100),
        nullable=True,
        index=True,
    )

    priority = Column(
        String(30),
        nullable=False,
        default=NOTIFICATION_PRIORITY_NORMAL,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=True,
    )

    entity_type = Column(
        String(100),
        nullable=True,
        index=True,
    )

    entity_id = Column(
        String(120),
        nullable=True,
        index=True,
    )

    context = Column(
        JSON,
        nullable=True,
    )

    actor_snapshot = Column(
        JSON,
        nullable=True,
    )

    created_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
    )

    recipients = relationship(
        "NotificationRecipient",
        back_populates="notification",
        cascade="all, delete-orphan",
    )


class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    notification_id = Column(
        Integer,
        ForeignKey(
            "notifications.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    read_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    notification = relationship(
        "Notification",
        back_populates="recipients",
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
    )