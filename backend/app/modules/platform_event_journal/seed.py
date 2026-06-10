from dataclasses import dataclass

from app.modules.platform_event_journal.constants import (
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)


@dataclass(frozen=True)
class PlatformEventJournalSeedEntry:
    slug: str
    title: str
    description: str
    event_type: str = PlatformEventJournalType.ARCHITECTURE.value
    status: str = PlatformEventJournalStatus.DONE.value
    author: str = "Cursor"


PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES: tuple[PlatformEventJournalSeedEntry, ...] = (
    PlatformEventJournalSeedEntry(
        slug="platform-section-removed",
        title="Удалён раздел Платформа из Studio",
        description=(
            "Раздел «Платформа» убран из меню Studio. "
            "Вместо контейнера с Dashboard добавлен прямой пункт «Журнал событий»."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-disabled-studio",
        title="Отключён Dashboard в Studio",
        description=(
            "PlatformDevelopmentPage отключена от маршрутов Studio. "
            "Dashboard, готовность, компоненты, стадии и связанные вкладки больше не отображаются."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="event-journal-created",
        title="Создан Журнал событий",
        description=(
            "В DEV Studio добавлен раздел «Журнал событий» — "
            "единый источник истории развития платформы."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-hidden-template",
        title="Скрыт Dashboard в TEMPLATE",
        description=(
            "В контуре TEMPLATE скрыты пункты «Платформа», «Журнал событий» и Dashboard. "
            "Legacy-маршруты перенаправляются в рабочие разделы Studio."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-hidden-demo",
        title="Скрыт Dashboard в DEMO",
        description=(
            "В контуре DEMO скрыты пункты «Платформа», «Журнал событий» и Dashboard."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-hidden-client",
        title="Скрыт Dashboard в CLIENT",
        description=(
            "В контуре CLIENT скрыты пункты «Платформа», «Журнал событий» и Dashboard."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="event-journal-improved",
        title="Усовершенствован Журнал событий",
        description=(
            "Журнал очищен от Dashboard-событий, введено обязательное логирование "
            "всех задач платформы, оптимизирован интерфейс отображения."
        ),
    ),
)
