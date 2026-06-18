"""Pydantic schemas for platform modules registry."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PlatformModuleOut(BaseModel):
    id: int
    module_key: str
    title: str
    description: str | None = None
    module_type: str
    status: str
    version: str
    entry_system_key: str | None = None
    entry_route: str | None = None
    is_runtime: bool
    is_tenant_installable: bool
    is_enabled_by_default: bool
    is_core: bool
    dependencies: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
