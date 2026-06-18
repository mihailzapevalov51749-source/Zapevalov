"""Structured DEV tenant journal entries for completed Cursor work items."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_service import (
    get_journal_entry_by_slug,
    record_dev_development_event,
)
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
)
from app.modules.platform_event_journal.journal_user_format import (
    build_user_facing_description,
    format_user_facing_title,
)
from app.modules.platform_event_journal.schemas import PlatformEventJournalEntryRead


@dataclass
class WorkItemJournalPayload:
    slug: str
    title: str
    summary: str
    work_item_type: str = "development"
    root_cause: str | None = None
    changed_files: list[str] = field(default_factory=list)
    tests: str = "NOT DOCUMENTED"
    manual_smoke: str = "NOT PERFORMED"
    cleanup: str = "NOT REQUIRED"
    environment_integrity: str = "NOT CHECKED"
    result: str | None = None
    platform_impact: str | None = None
    event_type: str = "development"
    author: str = "Cursor"
    category_ru: str | None = None

    def validate(self) -> None:
        missing: list[str] = []
        if not str(self.slug or "").strip():
            missing.append("slug")
        if not str(self.title or "").strip():
            missing.append("title")
        if not str(self.summary or "").strip():
            missing.append("summary")
        if not str(self.tests or "").strip():
            missing.append("tests")
        if not str(self.manual_smoke or "").strip():
            missing.append("manual_smoke")
        if missing:
            raise ValueError(f"Missing required work item journal fields: {', '.join(missing)}")


def build_work_item_description(payload: WorkItemJournalPayload) -> str:
    """User-facing journal card text (technical details stay in metadata)."""
    payload.validate()
    return build_user_facing_description(
        summary=payload.summary.strip(),
        work_item_type=payload.work_item_type,
        result=payload.result,
        platform_impact=payload.platform_impact,
    )


def build_work_item_technical_report(payload: WorkItemJournalPayload) -> str:
    """Internal implementation report — not shown in user journal cards."""
    payload.validate()
    category = payload.category_ru or _infer_category_ru(payload.slug, payload.event_type)
    changed_files_block = (
        "\n".join(f"- {path}" for path in payload.changed_files)
        if payload.changed_files
        else "- (not listed)"
    )

    return (
        f"Категория: {category}.\n"
        f"Тип work item: {payload.work_item_type}.\n"
        f"Сводка: {payload.summary.strip()}\n"
        f"Причина: {(payload.root_cause or '—').strip()}\n\n"
        f"Изменённые файлы:\n{changed_files_block}\n\n"
        f"Тесты:\n{payload.tests.strip()}\n\n"
        f"Ручная проверка:\n{payload.manual_smoke.strip()}\n\n"
        f"Очистка:\n{payload.cleanup.strip()}\n\n"
        f"Целостность среды:\n{payload.environment_integrity.strip()}"
    )


def build_work_item_metadata(payload: WorkItemJournalPayload) -> dict[str, Any]:
    payload.validate()
    return {
        "work_item_type": payload.work_item_type,
        "summary": payload.summary.strip(),
        "root_cause": (payload.root_cause or "").strip() or None,
        "changed_files": list(payload.changed_files),
        "tests": payload.tests.strip(),
        "manual_smoke": payload.manual_smoke.strip(),
        "cleanup": payload.cleanup.strip(),
        "environment_integrity": payload.environment_integrity.strip(),
        "technical_report": build_work_item_technical_report(payload),
        "result": (payload.result or "").strip() or None,
        "platform_impact": (payload.platform_impact or "").strip() or None,
    }


def create_work_item_journal_entry(
    db: Session,
    payload: WorkItemJournalPayload,
    *,
    commit: bool = True,
) -> PlatformEventJournalEntryRead | None:
    """Create DEV tenant journal entry; return None when slug already exists."""
    payload.validate()

    existing = get_journal_entry_by_slug(db, payload.slug)
    if existing is not None:
        return None

    description = build_work_item_description(payload)
    metadata = build_work_item_metadata(payload)
    normalized_title = format_user_facing_title(
        payload.title,
        work_item_type=payload.work_item_type,
        event_type=payload.event_type,
    )

    return record_dev_development_event(
        db,
        title=normalized_title,
        description=description,
        event_type=payload.event_type,
        status=PlatformEventJournalStatus.DONE.value,
        author=payload.author,
        slug=payload.slug,
        source=PlatformEventJournalSource.CURSOR.value,
        metadata=metadata,
        commit=commit,
    )


def _infer_category_ru(slug: str, event_type: str) -> str:
    normalized = str(slug or "").lower()
    if "calendar" in normalized:
        return "Календарь"
    if "menu" in normalized or "navigation" in normalized or "sidebar" in normalized:
        return "Навигация"
    if "notification" in normalized:
        return "Уведомления"
    if event_type == "audit":
        return "Аудит"
    if event_type == "fix":
        return "Исправление"
    return "Разработка платформы"
