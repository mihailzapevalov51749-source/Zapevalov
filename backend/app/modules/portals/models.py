from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Portal(Base):
    __tablename__ = "portals"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # связи добавим позже