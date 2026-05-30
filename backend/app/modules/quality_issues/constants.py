from enum import StrEnum


class QualityIssueStatus(StrEnum):
    NEW = "new"
    ANALYZING = "analyzing"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    CLOSED = "closed"


class QualityIssuePriority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class QualityIssueArea(StrEnum):
    NAVIGATION = "navigation"
    CARDS = "cards"
    VIEWS = "views"
    PUBLISH = "publish"
    NOTIFICATIONS = "notifications"
    ACCESS = "access"
    ARCHITECTURE = "architecture"
    OTHER = "other"


class QualityIssueAiFixStatus(StrEnum):
    NOT_STARTED = "not_started"
    PLAN_READY = "plan_ready"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


RESOLUTION_LABEL_OPEN = "Не исправлено"
RESOLUTION_LABEL_FIXED = "Исправлено"


def get_resolution_label(status: str | None) -> str:
    if status == QualityIssueStatus.CLOSED.value:
        return RESOLUTION_LABEL_FIXED
    return RESOLUTION_LABEL_OPEN


def status_for_resolution_label(
    resolution_label: str,
    *,
    current_status: str,
) -> str | None:
    normalized = str(resolution_label or "").strip()

    if normalized == RESOLUTION_LABEL_FIXED:
        return QualityIssueStatus.CLOSED.value

    if normalized == RESOLUTION_LABEL_OPEN:
        if current_status == QualityIssueStatus.CLOSED.value:
            return QualityIssueStatus.NEW.value
        return None

    return None
