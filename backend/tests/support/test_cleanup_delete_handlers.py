"""Delete handlers for test cleanup registry (test layer only)."""

from __future__ import annotations

import os
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_release.models import TenantUpdateOffer
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User
from app.modules.test_cleanup_registry.constants import PROTECTED_PORTAL_IDS

DeleteHandler = Callable[[Session, int], None]

TABLE_MODELS = {
    "platform_event_journal_entries": PlatformEventJournalEntry,
    "tenant_update_offers": TenantUpdateOffer,
    "platform_deployments": PlatformDeployment,
    "platform_environment_versions": PlatformEnvironmentVersion,
    "platform_version_history": PlatformVersionHistory,
    "tenant_user_memberships": TenantUserMembership,
    "users": User,
    "platform_release_packages": PlatformReleasePackage,
    "platform_code_builds": PlatformCodeBuild,
    "portals": Portal,
}


def _delete_row_by_id(db: Session, model, entity_id: int) -> None:
    row = db.query(model).filter(model.id == entity_id).one_or_none()
    if row is not None:
        db.delete(row)
        db.flush()


def _delete_portal(db: Session, entity_id: int) -> None:
    if entity_id in PROTECTED_PORTAL_IDS:
        raise RuntimeError(f"Refusing to delete protected portal id={entity_id}")

    os.environ.setdefault("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")
    from tests.support.release_test_cleanup import purge_test_portal

    purge_test_portal(db, entity_id)


def _delete_package(db: Session, entity_id: int) -> None:
    from tests.support.release_test_cleanup import delete_package_release_chain

    delete_package_release_chain(db, entity_id)


DELETE_HANDLERS: dict[str, DeleteHandler] = {
    "platform_event_journal_entries": lambda db, eid: _delete_row_by_id(
        db, PlatformEventJournalEntry, eid
    ),
    "tenant_update_offers": lambda db, eid: _delete_row_by_id(db, TenantUpdateOffer, eid),
    "platform_deployments": lambda db, eid: _delete_row_by_id(db, PlatformDeployment, eid),
    "platform_environment_versions": lambda db, eid: _delete_row_by_id(
        db, PlatformEnvironmentVersion, eid
    ),
    "platform_version_history": lambda db, eid: _delete_row_by_id(
        db, PlatformVersionHistory, eid
    ),
    "tenant_user_memberships": lambda db, eid: _delete_row_by_id(
        db, TenantUserMembership, eid
    ),
    "users": lambda db, eid: _delete_row_by_id(db, User, eid),
    "platform_release_packages": _delete_package,
    "platform_code_builds": lambda db, eid: _delete_row_by_id(db, PlatformCodeBuild, eid),
    "portals": _delete_portal,
}


def entity_exists(db: Session, table_name: str, entity_id: int) -> bool:
    model = TABLE_MODELS.get(table_name)
    if model is None:
        return False
    try:
        return db.query(model.id).filter(model.id == entity_id).first() is not None
    except Exception:
        db.rollback()
        return False


def delete_registered_entity(db: Session, table_name: str, entity_id: int) -> None:
    handler = DELETE_HANDLERS.get(table_name)
    if handler is None:
        raise ValueError(f"No delete handler for table_name={table_name!r}")
    handler(db, entity_id)
