from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.platform_dashboard.datetime_utils import utc_now

from app.modules.platform_dashboard.constants import (
    PlatformComponentStatus,
    PlatformStageStatus,
    PlatformTaskPriority,
    PlatformTaskStatus,
)


class PlatformComponent(Base):
    __tablename__ = "platform_components"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=PlatformComponentStatus.PLANNED.value,
        server_default=PlatformComponentStatus.PLANNED.value,
    )
    completed_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    remaining_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    dependencies: Mapped[str | None] = mapped_column(Text, nullable=True)
    architecture_debt: Mapped[str | None] = mapped_column(Text, nullable=True)
    cached_readiness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
    )

    tasks = relationship(
        "PlatformTask",
        back_populates="component",
        foreign_keys="PlatformTask.component_id",
    )


class PlatformImplementationStage(Base):
    __tablename__ = "platform_implementation_stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=PlatformStageStatus.PLANNED.value,
        server_default=PlatformStageStatus.PLANNED.value,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_position: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    completed_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    remaining_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    completion_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_tasks: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_tasks: Mapped[str | None] = mapped_column(Text, nullable=True)
    blockers: Mapped[str | None] = mapped_column(Text, nullable=True)
    cached_readiness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
    )

    tasks = relationship(
        "PlatformTask",
        back_populates="stage",
        foreign_keys="PlatformTask.stage_id",
    )


class PlatformTask(Base):
    __tablename__ = "platform_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    stage_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("platform_implementation_stages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    component_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("platform_components.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=PlatformTaskStatus.PLANNED.value,
        server_default=PlatformTaskStatus.PLANNED.value,
        index=True,
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=PlatformTaskPriority.MEDIUM.value,
        server_default=PlatformTaskPriority.MEDIUM.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    stage = relationship(
        "PlatformImplementationStage",
        back_populates="tasks",
        foreign_keys=[stage_id],
    )
    component = relationship(
        "PlatformComponent",
        back_populates="tasks",
        foreign_keys=[component_id],
    )


class PlatformDashboardMeta(Base):
    __tablename__ = "platform_dashboard_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analyzer_version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1",
        server_default="1",
    )
    analyzer_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    refreshed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    overall_readiness: Mapped[int | None] = mapped_column(Integer, nullable=True)


class PlatformActivity(Base):
    __tablename__ = "platform_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str | None] = mapped_column(String(120), nullable=True, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="milestone")
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    initiated_by_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    initiated_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
    )
    related_stage_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("platform_implementation_stages.id", ondelete="SET NULL"),
        nullable=True,
    )
    related_component_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("platform_components.id", ondelete="SET NULL"),
        nullable=True,
    )
    related_issue_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("quality_issues.id", ondelete="SET NULL"),
        nullable=True,
    )
