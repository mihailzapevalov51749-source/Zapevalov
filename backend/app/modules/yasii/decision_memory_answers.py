"""Decision Memory command handling for embedded/runtime queries (P8-W03)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.decision_memory_store import (
    deactivate_decision_records,
    detect_decision_conflict,
    find_relevant_decisions_for_query,
    list_decision_records,
    save_decision_record,
    search_decision_records,
)

SAVE_COMMAND_PREFIXES = (
    "запомни решение",
    "сохрани решение",
    "добавь решение",
)

LIST_COMMAND_KEYWORDS = (
    "какие решения мы приняли",
    "покажи решения",
    "что было решено",
    "какие активные решения",
    "какие решения существуют",
)

SEARCH_COMMAND_PREFIXES = (
    "что мы решили по",
    "есть ли решение по",
)

DEACTIVATE_COMMAND_PREFIXES = (
    "отмени решение",
    "пометь решение как устаревшее",
    "решение больше не действует",
)

DECISION_SAVED_MESSAGE = "Решение сохранено в Decision Memory."
DECISION_DEACTIVATED_MESSAGE = "Решение помечено как неактивное."
DECISION_NOT_FOUND_MESSAGE = "Не нашёл подходящее активное решение."
DECISION_EMPTY_MESSAGE = "Пока нет сохранённых решений. Используйте «Запомни решение: …»."
DECISION_SCOPE_REQUIRED_MESSAGE = "Чтобы работать с Decision Memory, нужен tenantId в HostContext."


@dataclass(frozen=True)
class DecisionMemoryCommandResult:
    message: str
    decision_saved: bool = False
    decision_updated: bool = False
    decision_loaded: bool = False
    decision_conflict_detected: bool = False


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _extract_tenant_scope(payload: dict) -> tuple[str, str | None, str | None]:
    tenant_id = str(payload.get("tenantId") or "").strip() or "default-tenant"
    user_id = str(payload.get("userId") or "").strip() or None
    session_id = str(payload.get("sessionId") or "").strip() or None
    return tenant_id, user_id, session_id


def _strip_command_prefix(original: str, normalized: str, prefixes: tuple[str, ...]) -> str | None:
    original_trimmed = str(original or "").strip()
    for prefix in prefixes:
        if normalized == prefix:
            return ""
        for separator in (",", ":", " "):
            marker = f"{prefix}{separator}"
            if not normalized.startswith(marker):
                continue
            index = original_trimmed.casefold().find(marker)
            if index >= 0:
                return original_trimmed[index + len(marker) :].strip()
    return None


def _build_list_message(tenant_id: str) -> str:
    records = list_decision_records(tenant_id)
    if not records:
        return DECISION_EMPTY_MESSAGE

    lines = ["Активные решения:"]
    for record in records:
        lines.append(f"• [{record.decisionId}] {record.decisionText}")
    return "\n".join(lines)


def _build_search_message(tenant_id: str, query_text: str) -> str:
    records = search_decision_records(tenant_id, query_text)
    if not records:
        return DECISION_NOT_FOUND_MESSAGE

    lines = ["Найденные решения:"]
    for record in records:
        lines.append(f"• [{record.status}] {record.decisionText}")
    return "\n".join(lines)


def is_decision_memory_command(query_text: str) -> bool:
    normalized = _normalize_query(query_text)
    if not normalized:
        return False
    if any(keyword in normalized for keyword in LIST_COMMAND_KEYWORDS):
        return True
    if _strip_command_prefix(query_text, normalized, SAVE_COMMAND_PREFIXES) is not None:
        return True
    if _strip_command_prefix(query_text, normalized, DEACTIVATE_COMMAND_PREFIXES) is not None:
        return True
    return any(normalized.startswith(prefix) for prefix in SEARCH_COMMAND_PREFIXES)


def resolve_decision_memory_command(query_text: str, payload: dict) -> DecisionMemoryCommandResult | None:
    from app.modules.yasii.memory_graph_answers import is_memory_graph_command
    from app.modules.yasii.user_identity_answers import is_user_identity_command

    original = str(query_text or "").strip()
    normalized = _normalize_query(original)
    if not normalized:
        return None

    from app.modules.yasii.strategy_answers import is_strategy_command
    from app.modules.yasii.blocker_answers import is_blocker_command
    from app.modules.yasii.unlock_score_answers import is_unlock_command

    if (
        is_memory_graph_command(original)
        or is_user_identity_command(original)
        or is_blocker_command(original)
        or is_unlock_command(original)
        or is_strategy_command(original, payload)
    ):
        return None

    tenant_id, user_id, session_id = _extract_tenant_scope(payload)
    if not tenant_id:
        return DecisionMemoryCommandResult(message=DECISION_SCOPE_REQUIRED_MESSAGE)

    save_payload = _strip_command_prefix(original, normalized, SAVE_COMMAND_PREFIXES)
    deactivate_payload = _strip_command_prefix(original, normalized, DEACTIVATE_COMMAND_PREFIXES)
    is_list = any(keyword in normalized for keyword in LIST_COMMAND_KEYWORDS)
    is_search = any(normalized.startswith(prefix) for prefix in SEARCH_COMMAND_PREFIXES)

    if save_payload is None and deactivate_payload is None and not is_list and not is_search:
        conflict = detect_decision_conflict(tenant_id, original)
        if conflict:
            return DecisionMemoryCommandResult(
                message=conflict,
                decision_loaded=True,
                decision_conflict_detected=True,
            )

        if any(token in normalized for token in ("нужно ли", "стоит ли", "создадим", "сделаем", "отдельный")):
            relevant = find_relevant_decisions_for_query(tenant_id, original)
            if relevant:
                lines = ["Учитываю ранее принятое решение:"]
                for record in relevant[:3]:
                    lines.append(f"• {record.decisionText}")
                return DecisionMemoryCommandResult(
                    message="\n".join(lines),
                    decision_loaded=True,
                )
        return None

    if save_payload is not None:
        if not save_payload:
            return DecisionMemoryCommandResult(
                message="Уточните текст решения. Например: «Запомни решение: Мы решили …»",
                decision_loaded=True,
            )
        record = save_decision_record(
            tenant_id,
            save_payload,
            user_id=user_id,
            session_id=session_id,
        )
        from app.modules.yasii.memory_graph import sync_decision_graph_links

        process_id = str(payload.get("processId") or "").strip() or None
        sync_decision_graph_links(tenant_id, record, process_id=process_id)
        return DecisionMemoryCommandResult(
            message=DECISION_SAVED_MESSAGE,
            decision_saved=True,
            decision_loaded=True,
        )

    if deactivate_payload is not None:
        if not deactivate_payload:
            return DecisionMemoryCommandResult(
                message="Уточните, какое решение отменить.",
                decision_loaded=True,
            )
        updated = deactivate_decision_records(tenant_id, deactivate_payload)
        if updated:
            return DecisionMemoryCommandResult(
                message=DECISION_DEACTIVATED_MESSAGE,
                decision_updated=True,
                decision_loaded=True,
            )
        return DecisionMemoryCommandResult(message=DECISION_NOT_FOUND_MESSAGE, decision_loaded=True)

    if is_list:
        return DecisionMemoryCommandResult(
            message=_build_list_message(tenant_id),
            decision_loaded=True,
        )

    if is_search:
        topic = original
        for prefix in SEARCH_COMMAND_PREFIXES:
            index = normalized.find(prefix)
            if index >= 0:
                topic = original[index + len(prefix) :].strip(" :?.!")
                break
        return DecisionMemoryCommandResult(
            message=_build_search_message(tenant_id, topic),
            decision_loaded=True,
        )

    return None


def resolve_decision_memory_message(query_text: str, payload: dict) -> str | None:
    result = resolve_decision_memory_command(query_text, payload)
    if result is None:
        return None
    return result.message
