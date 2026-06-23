"""Pydantic schemas for platform deployment registry API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DeploymentResponse(BaseModel):
    id: int
    deployment_key: str
    release_package_id: int
    deployment_kind: str
    target_environment_type: str
    target_environment_id: str | None = None
    target_tenant_id: int | None = None
    status: str
    target_platform_version: str
    target_schema_revision: str | None = None
    previous_platform_version: str | None = None
    previous_release_package_id: int | None = None
    deployment_manifest_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_by: int | None = None
    failure_reason: str | None = None

    model_config = {"from_attributes": True}


class CreateDeploymentRequest(BaseModel):
    deployment_key: str = Field(min_length=1, max_length=32)
    release_package_id: int
    deployment_kind: str | None = Field(default=None, max_length=32)
    target_environment_type: str = Field(min_length=1, max_length=32)
    target_environment_id: str | None = Field(default=None, max_length=64)
    target_tenant_id: int | None = None
    target_schema_revision: str | None = Field(default=None, max_length=64)
    previous_platform_version: str | None = Field(default=None, max_length=40)
    previous_release_package_id: int | None = None
    deployment_manifest_json: dict[str, Any] = Field(default_factory=dict)


class MarkFailedRequest(BaseModel):
    failure_reason: str = Field(min_length=1, max_length=4000)

