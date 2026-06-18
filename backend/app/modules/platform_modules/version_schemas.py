"""Pydantic schemas for platform module versions."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PlatformModuleVersionOut(BaseModel):
    id: int
    module_key: str
    version: str
    status: str
    release_id: int | None = None
    release_version: str | None = None
    release_date: datetime | None = None
    change_log: str | None = None
    breaking_changes: str | None = None
    manifest_version: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlatformModuleVersionDetailOut(PlatformModuleVersionOut):
    manifest_id: int | None = None
    manifest_status: str | None = None
    module_title: str | None = None


class PlatformReleaseModuleOut(BaseModel):
    id: int
    release_id: int
    module_key: str
    module_title: str | None = None
    from_version: str
    to_version: str
    change_summary: str | None = None

    model_config = {"from_attributes": True}


class TenantModuleVersionComparisonOut(BaseModel):
    module_key: str
    tenant_version: str
    platform_latest_version: str
    versions_match: bool
    update_available: bool = Field(
        description="Prepared for future update offers; always false in read-only MVP",
        default=False,
    )
