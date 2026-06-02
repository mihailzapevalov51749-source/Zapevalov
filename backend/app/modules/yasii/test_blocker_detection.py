import pytest

from app.modules.yasii.blocker_answers import resolve_blocker_command
from app.modules.yasii.blocker_detection import (
    BlockerType,
    build_blocker_assessment,
    detect_decision_conflict_blocker,
    detect_missing_decision_blocker,
)
from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_store import (
    clear_decision_memory_store,
    save_decision_record,
    set_decision_memory_data_dir,
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


def test_decision_conflict_blocker():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ на всю платформу.")
    blocker = detect_decision_conflict_blocker(
        "tenant-1",
        "Сделаем отдельный Dashboard YASII.",
    )
    assert blocker is not None
    assert blocker.blockerType == BlockerType.DECISION_CONFLICT
    assert "противоречит" in blocker.reasoning.casefold()


def test_missing_decision_blocker():
    blocker = detect_missing_decision_blocker("tenant-1", "Что мешает начать работу по архитектуре памяти?")
    assert blocker is not None
    assert blocker.blockerType == BlockerType.MISSING_DECISION


def test_dependency_blocker_from_catalog():
    payload = _payload(
        dashboardMetadata={"completedWorkItems": "P9-W01 Strategy Capability Engine"},
    )
    assessment = build_blocker_assessment(
        "tenant-1",
        "Почему нельзя перейти к P9-W04?",
        payload,
    )
    deps = [item for item in assessment.blockers if item.blockerType == BlockerType.MISSING_DEPENDENCY]
    assert deps
    assert any("P9-W02" in item.title or "P9-W03" in item.title for item in deps)


def test_goal_conflict_blocker():
    save_tenant_memory_fact("tenant-1", "Наша цель — один ЯСИИ на всю платформу.")
    assessment = build_blocker_assessment(
        "tenant-1",
        "Создадим три разных ЯСИИ для разных модулей.",
        _payload(),
    )
    assert any(item.blockerType == BlockerType.GOAL_CONFLICT for item in assessment.blockers)


def test_no_critical_blockers_message():
    save_decision_record("tenant-1", "Мы решили использовать Memory Graph для связей.")
    result = resolve_blocker_command("Есть ли блокеры?", _payload())
    assert result is not None
    assert "критических блокеров не обнаружено" in result.message.casefold()


def test_runtime_wiring_priority_over_unlock():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ на всю платформу.")
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="blocker-query",
            payload={
                **_payload(),
                "text": "Сделаем отдельный Dashboard YASII. Есть ли блокеры?",
            },
        ),
    )
    trace = response.payload.get("trace", [])
    assert "blocker_conflict_found" in trace
    assert "blocker_assessment_created" in trace
    message = response.payload.get("message", "")
    assert "Blocker Detection" in message
    assert "Unlock Ranking" not in message
