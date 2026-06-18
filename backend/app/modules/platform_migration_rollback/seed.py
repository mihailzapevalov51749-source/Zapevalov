"""Seed canonical platform_version -> schema_revision bindings."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_migration_rollback import crud
from app.modules.platform_migration_rollback.constants import (
    BASELINE_SCHEMA_REVISION,
    RollbackMode,
)
from app.modules.platform_version_registry.constants import (
    DEFAULT_CLIENT_PLATFORM_VERSION,
    DEFAULT_DEV_PLATFORM_VERSION,
    DEFAULT_TEMPLATE_PLATFORM_VERSION,
)

BASELINE_BINDINGS: list[dict[str, str | None]] = [
    {
        "platform_version": DEFAULT_DEV_PLATFORM_VERSION,
        "schema_revision": BASELINE_SCHEMA_REVISION,
        "rollback_mode_default": RollbackMode.SCHEMA_DOWNGRADE.value,
        "notes": "DEV baseline; selective schema downgrade allowed in policy",
    },
    {
        "platform_version": DEFAULT_TEMPLATE_PLATFORM_VERSION,
        "schema_revision": BASELINE_SCHEMA_REVISION,
        "rollback_mode_default": RollbackMode.BACKUP_RESTORE.value,
        "notes": (
            "Release baseline for Template and Client tenants "
            f"(includes {DEFAULT_CLIENT_PLATFORM_VERSION})"
        ),
    },
]


def seed_platform_version_schema_catalog(db: Session, *, commit: bool = True) -> int:
    created_or_updated = 0
    for item in BASELINE_BINDINGS:
        crud.upsert_schema_binding(
            db,
            platform_version=str(item["platform_version"]),
            schema_revision=str(item["schema_revision"]),
            rollback_mode_default=str(item["rollback_mode_default"]),
            notes=str(item["notes"]) if item["notes"] else None,
            commit=False,
        )
        created_or_updated += 1
    if commit:
        db.commit()
    else:
        db.flush()
    return created_or_updated
