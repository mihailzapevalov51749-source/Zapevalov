"""Pydantic schemas for platform version registry."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlatformEnvironmentVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    environment_key: str
    environment_label: str
    tenant_name: str | None = None
    tenant_code: str | None = None
    platform_version: str
    status: str
    installed_at: datetime
    installed_by_id: int | None = None
    installed_by_name: str | None = None
    notes: str | None = None
    change_description: str | None = None
    updated_at: datetime


class PlatformVersionHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    environment_key: str
    environment_label: str
    tenant_name: str | None = None
    tenant_code: str | None = None
    platform_version: str
    status: str
    installed_at: datetime
    installed_by_id: int | None = None
    installed_by_name: str | None = None
    notes: str | None = None
    change_description: str | None = None
    recorded_at: datetime
    superseded_at: datetime | None = None


class PlatformVersionRegistrySummaryOut(BaseModel):
    current_versions: list[PlatformEnvironmentVersionOut] = Field(default_factory=list)
    history: list[PlatformVersionHistoryOut] = Field(default_factory=list)
