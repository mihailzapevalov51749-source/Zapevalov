import app.modules.yasii.architecture_verdicts  # noqa: F401

from app.modules.yasii.architecture_verdicts import (
    ARCHITECTURE_VERDICTS,
    get_architecture_verdict,
    get_verdict_snapshot,
    list_available_verdicts,
    resolve_architecture_verdict_message,
)


def test_list_available_verdicts_returns_all_mvp_subjects():
    subjects = list_available_verdicts()

    assert "Rule Engine" in subjects
    assert "Runtime Orchestrator" in subjects
    assert len(subjects) == len(ARCHITECTURE_VERDICTS)


def test_get_architecture_verdict_rule_engine():
    verdict = get_architecture_verdict("Rule Engine")

    assert verdict.subject == "Rule Engine"
    assert "Evidence Resolver" in verdict.explanation
    assert verdict.reasoning == "architecture_verdict_catalog"


def test_get_architecture_verdict_verdict_engine():
    verdict = get_architecture_verdict("Verdict Engine")

    assert verdict.subject == "Verdict Engine"
    assert "Rule Engine" in verdict.explanation


def test_get_architecture_verdict_runtime_orchestrator():
    verdict = get_architecture_verdict("Runtime Orchestrator")

    assert verdict.subject == "Runtime Orchestrator"
    assert "координации" in verdict.explanation


def test_get_architecture_verdict_knowledge_resolver():
    verdict = get_architecture_verdict("Knowledge Resolver")

    assert verdict.subject == "Knowledge Resolver"
    assert "Intent Resolver" in verdict.explanation


def test_get_verdict_snapshot_contains_verdicts():
    snapshot = get_verdict_snapshot()

    assert snapshot.snapshotId.startswith("architecture-verdict-snapshot-")
    assert len(snapshot.verdicts) == len(ARCHITECTURE_VERDICTS)
    assert snapshot.createdAt


def test_resolve_architecture_verdict_message_rule_engine():
    message = resolve_architecture_verdict_message(
        "Почему Rule Engine расположен после Evidence Resolver?"
    )

    assert message is not None
    assert "Architecture Verdict" in message
    assert "Rule Engine" in message
    assert "доказательствам" in message


def test_resolve_architecture_verdict_message_runtime_orchestrator():
    message = resolve_architecture_verdict_message("Зачем нужен Runtime Orchestrator?")

    assert message is not None
    assert "Runtime Orchestrator" in message
    assert "pipeline" in message


def test_resolve_architecture_verdict_message_knowledge_resolver():
    message = resolve_architecture_verdict_message("Для чего нужен Knowledge Resolver?")

    assert message is not None
    assert "Knowledge Resolver" in message
    assert "намерение" in message


def test_resolve_architecture_verdict_message_without_component_returns_none():
    assert resolve_architecture_verdict_message("Почему так устроен pipeline?") is None


def test_resolve_architecture_verdict_message_without_verdict_keyword_returns_none():
    assert resolve_architecture_verdict_message("Rule Engine pipeline") is None
