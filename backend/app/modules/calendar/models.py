from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(64), nullable=False, index=True)
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False, index=True)
    location = Column(String(255), nullable=True)
    meeting_url = Column(String(512), nullable=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="scheduled", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    participants = relationship(
        "CalendarEventParticipant",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    created_by = relationship("User", foreign_keys=[created_by_id])


class CalendarEventParticipant(Base):
    __tablename__ = "calendar_event_participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("calendar_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    event = relationship("CalendarEvent", back_populates="participants")
    user = relationship("User")
