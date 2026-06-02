import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_store import (
    clear_decision_memory_store,
    save_decision_record,
    set_decision_memory_data_dir,
)
from app.modules.yasii.recommendation_answers import resolve_recommendation_command
from app.modules.yasii.recommendation_templates import (
    RecommendationType,
    build_recommendation_assessment,
    format_recommendation_message,
    select_recommendation_type,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.tenant_memory_store import (
    clear_tenant_memory_store,
    save_tenant_memory_fact,
    set_tenant_memory_data_dir,
)


@pytest.fixture(autouse=True)
def isolated_stores(tmp_path):
    decision_dir = tmp_path / "decision"
    tenant_dir = tmp_path / "tenant"
    decision_dir.mkdir()
    tenant_dir.mkdir()
    set_decision_memory_data_dir(decision_dir)
    set_tenant_memory_data_dir(tenant_dir)
    clear_decision_memory_store()
    clear_tenant_memory_store()
    yield
    clear_decision_memory_store()
    clear_tenant_memory_store()
    set_decision_memory_data_dir(None)
    set_tenant_memory_data_dir(None)


def _payload(**extra):
    return {
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        **extra,
    }


def test_select_recommendation_type_scenarios():
    assert select_recommendation_type("Что делать дальше?") == RecommendationType.NEXT_STEP
    assert select_recommendation_type("Что сейчас лучше сделать?") == RecommendationType.PRIORITY
    assert select_recommendation_type("Как устранить блокер?") == RecommendationType.BLOCKER_RESOLUTION
    assert select_recommendation_type("Как достичь цели?") == RecommendationType.GOAL_ALIGNMENT


def test_format_recommendation_message_structure():
    assessment = build_recommendation_assessment(
        "tenant-1",
        "Что делать дальше?",
        _payload(),
    )
    message = format_recommendation_message(assessment)
    assert "Strategy Recommendation (P9-W04)" in message
    assert f"RecommendationTemplate: {assessment.template.recommendationType.value}" in message
    assert "Рекомендация:" in message
    assert "Почему:" in message
    assert "Следующий шаг:" in message
    assert "Ожидаемый эффект:" in message


def test_resolve_recommendation_command_next_step():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ.")
    result = resolve_recommendation_command("Что делать дальше?", _payload())
    assert result is not None
    assert result.recommendation_type == RecommendationType.NEXT_STEP.value
    assert result.next_step_created is True
    assert "RecommendationTemplate: NEXT_STEP" in result.message


def test_resolve_recommendation_command_priority():
    result = resolve_recommendation_command("Что сейчас лучше сделать?", _payload())
    assert result is not None
    assert result.recommendation_type == RecommendationType.PRIORITY.value
    assert "RecommendationTemplate: PRIORITY" in result.message


def test_resolve_recommendation_command_blocker_resolution():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ на всю платформу.")
    result = resolve_recommendation_command(
        "Сделаем отдельный Dashboard. Как устранить блокер?",
        _payload(),
    )
    assert result is not None
    assert result.blocker_resolution_created is True
    assert "RecommendationTemplate: BLOCKER_RESOLUTION" in result.message


def test_resolve_recommendation_command_goal_alignment():
    save_tenant_memory_fact("tenant-1", "Наша цель — единый ЯСИИ на платформе.")
    result = resolve_recommendation_command("Что поможет достичь цели?", _payload())
    assert result is not None
    assert result.recommendation_type == RecommendationType.GOAL_ALIGNMENT.value
    assert "RecommendationTemplate: GOAL_ALIGNMENT" in result.message


def test_runtime_recommendation_priority_and_trace():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ.")
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="rec-next-step",
            payload={**_payload(), "text": "Что делать дальше?"},
        ),
    )
    message = response.payload.get("message", "")
    trace = response.payload.get("trace", [])
    assert "Strategy Recommendation (P9-W04)" in message
    assert "RecommendationTemplate: NEXT_STEP" in message
    assert "recommendation_generated" in trace
    assert "recommendation_template_selected" in trace
    assert "recommendation_next_step_created" in trace
    assert "Improvement Suggestions" not in message
