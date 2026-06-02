"""Project Awareness Engine — runtime resolver (P11-W02)."""

from __future__ import annotations

from dataclasses import dataclass

from app.db.session import SessionLocal
from app.modules.yasii.blocker_detection import (
    BlockerAssessment,
    build_blocker_assessment,
    detect_platform_dependency_blockers,
    format_blocker_message,
    merge_blocker_assessments,
)
from app.modules.yasii.project_awareness import (
    ProjectAwarenessQueryKind,
    build_project_awareness_assessment,
    classify_project_awareness_query,
    format_next_step_message,
    format_project_awareness_message,
    format_roadmap_message,
    is_project_awareness_query,
    load_project_state_from_db,
)


@dataclass(frozen=True)
class ProjectAwarenessResult:
    message: str
    state_loaded: bool = False
    awareness_created: bool = False
    priority_generated: bool = False
    blockers_detected: bool = False
    query_kind: str = ""


def _tenant_id(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def _format_blocker_view(query_text: str, payload: dict, db) -> tuple[str, bool]:
    _state, done_keys, _passed = load_project_state_from_db(db)
    platform = BlockerAssessment(
        blockers=detect_platform_dependency_blockers(done_keys),
        summary="",
    )
    contextual = build_blocker_assessment(_tenant_id(payload), query_text, payload)
    merged = merge_blocker_assessments(platform, contextual)
    message = format_blocker_message(
        merged,
        header="Blocker Detection (развитие платформы):",
    )
    return message, bool(merged.blockers)


def resolve_project_awareness_command(query_text: str, payload: dict) -> ProjectAwarenessResult | None:
    if not is_project_awareness_query(query_text):
        return None

    kind = classify_project_awareness_query(query_text)

    db = SessionLocal()
    try:
        if kind == ProjectAwarenessQueryKind.BLOCKERS:
            message, blockers_detected = _format_blocker_view(query_text, payload, db)
            return ProjectAwarenessResult(
                message=message,
                state_loaded=True,
                awareness_created=True,
                priority_generated=False,
                blockers_detected=blockers_detected,
                query_kind=kind.value,
            )

        assessment = build_project_awareness_assessment(query_text, db)
    finally:
        db.close()

    if assessment.queryKind == ProjectAwarenessQueryKind.ROADMAP:
        message = format_roadmap_message(assessment, query_text)
    elif assessment.queryKind == ProjectAwarenessQueryKind.NEXT_STEP:
        message = format_next_step_message(assessment, query_text)
    else:
        message = format_project_awareness_message(assessment, query_text)

    return ProjectAwarenessResult(
        message=message,
        state_loaded=True,
        awareness_created=True,
        priority_generated=bool(assessment.priorities),
        blockers_detected=bool(assessment.blockers),
        query_kind=assessment.queryKind.value,
    )
