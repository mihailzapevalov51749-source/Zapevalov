from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)

    entity_type = Column(String(80), nullable=False, index=True)

    # Название / ключ сущности
    entity_id = Column(String(120), nullable=False, index=True)

    # Технический ID файла для deep-link и уведомлений
    file_id = Column(
        String(120),
        nullable=True,
        index=True,
    )

    parent_comment_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # FOUNDATION FOR THREADS
    root_comment_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    kind = Column(String(30), nullable=False, default="user")

    system_event_key = Column(String(120), nullable=True)
    system_payload = Column(JSONB, nullable=True)

    body = Column(Text, nullable=False, default="")
    body_format = Column(String(30), nullable=False, default="plain")

    author_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    author_snapshot = Column(JSONB, nullable=True)

    is_pinned = Column(Boolean, nullable=False, default=False)

    pinned_at = Column(DateTime(timezone=True), nullable=True)

    pinned_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    edited_at = Column(DateTime(timezone=True), nullable=True)

    edited_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    deleted_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    delete_reason = Column(String(80), nullable=True)

    version = Column(Integer, nullable=False, default=1)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    parent = relationship(
        "Comment",
        remote_side=[id],
        foreign_keys=[parent_comment_id],
        backref="replies",
    )

    root_comment = relationship(
        "Comment",
        remote_side=[id],
        foreign_keys=[root_comment_id],
        backref="thread_comments",
    )

    author = relationship(
        "User",
        foreign_keys=[author_user_id],
    )

    edited_by = relationship(
        "User",
        foreign_keys=[edited_by_user_id],
    )

    pinned_by = relationship(
        "User",
        foreign_keys=[pinned_by_user_id],
    )

    deleted_by = relationship(
        "User",
        foreign_keys=[deleted_by_user_id],
    )


class CommentAttachment(Base):
    __tablename__ = "comment_attachments"

    id = Column(Integer, primary_key=True, index=True)

    comment_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    file_url = Column(String(1000), nullable=False)
    file_name = Column(String(255), nullable=False)

    file_type = Column(String(120), nullable=True)
    file_size = Column(Integer, nullable=True)

    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    comment = relationship(
        "Comment",
        backref="attachments",
    )

    uploaded_by = relationship("User")


class CommentMention(Base):
    __tablename__ = "comment_mentions"

    id = Column(Integer, primary_key=True, index=True)

    comment_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mentioned_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    is_read = Column(Boolean, nullable=False, default=False)

    notification_status = Column(
        String(40),
        nullable=False,
        default="pending",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    comment = relationship(
        "Comment",
        backref="mentions",
    )

    mentioned_user = relationship("User")


class CommentReaction(Base):
    __tablename__ = "comment_reactions"

    id = Column(Integer, primary_key=True, index=True)

    comment_id = Column(
        Integer,
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    emoji_key = Column(String(80), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    comment = relationship(
        "Comment",
        backref="reactions",
    )

    user = relationship("User")


Index(
    "ix_comments_entity_active_created",
    Comment.entity_type,
    Comment.entity_id,
    Comment.created_at.desc(),
    postgresql_where=Comment.deleted_at.is_(None),
)

Index(
    "ix_comments_parent_active",
    Comment.parent_comment_id,
    postgresql_where=Comment.deleted_at.is_(None),
)

Index(
    "ix_comments_root_active",
    Comment.root_comment_id,
    postgresql_where=Comment.deleted_at.is_(None),
)

Index(
    "ix_comment_reactions_unique",
    CommentReaction.comment_id,
    CommentReaction.user_id,
    CommentReaction.emoji_key,
    unique=True,
)