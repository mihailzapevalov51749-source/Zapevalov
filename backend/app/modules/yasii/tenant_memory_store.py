"""Persistent Tenant Memory store scoped by tenantId only (P8-W02)."""

from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

TENANT_MEMORY_SCHEMA_VERSION = "0.1.0"
TENANT_MEMORY_ENTRY_TYPE = "tenant_fact"
TENANT_MEMORY_DATA_DIR_ENV = "YASII_TENANT_MEMORY_DIR"

_DATA_DIR_OVERRIDE: Path | None = None


@dataclass(frozen=True)
class TenantMemoryFact:
    entryId: str
    text: str
    createdAt: str
    entryType: str = TENANT_MEMORY_ENTRY_TYPE


def set_tenant_memory_data_dir(path: Path | str | None) -> None:
    """Test helper — redirect persistence root."""
    global _DATA_DIR_OVERRIDE
    if path is None:
        _DATA_DIR_OVERRIDE = None
        return
    _DATA_DIR_OVERRIDE = Path(path)


def clear_tenant_memory_store() -> None:
    """Test helper — remove all persisted tenant memory files."""
    root = _memory_root()
    if not root.exists():
        return
    for file_path in root.glob("*.json"):
        file_path.unlink(missing_ok=True)


def _memory_root() -> Path:
    if _DATA_DIR_OVERRIDE is not None:
        root = _DATA_DIR_OVERRIDE
    else:
        env_path = os.environ.get(TENANT_MEMORY_DATA_DIR_ENV, "").strip()
        if env_path:
            root = Path(env_path)
        else:
            root = Path(__file__).resolve().parents[3] / "data" / "yasii_tenant_memory"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _scope_key(tenant_id: str) -> str:
    tenant = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(tenant_id or "default-tenant").strip()) or "default-tenant"
    return f"tenant__{tenant}"


def _memory_file_path(tenant_id: str) -> Path:
    return _memory_root() / f"{_scope_key(tenant_id)}.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read_scope_file(tenant_id: str) -> list[TenantMemoryFact]:
    file_path = _memory_file_path(tenant_id)
    if not file_path.exists():
        return []

    raw = json.loads(file_path.read_text(encoding="utf-8"))
    facts: list[TenantMemoryFact] = []
    for item in raw.get("facts", []):
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        facts.append(
            TenantMemoryFact(
                entryId=str(item.get("entryId") or uuid.uuid4().hex),
                text=text,
                createdAt=str(item.get("createdAt") or _utc_now_iso()),
                entryType=str(item.get("entryType") or TENANT_MEMORY_ENTRY_TYPE),
            ),
        )
    return facts


def _write_scope_file(tenant_id: str, facts: list[TenantMemoryFact]) -> None:
    file_path = _memory_file_path(tenant_id)
    payload = {
        "schemaVersion": TENANT_MEMORY_SCHEMA_VERSION,
        "tenantId": str(tenant_id or "").strip(),
        "facts": [asdict(fact) for fact in facts],
        "updatedAt": _utc_now_iso(),
    }
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def save_tenant_memory_fact(tenant_id: str, text: str) -> TenantMemoryFact:
    normalized_text = str(text or "").strip()
    if not normalized_text:
        raise ValueError("tenant memory fact text is required")

    facts = _read_scope_file(tenant_id)
    for existing in facts:
        if existing.text.casefold() == normalized_text.casefold():
            return existing

    fact = TenantMemoryFact(
        entryId=f"tm-{uuid.uuid4().hex[:12]}",
        text=normalized_text,
        createdAt=_utc_now_iso(),
    )
    facts.append(fact)
    _write_scope_file(tenant_id, facts)
    return fact


def list_tenant_memory_facts(tenant_id: str) -> list[TenantMemoryFact]:
    return _read_scope_file(tenant_id)


def delete_tenant_memory_facts(tenant_id: str, query_text: str) -> list[TenantMemoryFact]:
    normalized_query = normalize_tenant_memory_text(query_text)
    if not normalized_query:
        return []

    facts = _read_scope_file(tenant_id)
    remaining: list[TenantMemoryFact] = []
    removed: list[TenantMemoryFact] = []

    for fact in facts:
        normalized_fact = normalize_tenant_memory_text(fact.text)
        if (
            normalized_query in normalized_fact
            or normalized_fact in normalized_query
            or _abbreviation_match_for_delete(normalized_query, normalized_fact)
        ):
            removed.append(fact)
        else:
            remaining.append(fact)

    if removed:
        _write_scope_file(tenant_id, remaining)
    return removed


def find_tenant_memory_facts_by_term(tenant_id: str, term: str) -> list[TenantMemoryFact]:
    normalized_term = normalize_tenant_memory_text(term)
    if not normalized_term:
        return []

    matches: list[TenantMemoryFact] = []
    for fact in list_tenant_memory_facts(tenant_id):
        normalized_fact = normalize_tenant_memory_text(fact.text)
        if normalized_term in normalized_fact:
            matches.append(fact)
    return matches


def normalize_tenant_memory_text(text: str) -> str:
    lowered = str(text or "").strip().casefold()
    lowered = re.sub(r"^что\s+", "", lowered)
    lowered = re.sub(r"^,\s*", "", lowered)
    return re.sub(r"\s+", " ", lowered).strip(" .,;:")


def _abbreviation_match_for_delete(query: str, fact: str) -> bool:
    abbrev_match = re.match(r"^([a-zа-яё0-9]+)\s+означает\s+", query)
    if abbrev_match:
        abbrev = abbrev_match.group(1)
        return abbrev in fact
    return False
