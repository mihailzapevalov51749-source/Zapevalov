# Migration Rollback Foundation — Report

**Дата:** 2026-06-15  
**WI:** Migration Rollback Foundation — фундамент безопасного возврата  
**Статус:** **DONE**

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- Publication Guard Rules (без изменений guards)
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

---

## Executive Summary

Создан **фундамент безопасного возврата** к предыдущей версии: каноническая политика отката, привязка версии платформы к revision структуры БД, алгоритм проверки совместимости (проект), политика backup, проект реестра backup, сценарии восстановления.

**Не реализовано (сознательно):** Build Registry, Release Package, Deployment Registry, CI/CD, автоматический deploy, реальные backup, runtime compatibility gate.

**Канонический документ:** [`docs/architecture/MIGRATION_ROLLBACK_FOUNDATION.md`](../architecture/MIGRATION_ROLLBACK_FOUNDATION.md)

---

## Задача 1 — Политика отката

### Когда откат разрешён

| Случай | Режим |
|--------|-------|
| Изменился только код | `code_only` |
| Настройки / конфигурации | `config_restore` |
| Schema downgrade | `schema_downgrade` — только DEV |
| Production с миграцией | `backup_restore` — после verified backup |

### Когда откат запрещён

- База новее целевой версии без backup
- High-risk миграции (data backfill, drop_table)
- Downgrade = `pass`
- Несовместимость code ↔ schema

### Если откат запрещён

```text
STOP → ASSESS → RESTORE (backup) → ALIGN (код) → JOURNAL
```

---

## Задача 2 — Связь версии и структуры БД

| Уровень | Где хранится |
|---------|--------------|
| Каталог (канон) | `platform_version_schema_catalog` |
| Runtime (факт) | `alembic_version.version_num` |

**Решение:** новая таблица, без дублирования `platform_releases` / `tenant_versions`.

MVP bindings (unique `platform_version`):

| platform_version | schema_revision | Применение |
|------------------|-----------------|------------|
| `1.0.0-dev` | `20260615_0069` | DEV |
| `1.0.0` | `20260615_0069` | Template и Client |

---

## Задача 3 — Алгоритм проверки совместимости

Проектирован, **без runtime gate**. Шесть шагов в `MIGRATION_ROLLBACK_FOUNDATION.md` §3 и API `GET /platform/migration-rollback/policy` → `compatibility_algorithm_steps`.

---

## Задача 4 — Политика резервного копирования

**Минимум перед обновлением:**

```text
pg_dump + platform_version + schema_revision + дата + автор
```

Конвенция имени: `backup_{schema_revision}_{platform_version}_{timestamp}.sql`

---

## Задача 5 — Реестр резервных копий (проект)

Таблица `platform_schema_backup_registry` — **спроектирована, не создана**.

Поля: дата, версия, schema_revision, размер, статус, автор, verified_at.

---

## Задача 6 — Сценарии восстановления

| # | Сценарий | Система | Администратор |
|---|----------|---------|---------------|
| 1 | Успешный откат | Проверка schema; ALLOW code_only | Откат кода; health check |
| 2 | Откат невозможен | BLOCK + recommended_action | Не откатывать вслепую |
| 3 | Restore backup | Поиск backup (post-MVP) | pg_dump restore; выравнивание кода |

---

## Задача 7 — Совместимость

| Система | Статус |
|---------|--------|
| Code Release Foundation Phase 1 | **Используется** |
| Publication Guard | **Не используется** |
| Platform Releases | **Будет позже** |
| DEV Journal | **Используется** |
| Event Journal | **Будет позже** |

---

## Задача 8 — Архитектурный аудит

| Вопрос | Ответ |
|--------|-------|
| Фундамент для Build / Package / Deployment / Rollback Registry? | **Да** |
| Безопасный Release Pipeline после этапа? | **Частично** — нужны backup CLI + deploy registry |
| Что останется нерешённым? | Реальные backup, auto deploy, CI/CD, risk table в БД, split DB |

---

## Что теперь умеет ЯсноПро

**До этой задачи** платформа не могла ответить, совместим ли откат кода с состоянием базы данных, и не имела официальных правил «когда можно вернуться назад».

**Теперь:**

1. Есть **официальная политика**: когда откат разрешён, когда запрещён, что делать если нельзя.
2. Каждая версия платформы **привязана к revision структуры БД** — видно, какая схема соответствует `1.0.0` и `1.0.0-dev`.
3. Описан **алгоритм проверки** перед откатом (реализация gate — следующий этап).
4. Зафиксирован **минимальный набор backup** перед обновлением.
5. Спроектирован **реестр резервных копий** для будущей автоматизации.
6. Описаны **три сценария восстановления** с ролями системы и администратора.
7. API Control Plane: `GET /platform/migration-rollback/*` — политика и каталог (read-only).

---

## Реализованные артефакты

| Слой | Путь |
|------|------|
| Policy doc | `docs/architecture/MIGRATION_ROLLBACK_FOUNDATION.md` |
| Backend module | `backend/app/modules/platform_migration_rollback/` |
| Migration | `backend/alembic/versions/20260615_0069_platform_version_schema_catalog.py` |
| Tests | `backend/tests/test_platform_migration_rollback_foundation.py` |

### API

- `GET /platform/migration-rollback/policy`
- `GET /platform/migration-rollback/schema-catalog`
- `GET /platform/migration-rollback/summary`

---

## Architecture Audit

| Вопрос | Pass |
|--------|------|
| Source of Truth: catalog vs alembic_version разведены | Pass |
| Нет дублирования platform_releases | Pass |
| Technical keys (schema_revision, platform_version) | Pass |
| Scope: без deploy/backup automation | Pass |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Tables created | `platform_version_schema_catalog` |
| Tables altered | **0** |
| Rows created (seed) | 2 bindings (`1.0.0-dev`, `1.0.0` для Template+Client) |
| Rows updated | 0 |
| Rows deleted | 0 |
| Protected data touched | нет (только catalog metadata) |
| Destructive operation | none |
| Backup registry table | **не создана** (design only) |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Test tenants created | 0 |
| Test users created | 0 |
| Test catalog rows (rolled back in tests) | transient only |
| Remaining leaks | 0 |

---

## Cleanup Audit

```text
visible_test_records_count = 0
remaining_test_records_count = 0
Cleanup status: PASSED
```

---

## Tests

```text
pytest tests/test_platform_migration_rollback_foundation.py -q → 5 passed
alembic upgrade head → 20260615_0069
```

---

## Manual Smoke

**NOT PERFORMED** — API smoke через pytest; UI для migration rollback не добавлялся на этом этапе.

---

## DEV Journal

| Поле | Значение |
|------|----------|
| Created | yes |
| id | **970** |
| slug | `migration-rollback-foundation` |

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Политика отката | ✅ |
| Связь версии и schema | ✅ |
| Алгоритм совместимости (проект) | ✅ |
| Политика backup | ✅ |
| Реестр backup (проект) | ✅ |
| Сценарии восстановления | ✅ |
| «Что теперь умеет ЯсноПро» | ✅ |
| Audits | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**

---

## Следующий этап

1. Pre-release backup CLI
2. CodeBuild / ReleasePackage registry (`schema_revision` in manifest)
3. CodeDeployment rollback gate (runtime compatibility check)
