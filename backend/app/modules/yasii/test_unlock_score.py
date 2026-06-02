import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_store import (
    clear_decision_memory_store,
    save_decision_record,
    set_decision_memory_data_dir,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.session_memory_store import clear_session_memory_store, record_session_exchange
from app.modules.yasii.tenant_memory_store import (
    clear_tenant_memory_store,
    save_tenant_memory_fact,
    set_tenant_memory_data_dir,
)
from app.modules.yasii.unlock_score import (
    build_unlock_assessment,
    collect_unlock_candidates,
    score_unlock_candidate,
)
from app.modules.yasii.unlock_score_answers import resolve_unlock_command


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
    clear_session_memory_store()
    yield
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_session_memory_store()
    set_decision_memory_data_dir(None)
    set_tenant_memory_data_dir(None)


def _payload(**extra):
    return {
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        **extra,
    }


def test_score_generation_and_ranking():
    save_decision_record("tenant-1", "Мы решили завершить P8-W06 Memory Graph.")
    save_tenant_memory_fact("tenant-1", "Наша цель — единый ЯСИИ на платформе.")
    payload = _payload(
        dashboardMetadata={"currentWorkItems": "P9-W02 Unlock Score Ranking | Исправить баг"},
        hostSurface="dashboard",
    )
    candidates = collect_unlock_candidates("tenant-1", payload)
    assert len(candidates) >= 2

    assessment = build_unlock_assessment("tenant-1", payload)
    assert assessment.topCandidate is not None
    assert assessment.candidates[0].score >= assessment.candidates[-1].score
    assert assessment.candidates[0].signals

    scored = score_unlock_candidate(candidates[0], "tenant-1", payload)
    assert scored.score > 0
    assert scored.signals


def test_unlock_queries_and_blocker_view():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ на всю платформу.")
    payload = _payload()

    ranking = resolve_unlock_command("Что сейчас наиболее важно?", payload)
    assert ranking is not None
    assert "Unlock Ranking" in ranking.message
    assert ranking.ranking_created

    next_step = resolve_unlock_command("Что лучше сделать следующим?", payload)
    assert next_step is not None
    assert "Рекомендуется сейчас" in next_step.message

    focus = resolve_unlock_command("На чём стоит сосредоточиться?", payload)
    assert focus is not None
    assert focus.candidate_scored

    from app.modules.yasii.blocker_answers import resolve_blocker_command

    blockers = resolve_blocker_command("Что сейчас блокирует прогресс?", payload)
    assert blockers is not None
    assert "Blocker Detection" in blockers.message


def test_runtime_wiring_priority_over_strategy():
    save_decision_record("tenant-1", "Мы решили завершить Memory Graph.")
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-1",
        user_text="Нужно закрыть P8-W06",
        assistant_text="Принято.",
    )
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="unlock-ranking",
            payload={**_payload(), "text": "Что сейчас наиболее важно?"},
        ),
    )
    trace = response.payload.get("trace", [])
    assert "unlock_ranking_created" in trace
    assert "unlock_score_generated" in trace
    message = response.payload.get("message", "")
    assert "Unlock Ranking" in message
    assert "Strategy Capability" not in message
