"""Idempotent seed/backfill for platform module manifests."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_constants import PLATFORM_MODULE_MANIFEST_SEED
from app.modules.platform_modules.manifest_models import PlatformModuleManifest
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.settings_schema import validate_settings_schema


def seed_platform_module_manifests(db: Session, *, commit: bool = True) -> dict[str, int]:
    """
    Insert initial manifest rows for active runtime modules.

    Does not create navigation items, pages, or alter runtime behavior.
    """
    created = 0
    updated = 0
    skipped = 0

    for item in PLATFORM_MODULE_MANIFEST_SEED:
        module_key = item["module_key"]
        manifest_version = item["manifest_version"]

        parent = (
            db.query(PlatformModule)
            .filter(PlatformModule.module_key == module_key)
            .one_or_none()
        )
        if parent is None:
            continue

        payload = dict(item)
        validate_settings_schema(
            payload.get("settings_schema"),
            expected_module_key=module_key,
        )
        existing = (
            db.query(PlatformModuleManifest)
            .filter(
                PlatformModuleManifest.module_key == module_key,
                PlatformModuleManifest.manifest_version == manifest_version,
            )
            .one_or_none()
        )

        if existing is None:
            db.add(PlatformModuleManifest(**payload))
            created += 1
            continue

        changed = False
        for field, value in payload.items():
            if field in {"module_key", "manifest_version"}:
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
