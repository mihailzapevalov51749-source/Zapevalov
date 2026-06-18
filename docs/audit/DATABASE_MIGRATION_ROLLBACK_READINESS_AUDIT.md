# Database Migration Rollback Readiness Audit

**Дата:** 2026-06-15  
**Тип:** read-only аудит (без изменений кода, БД и runtime-данных)  
**Контекст:** `RELEASE_PACKAGE_DESIGN_AUDIT` — риск «schema forward-only в MVP»  
**Текущий Alembic head:** `20260615_0067`  
**Метод:** автоматический статический анализ 67 файлов `backend/alembic/versions/*.py` + выборочный manual review

---

## Проверенные правила

| Правило | Применение |
|---------|------------|
| `01_ARCHITECTURE_RULES.mdc` | technical id (`revision`, `release_key`); не display fields как id |
| `02_PROMPT_STANDARD.mdc` | структура отчёта, Success Criteria |
| `03_QUALITY_CONTROL.mdc` | Architecture / Data / Cleanup audits |
| Publication Guard | ортогонален; миграции — shared schema для всех tenant |
| DEV Journal | запись по факту аудита |
| Test Data / Cleanup Audit | read-only подтверждение |

---

## Executive Summary

### Главный вопрос

> Release 1.5.0 → Migration → Rollback Release → Rollback Schema → 1.4.2 — можно ли безопасно?

**Ответ: нет, не в текущем состоянии.**

Полный безопасный откат schema+data к предыдущему release **не гарантирован**. Причины:

1. **Нет связи Release Package ↔ Alembic revision** в коде/БД.
2. **6 data/backfill миграций** с partial или no downgrade.
3. **1 миграция** с явным `pass` в downgrade (`20260611_0039`).
4. **Drop-table downgrade** восстанавливает только пустую схему, не данные (`20260612_0046`).
5. **Нет штатного database backup/restore** pipeline перед release apply.
6. **Одна общая БД** для DEV, Template, Client — rollback schema затрагивает всех.

### Вердикт

```text
NOT READY для end-to-end Release + Schema Rollback

Готовность migration rollback foundation: ~35%
```

### Рекомендуемая стратегия MVP

**Вариант В (гибрид):** forward-only policy + обязательный pre-release backup + привязка `ReleasePackage.schema_revision` + block rollback при несовместимости schema.

---

## Блок 1. Аудит Alembic

### Текущее состояние

| Показатель | Значение |
|------------|----------|
| Всего миграций | **67** |
| Линейная цепочка | `20250525_0001` → `20260615_0067` (head) |
| С `upgrade()` | **67** |
| С `downgrade()` | **67** |
| Downgrade реализован (не pass) | **66** |
| Downgrade = `pass` / empty | **1** |
| Upgrade-only (без функции downgrade) | **0** |

### Сводка по rollback-безопасности (статический анализ upgrade)

| Категория upgrade | Кол-во | Оценка отката |
|-------------------|--------|---------------|
| **Низкий риск** (create_table) | 20 | downgrade **да** (schema) |
| **Средний риск** (add_column, alter, index) | 40 | downgrade **частично** |
| **Высокий риск** (data/backfill, drop_table) | 7 | downgrade **частично/нет** |

| Rollback-safe оценка | Кол-во |
|----------------------|--------|
| Да (schema reversible) | 20 |
| Частично | 46 |
| Нет | 1 |

### Таблица миграций (полный реестр)

| Revision | Upgrade | Downgrade | Rollback-safe | Риск |
|----------|---------|-----------|---------------|------|
| 20250525_0001 | да | implemented | partial | medium |
| 20250525_0002 | да | implemented | partial | medium |
| 20250525_0003 | да | implemented | partial | medium |
| 20250525_0004 | да | implemented | partial | medium |
| 20250525_0005 | да | implemented | yes | low |
| 20250525_0006 | да | implemented | yes | low |
| 20250525_0007 | да | implemented | yes | low |
| 20250528_0008 | да | implemented | partial | medium |
| 20250528_0009 | да | implemented | partial | medium |
| 20260602_0010 | да | implemented | yes | low |
| 20260602_0011 | да | implemented | partial | medium |
| 20260603_0012 | да | implemented | partial | medium |
| 20260604_0013 | да | implemented | partial | medium |
| 20260604_0014 | да | implemented | partial | medium |
| 20260605_0015 | да | implemented | yes | low |
| 20260605_0016 | да | implemented | partial | medium |
| 20260607_0017 | да | implemented | partial | medium |
| 20260607_0018 | да | implemented | partial | medium |
| 20260607_0019 | да | implemented | partial | medium |
| 20260608_0020 | да | implemented | yes | low |
| 20260608_0021 | да | implemented | yes | low |
| 20260608_0022 | да | implemented | yes | low |
| 20260608_0023 | да | implemented | partial | medium |
| 20260608_0024 | да | implemented | partial | medium |
| 20260609_0025 | да | implemented | yes | low |
| 20260609_0026 | да | implemented | yes | low |
| 20260610_0027 | да | implemented | partial | medium |
| 20260610_0028 | да | implemented | partial | medium |
| 20260610_0029 | да | implemented | partial | medium |
| 20260610_0030 | да | implemented | partial | medium |
| 20260610_0031 | да | implemented | yes | low |
| 20260610_0032 | да | implemented | yes | low |
| 20260610_0033 | да | implemented | partial | medium |
| 20260610_0034 | да | implemented | partial | medium |
| 20260610_0035 | да | implemented | partial | medium |
| 20260610_0036 | да | implemented | partial | medium |
| 20260611_0037 | да | implemented | yes | low |
| 20260611_0038 | да | implemented | partial | medium |
| 20260611_0039 | да | **pass** | **no** | **high** |
| 20260611_0040 | да | implemented | partial | medium |
| 20260611_0041 | да | implemented | partial | **high** |
| 20260611_0042 | да | implemented | partial | medium |
| 20260611_0043 | да | implemented | partial | **high** |
| 20260612_0044 | да | implemented | partial | medium |
| 20260612_0045 | да | implemented | yes | low |
| 20260612_0046 | да | implemented | partial | **high** |
| 20260613_0047 | да | implemented | partial | medium |
| 20260613_0048 | да | implemented | partial | **high** |
| 20260613_0049 | да | implemented | yes | low |
| 20260613_0050 | да | implemented | partial | medium |
| 20260613_0051 | да | implemented | yes | low |
| 20260613_0052 | да | implemented | partial | medium |
| 20260613_0053 | да | implemented | yes | low |
| 20260613_0054 | да | implemented | yes | low |
| 20260613_0055 | да | implemented | partial | **high** |
| 20260613_0056 | да | implemented | yes | low |
| 20260613_0057 | да | implemented | yes | low |
| 20260613_0058 | да | implemented | yes | low |
| 20260614_0059 | да | implemented | partial | **high** |
| 20260614_0060 | да | implemented | yes | low |
| 20260614_0061 | да | implemented | yes | low |
| 20260614_0062 | да | implemented | yes | low |
| 20260614_0063 | да | implemented | yes | low |
| 20260615_0064 | да | implemented | yes | low |
| 20260615_0065 | да | implemented | yes | low |
| 20260615_0066 | да | implemented | partial | medium |
| 20260615_0067 | да | implemented | partial | medium |

### Миграции без полноценного downgrade

| Revision | Файл | Проблема |
|----------|------|----------|
| **20260611_0039** | `runtime_protected_navigation_backfill.py` | `downgrade(): pass` — явный комментарий «not reversed» |

### Миграции высокого риска (детально)

| Revision | Тип | Откат | Комментарий |
|----------|-----|-------|-------------|
| 20260611_0039 | ORM data backfill | **Нельзя** | navigation flags остаются |
| 20260611_0041 | journal scope backfill | **Частично** | downgrade меняет scope, не гарантирует исходное состояние |
| 20260611_0043 | journal_kind reclassify | **Частично** | все entries переклассифицированы |
| 20260612_0046 | drop 4 universal_* tables | **Частично** | downgrade создаёт пустые таблицы; **данные потеряны** |
| 20260613_0048 | calendar + seed backfill | **Частично** | schema + seed data |
| 20260613_0055 | tenant_modules + backfill | **Частично** | rows from navigation backfill |
| 20260614_0059 | tenant_module_configurations + defaults | **Частично** | default config rows |

---

## Блок 2. Аудит миграций по рискам

| Категория | Примеры | Кол-во (approx) | Откат |
|-----------|---------|-----------------|-------|
| **Безопасные** | `create_table` без data mutation | 20 | **Можно** (schema) |
| **Средний риск** | `add_column`, `alter_column`, indexes, FK | 40 | **Частично** |
| **Высокий риск** | backfill, ORM mutations, `drop_table` | 7 | **Частично / нельзя** |

**Вывод:** даже при наличии функции `downgrade()` в 66/67 файлах, **безопасный полный откат цепочки к произвольному release не гарантирован** из-за data migrations и destructive ops.

---

## Блок 3. Аудит rollback сценария

### Сценарий

```text
Release 1.5.0 → Apply migration → Rollback deployment → Rollback database
```

| Шаг | Сейчас | Статус |
|-----|--------|--------|
| Зафиксировать schema до migrate | нет registry | **Отсутствует** |
| Apply migration (`alembic upgrade`) | вручную, один head для всех | **Частично** |
| Rollback deployment (code) | не реализован | **Отсутствует** |
| Определить target revision для 1.4.2 | нет mapping | **Отсутствует** |
| `alembic downgrade` к revision 1.4.2 | технически возможно по цепочке | **Частично** |
| Восстановление data после downgrade | не гарантировано | **Отсутствует** |
| Проверка совместимости code 1.4.2 + schema | нет gate | **Отсутствует** |

### Подтверждение риска из постановки

```text
Release 1.5.0 → upgrade → ошибка → rollback release → schema остаётся 1.5.0 → code 1.4.2 несовместим
```

**Сценарий реален сегодня.** Без `schema_revision` в Release Package и без backup/restore gate откат кода без отката schema (или наоборот) приведёт к рассинхрону.

---

## Блок 4. Аудит связки Release ↔ Schema

| Связь | Есть сейчас? |
|-------|--------------|
| `platform_releases.version` ↔ Alembic revision | **Нет** |
| `platform_releases` ↔ `commit_sha` | **Нет** |
| `ReleasePackage.schema_revision` (проектируемое) | **Нет** (только в design doc) |
| `alembic_version` table в БД | **Да** — единственный runtime source of truth |
| Mapping `1.4.2 → revision X` | **Нет** |

### Проблема

Невозможно автоматически ответить:

```text
Release 1.4.2 → Alembic revision ???
```

`platform_releases.version` — semver label для governance; **не привязан** к `alembic/versions/`.

**Обязательное требование для Code Release Pipeline:** каждый `ReleasePackage` MUST содержать `schema_revision` (Alembic revision id) и `schema_revision_chain` (опционально, список revisions до head на момент build).

---

## Блок 5. Аудит восстановления

| Способ | Статус | Детали |
|--------|--------|--------|
| **Alembic downgrade** | **Частично** | 66/67 implemented; data safety не гарантирована |
| **Database backup (pg_dump)** | **Частично** | упоминается в `dry_run_tenant1_recovery_plan.py`; **нет** стандартного скрипта в repo |
| **Database restore** | **Частично** | ad-hoc; не интегрирован в release flow |
| **Point-in-time recovery** | **Нет** | нет WAL archiving / managed PITR |
| **Docker volume snapshot** | **Частично** | `docker-compose.yml` — named volume `portal_constructor_v2_pgdata`; manual only |
| **JSON backups** | **Частично** | `backend/scripts/backups/` — точечные JSON, не full DB |

---

## Блок 6. Архитектурное решение для MVP

### Вариант А — полный downgrade всех миграций

| | |
|--|--|
| Плюсы | Теоретически точный откат schema по цепочке |
| Минусы | 7 high-risk migrations; data loss; 46 partial; дорого тестировать 67 downgrade |
| Сложность | Очень высокая |
| Риски | Ложная уверенность; production data corruption |

### Вариант Б — forward-only + restore backup

| | |
|--|--|
| Плюсы | Реалистично для production; быстрый recovery |
| Минусы | Нужен backup discipline; downtime |
| Сложность | Средняя |
| Риски | Backup без verify; human error |

### Вариант В — гибрид (рекомендуется)

| | |
|--|--|
| Плюсы | Forward-only policy + backup для prod; selective downgrade в DEV; schema gate в deployment rollback |
| Минусы | Два пути отката — нужна документация |
| Сложность | Средняя |
| Риски | Путаница путей — mitigated runbooks |

### Рекомендация для ЯсноПро

**Вариант В (гибрид).**

**MVP policy:**

1. **Новые миграции** — forward-only by default; downgrade только для pure schema (create/add nullable).
2. **Запрет data backfill в Alembic** без отдельного идемпотентного script + journal entry.
3. **Перед apply release** — mandatory `pg_dump` с `schema_revision` в имени файла.
4. **ReleasePackage** — обязательные `schema_revision`, `commit_sha`, `build_id`.
5. **CodeDeploymentRollback** — BLOCK если `current_schema_revision > target_package.schema_revision` без подтверждённого restore backup.
6. **Alembic downgrade** — только DEV/staging; не production default.

---

## Блок 7. Совместимость с Release Package

| Сущность | Что добавить |
|----------|--------------|
| **CodeBuild** | `schema_revision` (alembic head at build time); `schema_revision_base` (optional) |
| **ReleasePackage** | `schema_revision` (required); `min_code_version` / `max_schema_delta` policy fields |
| **CodeDeployment** | `schema_revision_before`, `schema_revision_after`, `backup_artifact_ref` |
| **CodeDeploymentRollback** | `restore_mode`: `code_only` \| `schema_downgrade` \| `backup_restore`; compatibility check |
| **Migration policy table** (new) | `revision`, `risk_class`, `rollback_mode_allowed` |

---

## Блок 8. Gap Analysis

| Элемент | Сейчас | Требуется | Статус |
|---------|--------|-----------|--------|
| Alembic downgrade coverage | 66/67 implemented | policy + risk classification | **Частично** |
| Safe data rollback | нет | backup restore | **Нет** |
| Release ↔ schema mapping | нет | `schema_revision` on package | **Нет** |
| Pre-migrate backup | ad-hoc | mandatory gate | **Нет** |
| Rollback compatibility gate | нет | block unsafe rollback | **Нет** |
| Shared DB isolation | один PostgreSQL | migration waves / env split (post-MVP) | **Нет** |
| Forward-only policy | не формализована | documented + lint | **Нет** |
| Schema revision in build manifest | design only | implementation | **Частично** |

### Что уже готово

- Линейная Alembic chain 67 revisions
- Большинство downgrade для schema DDL реализованы
- `alembic current` работает (head `20260615_0067`)
- Design: `ReleasePackage.schema_revision` в `RELEASE_PACKAGE_DESIGN_AUDIT.md`

### Что отсутствует

- Registry mapping release version → revision
- Backup/restore в release pipeline
- Rollback gate в CodeDeploymentRollback
- Запрет небезопасных data migrations в Alembic

### Что реализовать (порядок)

1. Migration Rollback Foundation (policy + `schema_revision` binding)
2. Pre-release backup CLI
3. CodeBuild / ReleasePackage registry
4. CodeDeployment rollback with compatibility check

---

## Архитектурные решения

### Решение №1 — Стратегия rollback

**Гибрид (В):** forward-only migrations + mandatory backup before release apply + schema compatibility gate on rollback. Production default = **backup restore**, не alembic downgrade chain.

### Решение №2 — Нужен ли полный Alembic downgrade?

**Нет** для MVP production path. Selective downgrade — только DEV/staging для pure schema migrations. Полный downgrade 67 revisions — **не цель**.

### Решение №3 — Привязка Release → Schema Revision

**Да, обязательна.** `ReleasePackage.schema_revision` = Alembic revision at build time. Без этого Code Release Pipeline **неполный**.

### Решение №4 — Порядок реализации

```text
СНАЧАЛА: Migration Rollback Foundation
  (schema_revision binding, backup CLI, rollback policy, deployment gate)

ЗАТЕМ: Code Builds / Release Package registry
  (build manifest уже включает schema_revision)

ПОТОМ: CodeDeployment + Rollback orchestration
```

**Обоснование:** без schema binding rollback release бессмысленен — риск из постановки воспроизводится.

---

## Risks

| ID | Риск |
|----|------|
| R1 | Rollback code без rollback schema → runtime crash |
| R2 | `alembic downgrade` после data backfill → inconsistent data |
| R3 | drop_table downgrade без data → silent data loss |
| R4 | Одна БД — migrate для release затрагивает все tenant |
| R5 | Ложная уверенность из 66 downgrade functions |

---

## Data Impact Audit

```text
Изменений БД: нет.
Изменений данных: нет.
Удалений: нет.
Выполнен только: alembic current (read) + статический анализ файлов миграций.
```

## Test Data Audit

```text
Тестовые данные не создавались.
```

## Cleanup Audit

```text
visible_test_companies_count = 0
Cleanup status: PASSED
```

## Architecture Audit

| Вопрос | Pass / Fail |
|--------|-------------|
| Главный вопрос отвечен честно | Pass |
| Source of Truth: `alembic_version` vs release registry разведены | Pass (gap задокументирован) |
| Не ломает Publication Guard | Pass |
| Рекомендация совместима с Release Package design | Pass |

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Проверены все миграции (67) | ✅ |
| Оценена готовность downgrade | ✅ |
| Проверена связка Release ↔ Schema | ✅ |
| Определена стратегия rollback | ✅ |
| Gap Analysis | ✅ |
| DEV Journal | ✅ |
| Изменений БД нет | ✅ |
| Тестовые данные не создавались | ✅ |

---

*Следующий WI: Migration Rollback Foundation — policy doc + `schema_revision` в build manifest + pre-release backup CLI.*
