"""Backfill missing DEV journal entries for work items after calendar MVP."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_event_journal.audit_service import get_journal_entry_by_slug
from app.modules.platform_event_journal.constants import PlatformEventJournalType
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.work_item_journal import (
    WorkItemJournalPayload,
    create_work_item_journal_entry,
)

ALIAS_SKIP_IF_EXISTS = {
    "runtime-navigation-duplicates-repair": "repair-dev-runtime-navigation-duplicates",
}

BACKFILL_ITEMS: tuple[WorkItemJournalPayload, ...] = (
    WorkItemJournalPayload(
        slug="calendar-context-menu-create-event-actions",
        title="Контекстное меню календаря: создание события",
        summary=(
            "Добавлены действия контекстного меню слота и события календаря "
            "(создание события из ячейки/слота, действия над событием)."
        ),
        work_item_type="feature",
        root_cause="Не было единого UX создания события из grid slot в week/day/month views.",
        changed_files=[
            "frontend/src/modules/calendar/utils/calendarContextMenu.js",
            "frontend/src/modules/calendar/components/CalendarContextMenu.jsx",
            "frontend/src/modules/calendar/pages/CorporateCalendarPage.jsx",
            "frontend/src/modules/calendar/components/CalendarWeekView.jsx",
            "frontend/src/modules/calendar/components/CalendarDayView.jsx",
            "frontend/src/modules/calendar/components/CalendarMonthView.jsx",
        ],
        tests="calendarContextMenu.test.js, calendarMvp.test.js",
        manual_smoke="NOT PERFORMED — backfill entry; verify context menu in browser.",
        cleanup="NOT REQUIRED",
        environment_integrity="runtime.calendar opens; context menu wired in views.",
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        category_ru="Календарь",
    ),
    WorkItemJournalPayload(
        slug="fix-calendar-context-menu-ui-not-working",
        title="Исправление: контекстное меню календаря не открывалось",
        summary="Починено открытие и обработка CalendarContextMenu в runtime calendar page.",
        work_item_type="fix",
        root_cause="Context menu state/handlers не были полностью связаны с view components.",
        changed_files=[
            "frontend/src/modules/calendar/pages/CorporateCalendarPage.jsx",
            "frontend/src/modules/calendar/components/CalendarContextMenu.jsx",
            "frontend/src/modules/calendar/utils/calendarContextMenu.js",
        ],
        tests="calendarMvp.test.js context menu wiring",
        manual_smoke="NOT PERFORMED — backfill entry.",
        event_type=PlatformEventJournalType.FIX.value,
        category_ru="Календарь",
    ),
    WorkItemJournalPayload(
        slug="calendar-week-sticky-day-header",
        title="Sticky day header в недельном и дневном виде календаря",
        summary="Заголовок дня закреплён внутри scroll container week/day views.",
        work_item_type="feature",
        root_cause="При прокрутке сетки терялся контекст текущего дня.",
        changed_files=[
            "frontend/src/modules/calendar/components/CalendarWeekView.jsx",
            "frontend/src/modules/calendar/components/CalendarDayView.jsx",
        ],
        tests="calendarMvp.test.js sticky header assertions",
        manual_smoke="NOT PERFORMED — backfill entry.",
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        category_ru="Календарь",
    ),
    WorkItemJournalPayload(
        slug="runtime-menu-settings-inheritance",
        title="Наследование runtime menu settings из platform template",
        summary=(
            "Tenant runtime menu settings: API, merge layers, clone from template, "
            "замена localStorage для tenant-level menu."
        ),
        work_item_type="architecture",
        root_cause="Tenant menu хранился в localStorage без server-side inheritance.",
        changed_files=[
            "backend/app/modules/platform/runtime/menu_settings/",
            "backend/alembic/versions/20260613_0049_runtime_menu_settings.py",
            "frontend/src/shared/navigation/useRuntimeMenuLayerSettings.js",
            "frontend/src/shared/navigation/mergeRuntimeMenuLayers.js",
            "frontend/src/modules/navigation/api/runtimeMenuSettingsApi.js",
        ],
        tests="mergeRuntimeMenuLayers.test.js, menu settings backend tests",
        manual_smoke="NOT PERFORMED — backfill entry.",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        category_ru="Навигация",
    ),
    WorkItemJournalPayload(
        slug="fix-left-sidebar-missing-menu-items",
        title="Исправление: пропадающие пункты левого меню",
        summary="Восстановлено отображение runtime system items после merge/filter regressions.",
        work_item_type="fix",
        root_cause="Фильтры removed items и merge layers скрывали runtime system keys.",
        changed_files=[
            "frontend/src/shared/navigation/removedSystemMenuItems.js",
            "frontend/src/shared/shell/sidebar/components/AppSidebarRenderer.jsx",
            "frontend/src/modules/navigation/components/MenuTree.jsx",
        ],
        tests="navigationMenuBlockLabels.test.js, mergeRuntimeMenuLayers.test.js",
        manual_smoke="NOT PERFORMED — backfill entry.",
        event_type=PlatformEventJournalType.FIX.value,
        category_ru="Навигация",
    ),
    WorkItemJournalPayload(
        slug="user-personal-menu-settings-access",
        title="Доступ user к «Мои настройки меню»",
        summary="User мог открыть personalize mode через gear/open-menu-settings routing.",
        work_item_type="feature",
        root_cause="open-menu-settings требовал canEditMenu вместо canPersonalizeMenu.",
        changed_files=[
            "frontend/src/shared/shell/sidebar/usePlatformSidebarControls.js",
            "frontend/src/shared/shell/sidebar/sidebarAdapters.ts",
            "frontend/src/layouts/PortalLayout.jsx",
        ],
        tests="menuSettingsPermissions.test.js (historical)",
        manual_smoke="SUPERSEDED — personalization later disabled.",
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        category_ru="Навигация",
    ),
    WorkItemJournalPayload(
        slug="user-menu-dnd-fix",
        title="Исправление drag-and-drop user menu в block mode",
        summary="Personalize DnD: blocks + holdPersonalBlocksRef + skipBlocksSyncRef.",
        work_item_type="fix",
        root_cause="После drop blocks пересобирались из rootItems и откатывали draft.",
        changed_files=[
            "frontend/src/shared/shell/sidebar/components/AppSidebarRenderer.jsx",
            "frontend/src/modules/navigation/hooks/useBlockedMenuDragAndDrop.js",
        ],
        tests="menuSettingsPermissions.test.js blocked DnD contract",
        manual_smoke="SUPERSEDED — personalization disabled.",
        event_type=PlatformEventJournalType.FIX.value,
        category_ru="Навигация",
    ),
    WorkItemJournalPayload(
        slug="disable-user-personal-left-menu-editing",
        title="Отключено пользовательское редактирование левого меню",
        summary=(
            "User не редактирует левое меню; только admin/superadmin tenant-level settings. "
            "user_menu_preferences не применяются к rendered menu."
        ),
        work_item_type="architecture",
        root_cause="User personalization давала серию регрессий (gear, DnD, blocks, reset).",
        changed_files=[
            "frontend/src/layouts/PortalLayout.jsx",
            "frontend/src/shared/shell/sidebar/sidebarAdapters.ts",
            "frontend/src/shared/navigation/useRuntimeMenuLayerSettings.js",
            "frontend/src/shared/shell/sidebar/components/AppSidebarRenderer.jsx",
            "backend/scripts/repair_user_menu_preferences.py",
        ],
        tests="menuSettingsPermissions.test.js, mergeRuntimeMenuLayers.test.js (37 pass)",
        manual_smoke="NOT PERFORMED — verify user has no gear; admin edit persists to tenant.",
        cleanup="repair_user_menu_preferences.py dry-run/apply for broken user prefs",
        environment_integrity="Tenant menu only; runtime.chat/calendar/notifications unchanged.",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        category_ru="Навигация",
    ),
    WorkItemJournalPayload(
        slug="notification-object-opening-audit",
        title="Аудит открытия объектов из уведомлений",
        summary=(
            "Read-only audit notification payloads/target context; "
            "repair script for legacy calendar/chat targets."
        ),
        work_item_type="audit",
        root_cause="Legacy notifications lacked normalized target context for runtime open.",
        changed_files=[
            "backend/scripts/audit_dev_notifications.py",
            "backend/scripts/repair_legacy_notification_targets.py",
            "backend/app/modules/notifications/target_context.py",
        ],
        tests="notification target context unit tests",
        manual_smoke="NOT PERFORMED — backfill entry.",
        event_type=PlatformEventJournalType.AUDIT.value,
        category_ru="Уведомления",
    ),
)


def main() -> None:
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        for payload in BACKFILL_ITEMS:
            alias_slug = ALIAS_SKIP_IF_EXISTS.get(payload.slug)
            if alias_slug and get_journal_entry_by_slug(db, alias_slug) is not None:
                print(f"SKIP {payload.slug} (alias exists: {alias_slug})")
                skipped += 1
                continue

            result = create_work_item_journal_entry(db, payload, commit=False)
            if result is None:
                print(f"SKIP {payload.slug} (already exists)")
                skipped += 1
            else:
                print(f"CREATE {payload.slug} -> id={result.id}")
                created += 1

        db.commit()
        print(f"backfill_created={created} backfill_skipped={skipped}")

        total = db.query(PlatformEventJournalEntry).count()
        print(f"total_journal_entries={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
