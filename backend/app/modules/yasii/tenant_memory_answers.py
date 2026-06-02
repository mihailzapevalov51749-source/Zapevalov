"""Tenant Memory command handling for embedded/runtime queries (P8-W02)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.tenant_memory_store import (
    delete_tenant_memory_facts,
    find_tenant_memory_facts_by_term,
    list_tenant_memory_facts,
    normalize_tenant_memory_text,
    save_tenant_memory_fact,
)

SAVE_COMMAND_PREFIXES = (
    "запомни для компании",
    "сохрани для компании",
    "добавь в память компании",
)

LIST_COMMAND_KEYWORDS = (
    "что ты знаешь о компании",
    "что сохранено для компании",
    "покажи память компании",
)

DELETE_COMMAND_PREFIXES = (
    "забудь для компании",
    "удали из памяти компании",
)

LOOKUP_COMMAND_PREFIXES = (
    "что означает",
    "что такое",
)

TENANT_MEMORY_SAVED_MESSAGE = "Информация сохранена в памяти компании."
TENANT_MEMORY_DELETED_MESSAGE = "Информация удалена из памяти компании."
TENANT_MEMORY_NOT_FOUND_MESSAGE = "Не нашёл эту запись в памяти компании."
TENANT_MEMORY_EMPTY_MESSAGE = (
    "Пока в памяти компании нет сохранённых фактов. "
    "Скажите «Запомни для компании …», чтобы добавить запись."
)
TENANT_MEMORY_SCOPE_REQUIRED_MESSAGE = (
    "Чтобы работать с памятью компании, нужен tenantId в HostContext."
)


@dataclass(frozen=True)
class TenantMemoryCommandResult:
    message: str
    memory_saved: bool = False
    memory_deleted: bool = False
    memory_loaded: bool = False


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _extract_tenant_id(payload: dict) -> str | None:
    tenant_id = str(payload.get("tenantId") or "").strip()
    if not tenant_id:
        return None
    return tenant_id


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
    facts = list_tenant_memory_facts(tenant_id)
    if not facts:
        return TENANT_MEMORY_EMPTY_MESSAGE

    lines = ["Вот что сохранено для компании:"]
    for fact in facts:
        lines.append(f"• {fact.text}")
    return "\n".join(lines)


def _resolve_lookup_message(original: str, normalized: str, tenant_id: str) -> str | None:
    for prefix in LOOKUP_COMMAND_PREFIXES:
        if not normalized.startswith(f"{prefix} "):
            continue
        marker = f"{prefix} "
        index = original.casefold().find(marker)
        if index < 0:
            continue
        term = original[index + len(marker) :].strip().strip("?.!")
        if not term:
            return "Уточните термин. Например: «Что означает СДС?»"
        matches = find_tenant_memory_facts_by_term(tenant_id, term)
        if not matches:
            return f"В памяти компании нет записи о «{term}»."
        if len(matches) == 1:
            return f"Из памяти компании:\n{matches[0].text}"
        lines = [f"В памяти компании есть несколько записей о «{term}»:"]
        for fact in matches:
            lines.append(f"• {fact.text}")
        return "\n".join(lines)
    return None


def is_tenant_memory_command(query_text: str) -> bool:
    from app.modules.yasii.decision_memory_answers import is_decision_memory_command
    from app.modules.yasii.memory_graph_answers import is_memory_graph_command
    from app.modules.yasii.session_memory_answers import is_session_memory_command

    if (
        is_decision_memory_command(query_text)
        or is_memory_graph_command(query_text)
        or is_session_memory_command(query_text)
    ):
        return False

    normalized = _normalize_query(query_text)
    if not normalized:
        return False
    if any(keyword in normalized for keyword in LIST_COMMAND_KEYWORDS):
        return True
    if _strip_command_prefix(query_text, normalized, SAVE_COMMAND_PREFIXES) is not None:
        return True
    if _strip_command_prefix(query_text, normalized, DELETE_COMMAND_PREFIXES) is not None:
        return True
    return any(normalized.startswith(f"{prefix} ") for prefix in LOOKUP_COMMAND_PREFIXES)


def resolve_tenant_memory_command(query_text: str, payload: dict) -> TenantMemoryCommandResult | None:
    from app.modules.yasii.decision_memory_answers import is_decision_memory_command
    from app.modules.yasii.session_memory_answers import is_session_memory_command

    original = str(query_text or "").strip()
    normalized = _normalize_query(original)
    if not normalized:
        return None

    if is_decision_memory_command(original) or is_session_memory_command(original):
        return None

    tenant_id = _extract_tenant_id(payload)
    is_list = any(keyword in normalized for keyword in LIST_COMMAND_KEYWORDS)
    save_payload = _strip_command_prefix(original, normalized, SAVE_COMMAND_PREFIXES)
    delete_payload = _strip_command_prefix(original, normalized, DELETE_COMMAND_PREFIXES)
    lookup_message = _resolve_lookup_message(original, normalized, tenant_id or "")

    if (
        save_payload is None
        and delete_payload is None
        and not is_list
        and lookup_message is None
    ):
        return None

    if tenant_id is None:
        return TenantMemoryCommandResult(message=TENANT_MEMORY_SCOPE_REQUIRED_MESSAGE)

    if save_payload is not None:
        if not save_payload:
            return TenantMemoryCommandResult(
                message=(
                    "Уточните, что сохранить. "
                    "Например: «Запомни для компании: СДС означает Служба дирекции строительства.»"
                ),
                memory_loaded=True,
            )
        save_tenant_memory_fact(tenant_id, save_payload)
        return TenantMemoryCommandResult(
            message=TENANT_MEMORY_SAVED_MESSAGE,
            memory_saved=True,
            memory_loaded=True,
        )

    if delete_payload is not None:
        if not delete_payload:
            return TenantMemoryCommandResult(
                message=(
                    "Уточните, что удалить. "
                    "Например: «Забудь для компании: СДС означает …»"
                ),
                memory_loaded=True,
            )
        removed = delete_tenant_memory_facts(tenant_id, delete_payload)
        if removed:
            return TenantMemoryCommandResult(
                message=TENANT_MEMORY_DELETED_MESSAGE,
                memory_deleted=True,
                memory_loaded=True,
            )
        return TenantMemoryCommandResult(message=TENANT_MEMORY_NOT_FOUND_MESSAGE, memory_loaded=True)

    if is_list:
        return TenantMemoryCommandResult(
            message=_build_list_message(tenant_id),
            memory_loaded=True,
        )

    if lookup_message is not None:
        return TenantMemoryCommandResult(message=lookup_message, memory_loaded=True)

    return None


def resolve_tenant_memory_message(query_text: str, payload: dict) -> str | None:
    result = resolve_tenant_memory_command(query_text, payload)
    if result is None:
        return None
    return result.message
