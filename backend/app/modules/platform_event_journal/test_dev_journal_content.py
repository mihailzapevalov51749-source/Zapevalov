"""Tests for DEV journal corporate content normalization."""

from __future__ import annotations

from app.modules.platform_event_journal.dev_journal_content import (
    is_mostly_english,
    normalize_dev_journal_content,
    slug_to_russian_title,
)


def test_is_mostly_english_detects_cursor_titles():
    assert is_mostly_english("Activate change company administrator") is True
    assert is_mostly_english("Исправление фильтра меню") is False


def test_known_slug_uses_canonical_russian_title():
    title, description, event_type, _category = normalize_dev_journal_content(
        slug="platform-event-journal-role-isolation-fix",
        title="Platform Event Journal: role isolation fix",
        description="Added read/write gates.",
        event_type="development",
    )

    assert title == "Исправление изоляции ролей журнала событий"
    assert event_type == "fix"
    assert "Категория:" in (description or "")
    assert is_mostly_english(description) is False


def test_unknown_slug_translates_english_title():
    title, description, event_type, _category = normalize_dev_journal_content(
        slug="comments-api-tenant-isolation-fix",
        title="Comments API tenant isolation fix",
        description="Backend only change.",
        event_type="development",
    )

    assert is_mostly_english(title) is False
    assert title.startswith("Исправление:")
    assert event_type == "fix"
    assert "Категория:" in (description or "")


def test_russian_title_is_preserved():
    title, description, event_type, _category = normalize_dev_journal_content(
        slug="custom-feature",
        title="Добавлен фильтр журнала событий",
        description="Категория: Журнал событий.\nФильтр по дате работает корректно.",
        event_type="ux_improvement",
    )

    assert title == "Добавлен фильтр журнала событий"
    assert description.startswith("Категория: Журнал событий.")
    assert event_type == "ux_improvement"


def test_slug_to_russian_title_fallback():
    title = slug_to_russian_title("tenant-isolation-final-smoke-test")
    assert title.startswith("Исправление:")
    assert is_mostly_english(title) is False
