"""Pydantic schemas for Tenant Registry."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.modules.tenant_environment.constants import TenantStatus, TenantType


class TenantRegistryListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_name: str
    name: str
    short_name: str | None = None
    code: str | None = None
    tenant_type: TenantType
    platform_version: str
    template_version: str
    source_tenant_id: int | None = None
    tenant_status: TenantStatus
    public_slug: str | None = None
    public_url: str | None = None


class TenantRegistryDetail(TenantRegistryListItem):
    notes: str | None = Field(default=None, max_length=5000)
    description: str | None = None


class TenantRegistrySummary(BaseModel):
    total: int
    by_type: dict[str, int]
    by_status: dict[str, int]
