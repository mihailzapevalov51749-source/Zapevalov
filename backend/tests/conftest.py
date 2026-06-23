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


@pytest.fixture(autouse=True)
def _mock_template_materialization_for_integration_tests(monkeypatch, request: pytest.FixtureRequest):
    """Integration tests validate orchestrator contract, not physical runtime FS."""
    mod = request.module.__name__ if request.module else ""
    if "platform_publish_orchestrator" in mod:
        return

    from pathlib import Path

    from app.modules.platform_publish_orchestrator import orchestrator as publish_orchestrator
    from app.modules.platform_publish_orchestrator.template_runtime_materialization import (
        TemplateMaterializationResult,
    )

    def _fake_materialize(**_kwargs):
        return TemplateMaterializationResult(
            release_id="release-999",
            release_dir=Path("/tmp/integration-test-release-999"),
            manifest_path=Path("/tmp/integration-test-release-999/manifest.json"),
        )

    monkeypatch.setattr(publish_orchestrator, "materialize_template_release", _fake_materialize)
    monkeypatch.setattr(
        publish_orchestrator,
        "record_template_materialization_audit",
        lambda *_args, **_kwargs: None,
    )

    from app.modules.platform_release_provenance.types import VerifyResult

    def _fake_verify_gate(_db, _deployment):
        return VerifyResult(
            status="passed",
            build_match=True,
            package_match=True,
            manifest_match=True,
            runtime_match=True,
            drift_detected=False,
        )

    monkeypatch.setattr(publish_orchestrator, "run_deployment_verify_gate", _fake_verify_gate)
    monkeypatch.setattr(
        publish_orchestrator,
        "record_template_verify_audit",
        lambda *_args, **_kwargs: None,
    )

    def _fake_activate(**_kwargs):
        from app.modules.platform_publish_orchestrator.template_runtime_activation import (
            TemplateActivationResult,
        )

        return TemplateActivationResult(
            release_id="release-999",
            release_dir=Path("/tmp/integration-test-release-999"),
            current_link=Path("/tmp/integration-test-current"),
            previous_release_id="release-998",
        )

    monkeypatch.setattr(publish_orchestrator, "activate_template_release", _fake_activate)
    monkeypatch.setattr(
        publish_orchestrator,
        "record_template_activation_audit",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        publish_orchestrator,
        "record_template_version_pin_audit",
        lambda *_args, **_kwargs: None,
    )


@pytest.fixture(autouse=True)
def _pass_deployment_verify_gate_for_integration_tests(monkeypatch, request: pytest.FixtureRequest):
    """Legacy release pipeline tests are not verify-gate scenarios."""
    mod = request.module.__name__ if request.module else ""
    if mod.endswith("test_deployment_verify_gate"):
        return

    from app.modules.platform_deployment_registry import service as deployment_service
    from app.modules.platform_release_provenance.types import VerifyResult

    passed = VerifyResult(
        status="passed",
        build_match=True,
        package_match=True,
        manifest_match=True,
        runtime_match=True,
        drift_detected=False,
    )

    monkeypatch.setattr(
        deployment_service,
        "run_deployment_verify_gate",
        lambda _db, _dep: passed,
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_verify_audit",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_lifecycle_audit",
        lambda *_args, **_kwargs: None,
    )


@pytest.fixture(autouse=True)
def _mock_release_diff_for_integration_tests(monkeypatch, request: pytest.FixtureRequest):
    """Release create requires DEV/TEMPLATE compare — stub for integration tests."""
    mod = request.module.__name__ if request.module else ""
    if mod.endswith("test_platform_release_diff") and not mod.endswith(
        "test_platform_release_diff_http",
    ):
        return

    from app.modules.platform_release_diff.schemas import ReleaseDiffCompareOut, ReleaseDiffElementOut

    stub_diff = ReleaseDiffCompareOut(
        changed_files=1,
        changed_elements=1,
        has_changes=True,
        dev_matches_template=False,
        elements=[
            ReleaseDiffElementOut(
                component_key="entity-engine",
                title="Entity Engine",
                registry="core",
                files_count=1,
            )
        ],
    )

    stub = lambda _db=None, **_kwargs: stub_diff
    monkeypatch.setattr(
        "app.modules.platform_release.service.compare_dev_template",
        stub,
    )
    monkeypatch.setattr(
        "app.modules.platform_release_diff.service.compare_dev_template",
        stub,
    )
    monkeypatch.setattr(
        "app.modules.platform_release_diff.router.compare_dev_template",
        stub,
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
