"""Owner-facing content normalization (T0.6) — adapter projection layer only."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.modules.platform_dashboard.owner_read_adapter import OwnerHistoryEvent, OwnerStageView

# --- Readiness owner status (T0.6 §3) ---

OWNER_STATUS_PLANNED = "В планах"
OWNER_STATUS_IN_PROGRESS = "В работе"
OWNER_STATUS_DONE = "Завершено"


def owner_status_from_readiness(readiness: int | None) -> str | None:
    if readiness is None:
        return None
    if readiness <= 0:
        return OWNER_STATUS_PLANNED
    if readiness >= 100:
        return OWNER_STATUS_DONE
    return OWNER_STATUS_IN_PROGRESS


def _works_count_label(count: int, *, completed: bool) -> str:
    n = abs(int(count))
    if n % 10 == 1 and n % 100 != 11:
        word = "работа"
    elif n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        word = "работы"
    else:
        word = "работ"
    if completed:
        return f"Завершено {n} ключевых {word}."
    return f"Осталось выполнить {n} {word}."


# --- Development work rewrite (T0.6 §2) ---

_TECH_MARKERS = re.compile(
    r"(\*\*|`|\.md\)|\]\([^)]+\)|modules/|universalTable|universal_table|"
    r"object-platform-independence|legacy-isolation|legacy-removal|"
    r"runtimeReadGateway|runtimeLegacyWriteAdapter|PortalPageView|UniversalTableView|"
    r"Alembic|TODO|COMPLETED|already done)",
    re.IGNORECASE,
)

_SLUG_OWNER_PHRASES: dict[str, str] = {
    "object-platform-independence": "Платформа переведена на независимую объектную модель.",
    "legacy-isolation": "Завершён этап изоляции устаревших компонентов.",
    "legacy-removal": "Выполняется вывод устаревшей табличной модели из продукта.",
    "runtime-foundation": "Развивается рабочая среда портала для сотрудников.",
    "designer-foundation": "Развивается Studio и сценарии публикации.",
}

_LINE_REWRITE_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"entity\s*card", re.I), "Карточка объекта отделена от старого интерфейса."),
    (re.compile(r"objectEntities", re.I), "Интерфейс записей объектов переведён на новую оболочку."),
    (re.compile(r"entityCardShell", re.I), "Создана единая оболочка карточки объекта."),
    (re.compile(r"legacy\s*notification", re.I), "Убраны устаревшие маршруты уведомлений."),
    (re.compile(r"runtimeReadGateway", re.I), "Очищен контур чтения данных без fallback на старые таблицы."),
    (re.compile(r"runtimeLegacyWriteAdapter", re.I), "Удалён адаптер записи в устаревшие таблицы."),
    (re.compile(r"UT\s*blocks?", re.I), "Запрещено создание новых блоков устаревшей таблицы."),
    (re.compile(r"universal_table|table/universal", re.I), "Устаревшие табличные блоки исключены из новых сценариев."),
    (re.compile(r"placeholder", re.I), "Старые табличные блоки заменены на безопасный placeholder."),
    (re.compile(r"navigation/sidebar|UT bridges", re.I), "Убраны скрытые связи навигации со старыми таблицами."),
    (re.compile(r"PortalPageView.*UniversalTableView", re.I), "Страницы портала отделены от старого табличного интерфейса."),
    (re.compile(r"universalTable", re.I), "Удалён устаревший табличный модуль из продукта."),
    (re.compile(r"universal_tables", re.I), "Выведен устаревший backend-контур таблиц."),
    (re.compile(r"universal_views", re.I), "Выведен устаревший контур представлений legacy-таблиц."),
    (re.compile(r"legacy\s*API", re.I), "Удалены устаревшие API-клиенты."),
    (re.compile(r"identity\s*branches", re.I), "Убраны ветки идентичности устаревших таблиц."),
    (re.compile(r"DROP\s*migration", re.I), "Подготовлена миграция удаления устаревного хранилища."),
    (re.compile(r"object\s*search", re.I), "Развит поиск по объектам платформы."),
    (re.compile(r"relation\s*engine", re.I), "Заложена основа движка связей между объектами."),
    (re.compile(r"runtime\s*auth", re.I), "Внедряется аутентификация в рабочей среде."),
    (re.compile(r"object-level\s*permissions", re.I), "Внедряются права доступа на уровне объектов."),
    (re.compile(r"field/group\s*permissions", re.I), "Внедряются права на поля и группы полей."),
    (re.compile(r"publish.*preview|preview.*Studio", re.I), "Сценарии публикации и предпросмотра в Studio."),
    (re.compile(r"Studio.*runtime|runtime.*Studio", re.I), "Уточняется граница между Studio и рабочей средой."),
    (re.compile(r"жизненн.*цикл.*тип", re.I), "Описан жизненный цикл типа объекта."),
)


def _strip_technical_markdown(text: str) -> str:
    cleaned = str(text or "").strip()
    cleaned = re.sub(r"\*\*[^*]+\*\*", "", cleaned)
    cleaned = re.sub(r"`[^`]+`", "", cleaned)
    cleaned = re.sub(r"\[[^\]]+\]\([^)]+\)", "", cleaned)
    cleaned = re.sub(r"\([^)]*\.md[^)]*\)", "", cleaned, flags=re.I)
    cleaned = re.sub(r"(?i)\s*—\s*already done.*$", "", cleaned)
    cleaned = re.sub(r"(?i)\s*—\s*COMPLETED.*$", "", cleaned)
    cleaned = re.sub(r"(?i)\s*\(уже\s+DONE[^)]*\)", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ;,—-")
    return cleaned


def rewrite_development_work_line(raw: str) -> str:
    """Map a raw implementation work line to an owner-facing phrase."""
    text = _strip_technical_markdown(raw)
    if not text:
        return ""

    lower = text.casefold()
    for slug, phrase in _SLUG_OWNER_PHRASES.items():
        if slug.replace("-", " ") in lower or slug in lower:
            return phrase

    for pattern, replacement in _LINE_REWRITE_RULES:
        if pattern.search(text):
            return replacement

    if _TECH_MARKERS.search(text):
        # Generic fallback: first sentence fragment without paths
        fragment = re.sub(r"[/\\][\w./-]+", "", text)
        fragment = re.sub(r"\w+\.\w{2,4}\b", "", fragment)
        fragment = re.sub(r"\s+", " ", fragment).strip(" ;,—-")
        if len(fragment) >= 12:
            if not fragment.endswith("."):
                fragment += "."
            return fragment[0].upper() + fragment[1:]

    if text.endswith(";"):
        text = text[:-1].strip()
    if text and not text.endswith("."):
        text += "."
    return text[0].upper() + text[1:] if text else ""


def rewrite_development_item_list(items: list[str]) -> list[str]:
    rewritten: list[str] = []
    seen: set[str] = set()
    for item in items:
        phrase = rewrite_development_work_line(item)
        if phrase and phrase not in seen:
            seen.add(phrase)
            rewritten.append(phrase)
    return rewritten


SUMMARY_STAGE_KEYS = frozenset({"dev-platform-transition"})
SUMMARY_LIST_THRESHOLD = 5


def apply_development_work_summary(
    stage_key: str,
    done: list[str],
    in_work: list[str],
    remaining: list[str],
    *,
    threshold: int = SUMMARY_LIST_THRESHOLD,
) -> tuple[list[str], list[str], list[str], dict[str, object]]:
    """Owner summary mode for large implementation-stage lists (T0.6 §7)."""
    raw_items = {"done": list(done), "inWork": list(in_work), "remaining": list(remaining)}
    use_summary = stage_key in SUMMARY_STAGE_KEYS or (
        len(done) >= threshold or len(remaining) >= threshold
    )
    if not use_summary:
        return done, in_work, remaining, {}

    owner_done = [_works_count_label(len(done), completed=True)] if done else []
    owner_remaining = [_works_count_label(len(remaining), completed=False)] if remaining else []
    owner_in_work = in_work
    if len(in_work) >= threshold:
        owner_in_work = [_works_count_label(len(in_work), completed=False)]

    return owner_done, owner_in_work, owner_remaining, {"raw_items": raw_items, "summary_mode": True}


def normalize_development_stage_content(stage: "OwnerStageView") -> "OwnerStageView":
    done = rewrite_development_item_list(stage.done)
    in_work = rewrite_development_item_list(stage.inWork)
    remaining = rewrite_development_item_list(stage.remaining)

    extra_meta: dict[str, Any] = {}
    if stage.id in SUMMARY_STAGE_KEYS or stage.id.startswith("dev-"):
        done, in_work, remaining, summary_meta = apply_development_work_summary(
            stage.id, done, in_work, remaining
        )
        extra_meta.update(summary_meta)

    return enrich_stage_meta(
        stage.model_copy(
            update={
                "done": done,
                "inWork": in_work,
                "remaining": remaining,
            },
        ),
        extra_meta=extra_meta,
    )


def enrich_stage_meta(stage: "OwnerStageView", *, extra_meta: dict[str, Any] | None = None) -> "OwnerStageView":
    meta = dict(stage.meta)
    if extra_meta:
        meta.update(extra_meta)
    status = owner_status_from_readiness(stage.readiness)
    if status is not None:
        meta["owner_status"] = status
    if stage.id.startswith("default:") and meta.get("workspaceTitle"):
        meta["displayTitle"] = meta["workspaceTitle"]
    return stage.model_copy(update={"meta": meta})


def normalize_platform_stage_content(stage: "OwnerStageView") -> "OwnerStageView":
    remaining = list(stage.remaining)
    rewritten_remaining: list[str] = []
    for item in remaining:
        if "legacy" in item.casefold():
            rewritten_remaining.append("Отключение устаревших маршрутов уведомлений")
        else:
            rewritten_remaining.append(item)
    return enrich_stage_meta(stage.model_copy(update={"remaining": _unique_owner_strings(rewritten_remaining)}))


def normalize_company_stage_content(stage: "OwnerStageView") -> "OwnerStageView":
    meta = dict(stage.meta)
    meta["displayTitle"] = meta.get("workspaceTitle") or stage.title
    status = owner_status_from_readiness(stage.readiness)
    if status is not None:
        meta["owner_status"] = status
    return stage.model_copy(update={"meta": meta})


# --- History (T0.6 §4–§6) ---

_OWNER_HISTORY_TITLE_BY_TYPE: dict[str, str] = {
    "analysis": "Проверка готовности проекта",
    "readiness_stage": "Изменение готовности этапа развития",
    "readiness_component": "Изменение готовности платформенного контура",
    "decision": "Архитектурное решение",
    "milestone": "Веха разработки",
    "quality": "Событие качества",
}

_FORBIDDEN_TITLE_RE = re.compile(
    r"(dashboard_refresh|readiness_component|readiness_stage|"
    r"legacy-isolation|object-platform-independence|P\d+-W\d+|\bACE\b)",
    re.IGNORECASE,
)


def normalize_history_title(activity_type: str, title: str) -> str:
    mapped = _OWNER_HISTORY_TITLE_BY_TYPE.get(activity_type)
    if mapped:
        return mapped
    cleaned = _FORBIDDEN_TITLE_RE.sub("", str(title or "")).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or "Событие платформы"


_ANALYSIS_DESCRIPTION_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"анализ архитектуры", re.I), "Проведён анализ состояния платформы."),
    (re.compile(r"анализ", re.I), "Выполнена проверка готовности проекта."),
)


def normalize_history_description(activity_type: str, description: str) -> str:
    text = _strip_technical_markdown(description)
    if activity_type == "analysis":
        for pattern, phrase in _ANALYSIS_DESCRIPTION_PATTERNS:
            if pattern.search(text) or not text:
                return phrase
        return "Проведён анализ состояния платформы."
    if activity_type == "dashboard_refresh":
        match = re.search(r"(\d+)\s*%\s*→\s*(\d+)\s*%", text)
        if match:
            return f"Общая готовность платформы: {match.group(1)}% → {match.group(2)}%."
        return "Обновлены показатели готовности на Dashboard."
    if activity_type == "readiness_stage":
        return text or "Изменилась готовность этапа программы развития."
    if activity_type == "readiness_component":
        return text or "Изменилась готовность платформенного контура."
    return text


def _unique_owner_strings(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _format_refresh_day_title(count: int, day: date, *, is_latest_day: bool) -> str:
    if count <= 1:
        return "Последнее обновление Dashboard"
    day_label = day.strftime("%d.%m.%Y")
    if is_latest_day:
        return f"Dashboard обновлялся {count} раз за {day_label}"
    return f"Dashboard обновлялся {count} раз ({day_label})"


def aggregate_history_events(events: list["OwnerHistoryEvent"]) -> list["OwnerHistoryEvent"]:
    """Collapse noisy dashboard_refresh rows; normalize analysis descriptions."""
    from app.modules.platform_dashboard.owner_read_adapter import OwnerHistoryEvent

    if not events:
        return []

    refresh_buckets: dict[date, list["OwnerHistoryEvent"]] = defaultdict(list)
    others: list["OwnerHistoryEvent"] = []

    for event in events:
        activity_type = str(event.meta.get("activity_type") or "")
        if activity_type == "dashboard_refresh":
            day = event.occurred_at.date() if isinstance(event.occurred_at, datetime) else date.today()
            refresh_buckets[day].append(event)
        else:
            others.append(event)

    normalized_others: list["OwnerHistoryEvent"] = []
    for event in others:
        activity_type = str(event.meta.get("activity_type") or "")
        description = normalize_history_description(activity_type, event.description)
        title = normalize_history_title(activity_type, event.title)
        normalized_others.append(
            event.model_copy(
                update={
                    "title": title,
                    "description": description,
                    "meta": {
                        **event.meta,
                        "aggregated": False,
                    },
                },
            ),
        )

    latest_refresh_day = max(refresh_buckets.keys()) if refresh_buckets else None
    aggregated_refresh: list["OwnerHistoryEvent"] = []
    for day in sorted(refresh_buckets.keys(), reverse=True):
        bucket = refresh_buckets[day]
        bucket.sort(key=lambda item: item.occurred_at, reverse=True)
        latest = bucket[0]
        count = len(bucket)
        title = _format_refresh_day_title(count, day, is_latest_day=(day == latest_refresh_day))
        aggregated_refresh.append(
            OwnerHistoryEvent(
                id=f"refresh-aggregate-{day.isoformat()}",
                group_key="hist-dashboard",
                title=title,
                description=normalize_history_description("dashboard_refresh", latest.description),
                occurred_at=latest.occurred_at,
                initiated_by=latest.initiated_by,
                meta={
                    "activity_type": "dashboard_refresh",
                    "aggregated": True,
                    "aggregate_count": count,
                    "aggregate_day": day.isoformat(),
                    "source_event_ids": [item.id for item in bucket[:20]],
                },
            ),
        )

    combined = normalized_others + aggregated_refresh
    combined.sort(key=lambda item: item.occurred_at, reverse=True)
    return combined


def normalize_owner_history_events(events: list["OwnerHistoryEvent"]) -> list["OwnerHistoryEvent"]:
    return aggregate_history_events(events)
