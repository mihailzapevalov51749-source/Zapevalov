"""Pydantic schemas for tenant module configuration rollbacks."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TenantModuleConfigurationRollbackResultOut(BaseModel):
    rollback_id: int
    status: str
    module_key: str | None = None
    apply_id: int | None = None
    snapshot_id: int | None = None


class TenantModuleConfigurationRollbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    apply_id: int | None = None
    snapshot_id: int | None = None
    from_module_version: str
    to_module_version: str
    from_config_version: str
    to_config_version: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    rolled_back_by: int | None = None
    notes: str | None = None


class TenantModuleConfigurationRollbackListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    apply_id: int | None = None
    from_module_version: str
    to_module_version: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
