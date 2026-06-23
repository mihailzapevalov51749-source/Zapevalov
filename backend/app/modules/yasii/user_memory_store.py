"""Persistent User Memory store scoped by tenantId + userId (P8-W01)."""

from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.runtime_paths import get_yasii_store_dir

USER_MEMORY_SCHEMA_VERSION = "0.1.0"
USER_MEMORY_ENTRY_TYPE = "user_fact"
USER_MEMORY_DATA_DIR_ENV = "YASII_USER_MEMORY_DIR"

_DATA_DIR_OVERRIDE: Path | None = None


@dataclass(frozen=True)
class UserMemoryFact:
    entryId: str
    text: str
    createdAt: str
    entryType: str = USER_MEMORY_ENTRY_TYPE


def set_user_memory_data_dir(path: Path | str | None) -> None:
    """Test helper — redirect persistence root."""
    global _DATA_DIR_OVERRIDE
    if path is None:
        _DATA_DIR_OVERRIDE = None
        return
    _DATA_DIR_OVERRIDE = Path(path)


def clear_user_memory_store() -> None:
    """Test helper — remove all persisted user memory files."""
    root = _memory_root()
    if not root.exists():
        return
    for file_path in root.glob("*.json"):
        file_path.unlink(missing_ok=True)


def _memory_root() -> Path:
    if _DATA_DIR_OVERRIDE is not None:
        root = _DATA_DIR_OVERRIDE
    else:
        env_path = os.environ.get(USER_MEMORY_DATA_DIR_ENV, "").strip()
        if env_path:
            root = Path(env_path)
        else:
            root = get_yasii_store_dir(
                "yasii_user_memory",
                env_var=USER_MEMORY_DATA_DIR_ENV,
            )
    root.mkdir(parents=True, exist_ok=True)
    return root


def _scope_key(tenant_id: str, user_id: str) -> str:
    tenant = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(tenant_id or "default-tenant").strip()) or "default-tenant"
    user = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(user_id or "").strip()) or "anonymous"
    return f"{tenant}__{user}"


def _memory_file_path(tenant_id: str, user_id: str) -> Path:
    return _memory_root() / f"{_scope_key(tenant_id, user_id)}.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read_scope_file(tenant_id: str, user_id: str) -> list[UserMemoryFact]:
    file_path = _memory_file_path(tenant_id, user_id)
    if not file_path.exists():
        return []

    raw = json.loads(file_path.read_text(encoding="utf-8"))
    facts: list[UserMemoryFact] = []
    for item in raw.get("facts", []):
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        facts.append(
            UserMemoryFact(
                entryId=str(item.get("entryId") or uuid.uuid4().hex),
                text=text,
                createdAt=str(item.get("createdAt") or _utc_now_iso()),
                entryType=str(item.get("entryType") or USER_MEMORY_ENTRY_TYPE),
            ),
        )
    return facts


def _write_scope_file(tenant_id: str, user_id: str, facts: list[UserMemoryFact]) -> None:
    file_path = _memory_file_path(tenant_id, user_id)
    payload = {
        "schemaVersion": USER_MEMORY_SCHEMA_VERSION,
        "tenantId": str(tenant_id or "").strip(),
        "userId": str(user_id or "").strip(),
        "facts": [asdict(fact) for fact in facts],
        "updatedAt": _utc_now_iso(),
    }
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def save_user_memory_fact(tenant_id: str, user_id: str, text: str) -> UserMemoryFact:
    normalized_text = str(text or "").strip()
    if not normalized_text:
        raise ValueError("memory fact text is required")

    facts = _read_scope_file(tenant_id, user_id)
    for existing in facts:
        if existing.text.casefold() == normalized_text.casefold():
            return existing

    fact = UserMemoryFact(
        entryId=f"um-{uuid.uuid4().hex[:12]}",
        text=normalized_text,
        createdAt=_utc_now_iso(),
    )
    facts.append(fact)
    _write_scope_file(tenant_id, user_id, facts)
    return fact


def list_user_memory_facts(tenant_id: str, user_id: str) -> list[UserMemoryFact]:
    return _read_scope_file(tenant_id, user_id)


def delete_user_memory_facts(tenant_id: str, user_id: str, query_text: str) -> list[UserMemoryFact]:
    normalized_query = _normalize_memory_text(query_text)
    if not normalized_query:
        return []

    facts = _read_scope_file(tenant_id, user_id)
    remaining: list[UserMemoryFact] = []
    removed: list[UserMemoryFact] = []

    for fact in facts:
        normalized_fact = _normalize_memory_text(fact.text)
        if (
            normalized_query in normalized_fact
            or normalized_fact in normalized_query
            or _facts_match_for_delete(normalized_query, normalized_fact)
        ):
            removed.append(fact)
        else:
            remaining.append(fact)

    if removed:
        _write_scope_file(tenant_id, user_id, remaining)
    return removed


def _normalize_memory_text(text: str) -> str:
    lowered = str(text or "").strip().casefold()
    lowered = re.sub(r"^что\s+", "", lowered)
    lowered = re.sub(r"^,\s*", "", lowered)
    return re.sub(r"\s+", " ", lowered).strip(" .,;:")


def _facts_match_for_delete(query: str, fact: str) -> bool:
    name_match = re.search(r"меня зовут\s+(.+)$", query)
    if name_match:
        name = name_match.group(1).strip()
        return bool(name) and name in fact
    return False
