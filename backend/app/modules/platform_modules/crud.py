"""CRUD helpers for platform modules registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.models import PlatformModule


def list_platform_modules(db: Session) -> list[PlatformModule]:
    return (
        db.query(PlatformModule)
        .order_by(PlatformModule.module_type.asc(), PlatformModule.module_key.asc())
        .all()
    )


def get_platform_module_by_key(db: Session, module_key: str) -> PlatformModule | None:
    normalized_key = str(module_key or "").strip()
    if not normalized_key:
        return None

    return (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == normalized_key)
        .one_or_none()
    )
