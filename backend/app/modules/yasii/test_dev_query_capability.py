import app.modules.yasii.dev_query_capability  # noqa: F401

from app.modules.yasii.dev_query_capability import (
    DeveloperQueryCategory,
    answer_developer_query,
    resolve_developer_query_message,
)


def test_answer_developer_query_pipeline_question():
    response = answer_developer_query("Как проходит запрос?")

    assert response.category == DeveloperQueryCategory.PIPELINE
    assert "Intent Resolver" in response.answer
    assert "Runtime Orchestrator" in response.answer
    assert "↓" in response.answer


def test_answer_developer_query_rule_engine_component():
    response = answer_developer_query("Что делает Rule Engine?")

    assert response.category == DeveloperQueryCategory.COMPONENT
    assert response.metadata["component"] == "Rule Engine"
    assert "доказательствам" in response.answer
    assert "Verdict Engine" in response.answer


def test_answer_developer_query_runtime_orchestrator():
    response = answer_developer_query("Что такое Runtime Orchestrator?")

    assert response.category == DeveloperQueryCategory.COMPONENT
    assert response.metadata["component"] == "Runtime Orchestrator"
    assert "pipeline" in response.answer.lower()


def test_answer_developer_query_components_list():
    response = answer_developer_query("Какие компоненты есть в ЯСИИ?")

    assert response.category == DeveloperQueryCategory.COMPONENT
    assert "Компоненты ЯСИИ" in response.answer
    assert "Graph Resolver" in response.answer


def test_resolve_developer_query_message_formats_component_answer():
    message = resolve_developer_query_message("Что делает Rule Engine?")

    assert message is not None
    assert "Developer Query" in message
    assert "Компонент:\nRule Engine" in message
    assert "Назначение:" in message


def test_resolve_developer_query_message_unknown_returns_none():
    assert resolve_developer_query_message("Кто ты?") is None


def test_resolve_developer_query_message_verdict_question_not_stolen():
    assert resolve_developer_query_message(
        "Почему Rule Engine расположен после Evidence Resolver?"
    ) is None
