import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_store import (
    clear_decision_memory_store,
    set_decision_memory_data_dir,
)
from app.modules.yasii.improvement_answers import resolve_improvement_command
from app.modules.yasii.improvement_query import (
    ImprovementCategory,
    build_improvement_assessment,
    format_improvement_message,
    is_improvement_query,
    select_improvement_focus_category,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline


@pytest.fixture(autouse=True)
def isolated_decision_store(tmp_path):
    decision_dir = tmp_path / "decision"
    decision_dir.mkdir()
    set_decision_memory_data_dir(decision_dir)
    clear_decision_memory_store()
    yield
    clear_decision_memory_store()
    set_decision_memory_data_dir(None)


def _payload(**extra):
    return {
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        **extra,
    }


def test_is_improvement_query_keywords():
    assert is_improvement_query("Что можно улучшить?")
    assert is_improvement_query("Есть ли технический долг?")
    assert not is_improvement_query("Что делать дальше?")


def test_select_improvement_focus_category():
    assert select_improvement_focus_category("Есть ли технический долг?") == ImprovementCategory.TECHNICAL_DEBT
    assert (
        select_improvement_focus_category("Что мешает повысить готовность платформы?")
        == ImprovementCategory.READINESS
    )
    assert select_improvement_focus_category("Какие улучшения нужны ЯСИИ?") == ImprovementCategory.KNOWLEDGE


def test_build_improvement_assessment_has_candidates():
    assessment = build_improvement_assessment("tenant-1", "Что можно улучшить?", _payload())
    assert assessment.candidates
    assert any(item.category == ImprovementCategory.KNOWLEDGE for item in assessment.candidates)


def test_format_improvement_message_structure():
    assessment = build_improvement_assessment("tenant-1", "Что можно улучшить?", _payload())
    message = format_improvement_message(assessment)
    assert message.startswith("Improvement Assessment")
    assert "Улучшение:" in message
    assert "Категория:" in message
    assert "Почему:" in message
    assert "Затронутые области:" in message
    assert "Рекомендуемое действие:" in message


def test_resolve_improvement_general():
    result = resolve_improvement_command("Что можно улучшить?", _payload())
    assert result is not None
    assert result.query_executed
    assert result.assessment_created
    assert "Improvement Assessment" in result.message


def test_resolve_improvement_technical_debt():
    result = resolve_improvement_command("Есть ли технический долг?", _payload())
    assert result is not None
    assert result.focus_category == ImprovementCategory.TECHNICAL_DEBT.value
    assert "TECHNICAL_DEBT" in result.message


def test_resolve_improvement_readiness():
    result = resolve_improvement_command(
        "Что мешает повысить готовность платформы?",
        _payload(),
    )
    assert result is not None
    assert result.focus_category == ImprovementCategory.READINESS.value


def test_resolve_improvement_yasii_knowledge():
    result = resolve_improvement_command("Какие улучшения нужны ЯСИИ?", _payload())
    assert result is not None
    assert result.focus_category == ImprovementCategory.KNOWLEDGE.value
    assert "KNOWLEDGE" in result.message


def test_runtime_improvement_priority_over_architect():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="improvement-general",
            payload={**_payload(), "text": "Что можно улучшить?"},
        ),
    )
    message = response.payload.get("message", "")
    trace = response.payload.get("trace", [])
    assert "Improvement Assessment" in message
    assert "Architect Assessment" not in message
    assert "improvement_query_executed" in trace
    assert "improvement_assessment_created" in trace
