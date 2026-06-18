"""Integration test for DB-backed test cleanup registry."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.modules.test_cleanup_registry.models import TestCleanupRecord, TestCleanupRun
from tests.support.test_cleanup_context import (
    begin_test_cleanup_run,
    finalize_cleanup_run,
    reset_cleanup_context,
    set_cleanup_context,
)
from tests.support.test_cleanup_delete_handlers import entity_exists
from tests.support.test_factories import (
    create_test_build,
    create_test_deployment,
    create_test_environment_version,
    create_test_membership,
    create_test_offer,
    create_test_package,
    create_test_portal,
    create_test_user,
    create_test_version_history,
    ensure_test_role,
)


def test_cleanup_registry_deletes_full_chain_by_id(
    db: Session,
    request: pytest.FixtureRequest,
) -> None:
    run_id = begin_test_cleanup_run(db, request.node.nodeid)
    tokens = set_cleanup_context(db, run_id)
    try:
        role = ensure_test_role(db, "user")
        portal = create_test_portal(db)
        user = create_test_user(db, role=role, tenant_id=portal.id)
        membership = create_test_membership(db, tenant_id=portal.id, user_id=user.id)
        build = create_test_build(db)
        package = create_test_package(db, build_id=build.id)
        deployment = create_test_deployment(
            db,
            release_package_id=package.id,
            target_tenant_id=portal.id,
        )
        offer = create_test_offer(db, tenant_id=portal.id, release_id=package.id)
        env_version = create_test_environment_version(db, tenant_id=portal.id)
        version_history = create_test_version_history(db, tenant_id=portal.id)
        db.commit()

        records = (
            db.query(TestCleanupRecord)
            .filter(TestCleanupRecord.run_id == run_id)
            .order_by(TestCleanupRecord.id.asc())
            .all()
        )
        assert len(records) == 9

        entity_ids = {
            "portal": portal.id,
            "user": user.id,
            "membership": membership.id,
            "build": build.id,
            "package": package.id,
            "deployment": deployment.id,
            "offer": offer.id,
            "environment_version": env_version.id,
            "version_history": version_history.id,
        }
        for record in records:
            assert record.delete_status == "pending"
            assert record.entity_id == entity_ids[record.entity_type]

        finalize_cleanup_run(db, run_id)
        db.commit()

        assert not entity_exists(db, "portals", portal.id)
        assert not entity_exists(db, "users", user.id)
        assert not entity_exists(db, "tenant_user_memberships", membership.id)
        assert not entity_exists(db, "platform_code_builds", build.id)
        assert not entity_exists(db, "platform_release_packages", package.id)
        assert not entity_exists(db, "platform_deployments", deployment.id)
        assert not entity_exists(db, "tenant_update_offers", offer.id)
        assert not entity_exists(db, "platform_environment_versions", env_version.id)
        assert not entity_exists(db, "platform_version_history", version_history.id)

        run = db.query(TestCleanupRun).filter(TestCleanupRun.id == run_id).one_or_none()
        if run is not None:
            assert run.status == "cleaned"
    finally:
        reset_cleanup_context(tokens)
