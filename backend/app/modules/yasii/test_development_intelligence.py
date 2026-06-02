import pytest

from app.db.session import SessionLocal
from app.modules.platform_dashboard.service import _serialize_development_intelligence
from app.modules.platform_dashboard.yasii_catalog import (
    YASII_IMPLEMENTATION_STAGE_SLUG,
    work_item_by_key,
)
from app.modules.yasii.development_intelligence import (
    DevelopmentQueryKind,
    build_development_intelligence_assessment,
    build_development_intelligence_snapshot,
    classify_development_intelligence_query,
    is_development_intelligence_query,
    load_architecture_debt_summary,
    load_quality_issues_summary,
)
from app.modules.yasii.development_intelligence_answers import resolve_development_intelligence_command
from app.modules.yasii.business_explanation_answers import resolve_business_explanation_command
from app.modules.yasii.project_awareness_answers import resolve_project_awareness_command
from app.modules.yasii.knowledge_answers import is_knowledge_corpus_command
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.contracts import YASIIRequest


@pytest.fixture
def _payload():
    return {"tenantId": "tenant-1", "userId": "user-1", "sessionId": "session-1"}


def test_classify_development_queries():
    assert classify_development_intelligence_query("Как идёт разработка?") == DevelopmentQueryKind.OVERVIEW
    assert classify_development_intelligence_query("Какие проблемы качества критичны?") == DevelopmentQueryKind.QUALITY
    assert classify_development_intelligence_query("Какой технический долг накопился?") == DevelopmentQueryKind.DEBT
    assert classify_development_intelligence_query("Какие риски реализации есть?") == DevelopmentQueryKind.RISKS
    assert classify_development_intelligence_query("Что блокирует разработку?") == DevelopmentQueryKind.BLOCKERS
    assert (
        classify_development_intelligence_query("Какой следующий управленческий шаг?")
        == DevelopmentQueryKind.NEXT_STEP
    )


def test_quality_summary_graceful_or_connected():
    db = SessionLocal()
    try:
        quality = load_quality_issues_summary(db)
    finally:
        db.close()
    assert quality.summary
    assert isinstance(quality.connected, bool)


def test_architecture_debt_extraction():
    debt = load_architecture_debt_summary()
    assert debt.summary


def test_development_state_loading(_payload):
    db = SessionLocal()
    try:
        assessment = build_development_intelligence_assessment(
            "Что требует моего внимания?",
            db,
            _payload,
        )
    finally:
        db.close()
    assert assessment.state.readiness >= 0
    assert assessment.focus.title
    assert assessment.nextStep.businessImpact


def test_risk_detection_and_next_step(_payload):
    result = resolve_development_intelligence_command("Что требует моего внимания?", _payload)
    assert result is not None
    assert "Development Intelligence Assessment" in result.message
    assert "Следующий шаг" in result.message
    assert "Бизнес-эффект" in result.message


def test_development_priority_over_business_and_awareness(_payload):
    query = "Что требует моего внимания?"
    assert is_development_intelligence_query(query)
    dev = resolve_development_intelligence_command(query, _payload)
    biz = resolve_business_explanation_command(query, _payload)
    awareness = resolve_project_awareness_command(query, _payload)
    assert dev is not None
    assert biz is None
    assert awareness is None
    assert not is_knowledge_corpus_command(query)


def test_runtime_routes_development_intelligence(_payload):
    query = "Что требует моего внимания?"
    response = run_demo_pipeline(
        YASIIRequest(requestId="dev-intel-001", payload={**_payload, "text": query}),
    )
    assert "Development Intelligence Assessment" in response.payload["message"]
    assert "development_state_loaded" in response.payload["trace"]
    assert "development_intelligence_created" in response.payload["trace"]


def test_dashboard_snapshot():
    db = SessionLocal()
    try:
        snap = _serialize_development_intelligence(YASII_IMPLEMENTATION_STAGE_SLUG, db)
        assert snap is not None
        assert snap.focus.title or snap.focus.reasoning
        assert snap.quality.summary
        assert snap.debt.summary
        assert snap.nextStep.title or snap.nextStep.businessImpact
        raw = build_development_intelligence_snapshot(db)
        assert raw.focus.title == snap.focus.title
    finally:
        db.close()


def test_p12_w01_catalog_entry():
    item = work_item_by_key("P12-W01")
    assert item is not None
    assert item.analyzer_check == "yasii_p12_w01_development_intelligence"
    assert "P11-W03" in item.depends_on
