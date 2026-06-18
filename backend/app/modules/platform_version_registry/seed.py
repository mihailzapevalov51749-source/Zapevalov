"""Idempotent seed for platform environment version registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_version_registry import crud
from app.modules.platform_version_registry.constants import (
    DEFAULT_CLIENT_PLATFORM_VERSION,
    DEFAULT_DEV_PLATFORM_VERSION,
    DEFAULT_TEMPLATE_PLATFORM_VERSION,
)
from app.modules.platform_version_registry.service import record_environment_version
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID
from app.modules.tenant_management.constants import DEMO_CLIENT_PORTAL_ID


def seed_platform_version_registry(
    db: Session,
    *,
    commit: bool = True,
) -> dict[str, int]:
    """Seed canonical DEV / Template / demo client versions if missing."""
    created = 0
    skipped = 0

    targets: list[tuple[int, str, str]] = [
        (1, DEFAULT_DEV_PLATFORM_VERSION, "Начальная версия DEV-контура"),
        (
            PLATFORM_TEMPLATE_TENANT_ID,
            DEFAULT_TEMPLATE_PLATFORM_VERSION,
            "Начальная версия эталона Template",
        ),
        (
            DEMO_CLIENT_PORTAL_ID,
            DEFAULT_CLIENT_PLATFORM_VERSION,
            "Начальная версия демо-клиента ООО Розетка",
        ),
    ]

    for tenant_id, version, description in targets:
        portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
        if portal is None:
            skipped += 1
            continue

        existing = crud.get_current_version_for_tenant(db, tenant_id)
        if existing is not None:
            skipped += 1
            continue

        record_environment_version(
            db,
            tenant_id=tenant_id,
            platform_version=version,
            change_description=description,
            notes="Phase 1 registry seed",
            commit=False,
        )
        created += 1

    if commit:
        db.commit()

    return {"created": created, "skipped": skipped}
