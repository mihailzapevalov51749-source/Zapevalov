"""Blocker Detection query handling (P9-W03)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.blocker_detection import (
    BlockerType,
    build_blocker_assessment,
    format_blocker_message,
)

BLOCKER_KEYWORDS = (
    "что сейчас блокирует прогресс",
    "какие есть препятствия",
    "что мешает двигаться дальше",
    "что мешает двигаться вперёд",
    "что мешает двигаться вперед",
    "есть ли блокеры",
    "какие ограничения существуют",
    "почему мы не можем продолжить",
    "почему нельзя перейти",
    "что мешает начать работу",
    "что мешает начать",
    "узкое место",
    "узким местом",
    "блокер",
    "блокирует",
)


@dataclass(frozen=True)
class BlockerCommandResult:
    message: str
    assessment_created: bool = False
    blocker_detected: bool = False
    dependency_found: bool = False
    conflict_found: bool = False


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tenant(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def is_blocker_command(query_text: str) -> bool:
    normalized = _normalize(query_text)
    if not normalized:
        return False
    return any(keyword in normalized for keyword in BLOCKER_KEYWORDS)


def resolve_blocker_command(query_text: str, payload: dict) -> BlockerCommandResult | None:
    if not is_blocker_command(query_text):
        return None

    assessment = build_blocker_assessment(_tenant(payload), query_text, payload)
    message = format_blocker_message(assessment)
    return BlockerCommandResult(
        message=message,
        assessment_created=True,
        blocker_detected=bool(assessment.blockers),
        dependency_found=any(
            item.blockerType == BlockerType.MISSING_DEPENDENCY for item in assessment.blockers
        ),
        conflict_found=any(
            item.blockerType == BlockerType.DECISION_CONFLICT for item in assessment.blockers
        ),
    )
