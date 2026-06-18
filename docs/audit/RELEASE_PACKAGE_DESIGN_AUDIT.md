# Release Package Design Audit

**Дата:** 2026-06-15  
**Тип:** read-only аудит проектирования (без изменений кода, БД и runtime-данных)  
**Предшественники:**
- `docs/audit/CODE_RELEASE_PIPELINE_READINESS_AUDIT.md`
- `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md`

**Главный вопрос:** что является объектом доставки между DEV → Template → Client?

---

## Проверенные правила

| Правило | Применение |
|---------|------------|
| `01_ARCHITECTURE_RULES.mdc` | technical keys (`module_key`, `release_key`, `commit_sha`); не `name`/`title` как id |
| `02_PROMPT_STANDARD.mdc` | полная структура, Success Criteria |
| `03_QUALITY_CONTROL.mdc` | Architecture / Data / Cleanup audits |
| Publication Guard (P0/P1) | ортогональный контур tenant data |
| DEV Journal | запись по факту выполненного аудита |
| Test Data / Cleanup Audit | read-only подтверждение |

---

## Executive Summary

### Ответ на главный вопрос

**Единица доставки — `Release Package` (платформенный релизный пакет):**

один **immutable** пакет, привязанный к одному `CodeBuild` и одному `commit_sha`, содержащий **все обязательные артефакты платформы** (backend + frontend + schema revision) и **Bill of Materials (BOM)** версий runtime-модулей.

Это **вариант В (гибрид)**:

- **снаружи** — один пакет с единым `platform_version` (SemVer);
- **внутри** — структурированный BOM по `module_key` (уже есть `platform_module_manifests`, `platform_module_versions`, `platform_release_modules`).

Независимая доставка отдельных модулей (вариант Б) — **не MVP** и противоречит текущему монорепо + единому runtime.

### Четыре архитектурных решения

| # | Решение |
|---|---------|
| **№1 Единица релиза** | `ReleasePackage` = blessed immutable `CodeBuild` + `platform_version` + BOM + migration head |
| **№2 Единица деплоя** | `CodeDeployment` = применение **целого** Release Package к code environment slot (template или client tenant) |
| **№3 Единица отката** | `CodeDeploymentRollback` = операция возврата к **предыдущему задеплоенному** Release Package (не откат Build) |
| **№4 Порядок реализации** | Build manifest → Release Package registry → Deployment registry → Rollback → orchestration |

---

## Блок 1. Единица релиза

### Что такое Release Package?

**Release Package** — immutable описание **согласованного среза платформы**, готового к установке в Template или Client:

```text
ReleasePackage
├── platform_version          (SemVer, публичный номер релиза)
├── build_id                  (FK → CodeBuild)
├── commit_sha                (денормализация)
├── backend_artifact          (digest / ref)
├── frontend_artifact         (digest / ref)
├── schema_revision           (Alembic head revision id)
├── module_bom[]              (module_key + module_version + manifest_version)
├── compatibility_matrix      (min supported client schema, optional)
├── release_notes             (display)
└── status                    (draft → released → superseded)
```

**Не путать с:**

| Объект | Что это |
|--------|---------|
| `CodeBuild` | результат сборки из git (может не стать релизом) |
| `platform_releases` | governance changelog + tenant version offers (данные, не артефакты) |
| `platform_module_publications` | tenant **config** snapshot DEV→Template |
| `Release Package` | **код + schema + BOM модулей** как единый deployable unit |

### Сравнение вариантов

#### Вариант А — один общий пакет (backend + frontend + все модули)

| | |
|--|--|
| **Плюсы** | Простая модель; соответствует монорепо; один deploy; предсказуемая совместимость API/UI |
| **Минусы** | Любое изменение → новый полный релиз; нельзя обновить только Calendar |
| **Сложность** | Низкая |
| **Соответствие ЯсноПро** | **Высокое** — сегодня один uvicorn + один Vite bundle |

#### Вариант Б — независимые компоненты

| | |
|--|--|
| **Плюсы** | Гибкость; client на старом Calendar |
| **Минусы** | Нужны отдельные артефакты, API compatibility matrix, multi-deploy runtime — **сейчас отсутствует** |
| **Сложность** | Очень высокая |
| **Соответствие ЯсноПро** | **Низкое** — модули в `backend/app/modules/`, не publishable bundles; manifest registry только на 3 runtime keys |

#### Вариант В — гибрид (рекомендуется)

| | |
|--|--|
| **Плюсы** | Один deployable package + внутренняя детализация BOM; reuse `platform_module_manifests`; путь к modular deploy позже |
| **Минусы** | Нужна дисциплина BOM; два уровня версий (platform + module) |
| **Сложность** | Средняя |
| **Соответствие ЯсноПро** | **Высокое** — уже есть `platform_release_modules`, manifests с `backend_routers` / `frontend_routes` |

### Рекомендация

**Выбрать вариант В.**

**Почему:**

1. Монорепо и единый runtime требуют **атомарного** platform deploy в MVP.
2. `platform_module_manifests` уже описывают состав модуля — natural fit для BOM внутри пакета.
3. `platform_release_modules` уже связывает platform release с module version transitions — паттерн можно перенести на `release_package_modules`.
4. Независимый deploy модулей отложить до появления физически отделяемых module artifacts (post-MVP).

---

## Блок 2. Build Design

### Что такое Build?

**Build** — зафиксированный результат **сборки из git** (один `commit_sha`). Build может завершиться успешно, но **не стать** Release Package (failed QA, rejected review).

Build **создаёт** артефакты и manifest snapshot; Release Package **благословляет** конкретный Build.

### Состав Build

| Поле | Зачем | Обязательное |
|------|-------|--------------|
| `build_key` | стабильный technical id (`build-20260615-abc123`) | **да** |
| `commit_sha` | привязка к исходникам | **да** |
| `branch` | контекст сборки | нет (MVP) |
| `backend_artifact_digest` | hash wheel/image/layer | **да** (MVP: placeholder допустим) |
| `frontend_artifact_digest` | hash static bundle | **да** (MVP: placeholder допустим) |
| `schema_revision` | Alembic head после migrate | **да** |
| `module_artifact_digests` | jsonb `{module_key: digest}` | нет в MVP (BOM из manifests) |
| `build_manifest_json` | полный snapshot BOM + tool versions | **да** |
| `build_status` | pending / running / succeeded / failed | **да** |
| `build_started_at` | audit | **да** |
| `build_completed_at` | audit | нет до завершения |
| `built_by` | user или `system:cli` | нет |

### Build manifest (пример `build_manifest_json`)

```json
{
  "commit_sha": "a1b2c3d4",
  "schema_revision": "20260615_0067",
  "backend": { "digest": "sha256:...", "python": "3.11" },
  "frontend": { "digest": "sha256:...", "node": "20" },
  "modules": [
    { "module_key": "runtime.calendar", "module_version": "1.0.0", "manifest_version": "1.0.0" },
    { "module_key": "runtime.chat", "module_version": "1.0.0", "manifest_version": "1.0.0" },
    { "module_key": "runtime.notifications", "module_version": "1.0.0", "manifest_version": "1.0.0" }
  ],
  "core_platform": {
    "designer": "included",
    "runtime_gateway": "included",
    "yasii": "included"
  }
}
```

> **Core platform** в MVP не выделяется в отдельные deployable modules — входит в backend/frontend artifacts. BOM фиксирует только **runtime modules** с registry (`ACTIVE_RUNTIME_MODULE_KEYS_FOR_VERSION_BACKFILL`).

---

## Блок 3. Release Package Design

### Состав Release Package

| Поле | Источник | Обязательное |
|------|----------|--------------|
| `release_package_key` | generated technical key | **да** |
| `platform_version` | SemVer `MAJOR.MINOR.PATCH` | **да** |
| `build_id` | FK → успешный CodeBuild | **да** |
| `commit_sha` | из build | **да** |
| `schema_revision` | из build | **да** |
| `backend_artifact_digest` | из build | **да** |
| `frontend_artifact_digest` | из build | **да** |
| `module_bom` | copy from build manifest | **да** |
| `release_notes` | markdown/text | нет |
| `release_type` | `standard` \| `hotfix` \| `security` | **да** |
| `status` | draft → released | **да** |
| `released_at` / `released_by` | audit | после release |

### Таблица связи `release_package_modules` (проектируемая)

Зеркало `platform_release_modules`:

| Поле | Описание |
|------|----------|
| `release_package_id` | FK |
| `module_key` | technical key |
| `module_version` | semver |
| `manifest_version` | manifest semver |
| `from_module_version` | для changelog |

### Привязка к `platform_releases`

**Ответ: да, но optional и loose coupling.**

| Подход | Рекомендация |
|--------|--------------|
| Merge в одну таблицу | **Нет** — разная семантика (governance vs code artifacts) |
| Nullable FK `release_packages.platform_governance_release_id` | **Да** |
| Синхронизация `platform_version` | **Да** — при link versions SHOULD match |
| Автосоздание governance release при code release | **Нет в MVP** — manual link |

**Правило:** `platform_releases` = «что сообщаем клиентам и reviewers»; `release_packages` = «что физически устанавливаем». Один governance release может ссылаться на один code package; обратное — optional.

---

## Блок 4. Deployment Design

### Что устанавливается в Template и Client

Устанавливается **целый Release Package** (не отдельный модуль, не отдельный frontend).

| Environment | Что получает | `target_tenant_id` |
|-------------|--------------|-------------------|
| `template` | latest blessed package для эталонного code slot | portal id=2 (optional ref) |
| `client` | chosen package per tenant | конкретный CLIENT portal id |

### Структура Deployment

| Поле | Описание |
|------|----------|
| `deployment_key` | technical id |
| `environment_key` | `template` \| `client` |
| `release_package_id` | FK |
| `build_id` | денормализация |
| `platform_version` | денормализация |
| `target_tenant_id` | null для template slot; id для client |
| `status` | planned / in_progress / applied / failed / superseded |
| `applied_at` | |
| `applied_by` | |
| `previous_deployment_id` | chain для rollback |

### Разные версии на Template и Clients

**Можно и нужно поддерживать:**

```text
Template code slot  = platform_version 1.5.0
Client A            = platform_version 1.4.2
Client B            = platform_version 1.3.9
```

| Уровень | Поддержка |
|---------|-----------|
| Template ahead of clients | **Да** — нормальная модель |
| Client A ≠ Client B | **Да** — per-tenant `code_deployments` |
| Client ahead of Template | **Нет** — policy violation, block apply |
| Partial module version on client | **Нет в MVP** — только full package |

**Registry:** `environment_release_states` для template slot + `tenant_code_release_state` (tenant_id → active release_package_id).

---

## Блок 5. Rollback Design

### Что откатывается

| Объект | Откатывается? | Комментарий |
|--------|---------------|-------------|
| **Build** | **Нет** | immutable history; новый build при необходимости |
| **Release Package** | **Нет** | immutable; остаётся в registry |
| **Deployment** | **Да** | единица отката — операция над deployment |

### Сценарий Template 1.5.0 → rollback → 1.4.2

```text
1. Active: deployment D2 (release_package RP-1.5.0, applied)
2. Operator initiates rollback
3. System resolves previous successful deployment D1 (RP-1.4.2)
4. Create CodeDeploymentRollback(deployment_id=D2, target_package=RP-1.4.2)
5. Create new deployment D3 (planned, package=RP-1.4.2, supersedes D2)
6. Operator applies D3 (manual restart MVP)
7. environment_release_states.template = RP-1.4.2
```

### Что хранить для отката

| Данные | Зачем |
|--------|-------|
| Полная цепочка `code_deployments` per environment/tenant | найти previous applied |
| `release_package_id` + `build_id` + digests | знать что redeploy |
| `schema_revision` per package | migration rollback policy (MVP: forward-only + manual) |
| `module_bom` snapshot | verify compatibility |
| Rollback audit record | `code_deployment_rollbacks` |

**MVP migration policy:** schema **forward-only**; rollback code to older package **only if** `schema_revision` compatible (same head или documented downgrade path). Иначе — block с explicit error.

---

## Блок 6. Версионирование

### Сравнение моделей

| Модель | Плюсы | Минусы для ЯсноПро |
|--------|-------|---------------------|
| **SemVer** | понятен клиентам; уже в `platform_releases.version` | не привязан к git без доп. полей |
| **Дата** | простой build id | плох для offers/compat |
| **Build Number** | CI-friendly | не семантика продукта |
| **Гибрид** | SemVer + build_key + commit_sha | чуть сложнее |

### Рекомендация для ЯсноПро

**Гибрид:**

| Уровень | Формат | Пример |
|---------|--------|--------|
| **Platform release (публичный)** | SemVer | `1.5.0` |
| **Build (технический)** | `build-YYYYMMDD-HHMMSS-{short_sha}` | `build-20260615-143022-a1b2` |
| **Schema** | Alembic revision id | `20260615_0067` |
| **Module** | SemVer per `module_key` | `runtime.calendar@1.2.0` |
| **Manifest** | SemVer per manifest | `manifest_version 1.0.0` |

**Правила bump:**

- `MAJOR` — breaking API/schema
- `MINOR` — features, backward compatible
- `PATCH` — fixes
- `hotfix` release_type может bump PATCH на production branch

---

## Блок 7. Совместимость с текущей архитектурой

| Система | Можно использовать | Нельзя | Частично |
|---------|-------------------|--------|----------|
| **Publication Guard** | — | как code deploy mechanism | guards остаются для tenant data writes |
| **Platform Releases** | workflow patterns, review UI, event codes | как code package storage | optional FK link; semver sync |
| **Module Publications** | parallel contour for **tenant config** | для доставки кода | BOM references module versions, not config snapshots |
| **platform_module_versions** | BOM source of truth per module | standalone deploy unit | link via `release_package_modules` |
| **platform_module_manifests** | populate BOM (`backend_routers`, etc.) | — | |
| **platform_release_modules** | паттерн связи | прямая таблица для code | migrate pattern to `release_package_modules` |
| **DEV Journal** | audit dev work | — | |
| **Event Journal** | `code_release_*` events (new codes) | reuse `TEMPLATE_PUBLISHED` for code | extend `PlatformEventCode` |

**Инвариант:** Release Package delivery **не обходит** Publication Guard и **не заменяет** module config publication.

---

## Блок 8. MVP Scope

### В MVP включить

- `code_builds` с `build_manifest_json` (commit, schema, digests, module BOM)
- `release_packages` (immutable after `released`)
- `release_package_modules` (BOM rows)
- `code_deployments` + `environment_release_states`
- `code_deployment_rollbacks`
- CLI: `record_code_build.py`, `create_release_package.py`, `apply_code_deployment.py`
- `GET /platform/code-version` (active package per environment/tenant)
- Manual apply only (operator checklist + journal)
- SemVer + hybrid build_key
- Per-tenant client version lag support
- Optional FK to `platform_releases`

### Из MVP исключить

- CI/CD pipelines
- Kubernetes / Docker orchestration
- Blue-Green / Canary deploy
- Multi-region
- Auto scaling
- Independent per-module code deploy
- Automatic runtime restart
- Schema downgrade automation
- Artifact registry (S3/Harbor) — digest placeholder OK
- Blue/green database migration waves

---

## Блок 9. Gap Analysis

| Элемент | Сейчас | Целевая Release Architecture |
|---------|--------|---------------------------|
| Единица релиза (определена) | **Нет** | `ReleasePackage` |
| CodeBuild registry | **Нет** | `code_builds` |
| Build manifest / BOM | **Частично** | manifests in DB, not tied to build |
| Release Package registry | **Нет** | `release_packages` |
| Module BOM in package | **Частично** | `platform_release_modules` pattern |
| Deployment registry | **Нет** | `code_deployments` |
| Per-client version lag | **Нет** | tenant deployment state |
| Rollback registry | **Частично** | config rollbacks only |
| Commit SHA tracking | **Нет** | on build + package |
| Schema revision in release | **Нет** | alembic head on package |
| platform_releases link | **Нет** | optional FK |
| Independent module deploy | **Нет** | post-MVP |

---

## Architecture Decisions (финал)

### Решение №1 — Единица релиза

**`ReleasePackage`** — один immutable платформенный пакет (backend + frontend + schema + module BOM), производный от одного `CodeBuild` и одного `commit_sha`.

### Решение №2 — Единица деплоя

**`CodeDeployment`** — применение **целого** Release Package к code environment (`template` или `client` + `target_tenant_id`).

### Решение №3 — Единица отката

**`CodeDeploymentRollback`** — откат **deployment** к предыдущему успешному Release Package; Build и Package не удаляются.

### Решение №4 — Порядок реализации

```text
1. code_builds + build_manifest_json (CLI from git + alembic current)
2. release_packages + release_package_modules
3. code_deployments + environment_release_states + tenant_code_release_state
4. code_deployment_rollbacks
5. optional platform_releases FK + /platform/code-version API
6. Control Plane UI (read-only → manual apply)
7. Orchestration WI (отдельно, post-MVP)
```

---

## Risks

| ID | Риск | Mitigation |
|----|------|------------|
| R1 | Путаница Release Package vs platform_releases | naming, separate UI tabs, this audit |
| R2 | BOM drift (manifest vs actual code) | build CLI scans manifests at build time |
| R3 | Schema rollback при code rollback | MVP forward-only; compatibility check |
| R4 | Преждевременный вариант Б (per-module deploy) | defer; document in MVP exclusions |
| R5 | Placeholder digests без real artifact store | Phase 2 WI adds real storage |

---

## Data Impact Audit

```text
Изменений БД: нет.
Изменений данных: нет.
Удалений: нет.
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
| Единица релиза определена до создания таблиц | Pass |
| Не ломает Publication Guard / module publication | Pass |
| Technical keys для идентификации | Pass |
| Source of Truth — один package, не дубли | Pass |

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Определена единица релиза | ✅ |
| Определена единица Build | ✅ |
| Определена единица Deployment | ✅ |
| Определена единица Rollback | ✅ |
| Определена модель версионирования | ✅ |
| MVP Scope | ✅ |
| Gap Analysis | ✅ |
| DEV Journal | ✅ |
| Изменений БД нет | ✅ |
| Тестовые данные не создавались | ✅ |

---

*Аудит — design gate перед реализацией `code_builds` / `release_packages`. Следующий WI: Phase 1 implementation по порядку из Решения №4.*
