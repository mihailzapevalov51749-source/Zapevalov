"""Tests for user-facing journal formatting standard."""

from __future__ import annotations

from app.modules.platform_event_journal.journal_user_format import (
    assess_backfill_feasibility,
    build_user_facing_description,
    contains_forbidden_journal_content,
    format_user_facing_title,
    sanitize_journal_description_for_display,
)
from app.modules.platform_event_journal.work_item_journal import (
    WorkItemJournalPayload,
    build_work_item_description,
    build_work_item_technical_report,
)


def test_build_user_facing_description_for_types():
    audit = build_user_facing_description(
        summary="Проведена проверка согласованности конфигураций модулей.",
        work_item_type="audit",
    )
    assert audit.startswith("Что сделано:")
    assert "Изменения в платформу не вносились." in audit
    assert not contains_forbidden_journal_content(audit)

    bug_fix = build_user_facing_description(
        summary="Исправлена ошибка загрузки переключателя режимов.",
        work_item_type="bug_fix",
        result="Переход между режимами работает корректно.",
        platform_impact="Ошибка запуска интерфейса устранена.",
    )
    assert "Переход между режимами работает корректно." in bug_fix


def test_default_result_does_not_duplicate_summary():
    user_text = build_user_facing_description(
        summary="Создан документ YASNOPRO_PLATFORM_DATA.md.",
        work_item_type="architecture",
    )

    assert "Что сделано:\nСоздан документ YASNOPRO_PLATFORM_DATA.md." in user_text
    assert (
        "Результат:\nСоздан документ YASNOPRO_PLATFORM_DATA.md."
        not in user_text
    )
    assert "Результат:\nАрхитектурные правила и реализация стали согласованнее." in user_text


def test_explicit_result_matching_summary_is_replaced():
    user_text = build_user_facing_description(
        summary="Создан документ YASNOPRO_PLATFORM_DATA.md.",
        result="Создан документ YASNOPRO_PLATFORM_DATA.md.",
        work_item_type="development",
    )

    assert "Результат:\nИзменение успешно внедрено." in user_text


def test_work_item_description_is_user_facing_only():
    payload = WorkItemJournalPayload(
        slug="journal-formatting-standard",
        title="Стандарт форматирования журнала",
        summary="Журнал событий снова показывает понятные пользователю записи.",
        work_item_type="ui_improvement",
        changed_files=["backend/app/modules/platform_event_journal/journal_user_format.py"],
        tests="test_journal_user_format.py — PASS",
        manual_smoke="NOT PERFORMED",
    )

    user_text = build_work_item_description(payload)
    technical = build_work_item_technical_report(payload)

    assert user_text.startswith("Что сделано:")
    assert "frontend/" not in user_text.lower()
    assert "NOT PERFORMED" not in user_text
    assert "Изменённые файлы" in technical


def test_sanitize_legacy_technical_description_from_metadata():
    legacy = (
        "Категория: Архитектура.\n"
        "Тип work item: audit.\n"
        "Сводка: Проведён аудит конфигураций модулей.\n"
        "Изменённые файлы:\n- backend/app/foo.py\n"
        "Тесты:\nPASS"
    )
    sanitized = sanitize_journal_description_for_display(
        description=legacy,
        title="Аудит конфигураций модулей",
        metadata={
            "work_item_type": "audit",
            "summary": "Проведён аудит конфигураций модулей.",
        },
        event_type="audit",
        slug="tenant-module-configuration-consistency-audit",
    )

    assert sanitized.startswith("Что сделано:")
    assert "Изменённые файлы" not in sanitized
    assert "PASS" not in sanitized


def test_format_user_facing_title_prefixes():
    assert format_user_facing_title(
        "Sidebar Mode Switcher",
        work_item_type="ui_improvement",
    ).startswith("Обновление:")
    assert format_user_facing_title(
        "Очистка тестовых пользователей",
        work_item_type="cleanup",
    ) == "Очистка тестовых пользователей"


def test_backfill_assessment_is_read_only():
    assessment = assess_backfill_feasibility()
    assert assessment["recommended"] == "presentation_layer_only"
