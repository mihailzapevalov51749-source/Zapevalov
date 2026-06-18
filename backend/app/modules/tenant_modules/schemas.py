"""Pydantic schemas for tenant modules registry."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.tenant_module_update_offers.schemas import TenantModuleUpdateOfferBriefOut


class TenantModuleOut(BaseModel):
    module_key: str
    title: str
    installed_version: str
    platform_version: str
    latest_platform_version: str
    update_available: bool = False
    available_offer: TenantModuleUpdateOfferBriefOut | None = None
    enabled: bool
    state: str = "installed"
    source: str
    installed_at: datetime | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class TenantModuleDetailOut(TenantModuleOut):
    portal_id: int
    tenant_id: int
    manifest_version: str | None = None
    dependencies: list[str] = Field(default_factory=list)
    versions_match: bool = True
