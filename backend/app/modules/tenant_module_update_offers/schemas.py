"""Pydantic schemas for tenant module update offers."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TenantModuleUpdateOfferOut(BaseModel):
    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    from_version: str
    to_version: str
    release_id: int | None = None
    publication_id: int | None = None
    release_version: str | None = None
    status: str
    offered_at: datetime
    applied_at: datetime | None = None
    skipped_at: datetime | None = None
    change_summary: str | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class TenantModuleUpdateOfferDetailOut(TenantModuleUpdateOfferOut):
    change_items: list[str] = Field(default_factory=list)


class TenantModuleUpdateOfferBriefOut(BaseModel):
    id: int
    from_version: str
    to_version: str
    release_version: str | None = None
    change_summary: str | None = None
    status: str

    model_config = {"from_attributes": True}
