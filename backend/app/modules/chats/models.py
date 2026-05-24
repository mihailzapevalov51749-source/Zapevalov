from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)

    description = Column(Text, nullable=True)

    type = Column(String(50), nullable=False, default="group")

    avatar_url = Column(String(1000), nullable=True)

    avatar_settings = Column(JSONB, nullable=True)

    workspace_id = Column(Integer, nullable=True)

    created_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    created_by = relationship("User")

    participants = relationship(
        "ChatParticipant",
        back_populates="chat",
        cascade="all, delete-orphan",
    )

    messages = relationship(
        "ChatMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
    )


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id = Column(Integer, primary_key=True, index=True)

    chat_id = Column(
        Integer,
        ForeignKey("chats.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    role = Column(
        String(50),
        nullable=False,
        default="member",
    )

    is_muted = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_pinned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    last_read_message_id = Column(
        Integer,
        nullable=True,
    )

    joined_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    chat = relationship(
        "Chat",
        back_populates="participants",
    )

    user = relationship("User")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)

    chat_id = Column(
        Integer,
        ForeignKey("chats.id", ondelete="CASCADE"),
        nullable=False,
    )

    parent_message_id = Column(
        Integer,
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    content = Column(
        Text,
        nullable=True,
    )

    created_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    edited_at = Column(
        DateTime,
        nullable=True,
    )

    deleted_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    chat = relationship(
        "Chat",
        back_populates="messages",
    )

    created_by = relationship("User")

    parent_message = relationship(
        "ChatMessage",
        remote_side=[id],
    )

    attachments = relationship(
        "ChatMessageAttachment",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    reactions = relationship(
        "ChatMessageReaction",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    mentions = relationship(
        "ChatMessageMention",
        back_populates="message",
        cascade="all, delete-orphan",
    )


class ChatMessageAttachment(Base):
    __tablename__ = "chat_message_attachments"

    id = Column(Integer, primary_key=True, index=True)

    message_id = Column(
        Integer,
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        nullable=False,
    )

    file_url = Column(
        String(1000),
        nullable=False,
    )

    file_name = Column(
        String(500),
        nullable=False,
    )

    file_type = Column(
        String(100),
        nullable=True,
    )

    file_size = Column(
        Integer,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    message = relationship(
        "ChatMessage",
        back_populates="attachments",
    )


class ChatMessageReaction(Base):
    __tablename__ = "chat_message_reactions"

    id = Column(Integer, primary_key=True, index=True)

    message_id = Column(
        Integer,
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    emoji = Column(
        String(50),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    message = relationship(
        "ChatMessage",
        back_populates="reactions",
    )

    user = relationship("User")


class ChatMessageMention(Base):
    __tablename__ = "chat_message_mentions"

    id = Column(Integer, primary_key=True, index=True)

    message_id = Column(
        Integer,
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    mention_key = Column(
        String(255),
        nullable=True,
    )

    is_notified = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    message = relationship(
        "ChatMessage",
        back_populates="mentions",
    )

    user = relationship("User")