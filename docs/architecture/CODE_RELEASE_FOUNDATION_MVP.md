# Code Release Foundation MVP — Design

**Дата:** 2026-06-15  
**Тип:** проектирование MVP-фундамента (без изменений кода, БД и runtime-данных)  
**Предшественники:**
- `docs/audit/CODE_RELEASE_PIPELINE_READINESS_AUDIT.md`
- `docs/audit/DEV_TEMPLATE_CLIENT_READINESS_AUDIT.md`

**Scope MVP:** registries + domain model + roadmap. **Вне scope:** CI/CD, Docker orchestration, Kubernetes, автоматический deploy, production rollout.

---

## Проверенные правила

| Правило | Применение |
|---------|------------|
| `01_ARCHITECTURE_RULES.mdc` | technical id (`id`, `key`, `code`, `tenant_type`); не ломать tenant protection |
| `02_PROMPT_STANDARD.mdc` | полная структура документа, Success Criteria |
| `03_QUALITY_CONTROL.mdc` | Architecture / Data / Cleanup audits |
| Publication Guard (P0/P1) | ортогональный контур (tenant data); не смешивать с code release |
| DEV Journal | запись по завершении design WI |
| Test Data / Cleanup Audit | read-only подтверждение |

---

## 1. Executive Summary

### Проблема

Сегодня изменение `backend/` или `frontend/` в монорепозитории **мгновенно** влияет на DEV, Template и Client — один runtime, один deploy. Publication Guard защищает **данные tenant**, но **кодовый контур отсутствует**.

### Цель MVP-фундамента

Заложить каноническую модель и registry-слой для цепочки:

```text
DEV → Build → Release → Template → Release → Client
```

без немедленного внедрения CI/CD и физического multi-deploy.

### Ключевое архитектурное решение

**Не переиспользовать `platform_releases` как code release.** Существующая таблица — **Platform Version Governance** (changelog + semver labels + tenant offers). Для кода вводится **параллельный контур** `code_*` registry, связанный с git/build, но не ломающий текущий workflow.

### Вердикт design WI

```text
DONE (design only)
```

Изменений в систему не вносилось.

---

## 2. Existing Components

### Этап 1 — аудит существующей реализации

| Компонент | Уже существует | Можно переиспользовать | Комментарий |
|-----------|----------------|------------------------|-------------|
| `platform_releases` | **Да** | **Частично** | Workflow review → publish_to_template → offers. Semver, status machine, journal hooks |
| `release_changes` | **Да** | **Частично** | Changelog entries (feature/fix/config). Не привязан к git diff |
| `tenant_versions` | **Да** | **Частично** | `current_version` per tenant — label, не code artifact |
| `tenant_update_offers` | **Да** | **Частично** | Template→Client offers для platform version; apply не деплоит код |
| `platform_module_publications` | **Да** | **Да (отдельный контур)** | DEV→Template **module config** publication; snapshot JSONB |
| `platform_module_versions` | **Да** | **Частично** | Module semver registry; уже есть nullable `release_id → platform_releases` |
| `platform_release_modules` | **Да** | **Частично** | Связь platform release ↔ module version transitions |
| `tenant_module_configuration_applies` | **Да** | **Паттерн** | Apply audit для config — образец для `code_deployments` |
| `tenant_module_configuration_rollbacks` | **Да** | **Паттерн** | Rollback audit для config — образец для code rollback registry |
| `platform_event_journal` | **Да** | **Да** | Release review events (`RELEASE_*`, `TEMPLATE_PUBLISHED`) |
| DEV journal (`dev_development`) | **Да** | **Да** | Cursor/dev work items |
| `tenant_environment` (`TenantType`, `TenantEnvironmentRole`) | **Да** | **Да** | DEV / TEMPLATE / CLIENT identity — **не** code runtime slots |
| Frontend `PlatformReleasesPage` | **Да** | **Нет для code** | UI для governance release, не code deploy |
| Build (`vite build`) | **Частично** | **Паттерн** | Локальный script, нет registry |
| Commit tracking | **Нет** | — | — |
| Build registry | **Нет** | — | — |
| Code deployment registry | **Нет** | — | — |
| Code rollback registry | **Нет** | — | — |

### Разделение контуров (обязательно зафиксировать)

| Контур | Объект | Таблицы / модули |
|--------|--------|------------------|
| **Tenant Data Publication** | structure/config в tenant | Publication Guard, `platform_module_publications`, applies/rollbacks |
| **Platform Version Governance** | semver + changelog + offers | `platform_releases`, `tenant_update_offers` |
| **Code Release** (новый) | исходный код backend/frontend/modules | `code_builds`, `code_releases`, `code_deployments`, `code_deployment_rollbacks` (проектируемые) |

---

## 3. Release Domain Model

### 3.1 Сущность `CodeRelease`

Каноническая запись **релиза кода** — immutable после `status = released`.

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `id` | int | да | PK |
| `release_key` | string | да | Стабильный технический ключ, напр. `cr-2026-06-15-001` (не display title) |
| `release_version` | semver string | да | `1.2.3` — версия **кода** платформы |
| `release_type` | enum | да | `platform_code` \| `hotfix` \| `module_bundle` (MVP: `platform_code`) |
| `commit_sha` | string(40) | да | Git SHA источника |
| `build_id` | FK → `code_builds.id` | да | Ссылка на сборку |
| `status` | enum | да | см. lifecycle ниже |
| `title` | string | да | Display |
| `description` | text | нет | Release notes |
| `created_at` | datetime | да | |
| `created_by` | user_id | да | |
| `released_at` | datetime | нет | Когда стал immutable |
| `released_by` | user_id | нет | |

**Lifecycle `CodeRelease.status`:**

```text
draft → ready_for_review → approved → released → superseded | archived
```

> Отличие от `platform_releases`: code release привязан к **build artifact**, а не к `source_tenant_id`.

### 3.2 Сущность `CodeBuild`

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `id` | int | да | PK |
| `build_key` | string | да | Уникальный id сборки, напр. `build-20260615-143022-a1b2` |
| `commit_sha` | string(40) | да | |
| `branch` | string | нет | `main` / feature branch |
| `build_status` | enum | да | `pending` \| `running` \| `succeeded` \| `failed` |
| `backend_artifact_digest` | string | нет | hash wheel/image/layer (MVP: placeholder) |
| `frontend_artifact_digest` | string | нет | hash static bundle |
| `manifest_json` | jsonb | нет | module versions included, tool versions |
| `created_at` | datetime | да | |
| `created_by` | user_id | нет | null если CI (будущее) |
| `completed_at` | datetime | нет | |

MVP: build создаётся **вручную** CLI (`record_code_build.py`) или dev script после локального `vite build` + pytest — без CI.

### 3.3 Связь с существующим `platform_releases` (опционально)

| Связь | Кардинальность | Назначение |
|-------|----------------|------------|
| `code_releases.platform_governance_release_id` | 0..1 → `platform_releases.id` | Связать code deploy с changelog governance для UI |
| `platform_module_versions.code_release_id` | 0..1 → `code_releases.id` | Module bundle в составе code release |

**Правило:** nullable FK, не breaking change для существующих rows.

---

## 4. Environment Model

### 4.1 Code Environment (новый слой)

Логические **слоты доставки кода**, не путать с `portals.tenant_type`.

| Code Environment | `environment_key` | Роль | MVP runtime |
|------------------|-----------------|------|-------------|
| DEV | `dev` | единственная точка разработки | latest working tree / latest dev build |
| Template | `template` | эталонный code slot | тот же процесс; registry фиксирует pinned release |
| Client | `client` | клиентский code slot | тот же процесс; per-tenant deployment records |

### 4.2 Маппинг на tenant (справочно, не 1:1)

| Code Environment | Типичные tenant (`tenant_type`) | Примечание |
|------------------|---------------------------------|------------|
| `dev` | DEV (portal id=1) | разработка данных + кода |
| `template` | TEMPLATE (id=2) | эталон данных; code slot отдельно |
| `client` | CLIENT, DEMO_CLIENT, … | много tenant → один или разные code deployments |

**Инвариант:** `environment_key` — technical key. `portals.name` / `title` — display only.

### 4.3 `EnvironmentReleaseState` (registry текущей версии)

Текущий активный code release per environment.

| Поле | Тип | Описание |
|------|-----|----------|
| `environment_key` | enum | `dev` \| `template` \| `client` |
| `active_code_release_id` | FK | текущий релиз |
| `active_build_id` | FK | денормализация для быстрого read |
| `commit_sha` | string | денормализация |
| `updated_at` | datetime | |
| `updated_by` | user_id | |

MVP: одна строка per `environment_key` (для `client` — отдельная таблица `tenant_code_deployments`, см. §5).

---

## 5. Deployment Model

### 5.1 `CodeDeployment`

Запись о **применении** code release к environment.

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `id` | int | да | PK |
| `deployment_key` | string | да | `deploy-{env}-{release_key}-{seq}` |
| `environment_key` | enum | да | `dev` \| `template` \| `client` |
| `code_release_id` | FK | да | |
| `build_id` | FK | да | |
| `target_tenant_id` | portal_id | нет | для `client` — конкретный tenant; для `template` — id=2 |
| `status` | enum | да | `planned` \| `in_progress` \| `applied` \| `failed` \| `superseded` |
| `applied_at` | datetime | нет | |
| `applied_by` | user_id | нет | |
| `notes` | text | нет | |
| `created_at` | datetime | да | |

### 5.2 `CodeDeploymentRollback`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | int | PK |
| `deployment_id` | FK | откатываемый deploy |
| `from_code_release_id` | FK | |
| `to_code_release_id` | FK | предыдущий активный |
| `status` | enum | `started` \| `completed` \| `failed` |
| `rolled_back_at` | datetime | |
| `rolled_back_by` | user_id | |
| `reason` | text | |

Паттерн: зеркалит `tenant_module_configuration_applies` + `tenant_module_configuration_rollbacks`.

### 5.3 MVP-поведение deploy (без auto rollout)

```text
1. CodeRelease создан (draft) из CodeBuild
2. Review → approved → released
3. CodeDeployment создаётся (planned) для environment=template
4. Operator вручную подтверждает apply (CLI / Control Plane UI)
5. Registry обновляет EnvironmentReleaseState
6. Физический restart/runtime switch — вне MVP auto; оператор перезапускает процесс
```

---

## 6. Gap Analysis

| Пункт | Сейчас | Целевая модель | Статус |
|-------|--------|----------------|--------|
| **Commit Tracking (Git SHA)** | нет в release tables | `code_builds.commit_sha`, `code_releases.commit_sha` | **Нет** |
| **Build Tracking (Build ID)** | нет | `code_builds` registry | **Нет** |
| **Release Registry** | `platform_releases` — governance only | `code_releases` + `EnvironmentReleaseState` | **Частично** |
| **Deployment Registry** | нет | `code_deployments` | **Нет** |
| **Rollback Registry** | config rollbacks only | `code_deployment_rollbacks` | **Частично** (паттерн есть) |
| **Artifact immutability** | нет | build digest + released status | **Нет** |
| **Environment separation (code)** | один runtime | logical slots + registry (MVP) | **Нет** |
| **Module config publication** | готов ~85% | без изменений | **Есть** |
| **Structure write guards** | P0/P1 | без изменений | **Есть** |
| **Platform review workflow** | `platform_releases` | reuse patterns, не таблицу | **Частично** |

### Сейчас → Целевая модель

```text
СЕЙЧАС:
  [monorepo] → [single uvicorn+vite] → [all tenants]
  platform_releases = version label + changelog
  module publications = tenant config data

ЦЕЛЬ MVP:
  [monorepo] → [CodeBuild record] → [CodeRelease] → [CodeDeployment per env]
  registry знает "какой commit/build/release активен"
  физический multi-deploy — Phase 5+, не MVP blocker для registry
```

---

## 7. MVP Roadmap

### Phase 1 — Release Registry

| | |
|--|--|
| **Цель** | Таблицы `code_releases`, `environment_release_states`; API read + manual create |
| **Объём** | Alembic migration, models, CRUD, `GET /code-releases`, CLI `record_code_release.py`, link commit_sha + build_id |
| **Риски** | Путаница с `platform_releases` → mitigated naming `code_*` + docs |
| **Зависимости** | Phase 2 (build_id FK) можно stub nullable в Phase 1 |

### Phase 2 — Build Registry

| | |
|--|--|
| **Цель** | `code_builds` с commit_sha, digests, manifest_json |
| **Объём** | migration, CLI `record_code_build.py` (reads `git rev-parse HEAD`), pytest |
| **Риски** | Локальные build без реального artifact store — digest placeholder OK для MVP |
| **Зависимости** | git в PATH; Phase 1 FK becomes required |

### Phase 3 — Deployment Registry

| | |
|--|--|
| **Цель** | `code_deployments`, apply/skip flow, update `environment_release_states` |
| **Объём** | service layer, Control Plane page (read-only list MVP), journal events |
| **Риски** | Registry без physical deploy — команда может игнорировать; нужен operator checklist |
| **Зависимости** | Phase 1 + 2 |

### Phase 4 — Rollback Registry

| | |
|--|--|
| **Цель** | `code_deployment_rollbacks`, revert `environment_release_states` to previous release |
| **Объём** | mirror config rollback pattern, tests, journal |
| **Риски** | Rollback registry ≠ rollback runtime без Phase 5 |
| **Зависимости** | Phase 3 history ≥ 2 deployments |

### Phase 5 — Code Release Pipeline

| | |
|--|--|
| **Цель** | End-to-end: DEV build → release → deploy template → verify → deploy client |
| **Объём** | Orchestration service, optional CI hooks, `/platform/version` endpoint, UI wizard |
| **Риски** | Scope creep into CI/K8s — **явно out of scope** until separate WI |
| **Зависимости** | Phases 1–4; optional physical runtime pinning |

**Явно вне MVP (по постановке):** CI/CD, Docker orchestration, Kubernetes, automatic deploy, production rollout.

---

## 8. Architecture Decisions

### ADR-1: Параллельный контур `code_*`, не рефакторинг `platform_releases`

**Решение:** новые таблицы `code_builds`, `code_releases`, `code_deployments`, `code_deployment_rollbacks`.  
**Причина:** `platform_releases` уже в production workflow (review, tenant offers); смена семантики — breaking.  
**Связь:** optional nullable FK `code_releases.platform_governance_release_id`.

### ADR-2: Code Environment ≠ Tenant Type

**Решение:** `environment_key` (`dev`/`template`/`client`) — отдельный enum для code delivery.  
**Причина:** один CLIENT tenant ≠ один code slot; Template tenant — data эталон, не code host обязательно.

### ADR-3: MVP допускает один физический runtime

**Решение:** registry-first; physical separation — позже.  
**Причина:** постановка запрещает CI/K8s/auto deploy на этом этапе; registry даёт Source of Truth и audit trail.

### ADR-4: Идентификация только по technical keys

**Решение:** `release_key`, `build_key`, `deployment_key`, `environment_key`, `commit_sha` — не `name`/`title`.  
**Соответствие:** `01_ARCHITECTURE_RULES.mdc`.

---

## 9. Compatibility Check (Phase 5 проверка совместимости)

| Система | Конфликт? | Обоснование |
|---------|-----------|-------------|
| **Publication Guard** | **Нет** | guards на tenant structure/config writes; `code_*` tables не вызывают structure mutations |
| **Module Publication** | **Нет** | отдельный pipeline; optional FK `platform_module_versions.code_release_id` |
| **platform_releases** | **Нет** | параллельный контур; optional link |
| **Template tenant (id=2)** | **Нет** | data guards сохраняются; code deployment — metadata |
| **Client tenants** | **Нет** | `tenant_update_offers` (governance) и `code_deployments` (code) coexist |
| **DEV tenant (id=1)** | **Нет** | dev journal + code build source |

**Правило интеграции:** code release **не заменяет** module config publication и **не обходит** Publication Guard.

---

## 10. Architecture Questions

### Вопрос 1: Можно ли реализовать release pipeline без разделения репозиториев?

**Да.** Release pipeline привязывается к **commit SHA + build artifacts**, а не к количеству git repo. Монорепо — нормальная модель: один `git rev-parse HEAD` → один `CodeBuild` → один `CodeRelease`.

### Вопрос 2: Можно ли оставить один репозиторий и один runtime на этапе MVP?

**Да.** MVP registry фиксирует **какой release должен быть активен** per environment, даже если физически один uvicorn+vite. Это закрывает audit gap («какая версия в Template?») до появления отдельных runtime.

### Вопрос 3: Что обязательно отделить первым?

Приоритет separation:

| # | Слой | Почему первым |
|---|------|---------------|
| 1 | **Build** | immutable record (commit + digest) — anchor для всего pipeline |
| 2 | **Release** | semver + link to build — «что выпускаем» |
| 3 | **Deploy** | «куда применили» per environment |
| 4 | **Runtime** | физический multi-instance — после registry (Phase 5+) |
| 5 | **Database** | общая schema в MVP; migration waves — позже |

**Код** как файлы в repo не «отделяется» — отделяется **доставка** через build/release/deploy registry. **Database** остаётся общей в MVP.

---

## 11. Risks

| ID | Риск | Mitigation |
|----|------|------------|
| R1 | Путаница `platform_releases` vs `code_releases` | naming `code_*`, docs, separate UI section |
| R2 | Registry без physical deploy — ложное ощущение безопасности | operator checklist + `/platform/version` endpoint |
| R3 | Два параллельных «release» в UI | Control Plane: вкладки «Platform Governance» / «Code Release» |
| R4 | Scope creep в CI/K8s | explicit out-of-scope в каждом Phase WI |
| R5 | Nullable FK stub в Phase 1 | short Phase 2 immediately after |

---

## 12. Recommendations

1. **Следующий WI:** Phase 1 + 2 в одном sprint (build + release registry с обязательным `commit_sha`).
2. Добавить endpoint `GET /platform/code-version` (read active release per environment) — без deploy automation.
3. Документировать в Control Plane: «Platform Release» ≠ «Code Release».
4. Не трогать Publication Guard и module publication services в code release WI.
5. Перед Phase 5 — отдельный WI на physical runtime pinning (optional).

---

## 13. Implementation Order

```text
1. docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md     ← этот документ (DONE)
2. Phase 2: code_builds migration + CLI (git SHA)
3. Phase 1: code_releases migration + API (depends build)
4. environment_release_states migration
5. Phase 3: code_deployments + apply service
6. Phase 4: code_deployment_rollbacks
7. Control Plane UI (read-only lists)
8. Phase 5: orchestration WI (отдельная постановка)
```

---

## Data Impact Audit

```text
Изменений БД: нет.
Изменений данных: нет.
Удалений: нет.
Только проектирование и документация.
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
| Source of Truth — отдельный code registry, не дубль module publication | Pass |
| Не ломает tenant/user architecture | Pass |
| Technical keys для идентификации | Pass |
| Новые сущности обоснованы (gap из audit) | Pass |
| Display-поля не как id | Pass |

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Release Domain Model спроектирована | ✅ |
| Environment Model спроектирована | ✅ |
| Deployment Model спроектирована | ✅ |
| Gap Analysis выполнен | ✅ |
| Roadmap подготовлен | ✅ |
| Архитектурные вопросы отвечены | ✅ |
| Изменений БД нет | ✅ |
| Изменений данных нет | ✅ |
| Тестовые данные не создавались | ✅ |
| DEV Journal создан | ✅ (см. отчёт) |

---

*Документ — design artifact. Реализация — отдельные Phase WI.*
