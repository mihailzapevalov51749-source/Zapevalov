from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class UniversalTable(Base):
    __tablename__ = "universal_tables"

    id = Column(Integer, primary_key=True, index=True)

    block_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False, default="Новая таблица")
    settings = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    columns = relationship(
        "UniversalTableColumn",
        back_populates="table",
        cascade="all, delete-orphan",
        order_by="UniversalTableColumn.position",
    )

    rows = relationship(
        "UniversalTableRow",
        back_populates="table",
        cascade="all, delete-orphan",
        order_by="UniversalTableRow.position",
    )


class UniversalTableColumn(Base):
    __tablename__ = "universal_table_columns"

    id = Column(Integer, primary_key=True, index=True)

    table_id = Column(
        Integer,
        ForeignKey("universal_tables.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String, nullable=False)

    type = Column(String, nullable=False, default="text")

    system_key = Column(String, nullable=True, index=True)

    required = Column(Boolean, nullable=False, default=False)

    width = Column(Integer, nullable=False, default=180)
    position = Column(Integer, nullable=False, default=0)

    options = Column(JSONB, nullable=False, default=list)

    # Для типа "Выбор":
    # False — одиночный выбор
    # True — множественный выбор
    multiple = Column(Boolean, nullable=False, default=False)

    align = Column(String, nullable=False, default="left")

    lookup = Column(JSONB, nullable=False, default=dict)

    is_system = Column(Boolean, nullable=False, default=False)
    is_readonly = Column(Boolean, nullable=False, default=False)

    lock_position = Column(Boolean, nullable=False, default=False)
    lock_width = Column(Boolean, nullable=False, default=False)
    lock_delete = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    table = relationship("UniversalTable", back_populates="columns")


class UniversalTableRow(Base):
    __tablename__ = "universal_table_rows"

    id = Column(Integer, primary_key=True, index=True)

    table_id = Column(
        Integer,
        ForeignKey("universal_tables.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_row_id = Column(
        Integer,
        ForeignKey("universal_table_rows.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    number = Column(Integer, nullable=False, default=0, index=True)

    values = Column(JSONB, nullable=False, default=dict)

    position = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    table = relationship("UniversalTable", back_populates="rows")

    parent = relationship(
        "UniversalTableRow",
        remote_side=[id],
        back_populates="children",
    )

    children = relationship(
        "UniversalTableRow",
        back_populates="parent",
        cascade="all, delete-orphan",
    )