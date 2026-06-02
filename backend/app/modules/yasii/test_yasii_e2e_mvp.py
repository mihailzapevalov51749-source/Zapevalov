"""E2E MVP scenario tests (P10-W03) — full YASII integration across surfaces and layers."""

from pathlib import Path

import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.e2e_mvp_flow import (
    MVP_E2E_SCENARIO_COUNT,
    MVP_E2E_SCENARIOS,
    configure_isolated_mvp_stores,
    reset_mvp_stores,
    run_mvp_e2e_validation,
    scenario_01_dashboard_strategy,
    scenario_02_object_card_architect,
    scenario_03_user_memory,
    scenario_04_tenant_memory,
    scenario_05_decision_conflict,
    scenario_06_session_memory,
    scenario_07_memory_graph,
    scenario_08_architect_impact,
    scenario_09_improvement_query,
    scenario_10_full_strategic_flow,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline


@pytest.fixture
def mvp_stores(tmp_path: Path):
    configure_isolated_mvp_stores(tmp_path)
    yield tmp_path
    reset_mvp_stores()


def test_mvp_e2e_scenario_registry_count():
    assert len(MVP_E2E_SCENARIOS) == MVP_E2E_SCENARIO_COUNT == 10


def test_e2e_scenario_01_dashboard_strategy(mvp_stores):
    assert scenario_01_dashboard_strategy()


def test_e2e_scenario_02_object_card_architect(mvp_stores):
    assert scenario_02_object_card_architect()


def test_e2e_scenario_03_user_memory(mvp_stores):
    assert scenario_03_user_memory()


def test_e2e_scenario_04_tenant_memory(mvp_stores):
    assert scenario_04_tenant_memory()


def test_e2e_scenario_05_decision_conflict(mvp_stores):
    assert scenario_05_decision_conflict()


def test_e2e_scenario_06_session_memory(mvp_stores):
    assert scenario_06_session_memory()


def test_e2e_scenario_07_memory_graph(mvp_stores):
    assert scenario_07_memory_graph()


def test_e2e_scenario_08_architect_impact(mvp_stores):
    assert scenario_08_architect_impact()


def test_e2e_scenario_09_improvement_query(mvp_stores):
    assert scenario_09_improvement_query()


def test_e2e_scenario_10_full_strategic_flow(mvp_stores):
    assert scenario_10_full_strategic_flow()


def test_run_mvp_e2e_validation_entrypoint(tmp_path: Path):
    assert run_mvp_e2e_validation(tmp_path)


def test_e2e_trace_markers_in_runtime(mvp_stores):
    started = run_demo_pipeline(
        YASIIRequest(
            requestId="e2e-trace-start",
            payload={
                "tenantId": "tenant-e2e",
                "text": "ping",
                "e2eMvpTrace": "started",
            },
        ),
    )
    validated = run_demo_pipeline(
        YASIIRequest(
            requestId="e2e-trace-validated",
            payload={
                "tenantId": "tenant-e2e",
                "text": "ping",
                "e2eMvpTrace": "validated",
            },
        ),
    )
    assert "yasii_e2e_mvp_started" in started.payload.get("trace", [])
    assert "yasii_e2e_flow_validated" in validated.payload.get("trace", [])


def test_improvement_has_priority_over_architect(mvp_stores):
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="e2e-priority",
            payload={
                "tenantId": "tenant-e2e",
                "userId": "user-e2e",
                "sessionId": "session-e2e",
                "text": "Что можно улучшить?",
            },
        ),
    )
    message = response.payload.get("message", "")
    assert "Improvement Assessment" in message
    assert "Architect Assessment" not in message
