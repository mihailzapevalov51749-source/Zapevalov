"""Pydantic schemas for platform module manifests."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PlatformModuleManifestOut(BaseModel):
    id: int
    module_key: str
    manifest_version: str
    module_version: str
    frontend_components: list[str] = Field(default_factory=list)
    frontend_routes: list[str] = Field(default_factory=list)
    backend_routers: list[str] = Field(default_factory=list)
    backend_services: list[str] = Field(default_factory=list)
    backend_models: list[str] = Field(default_factory=list)
    db_tables: list[str] = Field(default_factory=list)
    entry_points: list[dict[str, Any]] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    notification_targets: list[str] = Field(default_factory=list)
    settings_schema: dict[str, Any] = Field(default_factory=dict)
    release_notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
