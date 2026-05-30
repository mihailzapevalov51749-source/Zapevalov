from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

from app.modules.quality_issues.constants import (
    QualityIssueAiFixStatus,
    QualityIssueArea,
    QualityIssuePriority,
    QualityIssueStatus,
)


class QualityIssue(Base):
    __tablename__ = "quality_issues"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    area: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=QualityIssueArea.OTHER.value,
        server_default=QualityIssueArea.OTHER.value,
    )

    detected_place: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        default="Studio",
        server_default="Studio",
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=QualityIssuePriority.MEDIUM.value,
        server_default=QualityIssuePriority.MEDIUM.value,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=QualityIssueStatus.NEW.value,
        server_default=QualityIssueStatus.NEW.value,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    current_behavior: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    expected_behavior: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    ai_fix_user_plan: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    ai_fix_technical_plan: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    ai_fix_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=QualityIssueAiFixStatus.NOT_STARTED.value,
        server_default=QualityIssueAiFixStatus.NOT_STARTED.value,
    )

    ai_fix_created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    ai_fix_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    architecture_impact: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    related_phase: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    root_cause: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    solution: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    created_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_by_user = relationship(
        "User",
        foreign_keys=[created_by],
        lazy="joined",
    )

    status_history = relationship(
        "QualityIssueStatusHistory",
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="QualityIssueStatusHistory.created_at.desc()",
    )


class QualityIssueStatusHistory(Base):
    __tablename__ = "quality_issue_status_history"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    issue_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("quality_issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    from_label: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    to_label: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    issue = relationship(
        "QualityIssue",
        back_populates="status_history",
    )
