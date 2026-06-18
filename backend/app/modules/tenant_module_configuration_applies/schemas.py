"""Pydantic schemas for tenant module configuration applies."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TenantModuleConfigurationApplyResultOut(BaseModel):
    apply_id: int
    status: str
    module_key: str | None = None
    from_module_version: str | None = None
    to_module_version: str | None = None
    snapshot_id: int | None = None


class TenantModuleConfigurationApplyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    offer_id: int | None = None
    preview_id: int | None = None
    diff_id: int | None = None
    from_module_version: str
    to_module_version: str
    from_config_version: str
    to_config_version: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    applied_by: int | None = None
    rollback_id: int | None = None
    notes: str | None = None


class TenantModuleConfigurationApplyListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    from_module_version: str
    to_module_version: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
