from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableDict

from app.db.base import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)

    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    layout = Column(String(50), default="one_column")
    # one_column | two_columns | three_columns | flexible

    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    # ВАЖНО: исправлено
    settings = Column(MutableDict.as_mutable(JSON), default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # связь с blocks добавим после модуля blocks