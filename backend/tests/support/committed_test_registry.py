"""Track and purge committed test data via DB cleanup registry."""

from __future__ import annotations

import os
from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.test_cleanup_registry.service import (
    assert_cleanup_registry_empty,
    register_test_record_by_type,
    start_cleanup_run,
)
from tests.support.test_cleanup_context import finalize_cleanup_run

_registry: dict[str, set[int]] = {
    "portal_ids": set(),
    "release_ids": set(),
    "user_ids": set(),
    "publication_ids": set(),
    "package_ids": set(),
    "build_ids": set(),
    "deployment_ids": set(),
}

_BUCKET_ENTITY_TYPES = {
    "portal_ids": "portal",
    "user_ids": "user",
    "package_ids": "package",
    "build_ids": "build",
    "deployment_ids": "deployment",
}


def register_committed_test_data(
    *,
    portal_ids: list[int] | None = None,
    release_ids: list[int] | None = None,
    user_ids: list[int] | None = None,
    publication_ids: list[int] | None = None,
    package_ids: list[int] | None = None,
    build_ids: list[int] | None = None,
    deployment_ids: list[int] | None = None,
) -> None:
    if portal_ids:
        _registry["portal_ids"].update(int(value) for value in portal_ids)
    if release_ids:
        _registry["release_ids"].update(int(value) for value in release_ids)
    if user_ids:
        _registry["user_ids"].update(int(value) for value in user_ids)
    if publication_ids:
        _registry["publication_ids"].update(int(value) for value in publication_ids)
    if package_ids:
        _registry["package_ids"].update(int(value) for value in package_ids)
    if build_ids:
        _registry["build_ids"].update(int(value) for value in build_ids)
    if deployment_ids:
        _registry["deployment_ids"].update(int(value) for value in deployment_ids)

    from tests.support.test_cleanup_context import register_ids_if_active

    for bucket, entity_type in _BUCKET_ENTITY_TYPES.items():
        ids = sorted(_registry[bucket])
        if ids:
            register_ids_if_active(entity_type, ids)


def commit_test_data(
    db: Session,
    *,
    portal_ids: list[int] | None = None,
    release_ids: list[int] | None = None,
    user_ids: list[int] | None = None,
    publication_ids: list[int] | None = None,
    package_ids: list[int] | None = None,
    build_ids: list[int] | None = None,
    deployment_ids: list[int] | None = None,
) -> None:
    register_committed_test_data(
        portal_ids=portal_ids,
        release_ids=release_ids,
        user_ids=user_ids,
        publication_ids=publication_ids,
        package_ids=package_ids,
        build_ids=build_ids,
        deployment_ids=deployment_ids,
    )
    db.commit()


def clear_registry() -> None:
    for bucket in _registry.values():
        bucket.clear()


def _register_in_memory_buckets_to_run(db: Session, run_id: int) -> None:
    for bucket, entity_type in _BUCKET_ENTITY_TYPES.items():
        for entity_id in sorted(_registry[bucket]):
            register_test_record_by_type(
                db,
                run_id=run_id,
                entity_type=entity_type,
                entity_id=entity_id,
            )


def purge_registered_test_data() -> None:
    """Purge in-memory committed ids via DB registry (id-based, not name patterns)."""
    if not any(_registry.values()):
        return

    os.environ.setdefault("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")
    db = SessionLocal()
    try:
        run_id = start_cleanup_run(db, "pytest-committed-registry-sweep")
        _register_in_memory_buckets_to_run(db, run_id)
        db.commit()
        finalize_cleanup_run(db, run_id)
        db.commit()
        assert_cleanup_registry_empty(db)
    except Exception:
        db.rollback()
        raise
    finally:
        clear_registry()
        db.close()


def purge_publication_test_pattern_leaks() -> None:
    """Secondary safety net only — not the primary cleanup mechanism."""
    from scripts.cleanup_publication_test_leaks import (
        build_cleanup_plan,
        execute_cleanup,
    )

    os.environ.setdefault("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")
    db = SessionLocal()
    try:
        plan = build_cleanup_plan(db)
        if (
            plan.portal_ids
            or plan.release_ids
            or plan.publication_ids
            or plan.package_ids
            or plan.build_ids
        ):
            execute_cleanup(db, plan)
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def track_portals(*portal_ids: int):
    try:
        yield
    finally:
        register_committed_test_data(portal_ids=list(portal_ids))
