from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DesignerSystemMenuSettingRead(BaseModel):
    item_key: str
    title: str | None = None
    icon: str | None = None
    icon_type: str | None = None
    icon_file_url: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_visible: bool | None = None
    is_bold: bool | None = None
    is_italic: bool | None = None
    is_expanded: bool | None = None
    block_id: int | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DesignerSystemMenuSettingsMapRead(BaseModel):
    settings: dict[str, DesignerSystemMenuSettingRead] = Field(default_factory=dict)


class DesignerSystemMenuSettingUpsert(BaseModel):
    title: str | None = None
    icon: str | None = None
    icon_type: str | None = None
    icon_file_url: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_visible: bool | None = None
    is_bold: bool | None = None
    is_italic: bool | None = None
    is_expanded: bool | None = None
    block_id: int | None = None


class DesignerSystemMenuSettingsBulkUpsert(BaseModel):
    settings: dict[str, DesignerSystemMenuSettingUpsert] = Field(default_factory=dict)
