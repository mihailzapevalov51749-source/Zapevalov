"""Pydantic schemas for platform code build registry API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class BuildResponse(BaseModel):
    id: int
    build_key: str
    commit_sha: str
    status: str
    backend_digest: str | None = None
    frontend_digest: str | None = None
    schema_revision: str | None = None
    build_manifest_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_by: int | None = None
    failure_reason: str | None = None

    model_config = {"from_attributes": True}


class CreateBuildRequest(BaseModel):
    build_key: str = Field(min_length=1, max_length=32)
    commit_sha: str = Field(min_length=40, max_length=40)
    backend_digest: str | None = Field(default=None, max_length=255)
    frontend_digest: str | None = Field(default=None, max_length=255)
    schema_revision: str | None = Field(default=None, max_length=64)
    build_manifest_json: dict[str, Any] = Field(default_factory=dict)


class MarkFailedRequest(BaseModel):
    failure_reason: str = Field(min_length=1, max_length=4000)
