from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)

    block_id = Column(
        Integer,
        ForeignKey("blocks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )

    title = Column(String, nullable=False, default="Таблица")

    columns = relationship(
        "TableColumn",
        back_populates="table",
        cascade="all, delete-orphan",
        order_by="TableColumn.position",
    )

    rows = relationship(
        "TableRow",
        back_populates="table",
        cascade="all, delete-orphan",
        order_by="TableRow.position",
    )


class TableColumn(Base):
    __tablename__ = "table_columns"

    id = Column(Integer, primary_key=True, index=True)

    table_id = Column(
        Integer,
        ForeignKey("tables.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String, nullable=False)
    type = Column(String, nullable=False, default="text")

    required = Column(Boolean, nullable=False, default=False)
    width = Column(Integer, nullable=False, default=180)
    position = Column(Integer, nullable=False, default=0)

    # Для типа "choice"
    options = Column(JSONB, nullable=False, default=list)

    # Выравнивание содержимого ячеек:
    # left | center | right
    align = Column(String, nullable=False, default="left")

    # Для типа "lookup" / "Подстановка"
    #
    # Структура:
    # {
    #   "sourcePortalId": 1,
    #   "sourcePageId": 15,
    #   "sourceSectionId": 42,
    #   "sourceBlockId": 108,
    #   "sourceTableId": 7,
    #   "sourcePath": "Портал / Страница / Раздел / Таблица",
    #   "displayColumnId": 3
    # }
    #
    # Главный технический ключ — sourceTableId или sourceBlockId.
    # sourcePath нужен для понятного отображения пользователю.
    lookup = Column(JSONB, nullable=False, default=dict)

    table = relationship("Table", back_populates="columns")


class TableRow(Base):
    __tablename__ = "table_rows"

    id = Column(Integer, primary_key=True, index=True)

    table_id = Column(
        Integer,
        ForeignKey("tables.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Для обычных ячеек:
    # {
    #   "1": "Текст",
    #   "2": "Значение"
    # }
    #
    # Для lookup-ячейки:
    # {
    #   "5": {
    #     "rowId": 123
    #   }
    # }
    values = Column(JSONB, nullable=False, default=dict)

    position = Column(Integer, nullable=False, default=0)

    table = relationship("Table", back_populates="rows")