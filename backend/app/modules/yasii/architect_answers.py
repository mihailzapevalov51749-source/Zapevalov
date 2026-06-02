"""YASII Architect Profile query handling (P9-W05)."""

from __future__ import annotations

from dataclasses import dataclass

from app.modules.yasii.architect_profile import (
    ArchitectQuestionType,
    build_architect_assessment,
    format_architect_message,
    is_architect_query,
)

__all__ = (
    "ArchitectCommandResult",
    "is_architect_command",
    "resolve_architect_command",
)


@dataclass(frozen=True)
class ArchitectCommandResult:
    message: str
    profile_loaded: bool = False
    question_answered: bool = False
    dependency_analyzed: bool = False
    change_impact_analyzed: bool = False
    question_type: str = ""


def is_architect_command(query_text: str) -> bool:
    return is_architect_query(query_text)


def resolve_architect_command(query_text: str, payload: dict) -> ArchitectCommandResult | None:
    del payload  # architect layer uses normative docs, not tenant payload
    if not is_architect_command(query_text):
        return None

    assessment = build_architect_assessment(query_text)
    message = format_architect_message(assessment)
    qtype = assessment.questionType

    return ArchitectCommandResult(
        message=message,
        profile_loaded=True,
        question_answered=True,
        dependency_analyzed=qtype == ArchitectQuestionType.DEPENDENCY,
        change_impact_analyzed=qtype == ArchitectQuestionType.IMPACT,
        question_type=qtype.value,
    )
