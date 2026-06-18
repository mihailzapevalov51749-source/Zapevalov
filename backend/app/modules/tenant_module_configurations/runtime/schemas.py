"""Schemas for runtime module configuration consumption."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RuntimeModuleConfigurationOut(BaseModel):
    tenant_id: int
    module_key: str
    source_version: str
    configuration_version: str
    schema_version: str
    source: str
    settings: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime | None = None
    cache_status: str = "miss"
    last_refresh: datetime | None = None


class RuntimeModuleConfigurationCacheEntryOut(BaseModel):
    tenant_id: int | None = None
    module_key: str
    cache_status: str
    last_refresh: datetime | None = None
    source_version: str | None = None
    configuration_version: str | None = None
    current_runtime_configuration: dict[str, Any] = Field(default_factory=dict)
