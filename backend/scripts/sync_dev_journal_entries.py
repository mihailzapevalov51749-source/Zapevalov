#!/usr/bin/env python3
"""Sync DEV journal: bootstrap seed entries + backfill audit slugs missing from DB."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_event_journal.constants import PlatformEventJournalType
from app.modules.platform_event_journal.cursor_dev_journal import record_cursor_dev_event
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.service import ensure_platform_event_journal_bootstrap

BACKFILL_ENTRIES = (
    {
        "slug": "object-table-tenant-isolation-audit",
        "title": "Аудит изоляции Object Table между tenant",
        "description": (
            "Категория: Tenant Isolation. "
            "Проверена загрузка, фильтрация, поиск, экспорт, lookup, создание, "
            "редактирование, кэширование и race protection Object Table в контексте "
            "tenant isolation. Universal Table не учитывался. "
            "SQL-изоляция runtime_entities корректна; выявлен риск отсутствия "
            "проверки membership пользователя на runtime API."
        ),
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
    {
        "slug": "object-views-tenant-isolation-audit",
        "title": "Аудит изоляции Object Views между tenant",
        "description": (
            "Категория: Tenant Isolation. "
            "Проверена изоляция published views, office user views, настроек представлений, "
            "кэшей, маршрутов, Plan View и Quick Form между tenant."
        ),
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
    {
        "slug": "zadachnik-menu-regression-after-ut-removal",
        "title": "Регрессия отображения Задачника после удаления Universal Table",
        "description": (
            "Категория: Navigation. "
            "После PR-3A cleanup object_type nav zadachnik сохранил title «Мои задачи» от legacy UT. "
            "Фильтр removed_system_menu_items скрывал пункт в Office sidebar. "
            "Минимальный фикс: сузить фильтр до type=universal_table."
        ),
        "event_type": PlatformEventJournalType.AUDIT.value,
    },
)


def main() -> None:
    db = SessionLocal()
    try:
        bootstrap_created = ensure_platform_event_journal_bootstrap(db)
        backfill_created = 0

        for entry in BACKFILL_ENTRIES:
            slug = entry["slug"]
            exists = (
                db.query(PlatformEventJournalEntry.id)
                .filter(PlatformEventJournalEntry.slug == slug)
                .first()
            )
            if exists is not None:
                continue

            created = record_cursor_dev_event(
                db,
                slug=slug,
                title=entry["title"],
                description=entry["description"],
                event_type=entry["event_type"],
                commit=False,
            )
            if created is not None:
                backfill_created += 1

        db.commit()
        print(f"bootstrap_created={bootstrap_created} backfill_created={backfill_created}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
