from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.ext.mutable import MutableDict

from app.db.base import Base


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)

    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)

    type = Column(String(100), nullable=False)
    # text | image | documents | cards | steps | tree | calculator | table

    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    status = Column(String(50), default="draft")
    # draft | published | hidden

    settings = Column(MutableDict.as_mutable(JSON), default=dict)
    content = Column(MutableDict.as_mutable(JSON), default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())