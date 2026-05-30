from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.quality_issues.constants import (
    QualityIssueStatus,
    get_resolution_label,
)
from app.modules.quality_issues.models import QualityIssue, QualityIssueStatusHistory
from app.modules.quality_issues.schemas import QualityIssueCreate, QualityIssueUpdate


def list_quality_issues(db: Session) -> list[QualityIssue]:
    query = (
        select(QualityIssue)
        .order_by(QualityIssue.created_at.desc(), QualityIssue.id.desc())
    )
    return list(db.scalars(query).all())


def get_quality_issue(db: Session, *, issue_id: int) -> QualityIssue | None:
    query = select(QualityIssue).where(QualityIssue.id == issue_id)
    return db.scalar(query)


def list_quality_issue_status_history(
    db: Session,
    *,
    issue_id: int,
) -> list[QualityIssueStatusHistory]:
    query = (
        select(QualityIssueStatusHistory)
        .where(QualityIssueStatusHistory.issue_id == issue_id)
        .order_by(
            QualityIssueStatusHistory.created_at.desc(),
            QualityIssueStatusHistory.id.desc(),
        )
    )
    return list(db.scalars(query).all())


def _record_resolution_history(
    db: Session,
    *,
    issue: QualityIssue,
    previous_status: str,
    next_status: str,
) -> None:
    previous_label = get_resolution_label(previous_status)
    next_label = get_resolution_label(next_status)

    if previous_label == next_label:
        return

    db.add(
        QualityIssueStatusHistory(
            issue_id=issue.id,
            from_label=previous_label,
            to_label=next_label,
            created_at=datetime.utcnow(),
        )
    )


def create_quality_issue(
    db: Session,
    *,
    payload: QualityIssueCreate,
    created_by: int | None,
) -> QualityIssue:
    closed_at = None
    if payload.status == QualityIssueStatus.CLOSED:
        closed_at = datetime.utcnow()

    issue = QualityIssue(
        title=payload.title.strip(),
        area=payload.area.value,
        detected_place=payload.detected_place.strip(),
        priority=payload.priority.value,
        status=payload.status.value,
        description=_normalize_optional_text(payload.description),
        current_behavior=_normalize_optional_text(payload.current_behavior),
        expected_behavior=_normalize_optional_text(payload.expected_behavior),
        comment=_normalize_optional_text(payload.comment),
        architecture_impact=_normalize_optional_text(payload.architecture_impact),
        related_phase=_normalize_optional_text(payload.related_phase),
        root_cause=_normalize_optional_text(payload.root_cause),
        solution=_normalize_optional_text(payload.solution),
        created_by=created_by,
        closed_at=closed_at,
    )

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def update_quality_issue(
    db: Session,
    *,
    issue: QualityIssue,
    payload: QualityIssueUpdate,
) -> QualityIssue:
    if payload.title is not None:
        issue.title = payload.title.strip()

    if payload.area is not None:
        issue.area = payload.area.value

    if payload.detected_place is not None:
        issue.detected_place = payload.detected_place.strip()

    if payload.priority is not None:
        issue.priority = payload.priority.value

    if payload.status is not None:
        previous_status = issue.status
        issue.status = payload.status.value

        _record_resolution_history(
            db,
            issue=issue,
            previous_status=previous_status,
            next_status=issue.status,
        )

        if (
            payload.status == QualityIssueStatus.CLOSED
            and previous_status != QualityIssueStatus.CLOSED.value
        ):
            issue.closed_at = datetime.utcnow()
        elif (
            payload.status != QualityIssueStatus.CLOSED
            and previous_status == QualityIssueStatus.CLOSED.value
        ):
            issue.closed_at = None

    if payload.description is not None:
        issue.description = _normalize_optional_text(payload.description)

    if payload.current_behavior is not None:
        issue.current_behavior = _normalize_optional_text(payload.current_behavior)

    if payload.expected_behavior is not None:
        issue.expected_behavior = _normalize_optional_text(payload.expected_behavior)

    if payload.comment is not None:
        issue.comment = _normalize_optional_text(payload.comment)

    if payload.architecture_impact is not None:
        issue.architecture_impact = _normalize_optional_text(payload.architecture_impact)

    if payload.related_phase is not None:
        issue.related_phase = _normalize_optional_text(payload.related_phase)

    if payload.root_cause is not None:
        issue.root_cause = _normalize_optional_text(payload.root_cause)

    if payload.solution is not None:
        issue.solution = _normalize_optional_text(payload.solution)

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def delete_quality_issue(db: Session, *, issue: QualityIssue) -> None:
    db.delete(issue)
    db.commit()


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None
