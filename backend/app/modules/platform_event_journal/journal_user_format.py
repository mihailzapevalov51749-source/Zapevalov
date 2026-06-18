"""User-facing platform event journal formatting standard."""

from __future__ import annotations

import re
from typing import Any

from app.modules.platform_event_journal.constants import PlatformEventJournalType

_TITLE_PREFIX_BY_WORK_ITEM_TYPE: dict[str, str] = {
    "audit": "Аудит",
    "development": "Разработка",
    "bug_fix": "Исправление",
    "cleanup": "Очистка",
    "ui_improvement": "Обновление",
    "architecture": "Архитектура",
    "test_hardening": "Обновление",
    "fix": "Исправление",
}

_TITLE_PREFIX_BY_EVENT_TYPE: dict[str, str] = {
    PlatformEventJournalType.AUDIT.value: "Аудит",
    PlatformEventJournalType.FIX.value: "Исправление",
    PlatformEventJournalType.ARCHITECTURE.value: "Архитектура",
    PlatformEventJournalType.DEVELOPMENT.value: "Разработка",
    PlatformEventJournalType.UX_IMPROVEMENT.value: "Обновление",
}

_FORBIDDEN_MARKERS = (
    "изменённые файлы",
    "измененные файлы",
    "changed files",
    "тип work item",
    "work item:",
    "root cause",
    "stack trace",
    "traceback",
    "pytest",
    "npm run",
    "frontend/src/",
    "backend/app/",
    "not performed",
    "not required",
    "not checked",
    "manual smoke",
    "ручная проверка:",
    "очистка:",
    "целостность среды:",
    "тесты:",
    "tests:",
    "pass / fail",
    "migration",
    "patch",
    " diff",
)

_OLD_SECTION_MARKERS = (
    "категория:",
    "что изменено:",
    "зачем:",
    "примечание:",
    "сводка:",
    "причина:",
)


def contains_forbidden_journal_content(text: str | None) -> bool:
    normalized = str(text or "").strip().lower()
    if not normalized:
        return False
    return any(marker in normalized for marker in _FORBIDDEN_MARKERS)


def uses_legacy_journal_format(text: str | None) -> bool:
    normalized = str(text or "").strip().lower()
    if not normalized:
        return False
    if normalized.startswith("что сделано:"):
        return False
    return any(marker in normalized for marker in _OLD_SECTION_MARKERS)


def resolve_user_facing_title_prefix(
    *,
    work_item_type: str | None = None,
    event_type: str | None = None,
) -> str:
    normalized_work_item = str(work_item_type or "").strip().lower()
    if normalized_work_item in _TITLE_PREFIX_BY_WORK_ITEM_TYPE:
        return _TITLE_PREFIX_BY_WORK_ITEM_TYPE[normalized_work_item]

    normalized_event = str(event_type or "").strip().lower()
    return _TITLE_PREFIX_BY_EVENT_TYPE.get(normalized_event, "Изменение")


def format_user_facing_title(
    title: str,
    *,
    work_item_type: str | None = None,
    event_type: str | None = None,
) -> str:
    normalized_title = str(title or "").strip()
    if not normalized_title:
        return "Изменение платформы"

    all_prefixes = set(_TITLE_PREFIX_BY_WORK_ITEM_TYPE.values()) | set(
        _TITLE_PREFIX_BY_EVENT_TYPE.values()
    )
    lowered = normalized_title.lower()
    for known_prefix in all_prefixes:
        prefix_lower = known_prefix.lower()
        if lowered.startswith(f"{prefix_lower}:") or lowered.startswith(f"{prefix_lower} "):
            return normalized_title

    prefix = resolve_user_facing_title_prefix(
        work_item_type=work_item_type,
        event_type=event_type,
    )
    return f"{prefix}: {normalized_title}"


def _default_result_for_work_item(work_item_type: str | None, summary: str) -> str:
    normalized = str(work_item_type or "").strip().lower()
    if normalized == "audit":
        return "Проверка выполнена, результаты зафиксированы."
    if normalized in {"bug_fix", "fix"}:
        return "Ошибка устранена, сценарий работает корректно."
    if normalized == "cleanup":
        return "Среда приведена в порядок для демонстрации и эксплуатации."
    if normalized in {"ui_improvement", PlatformEventJournalType.UX_IMPROVEMENT.value}:
        return summary.strip() or "Интерфейс стал понятнее для пользователей."
    return summary.strip() or "Изменение успешно внедрено."


def _default_impact_for_work_item(work_item_type: str | None, summary: str) -> str:
    normalized = str(work_item_type or "").strip().lower()
    if normalized == "audit":
        return "Изменения в платформу не вносились."
    if normalized in {"bug_fix", "fix"}:
        return "Сбой устранён, работа платформы стабилизирована."
    if normalized == "cleanup":
        return "Демонстрационная среда стала чище и понятнее."
    if normalized == "architecture":
        return "Архитектура платформы стала более согласованной."
    if summary.strip():
        return "Пользователям стало удобнее работать с платформой."
    return "Платформа продолжает развиваться без нарушения рабочих сценариев."


def build_user_facing_description(
    *,
    summary: str,
    work_item_type: str | None = None,
    result: str | None = None,
    platform_impact: str | None = None,
) -> str:
    what_done = str(summary or "").strip() or "Выполнена доработка платформы."
    resolved_result = str(result or "").strip() or _default_result_for_work_item(work_item_type, what_done)
    resolved_impact = str(platform_impact or "").strip() or _default_impact_for_work_item(
        work_item_type,
        what_done,
    )
    return (
        f"Что сделано:\n{what_done}\n\n"
        f"Результат:\n{resolved_result}\n\n"
        f"Влияние на платформу:\n{resolved_impact}"
    )


def _extract_field(description: str, label: str) -> str | None:
    pattern = re.compile(rf"^{re.escape(label)}\s*(.+)$", re.IGNORECASE | re.MULTILINE)
    match = pattern.search(description)
    if not match:
        return None
    return match.group(1).strip()


def _extract_summary_from_legacy_description(description: str | None) -> str | None:
    if not description:
        return None

    for label in ("Сводка:", "Что изменено:", "Что сделано:"):
        value = _extract_field(description, label)
        if value:
            return value.rstrip(".")

    lines = [line.strip() for line in description.splitlines() if line.strip()]
    if not lines:
        return None
    if lines[0].lower().startswith("категория:") and len(lines) > 1:
        return lines[1].replace("Что изменено:", "").replace("что изменено:", "").strip()
    return None


def sanitize_journal_description_for_display(
    *,
    description: str | None,
    title: str | None,
    metadata: dict[str, Any] | None = None,
    event_type: str | None = None,
    slug: str | None = None,
) -> str | None:
    metadata = metadata or {}
    work_item_type = str(metadata.get("work_item_type") or event_type or "").strip().lower() or None
    summary = str(metadata.get("summary") or "").strip()
    result = str(metadata.get("result") or metadata.get("platform_result") or "").strip() or None
    impact = str(metadata.get("platform_impact") or metadata.get("impact") or "").strip() or None

    normalized_description = str(description or "").strip()
    if normalized_description and not contains_forbidden_journal_content(normalized_description):
        if normalized_description.lower().startswith("что сделано:"):
            return normalized_description

    if not summary:
        summary = _extract_summary_from_legacy_description(normalized_description) or ""

    if not summary:
        legacy_result = _extract_field(normalized_description, "Результат:")
        legacy_why = _extract_field(normalized_description, "Зачем:")
        legacy_changed = _extract_field(normalized_description, "Что изменено:")
        summary = legacy_changed or str(title or "").strip()
        if legacy_result and not result:
            result = legacy_result.rstrip(".")
        if legacy_why and not impact:
            impact = legacy_why.rstrip(".")

    if not summary:
        summary = str(title or "").strip()
        if ":" in summary:
            summary = summary.split(":", 1)[1].strip() or summary

    if not summary:
        summary = "Выполнена доработка платформы."

    if uses_legacy_journal_format(normalized_description) or contains_forbidden_journal_content(
        normalized_description
    ):
        return build_user_facing_description(
            summary=summary,
            work_item_type=work_item_type,
            result=result,
            platform_impact=impact,
        )

    return normalized_description or build_user_facing_description(
        summary=summary,
        work_item_type=work_item_type,
        result=result,
        platform_impact=impact,
    )


def assess_backfill_feasibility() -> dict[str, str]:
    """Read-only assessment: backfill is possible via metadata.summary, but not automated."""
    return {
        "feasible": "yes_with_caution",
        "recommended": "presentation_layer_only",
        "reason": (
            "metadata_json.summary и slug позволяют восстановить пользовательский текст без "
            "потери технических данных, но массовый UPDATE description не выполняется автоматически."
        ),
    }
