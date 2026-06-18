from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TenantRuntimeMenuSettingRead(BaseModel):
    item_key: str
    navigation_item_id: int | None = None
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


class TenantRuntimeMenuSettingsMapRead(BaseModel):
    settings: dict[str, TenantRuntimeMenuSettingRead] = Field(default_factory=dict)


class TenantRuntimeMenuSettingUpsert(BaseModel):
    navigation_item_id: int | None = None
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


class TenantRuntimeMenuSettingsBulkUpsert(BaseModel):
    settings: dict[str, TenantRuntimeMenuSettingUpsert] = Field(default_factory=dict)


class UserMenuPreferenceRead(BaseModel):
    item_key: str
    navigation_item_id: int | None = None
    sort_order: int | None = None
    is_hidden: bool | None = None
    color: str | None = None
    is_bold: bool | None = None
    is_collapsed: bool | None = None
    personal_block_key: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserMenuPreferencesMapRead(BaseModel):
    preferences: dict[str, UserMenuPreferenceRead] = Field(default_factory=dict)


class UserMenuPreferenceUpsert(BaseModel):
    navigation_item_id: int | None = None
    sort_order: int | None = None
    is_hidden: bool | None = None
    color: str | None = None
    is_bold: bool | None = None
    is_collapsed: bool | None = None
    personal_block_key: str | None = None


class UserMenuPreferencesBulkUpsert(BaseModel):
    preferences: dict[str, UserMenuPreferenceUpsert] = Field(default_factory=dict)
