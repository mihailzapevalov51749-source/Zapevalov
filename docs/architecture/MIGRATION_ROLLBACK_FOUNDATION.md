# Migration Rollback Foundation — каноническая политика

**Дата:** 2026-06-15  
**Статус:** Foundation (policy + schema binding; без deploy/backup automation)  
**Стратегия:** Гибрид (В) — forward-only migrations + обязательный backup перед обновлением + schema gate при откате

---

## 1. Политика отката (Задача 1)

### 1.1 Когда откат разрешён

| Класс изменений | Режим отката | Условие |
|-----------------|--------------|---------|
| Только код (без миграций) | `code_only` | `schema_revision` не изменился |
| Настройки / конфигурации tenant | `code_only` или `config_restore` | без DDL и без destructive data ops |
| Schema DDL (add nullable column, create table) | `schema_downgrade` | только DEV/staging; revision в whitelist |
| Любое production-изменение с миграцией | `backup_restore` | после verified backup |

**Разрешён без backup:** откат кода, когда `current_schema_revision == target_schema_revision`.

### 1.2 Когда откат запрещён

| Ситуация | Решение системы |
|----------|-----------------|
| `current_schema_revision > target_schema_revision` и нет backup | **BLOCK** |
| Миграция с `risk_class=high` (data backfill, drop_table) | **BLOCK** schema downgrade |
| Downgrade = `pass` (например `20260611_0039`) | **BLOCK** alembic downgrade |
| Удалены или трансформированы данные без restore path | **BLOCK** |
| Несовместимость версии кода и schema | **BLOCK** |

### 1.3 Если откат запрещён — официальный сценарий

```text
1. STOP — не откатывать код и не запускать alembic downgrade.
2. ASSESS — зафиксировать current platform_version, schema_revision, симптом.
3. RESTORE — восстановить БД из последнего verified backup (единственный production path).
4. ALIGN — после restore выровнять код до версии, привязанной к schema backup.
5. JOURNAL — запись в DEV Journal + Event Journal (post-MVP).
```

Автоматический deploy/rollback на этом этапе **не реализуется** — только политика и проверочный алгоритм.

---

## 2. Связь версии платформы и структуры БД (Задача 2)

### 2.1 Два уровня истины

| Уровень | Источник | Роль |
|---------|----------|------|
| **Каталог** | `platform_version_schema_catalog` | каноническая привязка `platform_version` → `schema_revision` |
| **Runtime** | `alembic_version.version_num` | фактическая revision в PostgreSQL |

### 2.2 Почему новая таблица, а не `platform_releases`

- `platform_releases` — governance workflow, не code deploy.
- `platform_module_versions` — semver модулей, не Alembic head.
- `tenant_versions` — offers для client updates.

**Решение:** таблица `platform_version_schema_catalog` (unique `platform_version`).

### 2.3 Поля каталога

| Поле | Описание |
|------|----------|
| `platform_version` | SemVer (`1.0.0`, `1.0.0-dev`) |
| `schema_revision` | Alembic revision id (`20260615_0068`) |
| `rollback_mode_default` | `code_only` / `backup_restore` / `schema_downgrade` |
| `notes` | ручное описание |

MVP baseline:

| platform_version | schema_revision |
|------------------|-----------------|
| `1.0.0` | `20260615_0069` | Template и Client |
| `1.0.0-dev` | `20260615_0069` |

---

## 3. Алгоритм проверки совместимости (Задача 3 — проект, без runtime gate)

**Вход:** `target_platform_version`, `current_schema_revision` (из `alembic_version`), `environment_key`, `has_verified_backup`.

**Шаги:**

```text
1. LOAD target_binding = catalog[target_platform_version]
   IF missing → BLOCK (unknown_version)

2. IF current_schema_revision == target_binding.schema_revision
   → ALLOW mode=code_only

3. IF current_schema_revision > target_binding.schema_revision (лексикографически по Alembic chain)
   3a. IF has_verified_backup == false → BLOCK (schema_ahead_no_backup)
   3b. ELSE → ALLOW mode=backup_restore (production path)

4. IF current_schema_revision < target_binding.schema_revision
   → BLOCK (schema_behind_code) — нужен forward migrate, не rollback

5. IF mode=schema_downgrade requested
   5a. IF environment_key != DEV → BLOCK (downgrade_dev_only)
   5b. IF any revision in (target..current] has risk_class=high → BLOCK
   5c. ELSE → ALLOW mode=schema_downgrade (DEV only)

6. EMIT decision + reasons[] + recommended_action
```

**Реализация gate** — этап CodeDeploymentRollback (позже).

---

## 4. Политика резервного копирования (Задача 4)

### 4.1 Перед обновлением (обязательно)

| Артефакт | Обязательность |
|----------|----------------|
| Dump PostgreSQL (`pg_dump`) | **обязателен** при любой миграции в production path |
| `platform_version` (до обновления) | **обязателен** |
| `schema_revision` (до обновления) | **обязателен** |
| Дата / автор | **обязательны** |
| Checksum / verify restore test | рекомендован (post-MVP automation) |

### 4.2 Минимально необходимый набор MVP

```text
pg_dump file + platform_version + schema_revision + created_at + created_by
```

Имя файла (конвенция): `backup_{schema_revision}_{platform_version}_{YYYYMMDD_HHMM}.sql`

---

## 5. Реестр резервных копий (Задача 5 — только проект)

**Таблица (будущая):** `platform_schema_backup_registry`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | int | PK |
| `backup_ref` | string | путь/S3 key |
| `platform_version` | string | версия на момент backup |
| `schema_revision` | string | Alembic revision |
| `created_at` | datetime | дата |
| `size_bytes` | bigint | размер |
| `status` | enum | `pending` / `verified` / `failed` / `expired` |
| `created_by_id` | FK users | автор |
| `verified_at` | datetime | когда проверен restore |
| `notes` | text | |

**Phase foundation:** таблица **не создаётся**; CLI backup — следующий WI.

---

## 6. Сценарии восстановления (Задача 6)

### Сценарий 1 — Успешный откат

| Роль | Действие |
|------|----------|
| Система | Проверяет `schema_revision` совпадает; разрешает `code_only` |
| Система | Обновляет `platform_environment_versions` (post-MVP deploy) |
| Администратор | Откатывает код до target version |
| Администратор | Проверяет health; фиксирует в journal |

### Сценарий 2 — Откат невозможен

| Роль | Действие |
|------|----------|
| Система | BLOCK: schema ahead / high-risk migration / no backup |
| Система | Возвращает `recommended_action=restore_backup` |
| Администратор | Не откатывает код вслепую |
| Администратор | Выбирает restore backup или forward-fix |

### Сценарий 3 — Восстановление из backup

| Роль | Действие |
|------|----------|
| Система | Находит backup по `schema_revision` + version |
| Администратор | STOP traffic → restore `pg_dump` → verify |
| Администратор | Выравнивает код до версии из каталога |
| Система | (post-MVP) записывает restore event в registry |

---

## 7. Совместимость (Задача 7)

| Система | Статус |
|---------|--------|
| Code Release Foundation Phase 1 | **Используется** — `platform_version` из version registry |
| Publication Guard | **Не используется** — ортогонален |
| Platform Releases | **Будет позже** — optional link governance release |
| DEV Journal | **Используется** — фиксация foundation WI |
| Event Journal | **Будет позже** — backup/restore events |

---

## 8. Архитектурные ответы

### Вопрос 1 — фундамент для Build / Release Package / Deployment / Rollback Registry?

**Да.** `platform_version_schema_catalog` → `ReleasePackage.schema_revision`; compatibility algorithm → `CodeDeploymentRollback`; backup registry design → `platform_schema_backup_registry`.

### Вопрос 2 — безопасный Release Pipeline после этапа?

**Частично.** Политика и binding готовы; pipeline станет безопасным после: pre-release backup CLI + Build/Deploy registry + runtime gate.

### Вопрос 3 — что останется нерешённым?

- Реальное создание/verify backup
- Автоматический deploy и rollback orchestration
- CI/CD
- Классификация risk per migration в БД (можно lint/script)
- Разделение БД по средам (shared PostgreSQL)

---

## Ссылки

- `DATABASE_MIGRATION_ROLLBACK_READINESS_AUDIT.md`
- `CODE_RELEASE_FOUNDATION_PHASE1_REPORT.md`
- `RELEASE_PACKAGE_DESIGN_AUDIT.md`
- `backend/app/modules/platform_migration_rollback/`
