# Code Build Registry Readiness Audit
# Аудит готовности к реестру сборок платформы

**Дата:** 2026-06-16  
**Тип:** read-only аудит (без изменений кода, БД, API, UI, миграций)  
**Предшественники:**
- `CODE_RELEASE_PIPELINE_READINESS_AUDIT.md`
- `CODE_RELEASE_FOUNDATION_MVP.md`
- `RELEASE_PACKAGE_DESIGN_AUDIT.md`
- `DATABASE_MIGRATION_ROLLBACK_READINESS_AUDIT.md`
- `CODE_RELEASE_FOUNDATION_PHASE1_REPORT.md`
- `MIGRATION_ROLLBACK_FOUNDATION_REPORT.md`

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- Publication Guard Rules (`backend/app/modules/publication_guard/`, P0/P1 tests)
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

---

## Executive Summary

### Главный ответ

**Для Build Registry уже есть:** semver-реестр версий по средам, привязка platform version ↔ schema revision, module manifest/BOM-заготовки, governance workflow `platform_releases`, паттерны apply/rollback для **конфигурации tenant**, Publication Guard для **данных tenant**.

**Для Build Registry отсутствует:** таблицы и API `code_builds`, хранение `commit_sha`, artifact digest, build manifest snapshot, связь «из какого коммита собрана версия», реестр физических артефактов backend/frontend.

**Следующий этап (один):** **Вариант А — Code Build Registry.**

Обоснование: Release Package и Deployment опираются на immutable Build; без Build Registry нельзя честно фиксировать commit, состав сборки и артефакты. Порядок подтверждён в `RELEASE_PACKAGE_DESIGN_AUDIT.md` (Build → Release Package → Deployment → Rollback).

**Готовность к Build Registry:** ~**40%** (паттерны и смежные registry есть; самого Build слоя нет).

---

## Задача 1. Существующие релизные сущности

| Сущность | Назначение | Для Build Registry | Переиспользовать | Нельзя использовать как Build |
|----------|------------|-------------------|------------------|----------------------------|
| **`platform_releases`** | Governance: review → publish, semver, changelog, `source_tenant_id` | **Частично** | Workflow patterns, journal hooks, optional nullable FK `platform_governance_release_id` | Как запись сборки/артефакта — нет `commit_sha`, нет build_id |
| **`release_changes`** | Changelog items (feature/fix/config) | **Частично** | Human-readable release notes в UI | Как build manifest / git diff |
| **`platform_module_versions`** | Module semver registry per `module_key` | **Да (BOM)** | Строки BOM в `build_manifest_json`; паттерн `platform_release_modules` | Как platform code build — это module semver, не git artifact |
| **`platform_module_publications`** | DEV→Template **config** snapshot (JSONB) | **Паттерн** | Snapshot/immutability pattern | Как code build — tenant data, не исходники |
| **`platform_release_modules`** | Связь governance release ↔ module version transitions | **Да (BOM)** | Модель для будущего `release_package_modules` | Напрямую как build record |
| **`tenant_versions`** | Legacy label `current_version` per tenant | **Нет** | Deprecated read fallback | SoT — `platform_environment_versions` |
| **`tenant_update_offers`** | Client offers по governance `platform_releases` | **Паттерн** | Будущие code rollout offers | Как build tracking |
| **`platform_environment_versions`** | **SoT** текущей platform version per portal | **Да** | Target поле после deploy; environment slots DEV/Template/Client | Как build — нет commit/build linkage |
| **`platform_version_history`** | Append-only install history | **Да** | Read-model deployments (сейчас ручные записи) | Как build registry |
| **`platform_version_schema_catalog`** | Канон: `platform_version` → `schema_revision` | **Да** | Поле `schema_revision` в build manifest; compatibility checks | Как substitute для `code_builds` — нет commit/artifact |

### Дополнительно (смежные, не в списке задачи)

| Сущность | Роль для Build |
|----------|----------------|
| `platform_module_manifests` | BOM: routers, routes, tables — snapshot в build manifest |
| `tenant_module_configuration_applies` / `rollbacks` | Паттерн audit для будущих `code_deployments` |
| `portals.template_version` | Legacy display; не SoT |
| `designer_publish_records` | Designer metadata publish, не platform code |

---

## Задача 2. Build-подобные сущности в проекте

| Файл / место | Сущность / термин | Назначение |
|--------------|-------------------|------------|
| `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md` | `CodeBuild`, `build_key` | **Design only** — целевая модель |
| `docs/audit/RELEASE_PACKAGE_DESIGN_AUDIT.md` | `build_manifest_json`, digests | **Design only** |
| `frontend/package.json` | `vite build` | Локальная сборка frontend, **без registry** |
| `backend/app/modules/platform_modules/manifest_models.py` | `PlatformModuleManifest` | Метаданные модуля (routes, routers), не build artifact |
| `backend/app/modules/platform_module_publications/models.py` | `snapshot_payload` JSONB | Config snapshot, не code bundle |
| `backend/app/modules/platform_migration_rollback/` | `schema_revision` | Привязка версии к Alembic head |
| `backend/alembic/versions/*.py` | Alembic revisions | Schema evolution, не build record |
| `backend/tests/test_platform_release_pipeline.py` | `_cleanup_release_artifacts` | Test helper для governance release rows |
| Git (вне БД) | `.git/` | Источник commit SHA — **не записывается в БД** |

**Вывод:** в runtime БД **нет** таблиц `code_builds`, `code_releases`, `release_packages`, `code_deployments`. Build-подобное — только в design docs и локальный `npm run build`.

---

## Задача 3. Связь версий

### Три уровня версий сегодня

| Уровень | Где хранится | Что означает |
|---------|--------------|--------------|
| **Platform Version** | `platform_environment_versions`, `platform_releases.version`, `tenant_versions` | SemVer **метка** релиза/установки |
| **Module Version** | `platform_module_versions.version` + `manifest_version` | SemVer модуля + привязка к manifest |
| **Schema Revision** | `platform_version_schema_catalog`, `alembic_version` | Alembic head id структуры БД |

### Схема связей (факт, не целевая)

```text
Platform Version (SemVer)
    │
    ├─[ЕСТЬ] platform_version_schema_catalog ──→ Schema Revision (Alembic id)
    │
    ├─[СЛАБО] platform_releases.version ≈ governance label (не обязательно = installed)
    │
    ├─[НЕТ]  commit_sha / build_id / artifact
    │
    └─[ЧЕРЕЗ governance] platform_release_modules
              │
              ▼
        Module Version (per module_key)
              │
              └─[ЕСТЬ] manifest_version → platform_module_manifests (code structure metadata)
```

**Разрыв:** Platform Version **не связана** с git commit и физической сборкой. Module Version связан с governance release, **не** с monorepo build artifact.

---

## Задача 4. Целевая цепочка vs реальность

```text
Code → Build → Release Package → Deployment → Template → Client
```

| Звено | Статус | Что есть |
|-------|--------|----------|
| **Code** | Есть | Монорепо `backend/` + `frontend/`, один runtime |
| **Build** | **Нет** | Нет `code_builds`, нет commit_sha в БД |
| **Release Package** | **Design only** | `RELEASE_PACKAGE_DESIGN_AUDIT.md`; таблиц нет |
| **Deployment** | **Частично** | `platform_environment_versions` = registry *установленной версии*; нет `code_deployments` |
| **Template** | **Частично** | Portal id=2, version registry slot; нет pinned artifact |
| **Client** | **Частично** | Per-tenant version in registry; offers для governance, не code deploy |

---

## Задача 5. Commit Tracking

### Есть ли сейчас «из какого коммита собрана версия»?

**Нет.** Ни в одной production-таблице нет поля `commit_sha` / `git_sha`.

### Что добавить

| Элемент | Где хранить |
|---------|-------------|
| `commit_sha` (обязательное) | `code_builds.commit_sha` (primary); денормализация в `release_packages` / `code_deployments` |
| `branch` (опционально) | `code_builds.branch` |
| Источник при записи | CLI `record_code_build.py` → `git rev-parse HEAD` (design в MVP) |

**Не хранить commit только в** `platform_releases` — смешает governance и code delivery (ADR-1 в MVP design).

---

## Задача 6. Build Tracking

### Можно ли узнать сейчас?

| Вопрос | Ответ |
|--------|-------|
| Когда собрана версия | **Частично** — `platform_environment_versions.installed_at` (ручная/seed запись), не build time |
| Кто собрал | **Частично** — `installed_by_id` в version registry, не builder |
| Что вошло в сборку | **Нет** — нет manifest snapshot привязанного к build |

### Gap

```text
Нужно: code_builds (build_key, commit_sha, build_status, started/completed, built_by, build_manifest_json, digests)
Связь: CodeBuild → Release Package → обновление platform_environment_versions при Deployment
```

---

## Задача 7. Release Package Foundation

### Уже подготовлено (design + смежные registry)

- `RELEASE_PACKAGE_DESIGN_AUDIT.md` — единица доставки, BOM, hybrid model
- `platform_module_manifests` — структура для module BOM
- `platform_release_modules` — паттерн `release_package_modules`
- `platform_version_schema_catalog` — `schema_revision` в пакете
- `PLATFORM_VERSION_PATTERN` / SemVer validation в version registry
- Migration rollback policy API (`/platform/migration-rollback/*`)

### Отсутствует

- Таблицы `release_packages`, `release_package_modules`
- FK `build_id` → `code_builds`
- Immutable artifact refs (digests)
- API create/release package
- Связь Release Package ↔ `platform_releases` (optional FK)

---

## Задача 8. Deployment Foundation

### Готово

| Компонент | Статус |
|-----------|--------|
| `platform_environment_versions` | Registry текущей версии per portal |
| `platform_version_history` | Audit trail установок |
| UI Companies → Версии | Read-model контуров + client fleet |
| `tenant_module_configuration_applies` | Паттерн apply audit |
| `environment_key` + `tenant_id` model | Slots DEV/Template/Client |

### Отсутствует

- `code_deployments` table + service
- `target_tenant_id` + `environment_key` на deployment record
- Operator apply flow (planned → applied)
- Physical runtime pinning (ожидаемо post-MVP)
- Связь deployment → build/release package id

---

## Задача 9. Rollback Foundation

По `MIGRATION_ROLLBACK_FOUNDATION.md` + Phase 1 reports:

### Готово

- Политика отката (code_only / backup_restore / schema_downgrade)
- `platform_version_schema_catalog` (version ↔ schema_revision)
- API policy / schema-catalog / summary (read-only)
- Алгоритм compatibility (design, без runtime gate)
- Паттерн `tenant_module_configuration_rollbacks`

### Потребуется для code rollback

- `code_deployment_rollbacks` (mirror config rollbacks)
- История ≥ 2 deployments per slot
- Verified backup pipeline (ещё не реализован)
- Runtime gate schema ↔ target package (не реализован)
- Rollback = redeploy **предыдущего Release Package**, не откат git

---

## Задача 10. Минимальный следующий этап

### Вариант А — Code Build Registry ✅ **ВЫБРАН**

| | |
|--|--|
| **Плюсы** | Первое звено цепочки; фиксирует commit + manifest; unblock Release Package |
| **Минусы** | Пока без physical artifact store (digest placeholder OK) |
| **Риски** | Путаница с `platform_releases` — mitigated naming `code_*` |

### Вариант Б — Release Package Registry

| | |
|--|--|
| **Минусы** | Нет Build → пакет без commit/artifact = пустая метка |
| **Вердикт** | **Рано** |

### Вариант В — Deployment Registry

| | |
|--|--|
| **Минусы** | Registry deploy без build/package = audit без объекта доставки |
| **Вердикт** | **Рано** |

**Рекомендуемый WI:** `Code Build Registry` — таблица `code_builds`, CLI `record_code_build.py`, read API, `build_manifest_json` (modules из `platform_module_versions` + `schema_revision` из catalog/Alembic head).

---

## Что увидит владелец продукта

**Что уже построено:** мы знаем, **какая версия** стоит у DEV, эталона и клиентов; есть история установок; есть правила отката схемы БД; модули и их манифесты описаны; публикация **настроек** tenant защищена.

**Чего нет:** система **не помнит**, из какого коммита и какой сборки появилась версия. Сейчас изменение кода в репозитории сразу влияет на все среды.

**Что даст Build Registry:** появится «паспорт сборки» — коммит, дата, состав, привязка к схеме БД. Это первый шаг к честной цепочке: разработка → сборка → релиз → эталон → клиенты.

---

## Архитектурный аудит

| Вопрос | Ответ |
|--------|-------|
| Риск дублирования сущностей | **Средний** — если писать build в `platform_releases` или `tenant_versions` |
| Риск лишних таблиц | **Низкий** при ADR-1: отдельный контур `code_*` |
| Что переиспользовать | `platform_module_manifests`, `platform_release_modules` (паттерн), `platform_version_schema_catalog`, apply/rollback patterns, version registry как deployment read-model |
| Publication Guard | **Ортогонален** — не смешивать с code build WI |
| Инвариант | `platform_environment_versions` остаётся SoT **установленной** версии; Build Registry — SoT **сборок** |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Изменения БД | **Нет** |
| Изменения данных | **Нет** |
| Тип работы | Read-only анализ кода и документов |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Создано | 0 |
| Удалено | 0 |
| Осталось | 0 |

---

## Cleanup Audit

```text
visible_test_records_count = 0
remaining_test_records_count = 0
Cleanup status: PASSED
```

---

## Manual Smoke

**NOT PERFORMED** — аудит без UI/runtime проверок.

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Все релизные сущности проверены | ✅ |
| Точки переиспользования определены | ✅ |
| Пробелы определены | ✅ |
| Следующий этап выбран | ✅ (Code Build Registry) |
| Код / БД не менялись | ✅ |
| Нет тестового мусора | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**
