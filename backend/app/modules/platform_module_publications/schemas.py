"""Pydantic schemas for platform module publications."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PlatformModulePublicationOut(BaseModel):
    id: int
    module_key: str
    module_title: str | None = None
    source_tenant_id: int
    source_tenant_name: str | None = None
    target_tenant_id: int
    target_tenant_name: str | None = None
    from_module_version: str
    to_module_version: str
    from_config_version: str
    to_config_version: str
    manifest_version: str | None = None
    publication_status: str
    publication_type: str
    release_summary: str | None = None
    risk_level: str | None = None
    created_by: int | None = None
    created_by_name: str | None = None
    reviewed_by: int | None = None
    reviewed_by_name: str | None = None
    approved_by: int | None = None
    approved_by_name: str | None = None
    created_at: datetime
    review_started_at: datetime | None = None
    approved_at: datetime | None = None
    published_at: datetime | None = None
    notes: str | None = None


class PlatformModulePublicationDetailOut(PlatformModulePublicationOut):
    snapshot_payload: dict[str, Any] = Field(default_factory=dict)
    configuration_diff: dict[str, Any] = Field(default_factory=dict)
    manifest: dict[str, Any] = Field(default_factory=dict)


class PlatformModulePublicationCreate(BaseModel):
    module_key: str
    release_summary: str | None = None
    notes: str | None = None


class PlatformModulePublicationReviewNotes(BaseModel):
    notes: str | None = None


class PlatformModulePublicationPublishResult(BaseModel):
    publication: PlatformModulePublicationOut
    template_tenant_id: int
    offers_created: int
    offer_ids: list[int] = Field(default_factory=list)
    tenant_ids: list[int] = Field(default_factory=list)
