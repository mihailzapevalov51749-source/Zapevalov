"""Shared pytest fixtures for publication/module integration tests."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.test_cleanup_registry.models import TestCleanupRecord, TestCleanupRun
from tests.support.committed_test_registry import (
    purge_publication_test_pattern_leaks,
    purge_registered_test_data,
)
from tests.support.test_cleanup_context import (
    assert_global_cleanup_registry_empty,
    begin_test_cleanup_run,
    finalize_cleanup_run,
    reset_cleanup_context,
    set_cleanup_context,
)

PUBLICATION_LEAK_TEST_BASENAMES = frozenset(
    {
        "test_dev_to_template_module_publication_pipeline_mvp.py",
        "test_publication_guard_foundation_p0.py",
        "test_publication_guard_foundation_p1.py",
        "test_publication_guard_company_constructor.py",
        "test_tenant_provisioning_pipeline_fix.py",
        "test_module_configuration_apply_mvp.py",
        "test_module_configuration_rollback_mvp.py",
        "test_module_configuration_diff_engine_mvp.py",
        "test_tenant_module_update_offers_registry.py",
        "test_tenant_module_update_previews_registry.py",
        "test_tenant_module_configurations_mvp.py",
        "test_runtime_configuration_integration_mvp.py",
        "test_publication_diff_generation_fix.py",
        "test_tenant_modules_registry.py",
        "test_tenant_write_protection.py",
        "test_platform_release_pipeline.py",
        "test_platform_release_step3_package_sot.py",
        "test_platform_release_step4_publish_template.py",
        "test_platform_release_step5_tenant_updates.py",
        "test_platform_release_step6_cutover_writes.py",
        "test_cleanup_registry_integration.py",
        "test_tenant_login_branding.py",
    }
)


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def test_cleanup_run(db: Session, request: pytest.FixtureRequest) -> int:
    """DB-backed cleanup registry run for a single test."""
    run_key = request.node.nodeid
    run_id = begin_test_cleanup_run(db, run_key)
    tokens = set_cleanup_context(db, run_id)
    try:
        yield run_id
    finally:
        reset_cleanup_context(tokens)
        try:
            finalize_cleanup_run(db, run_id)
            db.commit()
        except Exception:
            db.rollback()
            raise


@pytest.fixture(scope="session", autouse=True)
def _final_publication_test_leak_sweep() -> None:
    yield
    purge_registered_test_data()
    _assert_registry_gate()


@pytest.fixture(scope="module", autouse=True)
def _cleanup_publication_test_leaks_after_module(request: pytest.FixtureRequest) -> None:
    yield
    node_path = getattr(request.node, "path", None) or getattr(request.node, "fspath", None)
    basename = node_path.name if node_path is not None else ""
    if basename not in PUBLICATION_LEAK_TEST_BASENAMES:
        return
    purge_registered_test_data()
    _assert_registry_gate()


def _assert_registry_gate() -> None:
    db = SessionLocal()
    try:
        assert_global_cleanup_registry_empty(db)
    finally:
        db.close()
    # Secondary safety net only — primary cleanup is id-based registry.
    purge_publication_test_pattern_leaks()


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:  # noqa: ARG001
    db = SessionLocal()
    try:
        active_runs = db.query(TestCleanupRun).filter(TestCleanupRun.status == "running").count()
        undeleted = (
            db.query(TestCleanupRecord)
            .filter(TestCleanupRecord.delete_status.in_(["pending", "failed"]))
            .count()
        )
        if active_runs or undeleted:
            print(
                "\nTEST CLEANUP REGISTRY GATE FAILED: "
                f"active_runs={active_runs} undeleted_records={undeleted}"
            )
    finally:
        db.close()
