import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_store import (
    clear_decision_memory_store,
    save_decision_record,
    set_decision_memory_data_dir,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.strategy_answers import resolve_strategy_command
from app.modules.yasii.strategy_engine import (
    assess_consistency,
    assess_decision_impact,
    assess_goal_alignment,
    assess_recommendations,
)
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


def test_consistency_conflict_with_saved_decision():
    save_decision_record(
        "tenant-1",
        "Мы решили использовать один ЯСИИ на всю платформу.",
    )
    assessment = assess_consistency(
        "tenant-1",
        "Создадим отдельный Dashboard YASII.",
    )
    assert assessment.consistency is not None
    assert assessment.consistency.conflictDetected is True
    assert "противоречит" in assessment.consistency.summary.casefold()


def test_impact_and_recommendation_assessments():
    save_decision_record("tenant-1", "Мы решили использовать ACE handoff.")
    payload = _payload(hostSurface="object_card")
    impact = assess_decision_impact(
        "tenant-1",
        "На что повлияет отказ от единого runtime?",
        payload,
    )
    assert impact.impact is not None
    assert impact.impact.relatedDecisions

    recommendation = assess_recommendations("tenant-1", payload)
    assert recommendation.recommendation is not None
    assert recommendation.recommendation.recommendations


def test_goal_alignment_with_tenant_goal():
    save_tenant_memory_fact("tenant-1", "Наша цель — единый ЯСИИ на платформе.")
    assessment = assess_goal_alignment(
        "tenant-1",
        "Это приближает нас к цели единого цифрового сотрудника?",
        _payload(),
    )
    assert assessment.goalAlignment is not None
    assert assessment.goalAlignment.aligned is True


def test_runtime_strategy_priority_and_trace():
    save_decision_record(
        "tenant-1",
        "Мы решили использовать один ЯСИИ на всю платформу.",
    )
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="strategy-conflict",
            payload={**_payload(), "text": "Создадим Dashboard YASII."},
        ),
    )
    trace = response.payload.get("trace", [])
    assert "strategy_conflict_detected" in trace
    assert "strategy_assessment_created" in trace
    assert "противоречит" in response.payload.get("message", "").casefold()


def test_resolve_strategy_command_recommendation():
    from app.modules.yasii.recommendation_answers import resolve_recommendation_command

    save_decision_record("tenant-1", "Мы решили использовать Memory Graph.")
    result = resolve_recommendation_command(
        "Что ты рекомендуешь сделать дальше?",
        _payload(),
    )
    assert result is not None
    assert result.recommendation_generated is True
    assert "RecommendationTemplate:" in result.message
