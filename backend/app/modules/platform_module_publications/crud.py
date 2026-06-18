"""CRUD helpers for platform module publications."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_module_publications.models import PlatformModulePublication


def list_publications(db: Session) -> list[PlatformModulePublication]:
    return (
        db.query(PlatformModulePublication)
        .order_by(
            PlatformModulePublication.created_at.desc(),
            PlatformModulePublication.id.desc(),
        )
        .all()
    )


def list_publications_for_source_tenant(
    db: Session,
    *,
    source_tenant_id: int,
) -> list[PlatformModulePublication]:
    return (
        db.query(PlatformModulePublication)
        .filter(PlatformModulePublication.source_tenant_id == source_tenant_id)
        .order_by(
            PlatformModulePublication.created_at.desc(),
            PlatformModulePublication.id.desc(),
        )
        .all()
    )


def list_publications_for_module(
    db: Session,
    *,
    module_key: str,
) -> list[PlatformModulePublication]:
    return (
        db.query(PlatformModulePublication)
        .filter(PlatformModulePublication.module_key == module_key)
        .order_by(
            PlatformModulePublication.created_at.desc(),
            PlatformModulePublication.id.desc(),
        )
        .all()
    )


def get_publication(db: Session, publication_id: int) -> PlatformModulePublication | None:
    return (
        db.query(PlatformModulePublication)
        .filter(PlatformModulePublication.id == publication_id)
        .one_or_none()
    )
