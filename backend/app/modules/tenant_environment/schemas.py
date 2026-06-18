"""Pydantic schemas for tenant environment."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)


class TenantEnvironmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tenant_id: int
    tenant_type: TenantType
    name: str
    short_name: str | None = None
    code: str | None = None
    template_version: str = DEFAULT_TEMPLATE_VERSION
    tenant_status: TenantStatus = TenantStatus.ACTIVE
    source_tenant_id: int | None = None
    notes: str | None = None


class PortalEnvironmentFields(BaseModel):
    """Environment fields exposed on portal admin API."""

    tenant_type: TenantType
    template_version: str = DEFAULT_TEMPLATE_VERSION
    tenant_status: TenantStatus = TenantStatus.ACTIVE
    source_tenant_id: int | None = None
    notes: str | None = Field(default=None, max_length=5000)
