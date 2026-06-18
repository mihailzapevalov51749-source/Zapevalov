# Code Release Pipeline Readiness Audit

**Дата:** 2026-06-15  
**Тип:** read-only аудит кодового контура (без изменений кода, БД и runtime-данных)  
**Связанный аудит (tenant data):** `docs/audit/DEV_TEMPLATE_CLIENT_READINESS_AUDIT.md`  
**Главный вопрос:** может ли Cursor или разработчик изменить код Template/Client напрямую, минуя DEV и механизм релизов?

---

## Проверенные правила

| Правило | Применение в аудите |
|---------|---------------------|
| `01_ARCHITECTURE_RULES.mdc` | разделение display vs technical id; tenant protection; Source of Truth |
| `02_PROMPT_STANDARD.mdc` | структура отчёта, Success Criteria |
| `03_QUALITY_CONTROL.mdc` | Architecture / Data Impact / Cleanup / Demo audits |
| Publication Guard (P0/P1) | защита **tenant structure/config data**, не исходного кода |
| Release Management (`platform_release`) | workflow версий и offers; не deploy артефактов |
| DEV Journal (`dev-journal-mandatory.mdc`) | запись по завершении аудита |

---

## 1. Executive Summary

### Главный ответ

**Да.** Cursor и любой разработчик с доступом к репозиторию **могут изменить код, который немедленно влияет на Template и Client**, потому что:

1. Существует **одна** кодовая база (монорепозиторий).
2. DEV / Template / Client — это **tenant-окружения в одной БД**, а не отдельные инстансы приложения.
3. Один процесс **FastAPI** (`backend/app/main.py`) и один **Vite dev server** (`frontend/`) обслуживают все tenant.
4. Механизмы Publication Guard и `platform_release` защищают **данные и конфигурацию tenant**, но **не исходный код** backend/frontend/modules.

Изменение файла, например `backend/app/modules/calendar/router.py` или `frontend/src/App.jsx`, после перезагрузки dev-сервера **автоматически** меняет поведение для DEV (id=1), Template (id=2) и Client (id=21, ООО Розетка) — без релиза.

### Финальный вердикт

```text
NOT READY
```

### Готовность к модели DEV → Build → Release → Template → Release → Client (код)

```text
Общая готовность кодового контура: ~18%

  DEV как единственная точка разработки (enforcement)     ~5%
  Build (frontend / backend / modules)                   ~20%
  Versioning & Release artifacts                         ~25%
  Deploy Template                                        ~0%
  Deploy Client                                          ~0%
  Rollback кода                                          ~0%
  Защита от прямого изменения кода                       ~5%
```

**Интерпретация:** в репозитории есть зачатки release **governance** (метаданные в БД), но **нет** release **delivery** для кода.

---

## 2. Codebase Architecture

### Сколько кодовых баз

| # | Кодовая база | Статус |
|---|--------------|--------|
| 1 | `portal-constructor v2` (монорепозиторий) | **Единственная** |

Отдельных репозиториев, веток deploy или каталогов «template-code» / «client-code» **не существует**.

### Расположение компонентов

| Компонент | Путь | Примечание |
|-----------|------|------------|
| **Backend** | `backend/app/` | FastAPI, единый `main.py` |
| **Frontend** | `frontend/src/` | React + Vite |
| **Runtime modules** | `backend/app/modules/{calendar,chats,notifications,...}/` | Python-модули в том же процессе, не отдельные пакеты |
| **Platform modules registry** | `backend/app/modules/platform_modules/` | метаданные в БД + manifests; код в монорепо |
| **Shared libraries** | `frontend/src/shared/`, cross-imports в `backend/app/` | внутри монорепо, без publishable packages |
| **Scripts** | `backend/scripts/` | maintenance, restore, audit (~100+ скриптов) |
| **Docs / rules** | `docs/`, `.cursor/rules/` | governance, не runtime |
| **Uploads** | `backend/uploads/`, корневой `uploads/` | файловое хранилище, общее для инстанса |

### Инфраструктура запуска

| Сервис | Как запускается | Окружения |
|--------|-----------------|-----------|
| PostgreSQL | `docker-compose.yml` (только `db`, порт 5434) | одна БД для всех tenant |
| Backend API | локально `uvicorn` (порт 8010 по `apiClient.js`) | один инстанс |
| Frontend | `npm run dev` (Vite, порт 5173) | один инстанс |
| App containers | **отсутствуют** | нет Dockerfile для backend/frontend |

---

### DEV

| Вопрос | Ответ |
|--------|-------|
| Где код | тот же монорепозиторий `backend/`, `frontend/` |
| Как запускается | локальный uvicorn + vite dev |
| Как обновляется | правка файлов → hot reload / restart процесса |
| Отличие от Template/Client | **только данные tenant** (`tenant_type=DEV`, portal id=1), не код |

### Template

| Вопрос | Ответ |
|--------|-------|
| Отдельная кодовая база | **Нет** |
| Использует тот же код | **Да** — тот же backend/frontend процесс |
| Собственный deploy | **Нет** |
| Код может отличаться от DEV | **Нет** (физически один tree) |
| Что отделено | tenant data, guards на structure write, `tenant_type=TEMPLATE` (id=2) |

### Client

| Вопрос | Ответ |
|--------|-------|
| Отдельная кодовая база | **Нет** |
| Собственный deploy | **Нет** |
| Может отличаться от Template | **Нет** по коду; да по tenant data и module config apply |
| Пример | ООО Розетка (`ooo_rozetka`, id=21, `tenant_type=CLIENT`) |

---

## 3. Code Modification Paths

| Способ | DEV (код) | Template (код) | Client (код) | Обойти DEV? | Только одно окружение? |
|--------|-----------|----------------|--------------|-------------|------------------------|
| **Cursor / IDE** | да | да (тот же repo) | да (тот же repo) | **да** | **нет** — меняется общий код |
| **Git** | да | да | да | **да** | нет |
| **Manual file edit** | да | да | да | **да** | нет |
| **Terminal / PowerShell** | да | да | да | **да** | нет |
| **Hotfix (прямой commit)** | да | да | да | **да** | нет |
| **Deploy** | N/A | N/A | N/A | — | отдельного deploy нет |
| **Docker** | только Postgres | — | — | — | — |
| **Build scripts** | `vite build` локально | нет pipeline | нет pipeline | да | нет |
| **Migration scripts** | Alembic → общая схема БД | влияет на всех | влияет на всех | да | нет (DDL общий) |
| **CI/CD** | **отсутствует** (нет `.github/workflows`) | — | — | — | — |
| **Maintenance scripts** | да (`backend/scripts/`) | данные tenant guarded | данные tenant guarded | для **кода** — да | для **данных** — guards есть |

### Критическое следствие

Publication Guard (P0/P1) блокирует **прямую запись structure/config в Template/Client tenant**, но **не блокирует** правку `backend/app/**` или `frontend/src/**`.

`platform_release.apply_tenant_update` явно фиксирует: *«Конфигурационные изменения не применялись автоматически»* — релиз платформы сегодня **не доставляет код**.

---

## 4. Release Pipeline Readiness

### Целевая цепочка (код)

```text
Изменение кода → Сборка → Версионирование → Релиз → Развёртывание
```

### Build

| Артефакт | Есть | Детали |
|----------|------|--------|
| Frontend build | **Частично** | `npm run build` / `vite build` в `frontend/package.json`; нет CI, нет артефактного registry |
| Backend package | **Нет** | интерпретируемый Python + `requirements.txt`; нет wheel/sdist pipeline |
| Module package | **Нет** | модули — подпапки `backend/app/modules/`; `platform_modules` — registry в БД, не deployable bundle |

### Version

| Поле | Есть | Детали |
|------|------|--------|
| Version (semver) | **Частично** | `platform_releases.version`, `portals.template_version`, `tenant_versions` |
| Build Number | **Нет** | — |
| Release ID | **Да** | `platform_releases.id` (DB id, не deploy id) |
| Commit ID | **Нет** | не привязан к `platform_release` |
| Artifact hash | **Нет** | — |

### Deploy

| Операция | Есть | Детали |
|----------|------|--------|
| Deploy Template | **Нет** | нет отдельного template runtime |
| Deploy Client | **Нет** | нет client-specific runtime |
| Rollback (код) | **Нет** | нет versioned artifacts |
| Rollback (module config) | **Да** | `tenant_module_configuration_rollbacks` — **данные**, не код |

### Существующий `platform_release` (что реально делает)

Workflow в `backend/app/modules/platform_release/service.py`:

```text
draft → review → approved → published_to_template → offered_to_tenants → apply/skip
```

| Шаг | Эффект |
|-----|--------|
| `publish_release_to_template` | обновляет `template_version` у Template tenant |
| `offer_release_to_tenants` | создаёт `tenant_update_offers` для CLIENT tenants |
| `apply_tenant_update` | обновляет `tenant_versions` / `portal.template_version`; **код не меняется** |

Это **release governance для версий и changelog**, параллельный контур **module config publication** (`platform_module_publications`), но **не code delivery pipeline**.

---

## 5. Environment Separation

| Аспект | DEV | Template | Client | Разделено? |
|--------|-----|----------|--------|------------|
| Исходный код backend/frontend | общий | общий | общий | **Нет** |
| Процесс runtime (API/UI) | общий | общий | общий | **Нет** |
| PostgreSQL schema | общая | общая | общая | **Нет** |
| Tenant rows (`portals`) | id=1 | id=2 | id=21+ | **Да** |
| Structure write policy | allow | deny (guard) | deny (guard) | **Да** (данные) |
| Module config publication | source | target | apply target | **Да** (данные) |
| Uploads / files on disk | общий инстанс | общий | общий | **Нет** |
| `.env` / config | один файл в корне | — | — | **Нет** |

### Что невозможно разделить без новой архитектуры

- Единый Python import path и единый JS bundle для всех tenant.
- Alembic migrations — применяются к одной схеме.
- Любой import-time side effect в `main.py`.

### Критический вопрос: Cursor меняет файл → автоматически влияет на Template/Client?

**Да.**

| Файл | Путь | Окружения |
|------|------|-----------|
| Любой backend route/service | `backend/app/modules/**` | DEV + Template + Client (один API) |
| Любой frontend component | `frontend/src/**` | все tenant в браузере |
| App entry | `backend/app/main.py` | весь инстанс |
| API base URL | `frontend/src/api/apiClient.js` → `http://127.0.0.1:8010` | один backend |

Механизма «собрать только для Template» или «задеплоить только Client» **нет**.

---

## 6. Direct Code Change Risks

### Механизмы защиты

| Механизм | Статус | Комментарий |
|----------|--------|-------------|
| Git Branch Protection | **Нет** | в репозитории нет `.github/` workflows и branch rules |
| Deploy Protection | **Нет** | deploy pipeline отсутствует |
| Read Only (code) | **Нет** | весь repo writable |
| Separate Build | **Нет** | один локальный build |
| Separate Containers (app) | **Нет** | только Postgres container |
| Separate Runtime | **Нет** | один uvicorn + один vite |
| Separate Repositories | **Нет** | один git repo |
| Publication Guard (data) | **Частично** | structure/config tenant, не код |
| Platform Review (`platform_release`) | **Частично** | метаданные релиза, не артефакты |

---

## 7. Release Model Readiness

### Можно ли сейчас работать по модели?

```text
Изменили код в DEV → Создали релиз → Обновили Template → Проверили → Обновили Client
```

**Для исходного кода — нет.**

| Этап | Статус | Gap |
|------|--------|-----|
| Изменили код в DEV | de facto единственный repo | нет изоляции «DEV codebase» |
| Создали релиз | **частично** | `platform_release` — changelog + semver в БД |
| Сборка артефакта | **нет** | нет immutable build |
| Обновили Template (код) | **нет** | только `template_version` label |
| Проверили Template | manual | нет staging instance |
| Обновили Client (код) | **нет** | `apply_tenant_update` — version bump only |

### Что уже есть (смежные контуры)

| Контур | Готовность | Объект |
|--------|------------|--------|
| Module config publication | ~85% | tenant module settings DEV→Template→Client |
| Structure write guards | ~92% | tenant structure data |
| Platform release workflow | ~40% | governance / offers / journal |
| Code release delivery | ~0% | — |

---

## 8. Gap Analysis

### Сейчас

```text
[ Monorepo: backend + frontend ]
           ↓
   [ Single uvicorn + vite process ]
           ↓
   [ Single PostgreSQL + all tenants ]
           ↓
   DEV / Template / Client = tenant_type rows
           ↓
   Data guards + module config publication (partial)
           ↓
   platform_release = version metadata (not code deploy)
```

### Целевая модель

```text
DEV (единственная разработка)
  ↓ Build (immutable artifacts)
  ↓ Release (version + commit + artifact hash)
  ↓ Deploy → Template runtime
  ↓ Verify
  ↓ Release
  ↓ Deploy → Client runtime(s)
```

### Gap

| Область | Сейчас | Нужно |
|---------|--------|-------|
| Code isolation | один tree | DEV-only write path; template/client read pinned artifacts |
| Build | локальный vite | CI build backend image + frontend static bundle |
| Artifact registry | нет | хранить release bundles с hash |
| Version linkage | semver в БД | commit SHA, build id, artifact digest |
| Template deploy | нет | отдельный или pinned rollout target |
| Client deploy | нет | per-tenant или pool deploy с rollback |
| Code rollback | нет | redeploy previous artifact |
| Env config | один `.env` | per-environment secrets и URLs |
| DB migrations | общие | migration policy per rollout wave |

---

## 9. Risks

| ID | Риск | Severity |
|----|------|----------|
| R1 | Cursor/разработчик меняет `backend/` или `frontend/` — изменение сразу для всех tenant | **Critical** |
| R2 | Нет CI/CD — нет проверок перед «релизом» | **High** |
| R3 | `platform_release` создаёт иллюзию code release, но доставляет только version labels | **High** |
| R4 | Alembic migration в DEV меняет schema для Template/Client без wave control | **High** |
| R5 | Нет commit/build привязки к релизу — невозможен forensic rollback кода | **High** |
| R6 | Один apiClient URL — нет environment-specific frontend config | **Medium** |
| R7 | ~100 maintenance scripts с прямым доступом к коду и БД | **Medium** |
| R8 | Путаница data publication vs code release (разные зрелости) | **Medium** |
| R9 | Нет branch protection — hotfix может попасть в main без review | **Medium** |
| R10 | Uploads на общем диске — не tenant-isolated at storage layer | **Low** |

---

## 10. Roadmap

### Phase 0 — Зафиксировать терминологию (1 sprint)

- Разделить в документации: **Code Release** vs **Tenant Data Publication**.
- Переименовать/документировать `platform_release` как *Platform Version Governance* до появления code artifacts.

### Phase 1 — Build & Version (foundation)

- CI: `frontend` build artifact + backend test gate.
- Embed `GIT_COMMIT`, `BUILD_ID` в `/health` или `/platform/version`.
- Связать `platform_releases` с `commit_sha` + `artifact_digest` (schema migration).

### Phase 2 — Staging / Template runtime

- Отдельный deploy target для Template (container или pinned release slot).
- Deploy только из approved release artifact; DEV остаётся latest branch.

### Phase 3 — Client rollout

- Client pools с controlled rollout и rollback redeploy.
- Связать `tenant_update_offers` с **artifact version**, не только semver label.

### Phase 4 — Hardening

- Branch protection, required checks.
- Read-only production filesystem (если applicable).
- Migration waves: DEV schema → template verify → client batch.

---

## 11. Final Verdict

| Критерий | Результат |
|----------|-----------|
| Можно ли изменить код Template/Client минуя DEV release? | **Да** — нет отдельного кода; любая правка в монорепо влияет на всех |
| Есть ли code release pipeline end-to-end? | **Нет** |
| Есть ли защита исходного кода per environment? | **Нет** |
| Есть ли смежная защита tenant data? | **Да** (Publication Guard, module publication) |

```text
Статус: NOT READY

Готовность модели DEV → Build → Release → Template → Release → Client (код): ~18%
```

### Рекомендация

До внедрения code release pipeline:

1. Считать **любую** правку в `backend/` / `frontend/` изменением **глобального runtime**.
2. Не полагаться на `platform_release` как на deploy кода.
3. Продолжать использовать Publication Guard для **tenant data**, не смешивая с code delivery.
4. Приоритет Phase 1 roadmap: CI build + commit linkage + явный platform version endpoint.

---

## Data Impact Audit

```text
Только аудит.
Изменений БД: нет.
Изменений данных: нет.
Удалений: нет.
```

## Test Data Audit

```text
Новые тестовые данные не создавались.
```

## Cleanup Audit

Read-only проверка (2026-06-15):

```text
audit_companies_via_tenant_registry:
  total_companies: 3
  visible_test_companies_count: 0

audit_demo_environment:
  test_tenants: 0
  protected_tenants: 3 (DEV, Template, ООО Розетка)

visible_test_records_count = 0
Cleanup status: PASSED
```

## Architecture Audit

| Вопрос | Pass / Fail |
|--------|-------------|
| Source of Truth для **кода** — один repo | Pass (явно) |
| Разделение DEV/Template/Client на уровне **кода** | **Fail** |
| Tenant data guards не дублируют code release | Pass |
| `platform_release` не выдаёт себя за code deploy без оговорки | **Fail** (риск путаницы) |
| Display-поля не как id для protection | Pass (tenant by id/type) |

---

*Аудит выполнен read-only. Единственный записываемый артефакт — DEV Journal entry и этот документ.*
