from enum import Enum


class PlatformEventJournalType(str, Enum):
    DEVELOPMENT = "development"
    FIX = "fix"
    AUDIT = "audit"
    ARCHITECTURE = "architecture"
    TEMPLATE_TRANSFER = "template_transfer"
    PUBLISH = "publish"
    SETTINGS_CHANGE = "settings_change"
    UX_IMPROVEMENT = "ux_improvement"
    COMPANY_CREATION = "company_creation"
    PROVISIONING = "provisioning"


class PlatformEventJournalStatus(str, Enum):
    DONE = "done"
    ERROR = "error"
    WARNING = "warning"
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    PLANNED = "planned"


class PlatformEventJournalSource(str, Enum):
    SEED = "seed"
    CURSOR = "cursor"
    MANUAL = "manual"


class PlatformEventJournalScope(str, Enum):
    PLATFORM = "platform"
    TENANT = "tenant"
    LEGACY = "legacy"
    SYSTEM = "system"


class PlatformEventJournalKind(str, Enum):
    PLATFORM_AUDIT = "platform_audit"
    DEV_DEVELOPMENT = "dev_development"
    TENANT_CONFIGURATION = "tenant_configuration"


# Legacy seed / Cursor development types — belong in DEV development journal.
DEVELOPMENT_LEGACY_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "architecture",
        "fix",
        "development",
        "ux_improvement",
        "refactoring",
    }
)

# Legacy types that represent platform Control Plane audit (not product development).
PLATFORM_AUDIT_LEGACY_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "company_creation",
        "provisioning",
        "settings_change",
        "audit",
    }
)


PLATFORM_EVENT_JOURNAL_TYPE_LABELS = {
    PlatformEventJournalType.DEVELOPMENT.value: "Разработка",
    PlatformEventJournalType.FIX.value: "Исправление",
    PlatformEventJournalType.AUDIT.value: "Аудит",
    PlatformEventJournalType.ARCHITECTURE.value: "Архитектурное решение",
    PlatformEventJournalType.TEMPLATE_TRANSFER.value: "Передача в Template",
    PlatformEventJournalType.PUBLISH.value: "Публикация",
    PlatformEventJournalType.SETTINGS_CHANGE.value: "Изменение настроек",
    PlatformEventJournalType.UX_IMPROVEMENT.value: "UX улучшение",
    PlatformEventJournalType.COMPANY_CREATION.value: "Создание компании",
    PlatformEventJournalType.PROVISIONING.value: "Provisioning",
}

PLATFORM_EVENT_JOURNAL_STATUS_LABELS = {
    PlatformEventJournalStatus.DONE.value: "Готово",
    PlatformEventJournalStatus.ERROR.value: "Ошибка",
    PlatformEventJournalStatus.WARNING.value: "Предупреждение",
    PlatformEventJournalStatus.COMPLETED.value: "Выполнено",
    PlatformEventJournalStatus.IN_PROGRESS.value: "В работе",
    PlatformEventJournalStatus.PLANNED.value: "Запланировано",
}
