"""Canonical rollback policy as structured data (foundation phase)."""

from __future__ import annotations

from app.modules.platform_migration_rollback.constants import RollbackMode

ROLLBACK_POLICY_VERSION = "1.0.0"

ROLLBACK_ALLOWED_CASES: list[dict[str, str]] = [
    {
        "case": "code_only",
        "description": "Изменился только код; schema_revision не изменился",
        "mode": RollbackMode.CODE_ONLY.value,
    },
    {
        "case": "config_only",
        "description": "Изменились настройки или конфигурации без DDL",
        "mode": RollbackMode.CONFIG_RESTORE.value,
    },
    {
        "case": "dev_schema_downgrade",
        "description": "Обратная миграция schema — только DEV/staging и low-risk revisions",
        "mode": RollbackMode.SCHEMA_DOWNGRADE.value,
    },
    {
        "case": "backup_restore",
        "description": "Production path при изменении schema — restore verified backup",
        "mode": RollbackMode.BACKUP_RESTORE.value,
    },
]

ROLLBACK_BLOCKED_CASES: list[dict[str, str]] = [
    {
        "case": "schema_ahead",
        "description": "База новее целевой версии без подтверждённого backup",
    },
    {
        "case": "data_destructive",
        "description": "Миграция удалила или необратимо изменила данные",
    },
    {
        "case": "high_risk_migration",
        "description": "Revision с risk_class=high (backfill, drop_table)",
    },
    {
        "case": "version_mismatch",
        "description": "Код и schema_revision несовместимы",
    },
]

BLOCKED_ROLLBACK_OFFICIAL_SCENARIO: list[str] = [
    "STOP — не откатывать код и не запускать alembic downgrade",
    "ASSESS — зафиксировать platform_version, schema_revision, симптом",
    "RESTORE — восстановить БД из последнего verified backup",
    "ALIGN — выровнять код до версии, привязанной к backup",
    "JOURNAL — запись в DEV Journal",
]

PRE_UPDATE_BACKUP_MINIMUM: list[str] = [
    "pg_dump файл PostgreSQL",
    "platform_version до обновления",
    "schema_revision до обновления",
    "дата и автор",
]

BACKUP_FILENAME_CONVENTION = (
    "backup_{schema_revision}_{platform_version}_{timestamp}.sql"
)

COMPATIBILITY_ALGORITHM_STEPS: list[str] = [
    "Загрузить target_binding из platform_version_schema_catalog",
    "Если binding отсутствует — BLOCK (unknown_version)",
    "Если current_schema_revision == target — ALLOW code_only",
    "Если current > target и нет backup — BLOCK (schema_ahead_no_backup)",
    "Если current > target и есть verified backup — ALLOW backup_restore",
    "Если current < target — BLOCK (schema_behind_code)",
    "schema_downgrade — только DEV и без high-risk revisions в диапазоне",
]

RECOVERY_SCENARIOS: list[dict[str, object]] = [
    {
        "id": "successful_rollback",
        "title": "Успешный откат",
        "system": [
            "Проверяет совпадение schema_revision",
            "Разрешает code_only",
        ],
        "administrator": [
            "Откатывает код до целевой версии",
            "Проверяет health",
            "Фиксирует результат в journal",
        ],
    },
    {
        "id": "rollback_impossible",
        "title": "Откат невозможен",
        "system": [
            "BLOCK с причиной и recommended_action",
        ],
        "administrator": [
            "Не откатывает код вслепую",
            "Выбирает restore backup или forward-fix",
        ],
    },
    {
        "id": "backup_restore",
        "title": "Восстановление из резервной копии",
        "system": [
            "Находит backup по schema_revision и version (post-MVP registry)",
        ],
        "administrator": [
            "Останавливает трафик",
            "Восстанавливает pg_dump",
            "Выравнивает код по каталогу версий",
        ],
    },
]
