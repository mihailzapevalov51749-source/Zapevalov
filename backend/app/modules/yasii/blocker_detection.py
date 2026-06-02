"""Blocker Detection — deterministic obstacles over memory + strategy (P9-W03)."""

from __future__ import annotations

import re
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.yasii.decision_memory_store import (
    detect_decision_conflict,
    list_decision_records,
    normalize_decision_text,
    search_decision_records,
)
from app.modules.yasii.memory_graph import load_memory_graph, processes_linked_to_decision
from app.modules.yasii.process_memory import build_schema_process_memory_record
from app.modules.yasii.session_memory_store import load_session_memory
from app.modules.yasii.strategy_engine import _goal_signals, assess_goal_alignment
from app.modules.yasii.unlock_score import _metadata_work_items
from app.modules.platform_dashboard.yasii_catalog import (
    YASII_CRITICAL_PATH,
    YASII_WORK_ITEMS,
    work_item_by_key,
)
from app.modules.platform_dashboard.yasii_sync import _dependencies_satisfied

BLOCKER_DETECTION_SCHEMA_VERSION = "0.1.0"
WI_KEY_PATTERN = re.compile(r"P\d+-W\d+", re.IGNORECASE)

SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"


class BlockerType(str, Enum):
    DECISION_CONFLICT = "decision_conflict"
    MISSING_DECISION = "missing_decision"
    MISSING_DEPENDENCY = "missing_dependency"
    MISSING_CONTEXT = "missing_context"
    MISSING_INFORMATION = "missing_information"
    GOAL_CONFLICT = "goal_conflict"
    PROCESS_GAP = "process_gap"


class BlockerCandidate(BaseModel):
    blockerId: str = Field(default_factory=lambda: f"blocker-{uuid4().hex[:10]}")
    blockerType: BlockerType
    title: str = ""
    severity: str = SEVERITY_MEDIUM
    reasoning: str = ""
    signals: list[str] = Field(default_factory=list)
    recommendedAction: str = ""


class BlockerAssessment(BaseModel):
    schemaVersion: str = Field(default=BLOCKER_DETECTION_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"blocker-assess-{uuid4().hex[:12]}")
    blockers: list[BlockerCandidate] = Field(default_factory=list)
    summary: str = ""


def _tenant_id(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def _wi_keys(text: str) -> list[str]:
    return [match.upper() for match in WI_KEY_PATTERN.findall(str(text or ""))]


def _catalog_item(key: str):
    normalized = str(key or "").strip().upper()
    return next((item for item in YASII_WORK_ITEMS if item.key == normalized), None)


def _completed_work_keys(payload: dict) -> set[str]:
    completed: set[str] = set()
    for item in _metadata_work_items(payload):
        completed.update(key.upper() for key in _wi_keys(item))
        lowered = item.casefold()
        if "заверш" in lowered or "done" in lowered or "готов" in lowered:
            for key in _wi_keys(item):
                completed.add(key)
    for record in list_decision_records(_tenant_id(payload)):
        text = record.decisionText
        if any(marker in normalize_decision_text(text) for marker in ("заверш", "done", "готов")):
            completed.update(_wi_keys(text))
    return completed


def _dependency_satisfied(dep_key: str, payload: dict) -> bool:
    dep = str(dep_key or "").strip().upper()
    if not dep or dep.startswith("MVP"):
        return True
    if dep in _completed_work_keys(payload):
        return True
    tenant_id = _tenant_id(payload)
    for record in list_decision_records(tenant_id):
        if dep in record.decisionText.upper():
            return True
    return False


def _add_blocker(
    blockers: list[BlockerCandidate],
    *,
    blocker_type: BlockerType,
    title: str,
    severity: str,
    reasoning: str,
    signals: list[str],
    recommended_action: str,
) -> None:
    blockers.append(
        BlockerCandidate(
            blockerType=blocker_type,
            title=title,
            severity=severity,
            reasoning=reasoning,
            signals=signals,
            recommendedAction=recommended_action,
        ),
    )


def detect_decision_conflict_blocker(tenant_id: str, query_text: str) -> BlockerCandidate | None:
    conflict = detect_decision_conflict(tenant_id, query_text)
    if not conflict:
        return None
    title = "Конфликт с активным решением"
    if "dashboard" in normalize_decision_text(query_text):
        title = "Конфликт: отдельный Dashboard YASII vs единый ЯСИИ"
    return BlockerCandidate(
        blockerType=BlockerType.DECISION_CONFLICT,
        title=title,
        severity=SEVERITY_HIGH,
        reasoning=conflict,
        signals=["Decision Memory", "detect_decision_conflict"],
        recommendedAction="Сверить предложение с Decision Memory или обновить/отменить решение.",
    )


def detect_missing_decision_blocker(tenant_id: str, query_text: str) -> BlockerCandidate | None:
    normalized = normalize_decision_text(query_text)
    start_markers = ("начать", "начинаем", "приступ", "реализац", "запустить работу", "начать работу")
    topic_markers = ("архитектур", "памят", "memory", "стратег", "runtime", "реализац")
    if not any(marker in normalized for marker in start_markers):
        return None

    decisions = list_decision_records(tenant_id)
    if not decisions:
        return BlockerCandidate(
            blockerType=BlockerType.MISSING_DECISION,
            title="Не зафиксировано ключевое решение",
            severity=SEVERITY_HIGH,
            reasoning="Перед началом работы нет активных решений в Decision Memory.",
            signals=["Decision Memory пуст"],
            recommendedAction="Зафиксировать решение: «Запомни решение: …».",
        )

    if any(marker in normalized for marker in topic_markers):
        related = search_decision_records(tenant_id, normalized)
        if not related:
            return BlockerCandidate(
                blockerType=BlockerType.MISSING_DECISION,
                title="Нет решения по теме начала работы",
                severity=SEVERITY_MEDIUM,
                reasoning="Запрос о старте работы не сопоставлен с решениями по памяти/архитектуре.",
                signals=["Decision Memory", "topic search"],
                recommendedAction="Зафиксировать решение по выбранному направлению (память, runtime, стратегия).",
            )
    return None


def detect_missing_dependency_blockers(query_text: str, payload: dict) -> list[BlockerCandidate]:
    blockers: list[BlockerCandidate] = []
    keys = _wi_keys(query_text)
    if not keys:
        return blockers

    target_key = keys[0]
    item = _catalog_item(target_key)
    if item is None:
        return blockers

    for dep_key in item.depends_on:
        if _dependency_satisfied(dep_key, payload):
            continue
        dep_item = _catalog_item(dep_key)
        dep_title = dep_item.title if dep_item else dep_key
        blockers.append(
            BlockerCandidate(
                blockerType=BlockerType.MISSING_DEPENDENCY,
                title=f"Зависимость не закрыта: {dep_key}",
                severity=SEVERITY_HIGH,
                reasoning=(
                    f"{target_key} ({item.title}) зависит от {dep_key} ({dep_title}), "
                    "но признаков завершения зависимости в контексте нет."
                ),
                signals=["yasii_catalog.depends_on", "HostContext metadata"],
                recommendedAction=f"Завершить {dep_key} или зафиксировать решение о его готовности.",
            ),
        )
    return blockers


def detect_goal_conflict_blocker(tenant_id: str, query_text: str, payload: dict) -> BlockerCandidate | None:
    normalized = normalize_decision_text(query_text)
    multi_markers = ("три ", "три разных", "несколько", "отдельный", "второй", "третий", "разных ясии")
    if not (("ясии" in normalized or "yasii" in normalized) and any(m in normalized for m in multi_markers)):
        return None

    goals = _goal_signals(tenant_id, payload)
    single_markers = ("один ясии", "единый ясии", "один yasii", "на всю платформу", "единый цифровой")
    for goal in goals:
        goal_norm = normalize_decision_text(goal)
        if any(marker in goal_norm for marker in single_markers):
            return BlockerCandidate(
                blockerType=BlockerType.GOAL_CONFLICT,
                title="Конфликт с целью организации",
                severity=SEVERITY_HIGH,
                reasoning=(
                    f"Предложение расходится с зафиксированной целью: «{goal}»."
                ),
                signals=["Tenant Memory", "Strategy goal signals"],
                recommendedAction="Согласовать предложение с целью или обновить цель в Tenant Memory.",
            )

    alignment = assess_goal_alignment(tenant_id, query_text, payload)
    if alignment.goalAlignment and alignment.goalAlignment.aligned is False:
        return BlockerCandidate(
            blockerType=BlockerType.GOAL_CONFLICT,
            title="Предложение не согласуется с целями",
            severity=SEVERITY_MEDIUM,
            reasoning=alignment.goalAlignment.summary,
            signals=["Strategy Engine", "goal alignment"],
            recommendedAction="Уточнить цель в Tenant Memory и сверить предложение.",
        )
    return None


def detect_process_gap_blockers(tenant_id: str, payload: dict) -> list[BlockerCandidate]:
    blockers: list[BlockerCandidate] = []
    surface = str(payload.get("hostSurface") or "").strip().casefold()
    process_id = str(payload.get("processId") or "").strip()

    if surface == "process" and not process_id:
        blockers.append(
            BlockerCandidate(
                blockerType=BlockerType.PROCESS_GAP,
                title="Process Memory: нет processId в HostContext",
                severity=SEVERITY_MEDIUM,
                reasoning="Поверхность process без идентификатора процесса — только schema, без runtime.",
                signals=["Process Memory Schema", "HostContext"],
                recommendedAction="Передать processId/processInstanceId в HostContext.",
            ),
        )

    schema_record = build_schema_process_memory_record(tenant_id, payload)
    if schema_record and schema_record.definition and not schema_record.instance:
        blockers.append(
            BlockerCandidate(
                blockerType=BlockerType.PROCESS_GAP,
                title="Process Memory: нет экземпляра процесса",
                severity=SEVERITY_LOW,
                reasoning="Есть определение процесса, но нет instance snapshot (Process Runtime не подключён).",
                signals=["Process Memory Schema"],
                recommendedAction="Передать instanceId и шаги, когда Process Runtime будет доступен.",
            ),
        )

    decisions = list_decision_records(tenant_id)
    graph = load_memory_graph(tenant_id, reconcile=False)
    if decisions and process_id:
        has_link = any(
            processes_linked_to_decision(graph, record.decisionId) for record in decisions[:5]
        )
        if not has_link:
            blockers.append(
                BlockerCandidate(
                    blockerType=BlockerType.PROCESS_GAP,
                    title="Memory Graph: нет связи решения с процессом",
                    severity=SEVERITY_LOW,
                    reasoning="Решения не связаны с процессом в Memory Graph.",
                    signals=["Memory Graph", "process link"],
                    recommendedAction="Сохранить решение и синхронизировать связи Memory Graph.",
                ),
            )
    return blockers


def detect_missing_context_blockers(payload: dict) -> list[BlockerCandidate]:
    blockers: list[BlockerCandidate] = []
    if payload.get("embedded") is True:
        surface = str(payload.get("hostSurface") or payload.get("surfaceId") or "").strip()
        if not surface:
            blockers.append(
                BlockerCandidate(
                    blockerType=BlockerType.MISSING_CONTEXT,
                    title="Embedded HostContext без hostSurface",
                    severity=SEVERITY_MEDIUM,
                    reasoning="Встроенный запрос без поверхности — ограничен контекст ответа.",
                    signals=["ACE Handoff", "HostContext"],
                    recommendedAction="Передать hostSurface и metadata поверхности в Handoff.",
                ),
            )
    if not str(payload.get("tenantId") or "").strip():
        blockers.append(
            BlockerCandidate(
                blockerType=BlockerType.MISSING_CONTEXT,
                title="Нет tenantId в HostContext",
                severity=SEVERITY_HIGH,
                reasoning="Tenant scope обязателен для памяти и блокеров.",
                signals=["HostContext"],
                recommendedAction="Передать tenantId в HostContext.",
            ),
        )
    return blockers


def detect_missing_information_blockers(query_text: str, payload: dict) -> list[BlockerCandidate]:
    blockers: list[BlockerCandidate] = []
    normalized = normalize_decision_text(query_text)
    if any(marker in normalized for marker in ("сессия", "сессии", "диалог", "переписк")):
        if not str(payload.get("userId") or "").strip() or not str(payload.get("sessionId") or "").strip():
            blockers.append(
                BlockerCandidate(
                    blockerType=BlockerType.MISSING_INFORMATION,
                    title="Нет userId/sessionId для Session Memory",
                    severity=SEVERITY_MEDIUM,
                    reasoning="Вопрос о сессии без идентификаторов пользователя и сессии.",
                    signals=["Session Memory"],
                    recommendedAction="Передать userId и sessionId в HostContext.",
                ),
            )
    user_id = str(payload.get("userId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    tenant_id = _tenant_id(payload)
    if user_id and session_id and "итог" in normalized:
        session = load_session_memory(tenant_id, user_id, session_id)
        if not session.turns:
            blockers.append(
                BlockerCandidate(
                    blockerType=BlockerType.MISSING_INFORMATION,
                    title="Session Memory пуста",
                    severity=SEVERITY_LOW,
                    reasoning="Нет истории turns для анализа сессии.",
                    signals=["Session Memory"],
                    recommendedAction="Продолжить диалог или загрузить контекст сессии.",
                ),
            )
    return blockers


def detect_platform_dependency_blockers(
    done_keys: set[str],
    *,
    limit: int = 8,
) -> list[BlockerCandidate]:
    """Catalog + platform_tasks: WI blocked by unfinished depends_on."""
    blockers: list[BlockerCandidate] = []
    for item in YASII_WORK_ITEMS:
        if item.key in done_keys:
            continue
        if _dependencies_satisfied(item, done_keys):
            continue
        missing = [
            dep
            for dep in item.depends_on
            if dep not in done_keys and not str(dep).startswith("MVP")
        ]
        if not missing:
            continue
        primary = missing[0]
        dep_item = work_item_by_key(primary)
        dep_title = dep_item.title if dep_item else primary
        severity = SEVERITY_HIGH if item.key in YASII_CRITICAL_PATH else SEVERITY_MEDIUM
        blockers.append(
            BlockerCandidate(
                blockerType=BlockerType.MISSING_DEPENDENCY,
                title=f"{item.key} {item.title}",
                severity=severity,
                reasoning=(
                    f"Развитие платформы удерживает незакрытая зависимость {primary} ({dep_title}): "
                    f"{item.key} нельзя завершить по yasii_catalog."
                ),
                signals=["yasii_catalog.depends_on", "platform_tasks"],
                recommendedAction=f"Закрыть {primary} ({dep_title}) в Dashboard и пройти analyzer.",
            ),
        )

    severity_order = {SEVERITY_HIGH: 0, SEVERITY_MEDIUM: 1, SEVERITY_LOW: 2}
    blockers.sort(
        key=lambda row: (
            severity_order.get(row.severity, 9),
            0 if row.title.split()[0] in YASII_CRITICAL_PATH else 1,
            row.title,
        ),
    )
    return blockers[:limit]


def merge_blocker_assessments(*assessments: BlockerAssessment) -> BlockerAssessment:
    merged: list[BlockerCandidate] = []
    seen_titles: set[str] = set()
    for assessment in assessments:
        for blocker in assessment.blockers:
            key = blocker.title.casefold()
            if key in seen_titles:
                continue
            seen_titles.add(key)
            merged.append(blocker)

    severity_order = {SEVERITY_HIGH: 0, SEVERITY_MEDIUM: 1, SEVERITY_LOW: 2}
    merged.sort(key=lambda item: (severity_order.get(item.severity, 9), item.title))
    if not merged:
        summary = "Критических блокеров не обнаружено."
    else:
        summary = f"Найдено блокеров: {len(merged)}."
    return BlockerAssessment(blockers=merged, summary=summary)


def build_blocker_assessment(tenant_id: str, query_text: str, payload: dict) -> BlockerAssessment:
    blockers: list[BlockerCandidate] = []

    conflict = detect_decision_conflict_blocker(tenant_id, query_text)
    if conflict:
        blockers.append(conflict)

    missing_decision = detect_missing_decision_blocker(tenant_id, query_text)
    if missing_decision:
        blockers.append(missing_decision)

    blockers.extend(detect_missing_dependency_blockers(query_text, payload))

    goal_conflict = detect_goal_conflict_blocker(tenant_id, query_text, payload)
    if goal_conflict:
        blockers.append(goal_conflict)

    blockers.extend(detect_process_gap_blockers(tenant_id, payload))
    blockers.extend(detect_missing_context_blockers(payload))
    blockers.extend(detect_missing_information_blockers(query_text, payload))

    severity_order = {SEVERITY_HIGH: 0, SEVERITY_MEDIUM: 1, SEVERITY_LOW: 2}
    blockers.sort(key=lambda item: (severity_order.get(item.severity, 9), item.title))

    if not blockers:
        summary = "Критических блокеров не обнаружено."
    else:
        summary = f"Найдено блокеров: {len(blockers)}."

    return BlockerAssessment(blockers=blockers, summary=summary)


def format_blocker_message(assessment: BlockerAssessment, *, header: str | None = None) -> str:
    title = header or "Blocker Detection (что мешает прогрессу):"
    lines = [title, assessment.summary, ""]
    if not assessment.blockers:
        lines.append("Критических блокеров не обнаружено. Можно опираться на Unlock Ranking для приоритетов.")
        lines.append("")
        lines.append("ЯСИИ описывает препятствия без автоматических действий.")
        return "\n".join(lines)

    type_labels = {
        BlockerType.DECISION_CONFLICT: "Decision Conflict",
        BlockerType.MISSING_DECISION: "Missing Decision",
        BlockerType.MISSING_DEPENDENCY: "Missing Dependency",
        BlockerType.MISSING_CONTEXT: "Missing Context",
        BlockerType.MISSING_INFORMATION: "Missing Information",
        BlockerType.GOAL_CONFLICT: "Goal Conflict",
        BlockerType.PROCESS_GAP: "Process Gap",
    }
    for index, blocker in enumerate(assessment.blockers[:8], start=1):
        type_label = type_labels.get(blocker.blockerType, blocker.blockerType.value)
        lines.append(f"{index}. {type_label} — {blocker.title} [{blocker.severity}]")
        lines.append(f"   {blocker.reasoning}")
        if blocker.signals:
            lines.append("   Сигналы: " + "; ".join(blocker.signals))
        if blocker.recommendedAction:
            lines.append(f"   Рекомендация: {blocker.recommendedAction}")
        lines.append("")

    lines.append("ЯСИИ описывает препятствия без автоматических действий.")
    return "\n".join(lines)
