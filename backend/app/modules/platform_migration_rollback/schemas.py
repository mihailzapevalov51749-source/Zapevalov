"""Pydantic schemas for migration rollback foundation API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PlatformVersionSchemaCatalogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform_version: str
    schema_revision: str
    rollback_mode_default: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class MigrationRollbackPolicyOut(BaseModel):
    policy_version: str
    strategy: str
    allowed_cases: list[dict[str, str]]
    blocked_cases: list[dict[str, str]]
    blocked_rollback_official_scenario: list[str]
    pre_update_backup_minimum: list[str]
    backup_filename_convention: str
    compatibility_algorithm_steps: list[str]
    recovery_scenarios: list[dict[str, object]]
    backup_registry_status: str


class MigrationRollbackFoundationSummaryOut(BaseModel):
    policy: MigrationRollbackPolicyOut
    schema_catalog: list[PlatformVersionSchemaCatalogOut]
    runtime_schema_revision: str | None
    baseline_schema_revision: str
