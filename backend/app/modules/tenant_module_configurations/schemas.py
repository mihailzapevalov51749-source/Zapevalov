"""Pydantic schemas for tenant module configurations."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TenantModuleConfigurationOut(BaseModel):
    id: int
    tenant_id: int
    module_key: str
    module_title: str | None = None
    module_version: str
    config_version: str
    schema_version: str
    settings: dict[str, Any] = Field(default_factory=dict)
    permissions: dict[str, Any] = Field(default_factory=dict)
    views: dict[str, Any] = Field(default_factory=dict)
    rules: dict[str, Any] = Field(default_factory=dict)
    templates: dict[str, Any] = Field(default_factory=dict)
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TenantModuleConfigurationListItemOut(BaseModel):
    id: int
    tenant_id: int
    tenant_title: str | None = None
    module_key: str
    module_title: str | None = None
    module_version: str
    config_version: str
    schema_version: str
    source: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class TenantModuleConfigSnapshotOut(BaseModel):
    id: int
    tenant_id: int
    module_key: str
    snapshot_reason: str | None = None
    source_module_version: str | None = None
    target_module_version: str | None = None
    source_config_version: str | None = None
    config_payload: dict[str, Any] = Field(default_factory=dict)
    offer_id: int | None = None
    apply_id: str | None = None
    created_at: datetime
    created_by: int | None = None

    model_config = {"from_attributes": True}
