from typing import Any, Optional

from pydantic import BaseModel, Field


# ------------------------
# COLUMNS
# ------------------------

class TableColumnBase(BaseModel):
    title: str
    type: str = "text"
    required: bool = False
    width: int = 180
    position: int = 0

    # Для типа "choice"
    options: list[dict] = Field(default_factory=list)

    # left | center | right
    align: str = "left"

    # Для типа "lookup"
    lookup: dict[str, Any] = Field(default_factory=dict)


class TableColumnCreate(TableColumnBase):
    pass


class TableColumnUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    width: Optional[int] = None
    position: Optional[int] = None
    options: Optional[list[dict]] = None
    align: Optional[str] = None
    lookup: Optional[dict[str, Any]] = None


class TableColumnResponse(TableColumnBase):
    id: int
    table_id: int

    class Config:
        from_attributes = True


# ------------------------
# ROWS
# ------------------------

class TableRowBase(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)
    position: int = 0


class TableRowCreate(TableRowBase):
    pass


class TableRowUpdate(BaseModel):
    values: Optional[dict[str, Any]] = None
    position: Optional[int] = None


class TableRowResponse(TableRowBase):
    id: int
    table_id: int

    class Config:
        from_attributes = True


# ------------------------
# TABLE
# ------------------------

class TableBase(BaseModel):
    title: str = "Таблица"


class TableCreate(TableBase):
    block_id: int


class TableUpdate(BaseModel):
    title: Optional[str] = None


class TableResponse(TableBase):
    id: int
    block_id: int

    columns: list[TableColumnResponse] = Field(default_factory=list)
    rows: list[TableRowResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ------------------------
# LOOKUP
# ------------------------

class LookupSourceResponse(BaseModel):
    portal_id: Optional[int] = None
    portal_title: str = ""

    page_id: Optional[int] = None
    page_title: str = ""

    section_id: Optional[int] = None
    section_title: str = ""

    block_id: Optional[int] = None
    block_title: str = ""

    table_id: int
    table_title: str = ""

    path: str = ""


class LookupOptionResponse(BaseModel):
    row_id: int
    label: str = ""