"""P13-W03 — dual readiness (implementation vs release)."""

from app.db.session import SessionLocal
from app.modules.platform_dashboard.yasii_catalog import YASII_WORK_ITEMS
from app.modules.platform_dashboard.yasii_sync import (
    build_embedded_ai_rollups,
    compute_implementation_done_keys,
    compute_release_done_keys,
    detect_governance_release_blocker,
)
from app.modules.platform_dashboard_analyzer.refresh import build_scan_context
from app.modules.platform_dashboard_analyzer.yasii_checks import run_yasii_check
from app.modules.yasii.unified_project_state import build_unified_project_state


def test_implemented_but_release_blocked():
    item_passed = {item.key: False for item in YASII_WORK_ITEMS}
    item_passed["P1-W12"] = True
    item_passed["P8-W01"] = True
    item_passed["P10-W06"] = False

    impl = compute_implementation_done_keys(item_passed)
    release = compute_release_done_keys(item_passed)

    assert "P8-W01" in impl
    assert "P8-W01" not in release


def test_p10_w03_fail_impl_gt_release():
    from app.modules.platform_dashboard.yasii_sync import _run_yasii_analyzer_pass

    ctx = build_scan_context()
    item_passed = _run_yasii_analyzer_pass(ctx)
    impl = compute_implementation_done_keys(item_passed)
    release = compute_release_done_keys(item_passed)
    rollups = build_embedded_ai_rollups(release, item_passed, implementation_done_keys=impl)

    assert rollups.container_implementation_readiness > rollups.container_release_readiness
    blocker_key, blocker_label = detect_governance_release_blocker(item_passed, impl, release)
    assert blocker_key == "P10-W03"
    assert blocker_label


def test_release_subset_of_implementation():
    item_passed = {item.key: True for item in YASII_WORK_ITEMS}
    item_passed["P10-W03"] = False
    impl = compute_implementation_done_keys(item_passed)
    release = compute_release_done_keys(item_passed)
    assert release.issubset(impl)
    assert len(impl) >= len(release)


def test_unified_state_exposes_dual_fields():
    db = SessionLocal()
    try:
        unified = build_unified_project_state(db)
    finally:
        db.close()
    assert unified.containerImplementationReadiness >= unified.containerReleaseReadiness
    assert len(unified.implementationDoneKeys) >= len(unified.releaseDoneKeys)
    assert set(unified.releaseDoneKeys).issubset(set(unified.implementationDoneKeys))


def test_dashboard_api_dual_readiness_via_serialize():
    from app.modules.platform_dashboard.models import PlatformImplementationStage
    from app.modules.platform_dashboard.service import serialize_stage
    from app.modules.platform_dashboard.yasii_catalog import YASII_IMPLEMENTATION_STAGE_SLUG
    from app.modules.platform_dashboard.yasii_sync import compute_embedded_ai_rollups_from_db

    db = SessionLocal()
    try:
        stage = (
            db.query(PlatformImplementationStage)
            .filter(PlatformImplementationStage.slug == YASII_IMPLEMENTATION_STAGE_SLUG)
            .one_or_none()
        )
        if stage is None:
            return
        rollups = compute_embedded_ai_rollups_from_db(db)
        payload = serialize_stage(stage, embedded_ai_rollups=rollups, db=db)
    finally:
        db.close()

    assert payload.container_readiness is not None
    assert payload.implementation_readiness is not None
    assert payload.release_readiness is not None
    assert payload.implementation_readiness >= payload.release_readiness


def test_yasii_development_intelligence_dual_message():
    from app.modules.yasii.development_intelligence import (
        build_development_intelligence_assessment,
        format_development_intelligence_message,
    )

    db = SessionLocal()
    try:
        assessment = build_development_intelligence_assessment("Где мы сейчас?", db, None)
        message = format_development_intelligence_message(assessment, "Где мы сейчас?")
    finally:
        db.close()

    assert "Реализовано" in message
    assert "выпуску" in message


def test_analyzer_p13_w03_passes():
    assert run_yasii_check("yasii_p13_w03_dual_readiness_model", build_scan_context()) is True
