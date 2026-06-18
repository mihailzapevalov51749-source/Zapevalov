"""Shared cleanup helpers for platform release integration tests."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_release.models import TenantUpdateOffer, TenantVersion
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User


def delete_package_release_chain(db: Session, package_id: int) -> list[int]:
    """Delete package, linked build, deployments, offers, env versions. Returns portal ids touched."""
    tenant_ids: set[int] = set()

    db.query(PlatformEventJournalEntry).filter(
        PlatformEventJournalEntry.slug.like(f"%{package_id}%")
    ).delete(synchronize_session=False)

    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id == package_id).delete(
        synchronize_session=False
    )

    for row in (
        db.query(PlatformDeployment)
        .filter(PlatformDeployment.release_package_id == package_id)
        .all()
    ):
        if row.target_tenant_id is not None:
            tenant_ids.add(int(row.target_tenant_id))
    db.query(PlatformDeployment).filter(
        PlatformDeployment.release_package_id == package_id
    ).delete(synchronize_session=False)

    if tenant_ids:
        db.query(PlatformVersionHistory).filter(
            PlatformVersionHistory.tenant_id.in_(tenant_ids)
        ).delete(synchronize_session=False)
        db.query(PlatformEnvironmentVersion).filter(
            PlatformEnvironmentVersion.tenant_id.in_(tenant_ids)
        ).delete(synchronize_session=False)
        db.query(TenantVersion).filter(TenantVersion.tenant_id.in_(tenant_ids)).delete(
            synchronize_session=False
        )

    package = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == package_id)
        .one_or_none()
    )
    if package is None:
        return sorted(tenant_ids)

    build_id = package.build_id
    db.delete(package)
    db.flush()

    if build_id is not None:
        build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == build_id).one_or_none()
        if build is not None:
            db.delete(build)
            db.flush()

    return sorted(tenant_ids)


def purge_test_portal(db: Session, portal_id: int) -> None:
    """Hard-delete a test portal created by release integration tests."""
    if portal_id in {1, 2, 21}:
        raise RuntimeError(f"Refusing to purge protected portal id={portal_id}")

    db.query(PlatformVersionHistory).filter(
        PlatformVersionHistory.tenant_id == portal_id
    ).delete(synchronize_session=False)
    db.query(PlatformEnvironmentVersion).filter(
        PlatformEnvironmentVersion.tenant_id == portal_id
    ).delete(synchronize_session=False)
    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.tenant_id == portal_id).delete(
        synchronize_session=False
    )
    db.query(TenantVersion).filter(TenantVersion.tenant_id == portal_id).delete(
        synchronize_session=False
    )
    db.query(PlatformDeployment).filter(PlatformDeployment.target_tenant_id == portal_id).delete(
        synchronize_session=False
    )
    db.query(TenantUserMembership).filter(TenantUserMembership.tenant_id == portal_id).delete(
        synchronize_session=False
    )
    db.query(User).filter(User.tenant_id == portal_id).delete(synchronize_session=False)

    portal = db.query(Portal).filter(Portal.id == portal_id).one_or_none()
    if portal is not None:
        db.delete(portal)
        db.flush()
