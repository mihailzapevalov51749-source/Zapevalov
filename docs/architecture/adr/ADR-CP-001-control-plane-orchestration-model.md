# ADR-CP-001. Control Plane Orchestration Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-cp-001-control-plane-orchestration-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-RT-001 — Per-Company Runtime Architecture
- `docs/architecture/platform/control-plane-architecture.md`
- `docs/architecture/platform/tenant-environment-strategy.md`
- `backend/app/modules/control_plane/`
- `backend/app/modules/platform_release/`
- `backend/app/modules/platform_release_package_registry/`
- `backend/app/modules/platform_deployment_registry/`
- `backend/app/modules/platform_version_registry/`
- `backend/app/modules/platform_module_publications/`
- `backend/app/modules/platform_event_journal/`

---

## 1. Контекст

ADR-REL-001 и ADR-RT-001 зафиксировали целевой маршрут:

```text
DEV → Release Package → Control Plane Review → Publish To TEMPLATE
  → Offer → Company Decision → Apply → Company Runtime
```

При этом роль Control Plane (CP) в коде и документации описана **фрагментарно**:

- как UI и registry — **реализовано**;
- как publish orchestrator — **частично** (registry writes без physical/runtime orchestration);
- как company lifecycle coordinator — **частично** (provisioning DB; без per-company runtime).

ADR-CP-001 фиксирует **целевую роль CP** и границы ответственности относительно DEV, TEMPLATE, Company Runtime и Unified Release Package.

### As-is (текущее состояние)

| Роль CP | Статус |
|---------|--------|
| Management UI (`/control-plane/*`) | Реализовано |
| Registry (packages, deployments, offers, companies) | Реализовано |
| Review & approve release | Реализовано |
| Publish orchestration (full package) | **Не реализовано** — registry-only |
| Physical/runtime apply | **Вне CP** — ручные скрипты |
| Per-company runtime provision | **Не реализовано** |

---

## 2. Решение (Decision)

### 2.1. Главный ответ

**Control Plane — это комбинация ролей**, а не одна из них:

| Роль | Статус в CP |
|------|-------------|
| Интерфейс управления платформой | **Да** — primary operator surface |
| Реестр платформенных объектов | **Да** — Source of Truth для registry rows |
| Оркестратор жизненного цикла | **Да (целевое)** — координирует publish/offer/apply/provision |
| Система публикации | **Координатор**, не исполнитель артефактов |
| Система обновления компаний | **Координатор** Offer → Accept → Apply |
| Система аудита платформы | **Да** — обязательная запись событий |

CP **не является** runtime, БД компании, фабрикой сборки кода (DEV) или хранилищем user content.

### 2.2. Принцип разделения

```text
Control Plane  =  decide + record + coordinate
Runtime        =  execute + serve + persist (per environment/company)
DEV            =  build + draft + develop
TEMPLATE       =  golden reference (data + runtime slot)
Company        =  isolated tenant + runtime + DB
```

CP принимает решения и **инициирует** controlled side-effects через orchestration steps. CP **не подменяет** runtime processes и **не пишет** напрямую в company user data в обход Publication Guard и Offer-механизма.

---

## 3. Определение Control Plane (Control Plane Definition)

**Control Plane ЯсноПро** — это **платформенный контур управления** (UI, API, registry, audit), не являющийся tenant, который владеет жизненным циклом окружений (DEV, TEMPLATE, CLIENT), Unified Release Package, deployments, offers и company provisioning, выступает **единой точкой согласования и оркестрации** публикации и обновлений, и фиксирует **Source of Truth** для платформенных метаданных в Control Plane database.

Идентификация операций CP — по technical keys (`portal.id`, `package_key`, `deployment_key`, `company_code`), не по display names.

---

## 4. Границы Control Plane (Control Plane Boundaries)

### 4.1. В зоне ответственности CP

- Tenant registry (portals, customer_companies) для DEV / TEMPLATE / CLIENT / DEMO
- Unified Release Package registry и review workflow
- Deployment registry и environment version registry
- Offer registry (`tenant_update_offers`, converge module offers)
- Company provisioning **orchestration** (не исполнение runtime)
- Platform users, global users, platform roles
- Platform policies, licensing (целевое)
- Platform event journal (audit)
- Bridge Session issuance для cross-runtime auth (interim)
- Publication Guard enforcement **на уровне API/policy** (не обход)

### 4.2. Вне зоны ответственности CP

| Объект / процесс | Владелец |
|------------------|----------|
| Company Runtime processes | `runtime/company/{code}/` execution layer |
| Company database rows (tenant data) | Company DB + controlled apply services |
| Physical artifact build (vite, stage backend) | DEV monorepo + build scripts |
| HTTP request handling в company app | Company backend runtime |
| User work inside tenant (objects, pages content) | Company / Tenant Administration |
| TEMPLATE day-to-day editing | DEV tenant (design), не CP UI |
| Immutable release files on disk | Runtime filesystem (materialized by orchestrator) |
| YASII memory graphs per tenant | Company/TEMPLATE runtime data mounts |

### 4.3. CP vs Tenant Administration

| | Control Plane | Tenant Administration |
|--|---------------|----------------------|
| Scope | Вся платформа | Одна компания |
| Route | `/control-plane/*` | `/designer/tenant/{id}/administration/*` |
| Создание компаний | ✓ | ✗ |
| Publish release | ✓ | ✗ |
| Company users/roles | governance view | ✓ |
| Accept platform update offer | initiate (company admin) | ✓ (tenant admin UI) |

---

## 5. Матрица ответственности (Responsibility Matrix)

| Объект / процесс | Control Plane | Runtime (TEMPLATE / Company) | Company (tenant) |
|-----------------|---------------|------------------------------|------------------|
| `platform_release_packages` | **SoT registry** | — | — |
| `platform_code_builds` | **SoT registry** | — | — |
| `platform_deployments` | **SoT registry** | execution target recorded | — |
| `tenant_update_offers` | **SoT registry** | — | decision (accept/defer/reject) |
| `platform_environment_versions` | **SoT registry** | reflects active version | — |
| `portals` / `customer_companies` | **SoT registry** | — | logical identity |
| Physical `release-NNN/` | orchestrates materialize | **hosts artifacts** | hosts per-company copy |
| `yasnopro_company_{code}` | orchestrates CREATE | — | **SoT tenant data** |
| `yasnopro_template` | orchestrates publish target | TEMPLATE runtime serves | — |
| Module config apply | orchestrates via offer/apply API | executes in company DB session | receives result |
| User object records | — | — | **SoT** |
| Uploads / mounts | orchestrates paths policy | **persists files** | owns content |
| DEV journal (tenant) | — | DEV tenant | — |
| Platform event journal | **SoT audit** | — | — |
| Review / approve release | **owns workflow** | — | — |
| Rollback junction switch | orchestrates command | **executes** switch | — |
| Bridge JWT routing | issues / validates policy | middleware executes | — |

---

## 6. Модель реестров (Registry Model)

Все registry tables живут в **Control Plane database** (platform DB). Runtime filesystem и company DB — **не** registry SoT.

### 6.1. Release & delivery registries

| Реестр | Таблица / модуль | Назначение | SoT | Связи |
|--------|------------------|------------|-----|-------|
| **Release Package Registry** | `platform_release_packages` | Канон Unified Release Package | **CP** | `build_id` → builds; FK from deployments, offers |
| **Build Registry** | `platform_code_builds` | Provenance сборки | **CP** | → packages |
| **Deployment Registry** | `platform_deployments` | Факты apply к template/company | **CP** | `release_package_id`, `target_tenant_id` |
| **Environment Version Registry** | `platform_environment_versions`, `platform_version_history` | Текущая/историческая версия per portal | **CP** | `tenant_id`, `platform_version` |
| **Offer Registry (governance)** | `tenant_update_offers` | Предложения обновления компаниям | **CP** | `release_id` → packages |
| **Offer Registry (module, legacy)** | `tenant_module_update_offers` | Legacy per-module offers | **CP** (deprecate) | → publications |
| **Module Publication Registry** | `platform_module_publications` | Config snapshot source | **CP** | converge → package config layer |

### 6.2. Tenant & identity registries

| Реестр | Таблица / модуль | Назначение | SoT | Связи |
|--------|------------------|------------|-----|-------|
| **Company Registry** | `customer_companies`, `portals` | CLIENT tenants | **CP** | `database_name`, `code` |
| **Template Registry** | `portals` (TEMPLATE) | Эталон tenant metadata | **CP** | `yasnopro_template` DB |
| **Environment Registry** | `portals.tenant_type`, `environment_role` | DEV/TEMPLATE/CLIENT/DEMO | **CP** | tenant-environment-strategy |
| **Platform Users** | `platform_users` | CP operators | **CP** | — |
| **Global Users** | `users` | Identity layer | **CP** | memberships in company DB |
| **Tenant Versions (legacy)** | `tenant_versions` | Legacy version label | **CP** (deprecate) | → environment versions |

### 6.3. Audit & governance registries

| Реестр | Таблица / модуль | Назначение | SoT | Связи |
|--------|------------------|------------|-----|-------|
| **Platform Event Journal** | `platform_event_journal_entries` | Platform audit trail | **CP** | scope platform/tenant |
| **DEV Development Journal** | `platform_event_journal_entries` (dev_development) | DEV tenant WI log | **CP** (storage), DEV tenant scope | journal_kind |
| **Release Changes (legacy)** | `release_changes` | Legacy changelog rows | **CP** (deprecate) | → packages via adapter |

---

## 7. Модель процессов (Process Model)

### 7.1. Инициируются через CP (operator / API)

| Процесс | CP роль |
|---------|---------|
| Review Release | Workflow owner |
| Approve / Request Changes Release | Decision + state transition |
| Publish To TEMPLATE | **Orchestrator** (target): registry + runtime + template DB |
| Create Offer | Generate `tenant_update_offers` |
| Create Company | Orchestrate provisioning |
| Archive Company | `tenant_status` + orchestrate runtime stop |
| Platform user / role management | Direct CP CRUD |
| Record deployment succeeded/failed | Registry write (operator confirm or orchestrator callback) |

### 7.2. Инициируются вне CP, фиксируются в CP

| Процесс | Инициатор | CP роль |
|---------|-----------|---------|
| Release Draft creation | DEV (Studio UI → API) | Persist package + build |
| Code build / promote | DEV scripts | Optional build registry record |
| DEV journal entry | DEV scripts / agent | Persist journal row |
| Company admin Accept Offer | Tenant Administration UI | Validate + trigger apply orchestration |

### 7.3. Завершаются через CP (audit + registry terminal state)

| Процесс | Terminal CP records |
|---------|---------------------|
| Publish To TEMPLATE | deployment succeeded, env version, journal event |
| Apply to Company | deployment succeeded, offer applied, env version |
| Provisioning | customer_company + portal + database_name |
| Rollback | deployment rollback record, env version reverted, journal |

### 7.4. Не проходят через CP

| Процесс | Где выполняется |
|---------|-----------------|
| HTTP API обработка в company app | Company runtime backend |
| Object CRUD пользователями | Company DB |
| TEMPLATE structure editing | DEV tenant designer |
| Vite build / PowerShell promote | DEV workstation / CI (future) |
| Junction switch на диске | Runtime scripts (invoked by orchestrator) |
| PostgreSQL `CREATE DATABASE` | DB engine (invoked by provision service) |

---

## 8. Модель публикации (Publication Model)

По ADR-REL-001. CP участвует на каждом governance-шаге; **исполнение** артефактов — delegated.

```text
DEV: Release Draft
  → CP API: create/update platform_release_packages (status draft)
        │
        ▼
CP: Review Queue
  → submit / in_review / approve | changes_requested
        │
        ▼
CP: Publish To TEMPLATE (orchestrator — TARGET)
  ├─ 1. Validate package immutable + approved
  ├─ 2. Invoke runtime orchestration: materialize template release-NNN
  ├─ 3. Apply config/structure layers to yasnopro_template (guarded)
  ├─ 4. platform_deployments → running → succeeded
  ├─ 5. platform_environment_versions (template portal)
  └─ 6. platform_event_journal entry
        │
        ▼
CP: Offer To Companies
  └─ tenant_update_offers per CLIENT portal
```

**As-is gap:** шаги 2–3 выполняются вручную или не выполняются; CP пишет только registry.

---

## 9. Модель создания компании (Company Provisioning Model)

По ADR-RT-001.

```text
CP Operator: Create Company (customer_companies API)
        │
        ▼
CP Orchestrator (provision_service — TARGET extended)
  ├─ 1. Resolve template_tenant_id + template platform_version
  ├─ 2. CREATE DATABASE yasnopro_company_{code} WITH TEMPLATE yasnopro_template
  ├─ 3. Personalize portal in company DB
  ├─ 4. Create CP portal + customer_company rows
  ├─ 5. Assign first admin (global user + membership)
  ├─ 6. [TARGET] Materialize runtime/company/{code}/ from template runtime
  ├─ 7. Pin platform_environment_versions for new portal
  └─ 8. Journal event (platform + optional dev_development)
```

CP **оркестрирует** provisioning; **не хранит** company tenant data в CP DB (кроме registry metadata).

---

## 10. Модель обновления компании (Company Update Model)

### 10.1. Offer

```text
CP: offer_release_to_tenants(release_package_id)
  → tenant_update_offers (status=available)
  → journal event
```

Компания **не получает** изменений до accept.

### 10.2. Accept

```text
Company Admin (Tenant Administration) → accept API
        │
        ▼
CP Orchestrator: apply_release_package
  ├─ 1. Validate offer available + package published to template
  ├─ 2. Compatibility rules check
  ├─ 3. deployment planned → running
  ├─ 4. Invoke company runtime materialize (release-NNN)
  ├─ 5. Apply config/migration layers (guarded services)
  ├─ 6. deployment succeeded; offer applied
  ├─ 7. platform_environment_versions updated
  └─ 8. journal event
```

### 10.3. Defer / Reject

```text
CP API: update offer status → available (defer) | skipped (reject)
No orchestration side-effects
```

### 10.4. Rollback

```text
CP Operator: initiate rollback
  ├─ 1. Resolve previous succeeded deployment
  ├─ 2. Invoke runtime junction rollback (company slot)
  ├─ 3. Config rollback via rollback registry pattern
  ├─ 4. deployment rollback record + env version revert
  └─ 5. journal event
```

Rollback **scoped per company**; CP не откатывает другие tenants.

---

## 11. Модель аудита (Audit Model)

### 11.1. Обязательные события (platform_event_journal)

| Событие | Когда |
|---------|-------|
| Release created / updated | Draft changes |
| Release submitted / reviewed / approved | Review workflow |
| Published to template | After template publish |
| Offered to tenants | After offer generation |
| Tenant update applied / skipped / failed | Company decision |
| Company provisioned / archived | Lifecycle |
| Deployment started / succeeded / failed | Apply path |
| Rollback initiated / completed | Rollback path |
| Protected tenant guard triggered | Security |

### 11.2. Источники истины аудита

| Журнал | SoT для |
|--------|---------|
| `platform_event_journal_entries` (platform scope) | Platform operations audit |
| `platform_event_journal_entries` (tenant, dev_development) | DEV WI development log |
| `platform_version_history` | Version install history per portal |
| `platform_deployments` | Deployment attempt facts |
| Runtime `manifest.json` | Physical artifact provenance (derivative) |

Company tenant audit journal — **отдельный** контур (Tenant Administration), не подменяется platform journal.

---

## 12. Взаимодействие с контурами (Runtime Relationships)

### 12.1. Control Plane ↔ DEV

```text
DEV builds code → records build (optional) → creates Release Draft via CP API
DEV edits structure in DEV tenant → captured in package layers
DEV journal (dev_development) → stored in CP DB, scoped to DEV tenant
CP does NOT compile code or run vite
```

### 12.2. Control Plane ↔ TEMPLATE

```text
CP Publish → orchestrates template runtime + yasnopro_template DB
TEMPLATE is golden reference — CP manages version pin, not day-to-day design
CP reads template portal_id for deployment target
```

### 12.3. Control Plane ↔ Company Runtime

```text
CP Provision → [target] creates runtime/company/{code}/
CP Apply → orchestrates materialize + junction switch
CP does NOT serve HTTP for company users (company backend does)
Bridge JWT: CP issues, company runtime middleware consumes (interim)
```

### 12.4. Control Plane ↔ Release Package

```text
platform_release_packages = CANON in CP registry
CP owns review, publish, offer, deployment linkage
Physical artifacts = derivative materialization commanded by CP orchestrator
```

---

## 13. Ограничения Control Plane (Restrictions)

CP **запрещено**:

| # | Запрет |
|---|--------|
| 1 | Изменять user content компаний (object records) напрямую |
| 2 | Обходить Offer-механизм для company updates |
| 3 | Обходить Publication Guard и structure write guards |
| 4 | Мутировать immutable published `platform_release_packages` |
| 5 | Hard-delete protected tenants без dry-run + confirm + env flag |
| 6 | Идентифицировать tenants по `name` / `title` для delete/archive/routing |
| 7 | Подменять company runtime HTTP serving (не быть data plane) |
| 8 | Автоматически apply release без company accept (кроме TEMPLATE publish) |
| 9 | Писать в company DB без scoped session + policy layer |
| 10 | Создавать parallel registry SoT вне CP DB |

---

## 14. Orchestration Architecture (целевая)

```text
┌─────────────────────────────────────────────────────────┐
│                  CONTROL PLANE                           │
│  UI (/control-plane) + API + Registry DB                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Review Svc  │  │ Registry Svc │  │ Orchestrator   │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│         └────────────────┼───────────────────┘          │
│                          │ journal + state transitions   │
└──────────────────────────┼──────────────────────────────┘
                           │ commands (async/sync)
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Runtime Scripts    Provision Svc     Guarded Apply Svc
   (promote/switch)   (CREATE DB)       (config/structure)
         │                 │                 │
         ▼                 ▼                 ▼
   template/client/    PostgreSQL       company DB
   company runtime    yasnopro_*        sessions
```

**Orchestrator** — целевой компонент CP (не реализован как единый сервис); сегодня логика распределена между `platform_release/service.py`, `provision_service.py`, registry services.

---

## 15. Фазы внедрения orchestration

| Фаза | Scope |
|------|-------|
| Phase 0 | ADR-CP-001 accepted |
| Phase 1 | Unified `PublishOrchestrator` service (template path) |
| Phase 2 | `CompanyApplyOrchestrator` (accept → runtime + DB) |
| Phase 3 | Provisioning extends with runtime materialize |
| Phase 4 | Deprecate manual promote as primary path |

---

## 16. Отклонённые альтернативы

### CP как чистый registry (без orchestration)

Отклонено: ADR-REL-001 и ADR-RT-001 требуют coordinated publish/apply; registry-only сохраняет текущий разрыв.

### Runtime self-manages updates (без CP)

Отклонено: нет единого audit, offer, review; нарушает tenant-environment-strategy.

### CP как единый uvicorn для всех компаний

Отклонено: против ADR-RT-001 per-company runtime.

---

## 17. Документы, требующие обновления

| Документ | Изменение |
|----------|-----------|
| `docs/architecture/platform/control-plane-architecture.md` | Orchestrator role, registry list, restrictions |
| `docs/architecture/adr/ADR-REL-001-unified-release-package.md` | Cross-ref ADR-CP-001 |
| `docs/architecture/adr/ADR-RT-001-per-company-runtime.md` | Cross-ref ADR-CP-001 |
| `docs/architecture/platform/tenant-environment-strategy.md` | CP orchestration in lifecycle |
| `docs/architecture/README.md` | Index ADR-CP-001 |
| `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md` | CP operator checklist → orchestrator |

---

## 18. Риски

| Риск | Mitigation |
|------|------------|
| Orchestrator scope creep into data plane | Strict restrictions §13 |
| Distributed orchestration logic today | Phase 1 unified service |
| Manual ops bypass CP | Operator checklist + journal required |
| Async long-running apply | Job status in deployment registry |
| CP DB single point of failure | Standard DB HA; registry is SoT by design |

---

## 19. Критерии принятия ADR

- [x] Официальное определение Control Plane
- [x] Границы ответственности
- [x] Объекты управления (registry model)
- [x] Процессы (initiate / record / complete)
- [x] Реестры с SoT
- [x] Ограничения
- [x] Связи DEV, TEMPLATE, Release Package, Company Runtime
- [x] Publication, provisioning, update models
