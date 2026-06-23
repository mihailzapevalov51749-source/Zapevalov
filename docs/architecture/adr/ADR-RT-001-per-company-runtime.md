# ADR-RT-001. Per-Company Runtime Architecture

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-rt-001-per-company-runtime`

## Связанные материалы

- ADR-REL-001 — Unified Release Package (`adr-rel-001-unified-release-package`)
- WI-RT-016A — Architecture Fixation Audit (Per-Company Runtime)
- WI-RT-015B — CLIENT Runtime Isolation (interim shared slot)
- `docs/architecture/platform/tenant-environment-strategy.md`
- `docs/architecture/platform/control-plane-architecture.md`
- `backend/app/modules/company_database_provisioning/provision_service.py`
- `backend/app/db/company_runtime_middleware.py`
- `scripts/runtime/README.md`

---

## 1. Контекст

ADR-REL-001 зафиксировал **Unified Release Package** как единственный канонический релиз и маршрут:

```text
DEV → Review → Publish To TEMPLATE → Offer → Company Decision → Apply Release Package
```

При **Apply** компания должна получать полный пакет изменений, включая code artifacts. Для этого каждая компания обязана иметь **изолированный runtime**, а не зависеть от общего CLIENT slot.

### Текущее состояние (as-is, interim)

| Слой | Реализация |
|------|------------|
| **БД** | Per-company: `yasnopro_company_{code}` via `CREATE DATABASE … WITH TEMPLATE yasnopro_template` |
| **Backend/Frontend runtime** | **Shared** `runtime/client/` — один процесс на :8012/:5175 |
| **Routing** | `CompanyRuntimeDatabaseMiddleware` + Bridge JWT → per-company DB |
| **Releases** | Shared `runtime/client/releases/release-NNN/` |
| **Mounts** | Shared `runtime/client/mounts/` |

WI-RT-015B реализовал shared CLIENT runtime как **временный этап**. ADR-RT-001 фиксирует **целевую** модель и объявляет shared CLIENT runtime **не целевой архитектурой**.

---

## 2. Решение (Decision)

### 2.1. Главный ответ

**Компания в целевой архитектуре ЯсноПро** — это изолированный **CLIENT tenant** (`portals` + `customer_companies`) с:

- собственной PostgreSQL БД;
- собственным Company Runtime (backend + frontend + releases + mounts);
- собственным lifecycle и rollback;
- привязкой к Unified Release Package через offers и deployments.

Компания **не разделяет** runtime, releases или mounts с другими компаниями.

### 2.2. Shared CLIENT runtime

```text
runtime/client/  — INTERIM ONLY, NOT TARGET
```

Целевая замена: `runtime/company/{company_code}/` per company.

---

## 3. Определение компании (Company Definition)

**Компания ЯсноПро** — это **CLIENT tenant** платформы: логическая и физическая единица эксплуатации клиентского портала, идентифицируемая техническими ключами (`portal.id`, `customer_companies.code`, `database_name`), владеющая изолированными данными, конфигурацией, runtime и жизненным циклом обновлений.

### 3.1. Принадлежит компании

| Категория | Сущности / артефакты |
|-----------|----------------------|
| **Identity** | `portals` (tenant_type=CLIENT), `customer_companies`, `portal.code` |
| **Database** | `yasnopro_company_{code}` — все tenant-scoped rows |
| **Runtime** | `runtime/company/{code}/` — backend, frontend, releases, mounts |
| **Version state** | `platform_environment_versions` (per portal_id), `tenant_versions` |
| **Update state** | `tenant_update_offers`, `platform_deployments` (target=company portal) |
| **User content** | Objects, pages content, uploads, files, chats, journals |
| **Configuration** | Tenant module configs, permissions, views (post-provision) |
| **Mounts** | uploads, data, logs — per company |

### 3.2. Не принадлежит компании

| Категория | Почему |
|-----------|--------|
| Platform Control Plane registry | Платформенный контур |
| `platform_release_packages` | Канон релиза; не копия per company |
| DEV / TEMPLATE tenants | Окружения разработки и эталона |
| Shared `runtime/client/` (interim) | Общий slot — не ownership компании |
| Global users (`users`) | Identity layer; membership — per company |
| Display names (`name`, `title`) | Не идентификаторы |

### 3.3. Идентификация (Architecture Rules)

Защита и routing **только** по: `id`, `code`, `tenant_type`, `environment_role`, `is_protected`, `database_name`.  
**Запрещено** использовать `name` / `title` как ключ маршрутизации или удаления.

---

## 4. Определение Company Runtime (Company Runtime Definition)

**Company Runtime** — это **изолированный физический и логический контур исполнения** одной компании: immutable releases с frontend/backend артефактами, активный junction `current`, персистентные mounts и процессы (или контейнеры), обслуживающие **только** одну company database и один `portal_id`.

### 4.1. Обязательные компоненты

| Компонент | Назначение |
|-----------|------------|
| `current/backend/` | Активный backend artifact (junction) |
| `current/frontend/` | Активный frontend artifact (junction) |
| `releases/release-NNN/` | Immutable unified releases (frontend + backend + manifest) |
| `mounts/uploads/` | Файлы компании |
| `mounts/data/` | Runtime data stores (YASII JSON и др.) |
| `mounts/logs/` | Логи backend компании |
| `releases/release-NNN/manifest.json` | Digests, git_commit, fingerprints |

### 4.2. Служебные компоненты

| Компонент | Назначение |
|-----------|------------|
| Control Plane DB rows | Registry, offers, deployments — не runtime |
| Bridge Session JWT | Auth routing (до dedicated company ingress) |
| `platform_deployments` | Audit apply events |
| Build staging (`.build-staging/`) | DEV factory; не part of company runtime |

### 4.3. Опциональные (future)

| Компонент | Назначение |
|-----------|------------|
| `runtime/company/{code}/state.json` | Local runtime lifecycle metadata |
| Dedicated ports per company | Production orchestration |
| Sidecar migration runner | Apply migration plan from package |

---

## 5. Состав компании (Company Composition)

При **полном** provisioning (целевая модель):

```text
Company (logical)
├── portal_id                    — FK portals.id (CLIENT)
├── company_code                 — stable technical key (customer_companies.code)
├── database_name                — yasnopro_company_{code}
├── company_database             — PostgreSQL, cloned from TEMPLATE
├── company_runtime_root         — runtime/company/{code}/
│   ├── current/                 — junction → active release
│   ├── releases/release-NNN/    — materialized Unified Release Package (code layer)
│   └── mounts/{uploads,data,logs}
├── platform_version             — pinned via platform_environment_versions
├── source_package_id            — FK platform_release_packages (at provision / last apply)
├── tenant_configuration         — rows in company DB (from TEMPLATE clone + deltas)
├── memberships & profiles       — tenant_user_memberships, tenant_user_profiles
└── lifecycle_state              — provisioning | active | updating | … (registry)
```

### 5.1. Что создаётся при создании компании

| Артефакт | Источник | Создаётся заново |
|----------|----------|------------------|
| **Company Database** | `CREATE DATABASE … WITH TEMPLATE yasnopro_template` | DB instance |
| **Portal row (company DB)** | Clone + personalize (`code`, `name`, tenant_type=CLIENT) | Personalization |
| **Control Plane portal + customer_company** | Provisioning service | Yes |
| **First admin user** | Provisioning | Yes |
| **Company Runtime** | Materialize from **current TEMPLATE package** (target) | Yes (target) |
| **Initial release-NNN** | Copy/symlink from template runtime release matching template package | Yes (target) |
| **Mounts** | Empty dirs or seed from template policy | Yes |
| **platform_environment_versions** | Template's current `platform_version` at provision time | Yes |
| **tenant_update_offers** | None at create | — |

**As-is gap:** Company Runtime **не создаётся** — компания использует shared `runtime/client/`.

---

## 6. Структура Company Runtime (целевая)

```text
runtime/company/{company_code}/
├── current/                         # junction → releases/release-NNN
│   ├── backend/                     # active backend artifact
│   └── frontend/                    # active frontend artifact
├── releases/
│   ├── release-001/                 # initial (from TEMPLATE at provision)
│   │   ├── manifest.json
│   │   ├── frontend/
│   │   └── backend/
│   └── release-002/                 # after company apply
│       ├── manifest.json
│       ├── frontend/
│       └── backend/
└── mounts/
    ├── uploads/                     # company files only
    ├── data/                        # company runtime data
    └── logs/                        # company-backend.log
```

### 6.1. Обоснование структуры

- **Зеркалит** проверенный паттерн `runtime/template/` (WI-RT-014C/D).
- **`company_code`** — стабильный filesystem key; совпадает с `customer_companies.code` / `portals.code`.
- **`releases/`** — immutable; rollback = junction switch (без удаления history).
- **`mounts/`** вне `releases/` — персистентность при смене release.
- **Нет** `manifest.json` на корне company — manifest **внутри** каждого `release-NNN/` (unified release policy ADR-REL-001).
- **Вне git workspace** — sibling `../runtime/company/` (как template/client).

### 6.2. Environment variables (целевые)

```text
DATABASE_URL=postgresql://...@host:port/yasnopro_company_{code}
APP_ENV=CLIENT
YASNOPRO_ENV=CLIENT
YASNOPRO_COMPANY_CODE={code}
YASNOPRO_BACKEND_ROOT=<runtime>/company/{code}/current/backend
YASNOPRO_UPLOADS_DIR=<runtime>/company/{code}/mounts/uploads
YASNOPRO_DATA_DIR=<runtime>/company/{code}/mounts/data
```

---

## 7. Источник компании (Provisioning Source)

```text
                    ┌─────────────────────┐
                    │ TEMPLATE             │
                    │ (yasnopro_template)  │
                    │ + template runtime   │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
   DB schema +           Structure +           Code baseline
   config rows           pages/nav/objects      (release-NNN)
   (WITH TEMPLATE)        (cloned)              (materialize)
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ NEW COMPANY          │
                    │ portal + CP record   │
                    │ yasnopro_company_*   │
                    │ runtime/company/{code}│
                    └─────────────────────┘
```

| Источник | Что берётся |
|----------|-------------|
| **TEMPLATE DB** | Object model, pages structure, navigation, roles scaffold, module configs |
| **TEMPLATE runtime** | Active `release-NNN` как initial company release (target) |
| **TEMPLATE package pin** | `platform_version` at provision → `platform_environment_versions` |
| **Создаётся заново** | `code`, admin user, CP records, mounts, personalized portal fields, company runtime root |

**Release Package** при provisioning: компания получает **materialization** того package, который **опубликован в TEMPLATE** на момент создания, не отдельный package.

---

## 8. Жизненный цикл компании (Company Lifecycle)

### 8.1. Рекомендуемый state machine

```text
PROVISIONING
  │  CREATE DATABASE, CP records, runtime init, first admin
  ▼
ACTIVE
  │  normal operation; pinned platform_version
  ▼
UPDATE_AVAILABLE          (tenant_update_offer.status = available)
  │
  ├── DEFERRED            (no apply; stays ACTIVE with offer pending)
  ├── REJECTED            (offer skipped; stays ACTIVE)
  │
  └── ACCEPTED → UPDATING
                    │  materialize release, migrations, config apply
                    ├── success → ACTIVE (new platform_version)
                    └── failure → FAILED_UPDATE
                              │
                              ├── retry → UPDATING
                              └── ROLLING_BACK → ACTIVE (previous release)
SUSPENDED                 (tenant_status; runtime stopped, data retained)
ARCHIVED                  (soft delete; runtime stopped, DB retained)
PURGED                    (hard delete; only with explicit confirm + flags)
```

### 8.2. Registry mapping (as-is)

| Целевой статус | Сегодня |
|----------------|---------|
| PROVISIONING | Provisioning service in-flight |
| ACTIVE | `tenant_status=ACTIVE` |
| UPDATE_AVAILABLE | `tenant_update_offers.status=available` |
| UPDATING | deployment `running` (partial) |
| FAILED_UPDATE | offer `failed` |
| ARCHIVED | archive flow on portal |
| PURGED | `YASNOPRO_ALLOW_TENANT_HARD_DELETE=1` + confirm |

---

## 9. Обновление компании (Company Update Model)

По ADR-REL-001, после **Accept Offer**:

### 9.1. Разворачивается (Apply)

| Слой | Действие |
|------|----------|
| **Code** | New `releases/release-NNN/` in `runtime/company/{code}/`; junction `current` switch |
| **Config** | Module/configuration deltas from package (Publication Guard) |
| **Structure** | Structure deltas if in package (future) |
| **Migrations** | `migration_plan` from package |
| **Registry** | `platform_deployments` succeeded; `platform_environment_versions` updated |
| **Offer** | `tenant_update_offers.status = applied` |

### 9.2. Обновляется

- `platform_environment_versions.platform_version`
- `platform_version_history` (append)
- Company DB rows per config/structure/migration plan
- Active runtime junction

### 9.3. Не обновляется

- User-generated content (objects data) — unless migration explicitly transforms
- `company_code`, `portal.id`, `database_name`
- Other companies' runtimes
- TEMPLATE
- Display names without explicit admin action

### 9.4. Defer

```text
offer remains available
company stays on current release + platform_version
no runtime or DB mutation
```

### 9.5. Reject

```text
offer.status → skipped
no mutation
company may receive future offers for newer packages
```

---

## 10. Rollback компании (Company Rollback Model)

### 10.1. Что откатывается

| Слой | Rollback |
|------|----------|
| **Code** | Junction `current` → previous `release-NNN` in company runtime |
| **Registry** | `platform_environment_versions` → previous version; deployment rollback record |
| **Config** | Via `tenant_module_configuration_rollbacks` if config apply occurred |
| **Migrations** | Per rollback plan in package (forward rollback scripts or restore — future WI) |

### 10.2. Что не откатывается

- User content created after failed update
- Audit logs and `platform_version_history` (append-only)
- Offers for other companies
- TEMPLATE state

### 10.3. Определение версии для отката

```text
1. platform_deployments for company portal, status=succeeded, ordered by finished_at DESC
2. Previous succeeded deployment → release_package_id → platform_version
3. Matching release-NNN in runtime/company/{code}/releases/ via manifest digest / release_id
4. Junction switch to that release-NNN
```

Rollback **scoped to one company**; не влияет на shared resources (в целевой модели shared resources отсутствуют).

---

## 11. Удаление компании (Company Deletion)

По `01_ARCHITECTURE_RULES.mdc`: **archive first**, hard delete только с dry-run + confirm + env flag.

| Этап | Runtime | БД | Releases | Mounts |
|------|---------|-----|----------|--------|
| **ARCHIVED** | Processes stopped; `runtime/company/{code}/` **retained** | Retained | Retained | Retained |
| **PURGED** (explicit) | Directory removed after confirm | `DROP DATABASE` after orphan check | Deleted with runtime | Deleted with runtime |

Protected tenants (`is_protected`, DEV, TEMPLATE, DEMO) — **не подлежат** purge.

Provisioning cleanup on failed create: `cleanup_failed_company_provisioning` — удаление partial CP rows + DROP DB if created.

---

## 12. Связь с Unified Release Package

```text
platform_release_packages (CANON)
        │
        ├─► Publish To TEMPLATE
        │     runtime/template/releases/release-NNN/
        │
        └─► Offer To Companies
              tenant_update_offers (per portal_id)
                    │
                    ├─ defer / reject → no materialization
                    │
                    └─ accept
                          Apply Release Package
                                │
                                ▼
                    runtime/company/{code}/releases/release-NNN/
                    platform_deployments (succeeded)
                    platform_environment_versions updated
```

**Правило:** компания никогда не применяет package, который не был опубликован в TEMPLATE (compatibility gate).

---

## 13. Связь с TEMPLATE

```text
TEMPLATE (tenant + yasnopro_template + runtime/template/)
        │
        ├─► Publish Release Package (full materialization)
        │
        └─► Create Company (provisioning)
              ├─ DB: WITH TEMPLATE yasnopro_template
              ├─ Version: template's platform_environment_versions
              └─ Runtime: materialize template's active release → company initial release
                    │
                    ▼
              runtime/company/{code}/  (independent lifecycle thereafter)
```

После создания компания **автономна**: обновления только через Offer → Accept → Apply, не через прямое изменение TEMPLATE.

---

## 14. Модель хранения (Company Storage Model)

| Класс | Расположение | Mutable | Backup |
|-------|--------------|---------|--------|
| **БД** | PostgreSQL `yasnopro_company_{code}` | Yes (tenant data) | Per-company backup policy |
| **Runtime artifacts** | `runtime/company/{code}/releases/` | Immutable per release | Copy/snapshot |
| **Active code** | `runtime/company/{code}/current/` | Junction only | — |
| **Mounts** | `runtime/company/{code}/mounts/` | Yes (persistent) | Per-company |
| **Logs** | `mounts/logs/` | Append | Rotation |
| **Configuration** | Company DB rows | Yes (controlled apply) | DB backup |
| **Version metadata** | Control Plane DB | Registry writes | CP backup |

---

## 15. Legacy Runtime Status

| Объект | Статус |
|--------|--------|
| `runtime/client/` (shared) | **INTERIM — NOT TARGET**; deprecate after per-company rollout |
| `CompanyRuntimeDatabaseMiddleware` + Bridge JWT | **INTERIM** routing; replace with company-dedicated ingress or company-scoped process |
| Per-company DB (`yasnopro_company_*`) | **TARGET — уже реализовано** |
| `runtime/template/` | **TARGET** — эталон; не shared с companies |
| `runtime/company/{code}/` | **TARGET** — to be implemented |

---

## 16. Фазы внедрения

| Фаза | Scope |
|------|-------|
| **Phase 0** | ADR-RT-001 accepted (this document) |
| **Phase 1** | Provision creates `runtime/company/{code}/` skeleton + initial release from template |
| **Phase 2** | Company-scoped apply on Accept Offer (ADR-REL-001 Phase 4) |
| **Phase 3** | Per-company process/ports or orchestrator |
| **Phase 4** | Deprecate shared `runtime/client/` |

---

## 17. Architecture Invariants

1. **One company = one DB + one runtime root** — no sharing.
2. **Technical keys** — `portal.id`, `code`, `database_name`; not display names.
3. **TEMPLATE first** — company never receives package not published to TEMPLATE.
4. **Immutable releases** — rollback via junction, not in-place edit.
5. **Isolated mounts** — uploads/data/logs never shared between companies.
6. **Archive before purge** — hard delete requires explicit governance.

---

## 18. Отклонённые альтернативы

### Shared CLIENT runtime (status quo)

Отклонено как **целевая** модель: нет per-company rollback, нет digest isolation, несовместимо с ADR-REL-001 Apply semantics.

### DB-only isolation (no per-company runtime)

Отклонено: code updates cannot be applied per company; version drift across companies on shared binary.

### One runtime per company in git workspace

Отклонено: runtime lives outside monorepo (`../runtime/`), как template/client.

---

## 19. Документы, требующие обновления

| Документ | Изменение |
|----------|-----------|
| `docs/architecture/adr/ADR-REL-001-unified-release-package.md` | Cross-ref ADR-RT-001 |
| `docs/architecture/platform/tenant-environment-strategy.md` | Per-company runtime; deprecate shared CLIENT |
| `docs/architecture/platform/control-plane-architecture.md` | Company lifecycle + provisioning |
| `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md` | environment_key → company slot |
| `scripts/runtime/README.md` | `runtime/company/{code}/` structure |
| `scripts/dev-stack/manifest.yaml` | Company runtime lifecycle (future) |
| `docs/architecture/README.md` | Index ADR-RT-001 |

---

## 20. Риски

| Риск | Mitigation |
|------|------------|
| Resource cost (N runtimes) | Orchestrator; not all companies need 24/7 dedicated process in dev |
| Migration from shared CLIENT | Phased; Bridge JWT interim |
| Provisioning duration | Parallel runtime materialize; async provision |
| Disk usage (N × releases) | Retention policy; archive old releases |
| Operator complexity | Reuse template promote/verify scripts parametrized by `{code}` |

---

## 21. Критерии принятия ADR

- [x] Официальное определение компании
- [x] Официальное определение Company Runtime
- [x] Состав компании
- [x] Lifecycle компании
- [x] Процесс создания (provisioning source)
- [x] Процесс обновления (Accept/Defer/Reject)
- [x] Процесс rollback
- [x] Связь с Release Package
- [x] Связь с TEMPLATE
- [x] Legacy runtime status
