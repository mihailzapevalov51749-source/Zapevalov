"""Pydantic schemas for platform release package registry API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ReleasePackageResponse(BaseModel):
    id: int
    package_key: str
    platform_version: str
    build_id: int
    status: str
    package_manifest_json: dict[str, Any] = Field(default_factory=dict)
    module_bom_json: dict[str, Any] = Field(default_factory=dict)
    release_notes: str | None = None
    created_at: datetime
    ready_at: datetime | None = None
    published_at: datetime | None = None
    deprecated_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_by: int | None = None
    cancelled_by: int | None = None
    cancellation_reason: str | None = None

    model_config = {"from_attributes": True}


class CreateReleasePackageRequest(BaseModel):
    package_key: str = Field(min_length=1, max_length=32)
    build_id: int
    platform_version: str = Field(min_length=1, max_length=40)
    package_manifest_json: dict[str, Any] = Field(default_factory=dict)
    module_bom_json: dict[str, Any] = Field(default_factory=dict)
    release_notes: str | None = None


class CancelReleasePackageRequest(BaseModel):
    cancellation_reason: str = Field(min_length=1, max_length=4000)

