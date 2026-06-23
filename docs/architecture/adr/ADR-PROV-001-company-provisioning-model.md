# ADR-PROV-001. Company Provisioning Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-prov-001-company-provisioning-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- `backend/app/modules/company_database_provisioning/provision_service.py`
- `backend/app/modules/company_database_provisioning/provisioning_consistency.py`
- `docs/architecture/platform/tenant-environment-strategy.md`

---

## 1. Контекст

Принятые ADR фиксируют:

- новая компания создаётся **из TEMPLATE** (ADR-TPL-001);
- компания получает **собственную БД, runtime, releases, mounts, lifecycle** (ADR-RT-001);
- provisioning **оркестрируется Control Plane** (ADR-CP-001);
- baseline версии определяется **опубликованным в TEMPLATE Release Package** (ADR-REL-001).

Реализация WI-15 (`provision_client_company_in_dedicated_database`) покрывает **изолированную БД** и catalog в CP, но **не** materialize per-company runtime и **не** pin `platform_environment_versions` / `release_package_id`.

ADR-PROV-001 фиксирует **полную целевую модель provisioning** и явно разделяет **as-is** vs **target**.

### As-is (текущая реализация)

```text
CP API → CREATE DATABASE WITH TEMPLATE → personalize portal in company DB
       → first admin → customer_companies catalog → commit
Runtime: shared CLIENT slot (Bridge JWT)
Version pin: portals.template_version (legacy label)
Rollback: DROP DATABASE on failure (provisioning_consistency)
```

---

## 2. Решение (Decision)

**Company Provisioning** — это **атомарный (с compensating rollback) оркестрируемый процесс Control Plane**, создающий изолированную CLIENT-компанию путём клонирования нормативного состояния TEMPLATE (БД + code baseline) и регистрации всех платформенных метаданных, необходимых для автономного lifecycle компании.

**Главный ответ:** из TEMPLATE появляется новая компания через **controlled clone + personalize + registry + runtime materialize + version pin**, инициируемые CP, с единым audit trail и rollback при сбое.

---

## 3. Определение Provisioning (Provisioning Definition)

**Company Provisioning** — это **платформенный процесс Control Plane**, в котором по запросу оператора (или автоматизированного workflow) из golden reference TEMPLATE создаётся новая CLIENT-компания с уникальным техническим `company_code`, выделенной PostgreSQL базой `yasnopro_company_{code}`, персонализированным portal tenant в company DB, записью в company registry (`customer_companies`), первым суперадминистратором, зафиксированным baseline Unified Release Package / `platform_version`, materialized Company Runtime (`runtime/company/{code}/` — целевое), и обязательными journal events — при условии успешного завершения всех критических шагов или полного compensating rollback при сбое.

---

## 4. Входные параметры (Provisioning Inputs)

### 4.1. Обязательные

| Параметр | Источник | Примечание |
|----------|----------|------------|
| **Company Name** (`name`) | Operator input | Display; не id |
| **First Administrator** (`email`, `full_name`, …) | Operator input | Создаётся в company DB |
| **TEMPLATE reference** | System resolver | `resolve_template_tenant_id()` + `yasnopro_template` |

### 4.2. Опциональные

| Параметр | Источник |
|----------|----------|
| `description` | Operator |
| `users_limit`, `sales_owner_id`, `support_owner_id` | CP catalog |
| `short_name`, branding hints | Operator (future) |
| Explicit `company_code` | Operator (если API поддерживает; иначе generated) |

### 4.3. Вычисляемые (system-derived)

| Параметр | Как вычисляется |
|----------|-----------------|
| **company_code** | `generate_platform_key(name)` + uniqueness check |
| **database_name** | `yasnopro_company_{code}` |
| **template_tenant_id** | Из cloned company DB (portal TEMPLATE row) |
| **template_portal_id** (CP) | `resolve_template_tenant_id(cp_db)` |
| **platform_version** (target) | `platform_environment_versions` TEMPLATE at provision time |
| **release_package_id** (target) | Last succeeded template deployment → package |
| **home_page_id** | `resolve_tenant_home_page_id` после clone |
| **temporary_password** | `generate_provisioning_password()` |
| **public_slug** | `resolve_portal_public_slug_for_create` |
| **runtime_root** (target) | `runtime/company/{code}/` |
| **initial release_id** (target) | Active template `release-NNN` |

**Запрещено** принимать от оператора как authoritative: `portal.id` (до создания), `database_name` (только derived), `platform_version` override без governance policy.

---

## 5. Выходные объекты (Provisioning Outputs)

| Объект | Где создаётся | As-is | Target |
|--------|---------------|-------|--------|
| **Portal (CLIENT)** | Company DB | ✓ | ✓ |
| **CustomerCompany** | CP DB | ✓ | ✓ |
| **Company Database** | PostgreSQL | ✓ | ✓ |
| **First Administrator** (`users`) | Company DB | ✓ | ✓ |
| **Tenant superadmin** (membership + profile) | Company DB | ✓ | ✓ |
| **Tenant catalog publish** | Company DB | ✓ | ✓ |
| **database_name** in catalog metadata | CP `customer_companies` | ✓ | ✓ |
| **Company Runtime root** | Filesystem | ✗ | ✓ |
| **Initial release-NNN** | `runtime/company/{code}/releases/` | ✗ | ✓ |
| **Mounts** (uploads, data, logs) | Filesystem | ✗ | ✓ |
| **platform_environment_versions** | CP DB | ✗ | ✓ |
| **platform_version_history** | CP DB | ✗ | ✓ |
| **Provisioning deployment record** (target) | `platform_deployments` | ✗ | optional |
| **tenant_update_offers** | — | ✗ (none at create) | ✗ |
| **Platform event journal** | CP DB | partial | ✓ mandatory |
| **DEV development journal** | CP DB (DEV scope) | optional | ✓ for WI |

**Примечание:** CP `portals` row для CLIENT **не обязателен** в as-is — canonical registry через `customer_companies` + `portal_id` в company DB. Target: согласованный cross-reference без дублирования SoT.

---

## 6. Жизненный цикл provisioning (Provisioning Lifecycle)

### 6.1. Целевой полный маршрут

```text
[CP] Validate Request
  │  name, first_admin, policy guards, TEMPLATE availability
  ▼
[CP] Reserve Company Code
  │  generate_platform_key + uniqueness (codes in customer_companies + portals)
  ▼
[CP] Resolve Template Baseline
  │  template_tenant_id, platform_version, release_package_id (from TEMPLATE pin)
  ▼
[DB] Create Database
  │  CREATE DATABASE yasnopro_company_{code} WITH TEMPLATE yasnopro_template
  ▼
[Company DB] Clone Personalization
  │  personalize cloned portal → tenant_type=CLIENT, code, name, public_slug
  │  publish_tenant_catalog
  ▼
[Company DB] Create First Administrator
  │  users + assign_tenant_superadmin (TENANT_SUPERADMIN)
  ▼
[Company DB] Resolve Home Page
  │  home_page_id from cloned structure
  ▼
[CP] Register Customer Company
  │  customer_companies + catalog metadata (code, database_name, portal_id, …)
  ▼
[TARGET] Materialize Company Runtime
  │  runtime/company/{code}/releases/release-001/ from template active release
  │  junction current + empty mounts
  ▼
[TARGET] Pin Version Registry
  │  platform_environment_versions + platform_version_history
  ▼
[CP] Audit & Activate
  │  journal events; tenant_status=ACTIVE
  ▼
[CP] Finalize Commits
  │  company_db.commit → cp_db.commit (ordered)
  ▼
SUCCESS → CompanyProvisioningResult
```

### 6.2. As-is сокращённый маршрут

Шаги **Materialize Runtime** и **Pin Version Registry** — **пропущены**. Компания использует shared CLIENT runtime + Bridge JWT.

### 6.3. Состояния процесса

```text
VALIDATING → RESERVING_CODE → CREATING_DATABASE → CONFIGURING_TENANT
  → CREATING_ADMIN → REGISTERING_CATALOG → [MATERIALIZING_RUNTIME]
  → [PINNING_VERSION] → FINALIZING → SUCCEEDED | FAILED → CLEANUP
```

---

## 7. Модель создания Runtime (Runtime Creation Model)

По ADR-RT-001 (целевое).

| Компонент | Источник | Действие |
|-----------|----------|----------|
| `releases/release-001/` | TEMPLATE active `release-NNN` | Copy/materialize artifacts + manifest |
| `current/` junction | → release-001 | Activate |
| `mounts/uploads`, `data`, `logs` | — | Create empty (не клонировать TEMPLATE mounts) |
| Env vars template | Derived | `DATABASE_URL` → company DB |

**Не копируется:** TEMPLATE uploads, TEMPLATE logs, other companies' runtime.

**Материализуется из Release Package:** code layer того package, который опубликован в TEMPLATE на момент provision (через template active release digest match).

---

## 8. Модель создания БД (Database Creation Model)

| Аспект | Источник |
|--------|----------|
| **Источник БД** | `CREATE DATABASE … WITH TEMPLATE yasnopro_template` |
| **Источник структуры** | TEMPLATE DB snapshot (object types, fields, pages, navigation, …) |
| **Источник конфигурации** | TEMPLATE module configs (cloned rows) |
| **Источник данных** | Только reference/seed rows из TEMPLATE; **не** CLIENT/DEMO user content |
| **Персонализация** | `_personalize_cloned_portal` — name, code, tenant_type, public_slug |
| **Имя БД** | `yasnopro_company_{code}` — technical, derived from code |

**Инвариант:** bootstrap **только** из `yasnopro_template`, не из DEV/CLIENT/DEMO.

---

## 9. Модель первого администратора (First Administrator Model)

| Аспект | Решение |
|--------|---------|
| **Где создаётся** | Company DB — таблица `users` |
| **Связь с компанией** | `assign_tenant_superadmin` → `tenant_user_memberships` + `tenant_user_profiles` |
| **Роль** | `TENANT_SUPERADMIN` («Суперадминистратор») |
| **Права** | Полный tenant admin в рамках компании; **не** platform admin |
| **Пароль** | `generate_provisioning_password()` — временный; передаётся оператору |
| **Global user** | User в company DB (per-company identity model as-is); не `platform_users` |
| **account_status** | `USER_ACCOUNT_STATUS_ACTIVE` |

Первый администратор **не получает** Control Plane прав.

---

## 10. Транзакционность и критические шаги

### 10.1. Критические (failure → compensating rollback)

| Шаг | Критичность |
|-----|-------------|
| CREATE DATABASE | Критический — orphan DB при partial |
| Portal personalization + catalog | Критический |
| First admin creation | Критический |
| customer_companies registration | Критический |
| Finalize commits | Критический |
| Runtime materialize (target) | Критический |
| Version pin (target) | Критический |

### 10.2. Транзакционные границы

```text
Company DB session  — одна транзакция до commit
CP DB session       — одна транзакция до commit
PostgreSQL CREATE   — DDL вне ORM transaction
Filesystem runtime  — вне DB transaction (compensate: delete runtime root)
```

**Порядок finalize (as-is):** `company_db.commit()` → `cp_db.commit()`. При ошибке CP commit — **DROP DATABASE** (compensating).

### 10.3. Что откатывается целиком

При любом сбое до успешного finalize:

- rollback ORM sessions;
- `DROP DATABASE` если `created_database=True`;
- [target] удаление `runtime/company/{code}/` если создан;
- [target] откат CP registry rows если успели flush без commit.

### 10.4. Что может откатываться частично

- Journal events — append-only; при rollback помечать failed provision event, не удалять;
- Orphan detection scripts для DB без catalog (operational remediation).

---

## 11. Модель rollback (Rollback Model)

| Сценарий сбоя | Действие |
|---------------|----------|
| **БД создана, portal не персонализирован** | `cleanup_failed` → DROP DATABASE |
| **Portal OK, admin не создан** | rollback company_db session → DROP DATABASE |
| **Admin OK, catalog не зарегистрирован** | rollback both sessions → DROP DATABASE |
| **Catalog flushed, commit failed** | DROP DATABASE; CP rollback |
| **DB committed, CP commit failed** | DROP DATABASE (as-is finalize policy) |
| **Runtime создан, version pin failed** (target) | Delete runtime root + DROP DATABASE + CP rollback |
| **Provisioning прерван на середине** | `cleanup_failed_company_provisioning` — идемпотентный DROP если flag set |

**Запрещено** оставлять partial company без catalog entry и без cleanup.

**Hard delete** orphaned company — только с dry-run + explicit confirm + `YASNOPRO_ALLOW_TENANT_HARD_DELETE=1`.

---

## 12. Модель идемпотентности (Idempotency Model)

### 12.1. Безопасно повторять

| Операция | Условие |
|----------|---------|
| Validate request | Read-only |
| Reserve code check | Read-only если code ещё не committed |
| Resolve template baseline | Read-only |

### 12.2. Повторять нельзя без cleanup

| Операция | Риск |
|----------|------|
| CREATE DATABASE same name | PostgreSQL error — DB exists |
| Re-register same code | Uniqueness violation |
| Re-run full provision same name | Duplicate code generation may differ |

### 12.3. Целевые требования

| Требование | Решение |
|------------|---------|
| **Idempotency key** | `provision_request_id` (UUID) в journal + optional lock row |
| **At-most-once DB** | Check `database_name` existence before CREATE |
| **At-most-once catalog** | Unique `customer_companies.code` |
| **Retry policy** | Только после confirmed cleanup или new unique name |
| **Safe resume** | **Не поддерживается** в as-is; target: explicit `PROVISIONING` state machine с resume только для idempotent steps |

**Правило:** повторный запуск с тем же `company_code` после успеха — **запрещён**; после failure — только после DROP/cleanup.

---

## 13. Версия новой компании

По ADR-REL-001 + ADR-TPL-001.

| Поле | Источник |
|------|----------|
| **platform_version** | `platform_environment_versions.platform_version` для TEMPLATE portal **на момент provision** |
| **release_package_id** (target) | `platform_deployments.release_package_id` last succeeded (template) |
| **Baseline** | «Компания рождается на версии TEMPLATE» — не на DEV, не на latest unpublished |
| **portals.template_version** | Legacy display; синхронизировать с platform_version или deprecate |
| **Offers** | **Не создаются** при provision — компания уже на baseline |

При последующих обновлениях — только через `tenant_update_offers`.

---

## 14. Модель аудита (Audit Model)

### 14.1. Обязательные события

| Событие | Журнал |
|---------|--------|
| Provisioning started | `platform_event_journal` (platform scope) |
| Provisioning succeeded | `platform_event_journal` |
| Provisioning failed + cleanup | `platform_event_journal` |
| Company created (metadata) | `platform_event_journal` |
| Significant WI implementation | `dev_development` journal (DEV tenant) |

### 14.2. Обязательные поля audit record

```text
company_code
database_name
portal_id (company DB)
customer_company_id
template_tenant_id
platform_version (target)
release_package_id (target)
actor (platform user id)
provision_request_id (target)
```

### 14.3. SoT аудита provisioning

**`platform_event_journal_entries`** (platform scope) — authoritative для platform ops.  
Company tenant journal — **не** создаётся при provision (нет user actions yet).

---

## 15. Связь с Release Package (Release Package Relationship)

```text
Unified Release Package
        │
        ▼
Publish To TEMPLATE
        │
        ├─ yasnopro_template (structure + config)
        └─ runtime/template/current (code baseline)
        │
        ▼
Company Provisioning (on Create Company)
        │
        ├─ WITH TEMPLATE → company DB at template snapshot
        ├─ materialize code from template active release (target)
        └─ pin platform_version = template pin
        │
        ▼
New Company (autonomous; updates via future Offers only)
```

Компания **не применяет** package напрямую при создании — она **наследует** TEMPLATE materialization.

---

## 16. Связь с Control Plane (Control Plane Relationship)

```text
Control Plane Operator / API
        │
        ▼
Provision Company (orchestrator)
        │
        ├─ Registry: customer_companies, catalog metadata
        ├─ Registry: platform_environment_versions (target)
        ├─ Registry: platform_deployments provision record (target)
        ├─ Command: CREATE DATABASE
        ├─ Command: materialize runtime (target)
        └─ Audit: platform_event_journal
        │
        ▼
Company ready (ACTIVE)
```

CP **инициирует** provisioning; **не хранит** company tenant data (кроме registry metadata).

---

## 17. Ограничения (Restrictions)

Provisioning **запрещено**:

| # | Запрет |
|---|--------|
| 1 | Bootstrap из DEV, CLIENT, DEMO (только TEMPLATE) |
| 2 | Использовать display `name` как `code` |
| 3 | Создавать компанию без first administrator |
| 4 | Оставлять orphan DB без catalog или cleanup |
| 5 | Hard-delete без policy flags |
| 6 | Provision в protected template DB |
| 7 | Skip version pin (target) |
| 8 | Skip runtime materialize (target) |
| 9 | Auto-apply future package at create (no offers at birth) |
| 10 | Создавать test companies без cleanup policy в non-dev contexts |
| 11 | Писать user business data при provision |
| 12 | Обходить `client_company_provisioning` context manager finalize/cleanup |

---

## 18. Архитектурные инварианты

1. **Один provision → один `company_code` → одна `yasnopro_company_*` БД.**
2. **TEMPLATE — единственный clone source.**
3. **Failure → compensating rollback** (no silent partial state).
4. **Technical keys** для registry; display names не идентифицируют компанию.
5. **Baseline version = TEMPLATE pin** at provision time.
6. **Company runtime isolated** from other companies (target).
7. **First admin = TENANT_SUPERADMIN** in company DB only.
8. **CP orchestrates; company DB owns tenant data.**

---

## 19. Фазы внедрения

| Фаза | Scope |
|------|-------|
| Phase 0 | ADR-PROV-001 accepted |
| Phase 1 | `platform_environment_versions` pin on provision |
| Phase 2 | Runtime materialize `runtime/company/{code}/` |
| Phase 3 | `provision_request_id` + idempotency lock |
| Phase 4 | Unified `ProvisionOrchestrator` service in CP |
| Phase 5 | Deprecate shared CLIENT routing for new companies |

---

## 20. Документы, требующие обновления

| Документ | Изменение |
|----------|-----------|
| `docs/architecture/adr/ADR-RT-001-per-company-runtime.md` | Cross-ref ADR-PROV-001 |
| `docs/architecture/adr/ADR-CP-001-control-plane-orchestration-model.md` | Provision orchestrator detail |
| `docs/architecture/adr/ADR-TPL-001-template-governance-model.md` | Provisioning source link |
| `docs/architecture/platform/tenant-environment-strategy.md` | §7 CLIENT bootstrap |
| `docs/architecture/platform/control-plane-architecture.md` | Provisioning section |
| `docs/architecture/README.md` | Index ADR-PROV-001 |

---

## 21. Риски

| Риск | Mitigation |
|------|------------|
| As-is без runtime pin | Phase 1–2 |
| CP commit fail drops DB | Documented; consider two-phase commit improvement |
| No idempotency key | Phase 3 |
| Orphan DBs | Orphan detection module |
| `template_version` drift | Pin `platform_environment_versions` |
| Test company leaks | task-local cleanup policy |

---

## 22. Критерии принятия ADR

- [x] Определение Provisioning
- [x] Входные параметры
- [x] Выходные объекты
- [x] Жизненный цикл
- [x] Rollback
- [x] Идемпотентность
- [x] Аудит
- [x] Связь TEMPLATE / Release Package / CP
- [x] Runtime и DB models
- [x] First administrator model
