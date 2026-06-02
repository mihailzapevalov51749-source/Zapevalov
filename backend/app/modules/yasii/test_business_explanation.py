import pytest

from app.db.session import SessionLocal
from app.modules.platform_dashboard.yasii_catalog import work_item_by_key
from app.modules.yasii.business_explanation import (
    build_business_awareness_snapshot,
    build_business_explanation_for_work_item,
    classify_business_explanation_query,
    is_business_explanation_query,
    BusinessExplanationQueryKind,
)
from app.modules.yasii.business_explanation_answers import resolve_business_explanation_command
from app.modules.yasii.project_awareness_answers import resolve_project_awareness_command
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.contracts import YASIIRequest


@pytest.fixture
def _payload():
    return {"tenantId": "tenant-1", "userId": "user-1", "sessionId": "session-1"}


def test_classify_business_queries():
    assert classify_business_explanation_query("Почему это важно?") == BusinessExplanationQueryKind.BENEFIT
    assert classify_business_explanation_query("Объясни простыми словами") == BusinessExplanationQueryKind.SIMPLE_LANGUAGE
    assert classify_business_explanation_query("Что изменится после завершения?") == BusinessExplanationQueryKind.BUSINESS_IMPACT
    assert classify_business_explanation_query("Зачем нужен следующий этап?") == BusinessExplanationQueryKind.STAGE_ROADMAP


def test_three_views_for_why_important(_payload):
    result = resolve_business_explanation_command("Почему это важно?", _payload)
    assert result is not None
    assert "Technical View" in result.message
    assert "Project View" in result.message
    assert "Business View" in result.message
    assert "Бизнес-эффект" in result.message


def test_business_impact_after_completion(_payload):
    result = resolve_business_explanation_command("Что изменится после завершения?", _payload)
    assert result is not None
    assert "Business Impact" in result.message or "Бизнес-эффект" in result.message


def test_simple_language_business_view(_payload):
    result = resolve_business_explanation_command("Объясни простыми словами", _payload)
    assert result is not None
    assert "Простыми словами" in result.message
    assert result.business_view_selected


def test_stage_roadmap_business(_payload):
    result = resolve_business_explanation_command("Зачем нужен следующий этап?", _payload)
    assert result is not None
    assert "Roadmap" in result.message
    assert "Бизнес-результат" in result.message


def test_p10_w03_explanation_views():
    item = work_item_by_key("P10-W03")
    assert item is not None
    exp = build_business_explanation_for_work_item(item, set())
    assert "E2E" in exp.technicalView
    assert "runtime" in exp.projectView.casefold() or "слой" in exp.projectView.casefold()
    assert "MVP" in exp.businessView or "пользовател" in exp.businessView.casefold()


def test_project_awareness_next_step_includes_business_effect(_payload):
    awareness = resolve_project_awareness_command("Что делать дальше?", _payload)
    assert awareness is not None
    assert "Бизнес-эффект" in awareness.message


def test_business_priority_over_project_for_why(_payload):
    query = "Почему это важно?"
    business = resolve_business_explanation_command(query, _payload)
    awareness = resolve_project_awareness_command(query, _payload)
    assert business is not None
    assert awareness is None
    response = run_demo_pipeline(
        YASIIRequest(requestId="biz-001", payload={**_payload, "text": query}),
    )
    assert "Business Explanation" in response.payload["message"]
    assert "business_explanation_created" in response.payload["trace"]


def test_business_awareness_snapshot():
    db = SessionLocal()
    try:
        snapshot = build_business_awareness_snapshot(db)
    finally:
        db.close()
    assert snapshot.currentEffect
    assert snapshot.nextEffect
    assert snapshot.stageValue
