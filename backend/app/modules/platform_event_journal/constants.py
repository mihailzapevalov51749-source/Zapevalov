from enum import Enum


class PlatformEventJournalType(str, Enum):
    DEVELOPMENT = "development"
    FIX = "fix"
    AUDIT = "audit"
    ARCHITECTURE = "architecture"
    TEMPLATE_TRANSFER = "template_transfer"
    PUBLISH = "publish"


class PlatformEventJournalStatus(str, Enum):
    DONE = "done"
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    PLANNED = "planned"


class PlatformEventJournalSource(str, Enum):
    SEED = "seed"
    CURSOR = "cursor"
    MANUAL = "manual"


PLATFORM_EVENT_JOURNAL_TYPE_LABELS = {
    PlatformEventJournalType.DEVELOPMENT.value: "Разработка",
    PlatformEventJournalType.FIX.value: "Исправление",
    PlatformEventJournalType.AUDIT.value: "Аудит",
    PlatformEventJournalType.ARCHITECTURE.value: "Архитектурное решение",
    PlatformEventJournalType.TEMPLATE_TRANSFER.value: "Передача в Template",
    PlatformEventJournalType.PUBLISH.value: "Публикация",
}

PLATFORM_EVENT_JOURNAL_STATUS_LABELS = {
    PlatformEventJournalStatus.DONE.value: "Готово",
    PlatformEventJournalStatus.COMPLETED.value: "Выполнено",
    PlatformEventJournalStatus.IN_PROGRESS.value: "В работе",
    PlatformEventJournalStatus.PLANNED.value: "Запланировано",
}
