"""Idempotent seed/backfill for platform modules catalog."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.constants import (
    PLATFORM_MODULE_SEED,
    seed_item_without_dependencies,
)
from app.modules.platform_modules.models import PlatformModule


def seed_platform_modules(db: Session, *, commit: bool = True) -> dict[str, int]:
    """
    Insert initial platform module catalog rows.

    Does not create navigation items or pages.
    """
    created = 0
    updated = 0
    skipped = 0

    for item in PLATFORM_MODULE_SEED:
        payload = seed_item_without_dependencies(item)
        module_key = payload["module_key"]

        existing = (
            db.query(PlatformModule)
            .filter(PlatformModule.module_key == module_key)
            .one_or_none()
        )

        if existing is None:
            db.add(PlatformModule(**payload))
            created += 1
            continue

        changed = False
        for field, value in payload.items():
            if field == "module_key":
                continue
            if getattr(existing, field) != value:
                setattr(existing, field, value)
                changed = True

        if changed:
            updated += 1
        else:
            skipped += 1

    if commit:
        db.commit()

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
    }
