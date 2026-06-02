"""Ephemeral Session Memory store scoped by tenantId + userId + sessionId (P8-W04)."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

SESSION_MEMORY_SCHEMA_VERSION = "0.1.0"
SESSION_MEMORY_ENTRY_TYPE = "session_turn"
MAX_SESSION_TURNS = 40
MAX_SESSION_TOPICS = 20

_SESSION_REGISTRY: dict[str, "SessionMemoryState"] = {}


@dataclass
class SessionTurn:
    turnId: str
    role: str
    text: str
    hostSurface: str | None = None
    createdAt: str = ""


@dataclass
class SessionMemoryState:
    schemaVersion: str = SESSION_MEMORY_SCHEMA_VERSION
    tenantId: str = ""
    userId: str = ""
    sessionId: str = ""
    turns: list[SessionTurn] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    decisions: list[str] = field(default_factory=list)
    facts: list[str] = field(default_factory=list)
    updatedAt: str | None = None


def clear_session_memory_store() -> None:
    """Test helper — reset in-memory session store."""
    _SESSION_REGISTRY.clear()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def session_scope_key(tenant_id: str, user_id: str, session_id: str) -> str:
    tenant = str(tenant_id or "default-tenant").strip() or "default-tenant"
    user = str(user_id or "").strip() or "anonymous"
    session = str(session_id or "").strip() or "anonymous-session"
    return f"{tenant}::{user}::{session}"


def get_session_memory(tenant_id: str, user_id: str, session_id: str) -> SessionMemoryState | None:
    return _SESSION_REGISTRY.get(session_scope_key(tenant_id, user_id, session_id))


def load_session_memory(tenant_id: str, user_id: str, session_id: str) -> SessionMemoryState:
    key = session_scope_key(tenant_id, user_id, session_id)
    state = _SESSION_REGISTRY.get(key)
    if state is None:
        state = SessionMemoryState(
            tenantId=str(tenant_id or "").strip(),
            userId=str(user_id or "").strip(),
            sessionId=str(session_id or "").strip(),
        )
        _SESSION_REGISTRY[key] = state
    return state


def clear_session_memory(tenant_id: str, user_id: str, session_id: str) -> None:
    _SESSION_REGISTRY.pop(session_scope_key(tenant_id, user_id, session_id), None)


def _append_unique(items: list[str], value: str, *, limit: int) -> bool:
    normalized = str(value or "").strip()
    if not normalized:
        return False
    if any(existing.casefold() == normalized.casefold() for existing in items):
        return False
    items.append(normalized)
    if len(items) > limit:
        del items[0 : len(items) - limit]
    return True


def _infer_topic_from_user_text(text: str, host_surface: str | None) -> str | None:
    normalized = re.sub(r"\s+", " ", str(text or "").strip())
    if not normalized:
        return None
    if len(normalized) < 8:
        return None

    surface = str(host_surface or "").strip()
    if surface:
        return f"Обсуждение на поверхности «{surface}»: {normalized[:180]}"
    return f"Обсуждение: {normalized[:200]}"


def _infer_decision_from_user_text(text: str) -> str | None:
    normalized = re.sub(r"\s+", " ", str(text or "").strip())
    if not normalized:
        return None
    markers = (
        "решили",
        "приняли решение",
        "договорились",
        "согласовали",
        "утвердили",
    )
    if not any(marker in normalized.casefold() for marker in markers):
        return None
    return f"Решение сессии: {normalized[:220]}"


def record_session_exchange(
    tenant_id: str,
    user_id: str,
    session_id: str,
    *,
    user_text: str,
    assistant_text: str,
    host_surface: str | None = None,
) -> SessionMemoryState:
    state = load_session_memory(tenant_id, user_id, session_id)
    now = _utc_now_iso()

    user_message = str(user_text or "").strip()
    assistant_message = str(assistant_text or "").strip()

    if user_message:
        state.turns.append(
            SessionTurn(
                turnId=f"st-{uuid.uuid4().hex[:10]}",
                role="user",
                text=user_message,
                hostSurface=host_surface,
                createdAt=now,
            ),
        )
        decision = _infer_decision_from_user_text(user_message)
        if decision:
            _append_unique(state.decisions, decision, limit=MAX_SESSION_TOPICS)
        else:
            topic = _infer_topic_from_user_text(user_message, host_surface)
            if topic:
                _append_unique(state.topics, topic, limit=MAX_SESSION_TOPICS)

    if assistant_message:
        state.turns.append(
            SessionTurn(
                turnId=f"st-{uuid.uuid4().hex[:10]}",
                role="yasii",
                text=assistant_message,
                hostSurface=host_surface,
                createdAt=now,
            ),
        )

    if len(state.turns) > MAX_SESSION_TURNS:
        state.turns = state.turns[-MAX_SESSION_TURNS:]

    state.updatedAt = now
    return state


def build_session_context_message(state: SessionMemoryState) -> str:
    if not state.turns and not state.topics and not state.decisions:
        return "В текущей сессии пока нет сохранённого контекста."

    lines = ["Контекст текущей сессии:"]

    if state.topics:
        lines.append("")
        lines.append("Темы обсуждения:")
        for topic in state.topics[-8:]:
            lines.append(f"• {topic}")

    if state.decisions:
        lines.append("")
        lines.append("Принятые решения:")
        for decision in state.decisions[-8:]:
            lines.append(f"• {decision}")

    recent_turns = [turn for turn in state.turns if turn.role == "user"][-5:]
    if recent_turns:
        lines.append("")
        lines.append("Недавние вопросы:")
        for turn in recent_turns:
            lines.append(f"• {turn.text}")

    return "\n".join(lines)


def build_session_summary_message(state: SessionMemoryState) -> str:
    if not state.turns and not state.topics and not state.decisions:
        return "В текущей сессии пока нечего подводить — контекст пуст."

    user_turns = [turn for turn in state.turns if turn.role == "user"]
    lines = [
        "Краткий итог текущей сессии:",
        f"• Сообщений в сессии: {len(state.turns)}",
        f"• Вопросов пользователя: {len(user_turns)}",
    ]

    if state.topics:
        lines.append("")
        lines.append("Что обсуждали:")
        for topic in state.topics[-6:]:
            lines.append(f"• {topic}")

    if state.decisions:
        lines.append("")
        lines.append("Какие решения приняли:")
        for decision in state.decisions[-6:]:
            lines.append(f"• {decision}")

    if user_turns:
        lines.append("")
        lines.append("Последний вопрос:")
        lines.append(f"• {user_turns[-1].text}")

    return "\n".join(lines)


def build_session_decisions_message(state: SessionMemoryState) -> str:
    if not state.decisions:
        return "В текущей сессии пока нет зафиксированных решений."

    lines = ["Решения текущей сессии:"]
    for decision in state.decisions:
        lines.append(f"• {decision}")
    return "\n".join(lines)
