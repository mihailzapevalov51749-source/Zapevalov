"""Normalize DEV/Cursor journal entries to corporate Russian product format."""

from __future__ import annotations

import re
from typing import TypedDict

from app.modules.platform_event_journal.constants import PlatformEventJournalType
from app.modules.platform_event_journal.journal_user_format import (
    build_user_facing_description,
    contains_forbidden_journal_content,
    format_user_facing_title,
    sanitize_journal_description_for_display,
    uses_legacy_journal_format,
)
from app.modules.platform_event_journal.tenant_audit_constants import TenantEventCategory

_CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")
_LATIN_RE = re.compile(r"[A-Za-z]")


class DevJournalContentSpec(TypedDict, total=False):
    title: str
    category_ru: str
    event_type: str
    description: str


# Slug → canonical Russian content (slug stays English in DB).
DEV_JOURNAL_SLUG_CONTENT: dict[str, DevJournalContentSpec] = {
    "activate-change-company-administrator": {
        "title": "Смена администратора компании",
        "category_ru": "Компании",
        "event_type": PlatformEventJournalType.DEVELOPMENT.value,
        "description": (
            "Что сделано:\n"
            "В Control Plane активирован сценарий смены администратора компании.\n\n"
            "Результат:\n"
            "Platform admin может назначить нового владельца компании из карточки «Компании».\n\n"
            "Влияние на платформу:\n"
            "Управление компаниями стало безопаснее и понятнее."
        ),
    },
    "frontend-platform-access-isolation-audit": {
        "title": "Аудит изоляции доступа к платформе на frontend",
        "category_ru": "Control Plane",
        "event_type": PlatformEventJournalType.AUDIT.value,
        "description": (
            "Категория: Control Plane.\n"
            "Что изменено: проведён аудит маршрутов, меню и guard'ов platform-wide разделов.\n"
            "Зачем: выявить утечки ссылок и страниц для tenant-ролей после усиления backend.\n"
            "Результат: зафиксирован gap canAccessControlPlane без проверки tenant_id."
        ),
    },
    "frontend-control-plane-role-isolation-fix": {
        "title": "Исправление изоляции ролей Control Plane на frontend",
        "category_ru": "Безопасность",
        "event_type": PlatformEventJournalType.FIX.value,
        "description": (
            "Категория: Безопасность.\n"
            "Что изменено: canAccessControlPlane учитывает tenant_id и блокирует tenant admin.\n"
            "Зачем: синхронизировать frontend с backend require_platform_admin.\n"
            "Результат: tenant admin больше не видит shell Control Plane."
        ),
    },
    "platform-event-journal-role-isolation-fix": {
        "title": "Исправление изоляции ролей журнала событий",
        "category_ru": "Безопасность",
        "event_type": PlatformEventJournalType.FIX.value,
        "description": (
            "Категория: Журнал событий.\n"
            "Что изменено: добавлены role gate для GET/POST /platform-event-journal.\n"
            "Зачем: закрыть доступ tenant-пользователей к platform-wide audit trail.\n"
            "Результат: журнал событий платформы доступен только platform-ролям."
        ),
    },
    "platform-event-journal-content-normalization-audit": {
        "title": "Нормализация содержимого журнала событий",
        "category_ru": "Журнал событий",
        "event_type": PlatformEventJournalType.AUDIT.value,
        "description": (
            "Категория: Журнал событий.\n"
            "Что изменено: зафиксирован корпоративный стандарт title/description и нормализация "
            "записей Cursor.\n"
            "Зачем: журнал не должен выглядеть как git log или технический audit log.\n"
            "Результат: новые DEV-записи пишутся на русском языке."
        ),
    },
    "remove-dead-platform-dashboard-surface": {
        "title": "Удалена неиспользуемая поверхность Platform Dashboard",
        "category_ru": "Control Plane",
        "event_type": PlatformEventJournalType.ARCHITECTURE.value,
        "description": (
            "Категория: Control Plane.\n"
            "Что изменено: удалены мёртвые UI/API маршруты Platform Dashboard.\n"
            "Зачем: убрать дублирующий и незащищённый platform-wide surface.\n"
            "Результат: governance core сохранён, dead surface удалён."
        ),
    },
    "platform-dashboard-removal-dependency-audit": {
        "title": "Аудит зависимостей перед удалением Platform Dashboard",
        "category_ru": "Архитектура",
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
    "platform-dashboard-to-governance-impact-audit": {
        "title": "Аудит перехода platform_dashboard → platform_governance",
        "category_ru": "Архитектура",
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
    "platform-role-isolation-audit": {
        "title": "Аудит изоляции platform-ролей",
        "category_ru": "Безопасность",
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
    "quality-issues-role-isolation-fix": {
        "title": "Исправление изоляции ролей реестра проблем качества",
        "category_ru": "Безопасность",
        "event_type": PlatformEventJournalType.FIX.value,
    },
    "calendar-context-menu-create-event-actions": {
        "title": "Контекстное меню календаря: создание события",
        "category_ru": "Календарь",
        "event_type": PlatformEventJournalType.DEVELOPMENT.value,
    },
    "fix-calendar-context-menu-ui-not-working": {
        "title": "Исправление: контекстное меню календаря",
        "category_ru": "Календарь",
        "event_type": PlatformEventJournalType.FIX.value,
    },
    "calendar-week-sticky-day-header": {
        "title": "Sticky day header в календаре",
        "category_ru": "Календарь",
        "event_type": PlatformEventJournalType.DEVELOPMENT.value,
    },
    "runtime-menu-settings-inheritance": {
        "title": "Наследование runtime menu settings",
        "category_ru": "Навигация",
        "event_type": PlatformEventJournalType.ARCHITECTURE.value,
    },
    "fix-left-sidebar-missing-menu-items": {
        "title": "Исправление: пропадающие пункты левого меню",
        "category_ru": "Навигация",
        "event_type": PlatformEventJournalType.FIX.value,
    },
    "user-personal-menu-settings-access": {
        "title": "Доступ user к настройкам меню",
        "category_ru": "Навигация",
        "event_type": PlatformEventJournalType.DEVELOPMENT.value,
    },
    "user-menu-dnd-fix": {
        "title": "Исправление DnD user menu",
        "category_ru": "Навигация",
        "event_type": PlatformEventJournalType.FIX.value,
    },
    "disable-user-personal-left-menu-editing": {
        "title": "Отключено пользовательское редактирование левого меню",
        "category_ru": "Навигация",
        "event_type": PlatformEventJournalType.ARCHITECTURE.value,
    },
    "notification-object-opening-audit": {
        "title": "Аудит открытия объектов из уведомлений",
        "category_ru": "Уведомления",
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
}

_SLUG_TOKEN_RU: dict[str, str] = {
    "activate": "активация",
    "audit": "аудит",
    "backend": "backend",
    "bridge": "мост",
    "change": "изменение",
    "checklists": "чек-листы",
    "comments": "комментарии",
    "company": "компании",
    "consistency": "согласованность",
    "control": "control",
    "dashboard": "dashboard",
    "dead": "неиспользуемый",
    "dependency": "зависимости",
    "designer": "designer",
    "development": "разработка",
    "document": "документы",
    "documents": "документы",
    "event": "журнал",
    "files": "файлы",
    "final": "финальный",
    "fix": "исправление",
    "frontend": "интерфейс",
    "governance": "управление",
    "hotfix": "исправление",
    "impact": "влияние",
    "isolation": "изоляция",
    "journal": "журнал",
    "libraries": "библиотеки",
    "normalization": "нормализация",
    "notes": "заметки",
    "notification": "уведомления",
    "notifications": "уведомления",
    "office": "office",
    "orphan": "осиротевшие",
    "overlay": "overlay",
    "platform": "платформа",
    "remediation": "исправление",
    "removal": "удаление",
    "remove": "удаление",
    "role": "роли",
    "roles": "роли",
    "runtime": "runtime",
    "security": "безопасность",
    "smoke": "smoke",
    "tenant": "тенант",
    "test": "проверка",
    "user": "пользователи",
    "workspace": "рабочие пространства",
    "yasii": "YASII",
}

_EVENT_TYPE_PREFIX_RU: dict[str, str] = {
    PlatformEventJournalType.AUDIT.value: "Аудит",
    PlatformEventJournalType.FIX.value: "Исправление",
    PlatformEventJournalType.ARCHITECTURE.value: "Архитектурное решение",
    PlatformEventJournalType.DEVELOPMENT.value: "Разработка",
    PlatformEventJournalType.UX_IMPROVEMENT.value: "Улучшение интерфейса",
}

_CATEGORY_RU_TO_TENANT: dict[str, str] = {
    "Навигация": TenantEventCategory.NAVIGATION.value,
    "Безопасность": TenantEventCategory.SETTINGS.value,
    "Документы": TenantEventCategory.DOCUMENTS.value,
    "Журнал событий": TenantEventCategory.SYSTEM.value,
    "Компании": TenantEventCategory.SETTINGS.value,
    "Пользователи": TenantEventCategory.SETTINGS.value,
    "YASII": TenantEventCategory.SYSTEM.value,
    "Control Plane": TenantEventCategory.SETTINGS.value,
    "Архитектура": TenantEventCategory.SYSTEM.value,
    "Система": TenantEventCategory.SYSTEM.value,
}


def contains_cyrillic(text: str | None) -> bool:
    return bool(text and _CYRILLIC_RE.search(text))


def is_mostly_english(text: str | None) -> bool:
    if not text or not str(text).strip():
        return False
    normalized = str(text).strip()
    latin_count = len(_LATIN_RE.findall(normalized))
    cyrillic_count = len(_CYRILLIC_RE.findall(normalized))
    if latin_count == 0:
        return False
    return cyrillic_count == 0 or latin_count > cyrillic_count * 2


def infer_event_type_from_slug(slug: str) -> str:
    normalized = str(slug or "").strip().lower()
    if "audit" in normalized:
        return PlatformEventJournalType.AUDIT.value
    if any(token in normalized for token in ("fix", "hotfix", "remediation", "isolation")):
        return PlatformEventJournalType.FIX.value
    if any(token in normalized for token in ("architecture", "governance", "removal", "refactor")):
        return PlatformEventJournalType.ARCHITECTURE.value
    return PlatformEventJournalType.DEVELOPMENT.value


def infer_category_ru_from_slug(slug: str) -> str:
    normalized = str(slug or "").strip().lower()
    if "event-journal" in normalized or "journal" in normalized:
        return "Журнал событий"
    if "company" in normalized or "administrator" in normalized:
        return "Компании"
    if "yasii" in normalized:
        return "YASII"
    if "document" in normalized or "library" in normalized or "libraries" in normalized:
        return "Документы"
    if "navigation" in normalized or "menu" in normalized:
        return "Навигация"
    if "dashboard" in normalized or "control-plane" in normalized or "frontend" in normalized:
        return "Control Plane"
    if any(token in normalized for token in ("isolation", "security", "role", "auth", "idor")):
        return "Безопасность"
    if "audit" in normalized or "architecture" in normalized or "governance" in normalized:
        return "Архитектура"
    return "Система"


def slug_to_russian_title(slug: str, *, event_type: str | None = None) -> str:
    normalized_slug = str(slug or "").strip().lower()
    spec = DEV_JOURNAL_SLUG_CONTENT.get(normalized_slug)
    if spec and spec.get("title"):
        return str(spec["title"])

    resolved_event_type = event_type or infer_event_type_from_slug(normalized_slug)
    prefix = _EVENT_TYPE_PREFIX_RU.get(resolved_event_type, "Изменение")

    tokens = [token for token in normalized_slug.split("-") if token]
    translated = []
    for token in tokens:
        translated.append(_SLUG_TOKEN_RU.get(token, token))

    body = " ".join(translated).strip()
    if not body:
        body = normalized_slug.replace("-", " ")
    return f"{prefix}: {body}"


def build_corporate_description(
    *,
    category_ru: str,
    title_ru: str,
    source_description: str | None,
    event_type: str | None = None,
) -> str:
    _ = category_ru
    if source_description and source_description.strip().lower().startswith("что сделано:"):
        if not contains_forbidden_journal_content(source_description):
            return source_description.strip()

    if source_description and not uses_legacy_journal_format(source_description):
        if contains_cyrillic(source_description) and not is_mostly_english(source_description):
            if not contains_forbidden_journal_content(source_description):
                return build_user_facing_description(
                    summary=source_description.strip(),
                    work_item_type=event_type,
                )

    summary = title_ru
    if ":" in summary:
        summary = summary.split(":", 1)[1].strip() or summary

    return build_user_facing_description(
        summary=summary,
        work_item_type=event_type,
    )


def resolve_dev_journal_category(event_type: str, slug: str, category_ru: str) -> str:
    mapped = _CATEGORY_RU_TO_TENANT.get(category_ru)
    if mapped:
        return mapped
    return TenantEventCategory.SYSTEM.value


def normalize_dev_journal_content(
    *,
    slug: str | None,
    title: str,
    description: str | None,
    event_type: str,
) -> tuple[str, str | None, str, str]:
    normalized_slug = str(slug or "").strip().lower()
    spec = DEV_JOURNAL_SLUG_CONTENT.get(normalized_slug, {})

    resolved_event_type = str(spec.get("event_type") or event_type or "").strip().lower()
    inferred_event_type = infer_event_type_from_slug(normalized_slug)
    if not resolved_event_type:
        resolved_event_type = inferred_event_type
    elif (
        resolved_event_type == PlatformEventJournalType.DEVELOPMENT.value
        and inferred_event_type != PlatformEventJournalType.DEVELOPMENT.value
    ):
        resolved_event_type = inferred_event_type

    category_ru = str(spec.get("category_ru") or infer_category_ru_from_slug(normalized_slug))

    if spec.get("title"):
        normalized_title = str(spec["title"])
    elif is_mostly_english(title):
        normalized_title = slug_to_russian_title(normalized_slug, event_type=resolved_event_type)
    else:
        normalized_title = str(title or "").strip() or slug_to_russian_title(normalized_slug)

    normalized_title = format_user_facing_title(
        normalized_title,
        event_type=resolved_event_type,
    )

    if spec.get("description"):
        normalized_description = str(spec["description"])
    else:
        normalized_description = build_corporate_description(
            category_ru=category_ru,
            title_ru=normalized_title,
            source_description=description,
            event_type=resolved_event_type,
        )

    normalized_description = sanitize_journal_description_for_display(
        description=normalized_description,
        title=normalized_title,
        metadata=None,
        event_type=resolved_event_type,
        slug=normalized_slug,
    )

    resolved_category = resolve_dev_journal_category(
        resolved_event_type,
        normalized_slug,
        category_ru,
    )

    return normalized_title, normalized_description, resolved_event_type, resolved_category
