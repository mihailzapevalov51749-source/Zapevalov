from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.modules.quality_issues.constants import (
    QualityIssueAiFixStatus,
    QualityIssueArea,
    QualityIssuePriority,
    QualityIssueStatus,
)


class QualityIssueCreate(BaseModel):
    title: str = Field(..., min_length=1)
    area: QualityIssueArea = QualityIssueArea.OTHER
    detected_place: str = Field(default="Studio", min_length=1, max_length=120)
    priority: QualityIssuePriority = QualityIssuePriority.MEDIUM
    status: QualityIssueStatus = QualityIssueStatus.NEW
    description: str | None = None
    current_behavior: str | None = None
    expected_behavior: str | None = None
    comment: str | None = None
    architecture_impact: str | None = None
    related_phase: str | None = Field(default=None, max_length=120)
    root_cause: str | None = None
    solution: str | None = None


class QualityIssueUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    area: QualityIssueArea | None = None
    detected_place: str | None = Field(default=None, min_length=1, max_length=120)
    priority: QualityIssuePriority | None = None
    status: QualityIssueStatus | None = None
    description: str | None = None
    current_behavior: str | None = None
    expected_behavior: str | None = None
    comment: str | None = None
    architecture_impact: str | None = None
    related_phase: str | None = Field(default=None, max_length=120)
    root_cause: str | None = None
    solution: str | None = None


class QualityIssueStatusHistoryRead(BaseModel):
    id: int
    issue_id: int
    from_label: str
    to_label: str
    created_at: datetime

    class Config:
        from_attributes = True


class QualityIssueRead(BaseModel):
    id: int
    title: str
    area: QualityIssueArea
    detected_place: str
    priority: QualityIssuePriority
    status: QualityIssueStatus
    description: str | None = None
    current_behavior: str | None = None
    expected_behavior: str | None = None
    comment: str | None = None
    architecture_impact: str | None = None
    related_phase: str | None = None
    root_cause: str | None = None
    solution: str | None = None
    ai_fix_user_plan: str | None = None
    ai_fix_technical_plan: str | None = None
    ai_fix_status: QualityIssueAiFixStatus = QualityIssueAiFixStatus.NOT_STARTED
    ai_fix_created_at: datetime | None = None
    ai_fix_approved_at: datetime | None = None
    created_at: datetime
    created_by: int | None = None
    closed_at: datetime | None = None

    @field_validator("ai_fix_status", mode="before")
    @classmethod
    def normalize_ai_fix_status(cls, value):
        if value is None or value == "":
            return QualityIssueAiFixStatus.NOT_STARTED
        return value

    class Config:
        from_attributes = True
