import pytest

from app.modules.yasii.architect_answers import resolve_architect_command
from app.modules.yasii.architect_profile import (
    ArchitectQuestionType,
    build_architect_assessment,
    classify_architect_question,
    find_architect_component,
    format_architect_message,
)
from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.runtime_demo_service import run_demo_pipeline


def _payload():
    return {"tenantId": "tenant-1", "userId": "user-1", "sessionId": "session-1"}


def test_classify_architect_question_types():
    assert classify_architect_question("Как устроена платформа?") == ArchitectQuestionType.OVERVIEW
    assert classify_architect_question("Почему используется ACE?") == ArchitectQuestionType.RATIONALE
    assert classify_architect_question("Что зависит от HostContext?") == ArchitectQuestionType.DEPENDENCY
    assert (
        classify_architect_question("Что произойдёт если изменить HostContext?")
        == ArchitectQuestionType.IMPACT
    )


def test_find_architect_component_aliases():
    assert find_architect_component("Почему HostContext?") == "HostContext"
    assert find_architect_component("зачем нужен ace") == "ACE"


def test_format_architect_message_has_evidence():
    assessment = build_architect_assessment("Почему используется HostContext?")
    message = format_architect_message(assessment)
    assert "Architect Assessment" in message
    assert "Источник:" in message
    assert "YASII_HOST_INTEGRATION_CONTRACT.md" in message


def test_resolve_architect_overview():
    result = resolve_architect_command("Как устроена платформа?", _payload())
    assert result is not None
    assert result.question_answered
    assert "Architect Assessment" in result.message
    assert "Связанные компоненты" in result.message


def test_resolve_architect_ace_rationale_with_source():
    result = resolve_architect_command("Почему используется ACE?", _payload())
    assert result is not None
    assert "ADR_YASII_AI_CONTEXT_BOUNDARY.md" in result.message
    assert "ACE" in result.message


def test_resolve_architect_dependency_analysis():
    result = resolve_architect_command("Что зависит от HostContext?", _payload())
    assert result is not None
    assert result.dependency_analyzed
    assert "ACE" in result.message


def test_resolve_architect_change_impact():
    result = resolve_architect_command("Что произойдёт если изменить HostContext?", _payload())
    assert result is not None
    assert result.change_impact_analyzed
    assert "Риск:" in result.message
    assert "HostContext" in result.message


def test_runtime_architect_priority_over_recommendation():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="architect-overview",
            payload={**_payload(), "text": "Как устроена платформа?"},
        ),
    )
    message = response.payload.get("message", "")
    trace = response.payload.get("trace", [])
    assert "Architect Assessment" in message
    assert "Strategy Recommendation" not in message
    assert "architect_profile_loaded" in trace
    assert "architect_question_answered" in trace
