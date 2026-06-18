"""Pydantic schemas for tenant module configuration diffs."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ConfigurationBlockDiffOut(BaseModel):
    added: list[str] = Field(default_factory=list)
    removed: list[str] = Field(default_factory=list)
    changed: list[dict[str, Any]] = Field(default_factory=list)


class TemplatesBlockDiffOut(BaseModel):
    added_seeds: list[str] = Field(default_factory=list)
    removed_seeds: list[str] = Field(default_factory=list)
    changed_seeds: list[dict[str, Any]] = Field(default_factory=list)


class TenantModuleConfigurationDiffPayloadOut(BaseModel):
    settings: ConfigurationBlockDiffOut = Field(default_factory=ConfigurationBlockDiffOut)
    permissions: ConfigurationBlockDiffOut = Field(default_factory=ConfigurationBlockDiffOut)
    views: ConfigurationBlockDiffOut = Field(default_factory=ConfigurationBlockDiffOut)
    rules: ConfigurationBlockDiffOut = Field(default_factory=ConfigurationBlockDiffOut)
    templates: TemplatesBlockDiffOut = Field(default_factory=TemplatesBlockDiffOut)


class TenantModuleConfigurationDiffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    offer_id: int
    release_id: int | None = None
    release_version: str | None = None
    from_module_version: str
    to_module_version: str
    from_config_version: str
    to_config_version: str
    diff_payload: TenantModuleConfigurationDiffPayloadOut = Field(
        default_factory=TenantModuleConfigurationDiffPayloadOut
    )
    risk_level: str
    generated_at: datetime


class TenantModuleConfigurationDiffListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    module_key: str
    module_title: str | None = None
    from_module_version: str
    to_module_version: str
    from_config_version: str
    to_config_version: str
    risk_level: str
    generated_at: datetime
