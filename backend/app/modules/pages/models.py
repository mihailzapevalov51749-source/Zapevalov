from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)

    portal_id = Column(Integer, ForeignKey("portals.id"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    status = Column(String(50), default="draft")
    # draft | published | hidden

    is_home = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)

    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # связи с sections добавим после создания модуля sections