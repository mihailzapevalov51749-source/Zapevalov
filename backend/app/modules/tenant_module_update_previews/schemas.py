"""Pydantic schemas for tenant module update previews."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TenantModuleUpdatePreviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    tenant_name: str | None = None
    offer_id: int
    module_key: str
    module_title: str | None = None
    from_version: str
    to_version: str
    release_id: int | None = None
    release_version: str | None = None
    preview_status: str
    summary: str | None = None
    risk_level: str
    generated_at: datetime


class TenantModuleUpdatePreviewDetailOut(TenantModuleUpdatePreviewOut):
    impact_analysis: dict[str, Any] = Field(default_factory=dict)
    affected_components: list[str] = Field(default_factory=list)
    affected_routes: list[str] = Field(default_factory=list)
    affected_tables: list[str] = Field(default_factory=list)
    affected_permissions: list[str] = Field(default_factory=list)
    affected_settings: list[str] = Field(default_factory=list)
    affected_views: list[str] = Field(default_factory=list)
    affected_rules: list[str] = Field(default_factory=list)
    affected_templates: list[str] = Field(default_factory=list)
    affected_dependencies: list[str] = Field(default_factory=list)
    change_items: list[str] = Field(default_factory=list)
    configuration_diff: dict[str, Any] = Field(default_factory=dict)
    publication_metadata: dict[str, Any] = Field(default_factory=dict)
