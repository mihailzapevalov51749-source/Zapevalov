from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)

    entity_type = Column(
        String(80),
        nullable=False,
        index=True,
    )

    entity_id = Column(
        String(120),
        nullable=False,
        index=True,
    )

    content = Column(
        Text,
        nullable=False,
        default="",
    )

    format = Column(
        String(30),
        nullable=False,
        default="html",
    )

    published_version = Column(
        Integer,
        nullable=False,
        default=0,
    )

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

    mentions = relationship(
        "NoteMention",
        back_populates="note",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "entity_type",
            "entity_id",
            name="uq_notes_entity",
        ),
    )


class NoteMention(Base):
    __tablename__ = "note_mentions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    note_id = Column(
        Integer,
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mention_key = Column(
        String(120),
        nullable=False,
        index=True,
    )

    is_notified = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    published_version = Column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    note = relationship(
        "Note",
        back_populates="mentions",
    )

    __table_args__ = (
        UniqueConstraint(
            "note_id",
            "mention_key",
            name="uq_note_mention_key",
        ),
    )