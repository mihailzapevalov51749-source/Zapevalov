"""E2E MVP scenario runner — integration validation for P10-W03 (no new product features)."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_store import clear_decision_memory_store, set_decision_memory_data_dir
from app.modules.yasii.memory_graph_store import clear_memory_graph_store, set_memory_graph_data_dir
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.session_memory_store import clear_session_memory_store
from app.modules.yasii.tenant_memory_store import clear_tenant_memory_store, set_tenant_memory_data_dir
from app.modules.yasii.user_memory_store import clear_user_memory_store, set_user_memory_data_dir

MVP_E2E_SCENARIO_COUNT = 10


def configure_isolated_mvp_stores(base_dir: Path) -> None:
    graph_dir = base_dir / "graph"
    decision_dir = base_dir / "decision"
    tenant_dir = base_dir / "tenant"
    user_dir = base_dir / "user"
    for path in (graph_dir, decision_dir, tenant_dir, user_dir):
        path.mkdir(parents=True, exist_ok=True)
    set_memory_graph_data_dir(graph_dir)
    set_decision_memory_data_dir(decision_dir)
    set_tenant_memory_data_dir(tenant_dir)
    set_user_memory_data_dir(user_dir)
    clear_memory_graph_store()
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_session_memory_store()


def reset_mvp_stores() -> None:
    clear_memory_graph_store()
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_session_memory_store()
    set_memory_graph_data_dir(None)
    set_decision_memory_data_dir(None)
    set_tenant_memory_data_dir(None)
    set_user_memory_data_dir(None)


def _run(text: str, **payload_extra: object) -> dict:
    payload = {
        "tenantId": "tenant-e2e",
        "userId": "user-e2e",
        "sessionId": "session-e2e",
        **payload_extra,
        "text": text,
    }
    response = run_demo_pipeline(YASIIRequest(requestId=f"e2e-{hash(text)}", payload=payload))
    return response.payload


def _trace_has(trace: list[str], *events: str) -> bool:
    return all(event in trace for event in events)


def scenario_01_dashboard_strategy() -> bool:
    payload = _run(
        "Что сейчас наиболее важно?",
        hostSurface="dashboard",
        embedded=True,
        handoffId="handoff-e2e-01",
        dashboardMetadata={"currentWorkItems": "P10-W03 E2E MVP Scenario Tests"},
    )
    message = str(payload.get("message", ""))
    trace = payload.get("trace", [])
    return (
        "Unlock Ranking" in message
        and _trace_has(trace, "unlock_score_generated", "decision_loaded")
    )


def scenario_02_object_card_architect() -> bool:
    open_payload = _run(
        "Что сейчас открыто?",
        hostSurface="object_card",
        embedded=True,
        objectTypeName="Проект",
        objectTitle="Портал ЯсноПро",
        activeTab="overview",
    )
    if "открыта карточка" not in str(open_payload.get("message", "")).casefold():
        return False

    architect_payload = _run(
        "Почему эта архитектура устроена именно так?",
        hostSurface="object_card",
    )
    message = str(architect_payload.get("message", ""))
    trace = architect_payload.get("trace", [])
    return "Architect Assessment" in message and "architect_question_answered" in trace


def scenario_03_user_memory() -> bool:
    save_payload = _run("Запомни, меня зовут Михаил.")
    if "сохранен" not in str(save_payload.get("message", "")).casefold():
        return False
    recall_payload = _run("Что ты обо мне помнишь?")
    message = str(recall_payload.get("message", ""))
    trace = recall_payload.get("trace", [])
    return "Михаил" in message and "memory_loaded" in trace


def scenario_04_tenant_memory() -> bool:
    _run(
        "Запомни для компании: Мы строим ЯсноПро.",
        userId="user-owner",
    )
    recall_payload = _run(
        "Что ты знаешь о компании?",
        userId="user-other",
    )
    message = str(recall_payload.get("message", ""))
    trace = recall_payload.get("trace", [])
    return "ЯсноПро" in message and "tenant_memory_loaded" in trace


def scenario_05_decision_conflict() -> bool:
    _run("Запомни решение: В платформе существует только один ЯСИИ.")
    conflict_payload = _run("Мы решили сделать отдельный Dashboard YASII.")
    message = str(conflict_payload.get("message", "")).casefold()
    trace = conflict_payload.get("trace", [])
    return (
        ("противоречит" in message or "конфликт" in message)
        and (
            "decision_conflict_detected" in trace
            or "strategy_conflict_detected" in trace
            or "blocker_conflict_found" in trace
        )
    )


def scenario_06_session_memory() -> bool:
    base = {"hostSurface": "dashboard"}
    _run("Обсудим задачу P10-W03 E2E MVP.", **base)
    _run("Мы решили завершить Memory Foundation.", **base)
    _run("Какие последствия у отказа от единого runtime?", **base)
    summary_payload = _run("Подведи итог текущей сессии.", **base)
    message = str(summary_payload.get("message", ""))
    trace = summary_payload.get("trace", [])
    return (
        ("сесс" in message.casefold() or "итог" in message.casefold())
        and "session_summary_generated" in trace
    )


def scenario_07_memory_graph() -> bool:
    _run("Запомни решение: В платформе существует только один ЯСИИ.")
    links_payload = _run("Покажи связи решения.")
    message = str(links_payload.get("message", ""))
    trace = links_payload.get("trace", [])
    return "Связи решения" in message and "memory_graph_loaded" in trace


def scenario_08_architect_impact() -> bool:
    impact_payload = _run("Что произойдёт если изменить HostContext?")
    message = str(impact_payload.get("message", ""))
    trace = impact_payload.get("trace", [])
    return (
        "Architect Assessment" in message
        and "HostContext" in message
        and "architect_change_impact_analyzed" in trace
    )


def scenario_09_improvement_query() -> bool:
    improvement_payload = _run("Что можно улучшить?")
    message = str(improvement_payload.get("message", ""))
    trace = improvement_payload.get("trace", [])
    return (
        "Improvement Assessment" in message
        and "improvement_query_executed" in trace
        and "improvement_assessment_created" in trace
    )


def scenario_10_full_strategic_flow() -> bool:
    steps: list[tuple[str, Callable[[str, list[str]], bool]]] = [
        (
            "Что сейчас наиболее важно?",
            lambda msg, tr: "Unlock Ranking" in msg and "unlock_score_generated" in tr,
        ),
        (
            "Что мешает двигаться дальше?",
            lambda msg, tr: "Blocker Detection" in msg and "blocker_assessment_created" in tr,
        ),
        (
            "Что делать дальше?",
            lambda msg, tr: "RecommendationTemplate" in msg and "recommendation_generated" in tr,
        ),
        (
            "Что можно улучшить?",
            lambda msg, tr: "Improvement Assessment" in msg and "improvement_query_executed" in tr,
        ),
    ]
    for query, checker in steps:
        payload = _run(
            query,
            hostSurface="dashboard",
            dashboardMetadata={"currentWorkItems": "P10-W03"},
        )
        message = str(payload.get("message", ""))
        trace = payload.get("trace", [])
        if not checker(message, trace):
            return False
    return True


MVP_E2E_SCENARIOS: tuple[Callable[[], bool], ...] = (
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


def run_mvp_e2e_validation(base_dir: Path) -> bool:
    configure_isolated_mvp_stores(base_dir)
    try:
        started = _run("ping", e2eMvpTrace="started")
        if "yasii_e2e_mvp_started" not in started.get("trace", []):
            return False

        for scenario in MVP_E2E_SCENARIOS:
            if not scenario():
                return False

        completed = _run("ping", e2eMvpTrace="completed")
        validated = _run("ping", e2eMvpTrace="validated")
        trace = validated.get("trace", [])
        return (
            "yasii_e2e_mvp_completed" in completed.get("trace", [])
            and "yasii_e2e_flow_validated" in trace
        )
    finally:
        reset_mvp_stores()
