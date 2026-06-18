"""Persistent registry for committed test data cleanup."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TestCleanupRun(Base):
    __tablename__ = "test_cleanup_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_key: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="running")

    records: Mapped[list["TestCleanupRecord"]] = relationship(
        "TestCleanupRecord",
        back_populates="run",
        cascade="all, delete-orphan",
    )


class TestCleanupRecord(Base):
    __tablename__ = "test_cleanup_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("test_cleanup_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    table_name: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    entity_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delete_order: Mapped[int] = mapped_column(Integer, nullable=False, default=999)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delete_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    delete_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    run: Mapped[TestCleanupRun] = relationship("TestCleanupRun", back_populates="records")
