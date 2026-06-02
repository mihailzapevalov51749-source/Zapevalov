"""User Memory command handling for embedded/runtime queries (P8-W01)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.decision_memory_answers import is_decision_memory_command
from app.modules.yasii.memory_graph_answers import is_memory_graph_command
from app.modules.yasii.session_memory_answers import is_session_memory_command
from app.modules.yasii.tenant_memory_answers import is_tenant_memory_command
from app.modules.yasii.user_identity_answers import is_user_identity_command
from app.modules.yasii.user_memory_store import (
    delete_user_memory_facts,
    list_user_memory_facts,
    save_user_memory_fact,
)

SAVE_COMMAND_PREFIXES = (
    "запомни",
    "сохрани",
    "добавь в память",
)

LIST_COMMAND_KEYWORDS = (
    "что ты обо мне помнишь",
    "что сохранено в памяти",
    "покажи память пользователя",
)

DELETE_COMMAND_PREFIXES = (
    "забудь",
    "удали из памяти",
)

MEMORY_SAVED_MESSAGE = "Информация сохранена в памяти."
MEMORY_DELETED_MESSAGE = "Информация удалена из памяти."
MEMORY_NOT_FOUND_MESSAGE = "Не нашёл эту запись в памяти."
MEMORY_EMPTY_MESSAGE = "Пока я не сохранил о вас ни одного факта. Скажите «Запомни …», чтобы добавить запись."
MEMORY_SCOPE_REQUIRED_MESSAGE = (
    "Чтобы работать с памятью пользователя, нужен идентификатор пользователя в HostContext."
)


@dataclass(frozen=True)
class UserMemoryCommandResult:
    message: str
    memory_saved: bool = False
    memory_deleted: bool = False
    memory_loaded: bool = False


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _extract_scope(payload: dict) -> tuple[str, str] | None:
    user_id = str(payload.get("userId") or "").strip()
    tenant_id = str(payload.get("tenantId") or "").strip() or "default-tenant"
    if not user_id:
        return None
    return tenant_id, user_id


def _strip_command_prefix(original: str, normalized: str, prefixes: tuple[str, ...]) -> str | None:
    original_trimmed = str(original or "").strip()
    for prefix in prefixes:
        if normalized == prefix:
            return ""
        if normalized.startswith(f"{prefix},"):
            marker = f"{prefix},"
            index = original_trimmed.casefold().find(marker)
            if index >= 0:
                return original_trimmed[index + len(marker) :].strip()
        if normalized.startswith(f"{prefix} "):
            marker = f"{prefix} "
            index = original_trimmed.casefold().find(marker)
            if index >= 0:
                return original_trimmed[index + len(marker) :].strip()
    return None


def _build_list_message(tenant_id: str, user_id: str) -> str:
    facts = list_user_memory_facts(tenant_id, user_id)
    if not facts:
        return MEMORY_EMPTY_MESSAGE

    lines = ["Вот что я помню о вас:"]
    for fact in facts:
        lines.append(f"• {fact.text}")
    return "\n".join(lines)


def resolve_user_memory_command(query_text: str, payload: dict) -> UserMemoryCommandResult | None:
    original = str(query_text or "").strip()
    normalized = _normalize_query(original)
    if not normalized:
        return None

    if (
        is_user_identity_command(original)
        or is_decision_memory_command(original)
        or is_memory_graph_command(original)
        or is_session_memory_command(original)
        or is_tenant_memory_command(original)
    ):
        return None

    scope = _extract_scope(payload)
    is_list = any(keyword in normalized for keyword in LIST_COMMAND_KEYWORDS)
    save_payload = _strip_command_prefix(original, normalized, SAVE_COMMAND_PREFIXES)
    delete_payload = _strip_command_prefix(original, normalized, DELETE_COMMAND_PREFIXES)

    if save_payload is None and delete_payload is None and not is_list:
        return None

    if scope is None:
        return UserMemoryCommandResult(message=MEMORY_SCOPE_REQUIRED_MESSAGE)

    tenant_id, user_id = scope

    if save_payload is not None:
        if not save_payload:
            return UserMemoryCommandResult(
                message="Уточните, что сохранить. Например: «Запомни, что меня зовут Михаил.»",
                memory_loaded=True,
            )
        save_user_memory_fact(tenant_id, user_id, save_payload)
        return UserMemoryCommandResult(
            message=MEMORY_SAVED_MESSAGE,
            memory_saved=True,
            memory_loaded=True,
        )

    if delete_payload is not None:
        if not delete_payload:
            return UserMemoryCommandResult(
                message="Уточните, что удалить. Например: «Забудь, что меня зовут Михаил.»",
                memory_loaded=True,
            )
        removed = delete_user_memory_facts(tenant_id, user_id, delete_payload)
        if removed:
            return UserMemoryCommandResult(
                message=MEMORY_DELETED_MESSAGE,
                memory_deleted=True,
                memory_loaded=True,
            )
        return UserMemoryCommandResult(message=MEMORY_NOT_FOUND_MESSAGE, memory_loaded=True)

    if is_list:
        return UserMemoryCommandResult(
            message=_build_list_message(tenant_id, user_id),
            memory_loaded=True,
        )

    return None


def resolve_user_memory_message(query_text: str, payload: dict) -> str | None:
    result = resolve_user_memory_command(query_text, payload)
    if result is None:
        return None
    return result.message
