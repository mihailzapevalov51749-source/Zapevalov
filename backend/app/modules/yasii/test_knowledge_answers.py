import pytest

from app.modules.yasii.improvement_answers import resolve_improvement_command
from app.modules.yasii.knowledge_answers import (
    classify_knowledge_query,
    is_knowledge_corpus_command,
    resolve_knowledge_corpus_command,
)
from app.modules.yasii.knowledge_index import clear_project_corpus_cache


@pytest.fixture(autouse=True)
def _clear_corpus_cache():
    clear_project_corpus_cache()
    yield
    clear_project_corpus_cache()


def _payload():
    return {"tenantId": "tenant-1", "userId": "user-1", "sessionId": "session-1"}


def test_classify_knowledge_queries():
    assert classify_knowledge_query("Что находится в YASNOPRO_ARCHITECTURE_STATUS.md?") is not None
    assert classify_knowledge_query("Какие WI ещё открыты?") is not None
    assert is_knowledge_corpus_command("Какие архитектурные долги существуют?")


def test_knowledge_defers_to_architect_profile():
    query = "Почему эта архитектура устроена именно так?"
    assert classify_knowledge_query(query) is not None
    assert is_knowledge_corpus_command(query) is False
    assert resolve_knowledge_corpus_command(query, _payload()) is None


def test_resolve_architecture_status_document():
    result = resolve_knowledge_corpus_command(
        "Что находится в YASNOPRO_ARCHITECTURE_STATUS.md?",
        _payload(),
    )
    assert result is not None
    assert result.answer_generated
    assert "Knowledge Assessment" in result.message
    assert "YASNOPRO_ARCHITECTURE_STATUS.md" in result.message
    assert "Level" in result.message or "Hybrid" in result.message


def test_resolve_open_work_items():
    result = resolve_knowledge_corpus_command("Какие WI ещё открыты?", _payload())
    assert result is not None
    assert "WI" in result.message
    assert "yasii_catalog" in result.message


def test_resolve_architecture_debt():
    result = resolve_knowledge_corpus_command("Какие архитектурные долги существуют?", _payload())
    assert result is not None
    assert "долг" in result.message.casefold() or "legacy" in result.message.casefold()


def test_knowledge_defers_remaining_to_project_awareness():
    query = "Что ещё не реализовано?"
    assert is_knowledge_corpus_command(query) is False
    assert resolve_knowledge_corpus_command(query, _payload()) is None


def test_knowledge_priority_over_improvement_for_shared_query():
    query = "Какие WI ещё открыты?"
    knowledge = resolve_knowledge_corpus_command(query, _payload())
    improvement = resolve_improvement_command(query, _payload())
    assert knowledge is not None
    assert "Knowledge Assessment" in knowledge.message
    assert knowledge.corpus_loaded
    assert knowledge.answer_generated
