from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class UniversalView(Base):
    __tablename__ = "universal_views"

    id = Column(Integer, primary_key=True, index=True)

    table_id = Column(
        Integer,
        ForeignKey("universal_tables.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, default="table")

    settings = Column(JSONB, nullable=False, default=dict)
    layout = Column(JSONB, nullable=False, default=dict)
    filters = Column(JSONB, nullable=False, default=list)
    sorting = Column(JSONB, nullable=False, default=list)
    grouping = Column(JSONB, nullable=False, default=dict)
    visible_fields = Column(JSONB, nullable=False, default=list)

    is_default = Column(Boolean, nullable=False, default=False)
    is_visible = Column(Boolean, nullable=False, default=True)

    is_system = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    position = Column(Integer, nullable=False, default=0)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

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

    table = relationship("UniversalTable", backref="views")