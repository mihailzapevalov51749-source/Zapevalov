"""Pydantic schemas for Dirty DEV Check API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DirtyDevCheckIssueOut(BaseModel):
    code: str
    message: str
    path: str | None = None
    severity: str = "error"


class DirtyDevCheckResultOut(BaseModel):
    status: str
    check_version: str
    enforced: bool
    skipped: bool = False
    skip_reason: str | None = None
    scope_status: str | None = None
    scope_digest_expected: str | None = None
    scope_digest_actual: str | None = None
    repo_root: str | None = None
    allowed_paths: list[str] = Field(default_factory=list)
    excluded_paths: list[str] = Field(default_factory=list)
    issues: list[DirtyDevCheckIssueOut] = Field(default_factory=list)
    warnings: list[DirtyDevCheckIssueOut] = Field(default_factory=list)
    checked_at: str
    blocks_publish: bool = False
    readiness_gate: dict[str, Any] = Field(default_factory=dict)
