"""Session Memory command handling for embedded/runtime queries (P8-W04)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.session_memory_store import (
    build_session_context_message,
    build_session_decisions_message,
    build_session_summary_message,
    clear_session_memory,
    load_session_memory,
)
from app.modules.yasii.tenant_memory_answers import is_tenant_memory_command

CONTEXT_COMMAND_KEYWORDS = (
    "о чём мы сейчас говорим",
    "что обсуждали ранее",
    "напомни текущий контекст",
    "что происходит в этой сессии",
    "о чём мы говорили",
    "о чем мы говорили",
)

SUMMARY_COMMAND_KEYWORDS = (
    "подведи итог текущей сессии",
    "что мы сделали сегодня",
    "какие решения приняли",
)

DECISION_COMMAND_KEYWORDS = (
    "что мы решили сегодня",
    "какие решения приняли",
)

CLEAR_COMMAND_KEYWORDS = (
    "очистить память сессии",
    "начать новую сессию",
    "сбросить текущий контекст",
)

SESSION_MEMORY_CLEARED_MESSAGE = "Память текущей сессии очищена."
SESSION_MEMORY_SCOPE_REQUIRED_MESSAGE = (
    "Чтобы работать с памятью сессии, нужны tenantId, userId и sessionId в HostContext."
)


@dataclass(frozen=True)
class SessionMemoryCommandResult:
    message: str
    memory_loaded: bool = False
    memory_updated: bool = False
    memory_cleared: bool = False
    summary_generated: bool = False


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _extract_session_scope(payload: dict) -> tuple[str, str, str] | None:
    tenant_id = str(payload.get("tenantId") or "").strip() or "default-tenant"
    user_id = str(payload.get("userId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    if not user_id or not session_id:
        return None
    return tenant_id, user_id, session_id


def is_session_memory_command(query_text: str) -> bool:
    from app.modules.yasii.decision_memory_answers import is_decision_memory_command
    from app.modules.yasii.memory_graph_answers import is_memory_graph_command

    if is_decision_memory_command(query_text) or is_memory_graph_command(query_text):
        return False

    normalized = _normalize_query(query_text)
    if not normalized:
        return False
    keyword_groups = (
        CONTEXT_COMMAND_KEYWORDS,
        SUMMARY_COMMAND_KEYWORDS,
        DECISION_COMMAND_KEYWORDS,
        CLEAR_COMMAND_KEYWORDS,
    )
    return any(
        keyword in normalized
        for group in keyword_groups
        for keyword in group
    )


def should_skip_session_recording(query_text: str) -> bool:
    from app.modules.yasii.decision_memory_answers import is_decision_memory_command
    from app.modules.yasii.memory_graph_answers import is_memory_graph_command

    if (
        is_decision_memory_command(query_text)
        or is_memory_graph_command(query_text)
        or is_session_memory_command(query_text)
        or is_tenant_memory_command(query_text)
    ):
        return True

    normalized = _normalize_query(query_text)
    if "для компании" in normalized or "память компании" in normalized:
        return True

    user_only_phrases = (
        "что ты обо мне помнишь",
        "что сохранено в памяти",
        "покажи память пользователя",
    )
    if any(phrase in normalized for phrase in user_only_phrases):
        return True

    if normalized.startswith(("запомни,", "запомни что", "сохрани,", "сохрани что")):
        return True
    if normalized.startswith(("забудь", "удали из памяти", "добавь в память")):
        return True
    if "решение" in normalized and any(
        marker in normalized
        for marker in (
            "запомни решение",
            "сохрани решение",
            "добавь решение",
            "отмени решение",
            "покажи решения",
            "какие решения",
        )
    ):
        return True
    return False


def resolve_session_memory_command(query_text: str, payload: dict) -> SessionMemoryCommandResult | None:
    normalized = _normalize_query(query_text)
    if not normalized or not is_session_memory_command(query_text):
        return None

    scope = _extract_session_scope(payload)
    if scope is None:
        return SessionMemoryCommandResult(message=SESSION_MEMORY_SCOPE_REQUIRED_MESSAGE)

    tenant_id, user_id, session_id = scope
    state = load_session_memory(tenant_id, user_id, session_id)

    if any(keyword in normalized for keyword in CLEAR_COMMAND_KEYWORDS):
        clear_session_memory(tenant_id, user_id, session_id)
        return SessionMemoryCommandResult(
            message=SESSION_MEMORY_CLEARED_MESSAGE,
            memory_loaded=True,
            memory_cleared=True,
        )

    if any(keyword in normalized for keyword in DECISION_COMMAND_KEYWORDS):
        return SessionMemoryCommandResult(
            message=build_session_decisions_message(state),
            memory_loaded=True,
        )

    if any(keyword in normalized for keyword in SUMMARY_COMMAND_KEYWORDS):
        return SessionMemoryCommandResult(
            message=build_session_summary_message(state),
            memory_loaded=True,
            summary_generated=True,
        )

    if any(keyword in normalized for keyword in CONTEXT_COMMAND_KEYWORDS):
        return SessionMemoryCommandResult(
            message=build_session_context_message(state),
            memory_loaded=True,
        )

    return None


def resolve_session_memory_message(query_text: str, payload: dict) -> str | None:
    result = resolve_session_memory_command(query_text, payload)
    if result is None:
        return None
    return result.message
