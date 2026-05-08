from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UniversalTableColumnBase(BaseModel):
    title: str
    type: str = "text"

    system_key: str | None = None

    required: bool = False
    width: int = 180
    position: int = 0

    options: list[dict[str, Any]] | list[Any] = Field(default_factory=list)

    # Для типа поля "Выбор":
    # False — одиночный выбор
    # True — множественный выбор
    multiple: bool = False

    align: str = "left"
    lookup: dict[str, Any] = Field(default_factory=dict)


class UniversalTableColumnCreate(UniversalTableColumnBase):
    pass


class UniversalTableColumnUpdate(BaseModel):
    title: str | None = None
    type: str | None = None

    system_key: str | None = None

    required: bool | None = None
    width: int | None = None
    position: int | None = None

    options: list[dict[str, Any]] | list[Any] | None = None

    # Для типа поля "Выбор":
    # False — одиночный выбор
    # True — множественный выбор
    multiple: bool | None = None

    align: str | None = None
    lookup: dict[str, Any] | None = None


class UniversalTableColumnRead(UniversalTableColumnBase):
    id: int
    table_id: int

    is_system: bool = False
    is_readonly: bool = False
    lock_position: bool = False
    lock_width: bool = False
    lock_delete: bool = False

    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class UniversalTableRowBase(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)
    position: int = 0

    parent_row_id: int | None = None
    parent_id: int | None = None
    parentId: int | None = None


class UniversalTableRowCreate(UniversalTableRowBase):
    pass


class UniversalTableRowUpdate(BaseModel):
    values: dict[str, Any] | None = None
    position: int | None = None

    parent_row_id: int | None = None
    parent_id: int | None = None
    parentId: int | None = None


class UniversalTableRowRead(UniversalTableRowBase):
    id: int
    table_id: int

    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class UniversalTableBase(BaseModel):
    title: str = "Новая таблица"
    block_id: int | None = None
    settings: dict[str, Any] = Field(default_factory=dict)


class UniversalTableCreate(UniversalTableBase):
    pass


class UniversalTableUpdate(BaseModel):
    title: str | None = None
    settings: dict[str, Any] | None = None


class UniversalTableRead(UniversalTableBase):
    id: int

    columns: list[UniversalTableColumnRead] = Field(default_factory=list)
    rows: list[UniversalTableRowRead] = Field(default_factory=list)

    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True