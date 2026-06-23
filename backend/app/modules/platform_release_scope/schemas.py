"""Pydantic schemas for Release Scope Manifest API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ReleaseScopeWorkItemIn(BaseModel):
    key: str = Field(min_length=1, max_length=64)
    title: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=4000)


class ReleaseScopeModuleIn(BaseModel):
    module_key: str = Field(min_length=1, max_length=128)
    module_title: str | None = Field(default=None, max_length=255)
    from_version: str = Field(default="n/a", max_length=64)
    to_version: str = Field(default="n/a", max_length=64)
    change_summary: str | None = Field(default=None, max_length=4000)


class ReleaseScopeChangeIn(BaseModel):
    change_type: str = Field(default="other", max_length=64)
    entity_type: str | None = Field(default=None, max_length=128)
    entity_id: str | None = Field(default=None, max_length=128)
    system_key: str | None = Field(default=None, max_length=128)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    risk_level: str = Field(default="low", max_length=32)


class ReleaseScopeRuntimeChangeIn(BaseModel):
    slot_key: str = Field(min_length=1, max_length=64)
    change_type: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    reference: str | None = Field(default=None, max_length=512)


class ReleaseScopeMigrationIn(BaseModel):
    revision_id: str = Field(min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=4000)
    reversible: bool | None = None


class ReleaseScopeArtifactIn(BaseModel):
    artifact_kind: str = Field(min_length=1, max_length=64)
    path_or_ref: str = Field(min_length=1, max_length=512)
    notes: str | None = Field(default=None, max_length=4000)


class ReleaseScopeExcludedChangeIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    reason: str = Field(min_length=1, max_length=4000)
    reference: str | None = Field(default=None, max_length=512)
    work_item_key: str | None = Field(default=None, max_length=64)


class ReleaseScopeLimitationIn(BaseModel):
    description: str = Field(min_length=1, max_length=4000)
    severity: str = Field(default="info", max_length=32)


class ReleaseScopeProofOut(BaseModel):
    proof_version: str
    scope_digest: str
    computed_at: str
    included_count: dict[str, int]
    excluded_count: dict[str, int]
    summary: str


class ReleaseScopeOut(BaseModel):
    scope_version: str
    scope_status: str
    included_work_items: list[dict[str, Any]] = Field(default_factory=list)
    included_modules: list[dict[str, Any]] = Field(default_factory=list)
    included_changes: list[dict[str, Any]] = Field(default_factory=list)
    included_runtime_changes: list[dict[str, Any]] = Field(default_factory=list)
    included_migrations: list[dict[str, Any]] = Field(default_factory=list)
    included_artifacts: list[dict[str, Any]] = Field(default_factory=list)
    excluded_changes: list[dict[str, Any]] = Field(default_factory=list)
    known_limitations: list[dict[str, Any]] = Field(default_factory=list)
    scope_proof: ReleaseScopeProofOut | None = None
    defined_at: str | None = None
    defined_by: int | None = None
    reviewed_at: str | None = None
    reviewed_by: int | None = None
    approved_at: str | None = None
    approved_by: int | None = None
    published_at: str | None = None
    archived_at: str | None = None


class ReleaseScopeUpsert(BaseModel):
    included_work_items: list[ReleaseScopeWorkItemIn] = Field(default_factory=list)
    included_modules: list[ReleaseScopeModuleIn] = Field(default_factory=list)
    included_changes: list[ReleaseScopeChangeIn] = Field(default_factory=list)
    included_runtime_changes: list[ReleaseScopeRuntimeChangeIn] = Field(default_factory=list)
    included_migrations: list[ReleaseScopeMigrationIn] = Field(default_factory=list)
    included_artifacts: list[ReleaseScopeArtifactIn] = Field(default_factory=list)
    excluded_changes: list[ReleaseScopeExcludedChangeIn] = Field(default_factory=list)
    known_limitations: list[ReleaseScopeLimitationIn] = Field(default_factory=list)

    @field_validator(
        "included_work_items",
        "included_modules",
        "included_changes",
        "included_runtime_changes",
        "included_migrations",
        "included_artifacts",
        "excluded_changes",
        "known_limitations",
        mode="before",
    )
    @classmethod
    def _none_to_list(cls, value: Any) -> list[Any]:
        if value is None:
            return []
        return value


class ReleaseScopeStatusTransitionOut(BaseModel):
    release_id: int
    scope_status: str
    scope: ReleaseScopeOut
