"""Service layer for migration rollback foundation (read-only + catalog seed)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.platform_migration_rollback import crud
from app.modules.platform_migration_rollback.constants import BASELINE_SCHEMA_REVISION
from app.modules.platform_migration_rollback.policy import (
    BACKUP_FILENAME_CONVENTION,
    BLOCKED_ROLLBACK_OFFICIAL_SCENARIO,
    COMPATIBILITY_ALGORITHM_STEPS,
    PRE_UPDATE_BACKUP_MINIMUM,
    RECOVERY_SCENARIOS,
    ROLLBACK_ALLOWED_CASES,
    ROLLBACK_BLOCKED_CASES,
    ROLLBACK_POLICY_VERSION,
)
from app.modules.platform_migration_rollback.schemas import (
    MigrationRollbackFoundationSummaryOut,
    MigrationRollbackPolicyOut,
    PlatformVersionSchemaCatalogOut,
)


def read_runtime_schema_revision(db: Session) -> str | None:
    result = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar()
    return str(result) if result else None


def get_migration_rollback_policy() -> MigrationRollbackPolicyOut:
    return MigrationRollbackPolicyOut(
        policy_version=ROLLBACK_POLICY_VERSION,
        strategy="hybrid_forward_only_with_backup_restore",
        allowed_cases=ROLLBACK_ALLOWED_CASES,
        blocked_cases=ROLLBACK_BLOCKED_CASES,
        blocked_rollback_official_scenario=BLOCKED_ROLLBACK_OFFICIAL_SCENARIO,
        pre_update_backup_minimum=PRE_UPDATE_BACKUP_MINIMUM,
        backup_filename_convention=BACKUP_FILENAME_CONVENTION,
        compatibility_algorithm_steps=COMPATIBILITY_ALGORITHM_STEPS,
        recovery_scenarios=RECOVERY_SCENARIOS,
        backup_registry_status="design_only_not_implemented",
    )


def list_schema_catalog(db: Session) -> list[PlatformVersionSchemaCatalogOut]:
    return [
        PlatformVersionSchemaCatalogOut.model_validate(row)
        for row in crud.list_schema_catalog(db)
    ]


def get_foundation_summary(db: Session) -> MigrationRollbackFoundationSummaryOut:
    return MigrationRollbackFoundationSummaryOut(
        policy=get_migration_rollback_policy(),
        schema_catalog=list_schema_catalog(db),
        runtime_schema_revision=read_runtime_schema_revision(db),
        baseline_schema_revision=BASELINE_SCHEMA_REVISION,
    )
