"""Persistent Decision Memory store scoped by tenantId (P8-W03)."""

from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.runtime_paths import get_yasii_store_dir

DECISION_MEMORY_SCHEMA_VERSION = "0.1.0"
DECISION_STATUS_ACTIVE = "active"
DECISION_STATUS_SUPERSEDED = "superseded"
DECISION_STATUS_CANCELLED = "cancelled"
DECISION_MEMORY_DATA_DIR_ENV = "YASII_DECISION_MEMORY_DIR"

_DATA_DIR_OVERRIDE: Path | None = None


@dataclass(frozen=True)
class DecisionRecord:
    decisionId: str
    title: str
    decisionText: str
    createdAt: str
    tenantId: str
    userId: str | None = None
    sessionId: str | None = None
    source: str = "explicit_command"
    status: str = DECISION_STATUS_ACTIVE


def set_decision_memory_data_dir(path: Path | str | None) -> None:
    global _DATA_DIR_OVERRIDE
    if path is None:
        _DATA_DIR_OVERRIDE = None
        return
    _DATA_DIR_OVERRIDE = Path(path)


def clear_decision_memory_store() -> None:
    root = _memory_root()
    if not root.exists():
        return
    for file_path in root.glob("*.json"):
        file_path.unlink(missing_ok=True)


def _memory_root() -> Path:
    if _DATA_DIR_OVERRIDE is not None:
        root = _DATA_DIR_OVERRIDE
    else:
        env_path = os.environ.get(DECISION_MEMORY_DATA_DIR_ENV, "").strip()
        if env_path:
            root = Path(env_path)
        else:
            root = get_yasii_store_dir(
                "yasii_decision_memory",
                env_var=DECISION_MEMORY_DATA_DIR_ENV,
            )
    root.mkdir(parents=True, exist_ok=True)
    return root


def _scope_key(tenant_id: str) -> str:
    tenant = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(tenant_id or "default-tenant").strip()) or "default-tenant"
    return f"tenant__{tenant}"


def _memory_file_path(tenant_id: str) -> Path:
    return _memory_root() / f"{_scope_key(tenant_id)}.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_decision_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _build_title(decision_text: str) -> str:
    cleaned = re.sub(r"\s+", " ", str(decision_text or "").strip())
    if not cleaned:
        return "Решение"
    lowered = cleaned.casefold()
    for prefix in ("мы решили", "решили", "было решено"):
        if lowered.startswith(prefix):
            cleaned = cleaned[len(prefix) :].strip(" :,.")
            break
    if len(cleaned) <= 80:
        return cleaned or "Решение"
    return f"{cleaned[:77]}..."


def _read_records(tenant_id: str) -> list[DecisionRecord]:
    file_path = _memory_file_path(tenant_id)
    if not file_path.exists():
        return []

    raw = json.loads(file_path.read_text(encoding="utf-8"))
    records: list[DecisionRecord] = []
    for item in raw.get("decisions", []):
        text = str(item.get("decisionText") or "").strip()
        if not text:
            continue
        records.append(
            DecisionRecord(
                decisionId=str(item.get("decisionId") or uuid.uuid4().hex),
                title=str(item.get("title") or _build_title(text)),
                decisionText=text,
                createdAt=str(item.get("createdAt") or _utc_now_iso()),
                tenantId=str(item.get("tenantId") or tenant_id),
                userId=str(item.get("userId")).strip() if item.get("userId") else None,
                sessionId=str(item.get("sessionId")).strip() if item.get("sessionId") else None,
                source=str(item.get("source") or "explicit_command"),
                status=str(item.get("status") or DECISION_STATUS_ACTIVE),
            ),
        )
    return records


def _write_records(tenant_id: str, records: list[DecisionRecord]) -> None:
    file_path = _memory_file_path(tenant_id)
    payload = {
        "schemaVersion": DECISION_MEMORY_SCHEMA_VERSION,
        "tenantId": str(tenant_id or "").strip(),
        "decisions": [asdict(record) for record in records],
        "updatedAt": _utc_now_iso(),
    }
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def save_decision_record(
    tenant_id: str,
    decision_text: str,
    *,
    user_id: str | None = None,
    session_id: str | None = None,
    source: str = "explicit_command",
) -> DecisionRecord:
    normalized_text = str(decision_text or "").strip()
    if not normalized_text:
        raise ValueError("decision text is required")

    records = _read_records(tenant_id)
    for existing in records:
        if (
            existing.status == DECISION_STATUS_ACTIVE
            and existing.decisionText.casefold() == normalized_text.casefold()
        ):
            return existing

    record = DecisionRecord(
        decisionId=f"dec-{uuid.uuid4().hex[:12]}",
        title=_build_title(normalized_text),
        decisionText=normalized_text,
        createdAt=_utc_now_iso(),
        tenantId=str(tenant_id or "").strip(),
        userId=str(user_id or "").strip() or None,
        sessionId=str(session_id or "").strip() or None,
        source=source,
        status=DECISION_STATUS_ACTIVE,
    )
    records.append(record)
    _write_records(tenant_id, records)
    return record


def list_decision_records(
    tenant_id: str,
    *,
    active_only: bool = True,
) -> list[DecisionRecord]:
    records = _read_records(tenant_id)
    if not active_only:
        return records
    return [record for record in records if record.status == DECISION_STATUS_ACTIVE]


def search_decision_records(tenant_id: str, query_text: str) -> list[DecisionRecord]:
    needle = normalize_decision_text(query_text)
    if not needle:
        return list_decision_records(tenant_id)

    matches: list[DecisionRecord] = []
    for record in list_decision_records(tenant_id):
        haystack = normalize_decision_text(f"{record.title} {record.decisionText}")
        if needle in haystack or any(token in haystack for token in needle.split() if len(token) >= 4):
            matches.append(record)
    return matches


def deactivate_decision_records(tenant_id: str, query_text: str) -> list[DecisionRecord]:
    needle = normalize_decision_text(query_text)
    if not needle:
        return []

    updated: list[DecisionRecord] = []
    records = _read_records(tenant_id)
    for index, record in enumerate(records):
        if record.status != DECISION_STATUS_ACTIVE:
            continue
        haystack = normalize_decision_text(f"{record.title} {record.decisionText}")
        if needle in haystack or haystack in needle:
            records[index] = DecisionRecord(
                decisionId=record.decisionId,
                title=record.title,
                decisionText=record.decisionText,
                createdAt=record.createdAt,
                tenantId=record.tenantId,
                userId=record.userId,
                sessionId=record.sessionId,
                source=record.source,
                status=DECISION_STATUS_CANCELLED,
            )
            updated.append(records[index])

    if updated:
        _write_records(tenant_id, records)
    return updated


CONFLICT_RULES: tuple[dict[str, tuple[str, ...]], ...] = (
    {
        "proposal_markers": (
            "отдельный dashboard",
            "отдельный dashboard yasii",
            "dashboard yasii",
            "создадим dashboard",
            "сделаем dashboard",
            "создать dashboard",
            "отдельный ясии",
            "второй ясии",
            "вторую ясии",
        ),
        "decision_markers": (
            "один ясии",
            "один yasii",
            "единый ясии",
            "на всю платформу",
            "единый цифровой сотрудник",
        ),
        "topic": "единый ЯСИИ на платформе",
    },
    {
        "proposal_markers": (
            "отдельный runtime",
            "второй runtime",
            "новый runtime",
            "отдельный memory chat",
            "отдельный чат",
        ),
        "decision_markers": (
            "один runtime",
            "единый runtime",
            "hostcontext",
            "ace handoff",
            "не создавать второй runtime",
        ),
        "topic": "единый runtime pipeline",
    },
)


def detect_decision_conflict(tenant_id: str, query_text: str) -> str | None:
    normalized_query = normalize_decision_text(query_text)
    if not normalized_query:
        return None

    active_records = list_decision_records(tenant_id)
    if not active_records:
        return None

    for rule in CONFLICT_RULES:
        if not any(marker in normalized_query for marker in rule["proposal_markers"]):
            continue
        for record in active_records:
            haystack = normalize_decision_text(record.decisionText)
            if any(marker in haystack for marker in rule["decision_markers"]):
                return (
                    "Это предложение противоречит ранее принятому решению.\n"
                    f"• Активное решение: {record.decisionText}\n"
                    f"• Конфликт по теме: {rule['topic']}"
                )
    return None


def find_relevant_decisions_for_query(tenant_id: str, query_text: str) -> list[DecisionRecord]:
    normalized_query = normalize_decision_text(query_text)
    if not normalized_query:
        return []

    if "решени" not in normalized_query and "решил" not in normalized_query:
        return search_decision_records(tenant_id, normalized_query)

    return search_decision_records(tenant_id, normalized_query)
