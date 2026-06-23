# ADR-REL-001. Unified Release Package

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-rel-001-unified-release-package`

## Связанные материалы

- WI-REL-001 — Unified Release Model Audit (read-only)
- WI-RT-016A — Architecture Fixation Audit (Per-Company Runtime)
- `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md`
- `docs/architecture/platform/tenant-environment-strategy.md`
- `docs/architecture/platform/control-plane-architecture.md`
- `docs/audit/RELEASE_PACKAGE_REGISTRY_DESIGN_AUDIT.md`
- `docs/audit/DEV_TO_COMPANIES_PUBLICATION_INVENTORY.md`
- `scripts/runtime/README.md`

---

## 1. Контекст

В ЯсноПро исторически сформировались **три независимых контура** поставки изменений:

```text
Physical Code Release   — runtime/{slot}/releases/release-NNN/
Governance Release      — platform_release_packages (+ review workflow)
Module Publication      — platform_module_publications (+ config apply)
```

Аудит WI-REL-001 установил:

- нет единого определения «релиз»;
- нет единого маршрута публикации DEV → TEMPLATE → Company;
- нет единого жизненного цикла;
- governance publish **не активирует** physical code;
- module publication **не связана** с governance package;
- company update **не разворачивает** полный пакет изменений.

Принято архитектурное решение **Per-Company Runtime** (WI-RT-016A): каждая компания имеет собственную БД, backend/frontend runtime, releases, lifecycle и rollback.

Данный ADR фиксирует **целевую модель релиза** до начала реализации унификации.

---

## 2. Решение (Decision)

### 2.1. Каноническое определение

**Релиз ЯсноПро** — это **immutable Unified Release Package**: версионированный, прошедший platform review пакет платформенных изменений, идентифицируемый техническими ключами (`package_key`, `platform_version`), содержащий обязательные code artifacts и governance metadata, опционально — config/structure snapshots, и предназначенный для материализации в TEMPLATE и в runtime компаний через контролируемый маршрут Offer → Accept → Apply.

### 2.2. Что НЕ является релизом

| Объект | Почему не релиз |
|--------|------------------|
| `platform_code_builds` | Технический результат сборки; build может не стать релизом |
| `platform_deployments` | Событие применения package к environment/tenant |
| `tenant_update_offers` / `tenant_module_update_offers` | Offer state; не пакет изменений |
| `runtime/.../release-NNN/` (без package) | Физическое хранилище артефактов; не governance-единица |
| `platform_releases` (legacy) | Устаревающий adapter; не канон |
| Отдельная `platform_module_publication` | Источник snapshot; не самостоятельный продуктовый релиз |

### 2.3. Части релиза vs служебные объекты

**Части Unified Release Package (логические слои):**

```text
code_layer          — frontend + backend artifacts + physical manifest
governance_layer    — version metadata, changelog, review state, release notes
config_layer        — module/configuration snapshots (optional)
structure_layer     — object model, pages, navigation, processes (optional, future)
delivery_layer      — compatibility rules, migration plan, rollback plan
```

**Служебные объекты (provenance и audit, не «релиз»):**

```text
platform_code_builds
platform_deployments
platform_environment_versions / platform_version_history
tenant_update_offers
tenant_module_update_offers
tenant_module_configuration_applies / rollbacks
```

---

## 3. Состав релиза (Release Composition)

| Элемент | Обязательно | Опционально | Не входит |
|---------|-------------|-------------|-----------|
| **Frontend Artifact** | ✓ | | |
| **Backend Artifact** | ✓ | | |
| **Manifest** (digests, git SHA, fingerprints) | ✓ | | |
| **Version Metadata** (`package_key`, `platform_version`) | ✓ | | |
| **Release Notes** | ✓ | | |
| **Changelog** (`release_changes` / manifest changes) | ✓ | | |
| **Compatibility Rules** | ✓ | | |
| **Rollback Plan** | ✓ | | |
| **Migration Plan** (`schema_revision`, migration scripts ref) | | ✓ | |
| **Configuration Snapshots** | | ✓ | |
| **Structure Snapshots** | | ✓ | |
| **Module Snapshots** | | ✓ | |
| **Permissions** (в snapshot) | | ✓ | |
| **Navigation** (в structure snapshot) | | ✓ | |
| **Pages** (в structure snapshot) | | ✓ | |
| **Object Model** (в structure snapshot) | | ✓ | |
| **Processes** (в structure snapshot) | | ✓ | |
| **Actions** (в structure snapshot) | | ✓ | |
| Display `title` / `name` как идентификатор | | | ✓ |
| Runtime process state | | | ✓ |
| Tenant user content | | | ✓ |
| Control Plane operator accounts | | | ✓ |

**Правило immutability:** после перехода package в статус `published` содержимое обязательных слоёв **не изменяется**. Исправления — только новый Release Package.

---

## 4. Источник истины (Source Of Truth)

### 4.1. Канонический объект

**`platform_release_packages`** — единственный канонический **Unified Release Package** в registry.

Идентификация только по technical keys:

```text
package_key       — стабильный ключ пакета (PKG-*)
platform_version  — semver платформы
id                — FK для deployments и offers
build_id          — FK на platform_code_builds (provenance)
```

### 4.2. Производные объекты

| Объект | Роль |
|--------|------|
| `runtime/{slot}/releases/release-NNN/` | **Materialized code artifacts** package; digest-linked к build/manifest |
| `platform_deployments` | Запись факта применения package к target (TEMPLATE / company) |
| `platform_environment_versions` | Текущая установленная `platform_version` per portal |
| `tenant_update_offers` | Offer governance package компании |
| `platform_module_publications` | **Источник** config snapshots до полной унификации; target — вложение в package |

### 4.3. Служебные объекты

| Объект | Роль |
|--------|------|
| `platform_code_builds` | Provenance сборки (commit_sha, digests) |
| `platform_version_history` | Append-only audit trail |
| `tenant_module_update_offers` | Legacy offer path; converge к unified offer |
| `platform_releases` | Legacy adapter; deprecate |

### 4.4. Схема SoT

```text
                    ┌─────────────────────────┐
                    │ platform_release_       │  ← CANON (Unified Release Package)
                    │ packages                │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────────┐
│ platform_code_  │    │ materialized       │   │ config/structure    │
│ builds          │    │ runtime/release-   │   │ snapshots (from     │
│ (provenance)    │    │ NNN/ (derivative)  │   │ module publications)│
└─────────────────┘    └────────────────────┘   └─────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ platform_deployments     │  (apply events)
                    │ tenant_update_offers     │  (company decisions)
                    └─────────────────────────┘
```

---

## 5. Жизненный цикл релиза (Release Lifecycle)

### 5.1. Целевой state machine (единый)

```text
┌─────────┐
│  DRAFT  │  Создание package в DEV; сборка artifacts; формирование snapshots
└────┬────┘
     │ submit_for_review
┌────▼────────────────────┐
│ READY_FOR_REVIEW        │
└────┬────────────────────┘
     │ start_review
┌────▼────────────────────┐
│ IN_REVIEW               │
└────┬──────────┬─────────┘
     │          │ request_changes
     │          ▼
     │    ┌──────────────────┐
     │    │ CHANGES_REQUESTED│──► (edit) ──► DRAFT
     │    └──────────────────┘
     │ approve
┌────▼────────────────────┐
│ APPROVED                │  Immutable gate: далее только publish
└────┬────────────────────┘
     │ publish_to_template
┌────▼────────────────────┐
│ PUBLISHED_TO_TEMPLATE   │  Artifacts + config applied to TEMPLATE
└────┬────────────────────┘
     │ offer_to_companies
┌────▼────────────────────┐
│ OFFERED_TO_COMPANIES    │  tenant_update_offers created
└────┬────────────────────┘
     │
     ├── company: accept ──► APPLYING ──► APPLIED
     ├── company: defer  ──► DEFERRED (offer remains AVAILABLE)
     ├── company: reject ──► REJECTED (offer SKIPPED)
     └── apply failure   ──► FAILED ──► ROLLED_BACK | retry
     
Terminal: ARCHIVED | DEPRECATED | CANCELLED
```

### 5.2. Маппинг на текущие статусы (transitional)

| Целевой статус | Сегодня (governance) | Сегодня (package registry) |
|----------------|----------------------|------------------------------|
| DRAFT | `draft` | `draft` |
| READY_FOR_REVIEW | `ready_for_platform_review` | `ready` |
| IN_REVIEW | `in_platform_review` | `ready` |
| CHANGES_REQUESTED | `changes_requested` | `draft` |
| APPROVED | `approved_by_platform` | `ready` |
| PUBLISHED_TO_TEMPLATE | `published_to_template` | `published` |
| OFFERED_TO_COMPANIES | `offered_to_tenants` | `published` |
| APPLIED (per company) | offer `applied` | deployment `succeeded` |

---

## 6. Маршрут релиза (Release Route)

### 6.1. Официальный маршрут

```text
DEV
  │
  ├─► Code build (monorepo → platform_code_builds)
  ├─► Config/structure capture (module snapshots, future structure snapshots)
  └─► Release Draft (platform_release_packages, status=draft)
        │
        ▼
Control Plane Review
  │  submit → review → approve | changes_requested
  │
  ▼
Approved Release Package
  │  immutable; all mandatory layers frozen
  │
  ▼
Publish To TEMPLATE
  │  1. Activate code artifacts → runtime/template/releases/release-NNN/
  │  2. Apply config/structure snapshots → yasnopro_template DB
  │  3. Record deployment (target=template tenant) → succeeded
  │  4. Pin platform_environment_versions for template portal
  │
  ▼
Offer To Companies
  │  tenant_update_offers per ACTIVE CLIENT portal (excl. DEV/TEMPLATE)
  │  offer references package_key + platform_version + compatibility
  │
  ▼
Company Decision
  │  accept | defer | reject (per company, per offer)
  │
  ▼
Apply Release Package (on accept only)
  │  1. Materialize code → runtime/company/{code}/releases/release-NNN/
  │  2. Run migration plan (if present)
  │  3. Apply config/structure deltas (Publication Guard respected)
  │  4. Record deployment → succeeded
  │  5. Update platform_environment_versions for company portal
  │  6. Offer status → applied
```

### 6.2. Описание шагов

| Шаг | Actor | Действие | Запись |
|-----|-------|----------|--------|
| **DEV — Release Draft** | Platform developer | Сборка + формирование package | `platform_code_builds`, `platform_release_packages` |
| **Control Plane Review** | Platform reviewer | Review queue, approve/reject | `package_manifest_json.governance` |
| **Approved Release Package** | System | Immutability gate | package status |
| **Publish To TEMPLATE** | Control Plane operator | Orchestrated publish | deployment + template runtime + template DB |
| **Offer To Companies** | Control Plane | Generate offers | `tenant_update_offers` |
| **Company Decision** | Company admin | Accept/defer/reject | offer status |
| **Apply Release Package** | System (on accept) | Per-company materialization | deployment + company runtime + company DB |

### 6.3. Publication Guard

Apply config/structure layers **не обходит** Publication Guard и structure write guards. Code layer apply — отдельный controlled path, не мутирующий tenant structure без review.

---

## 7. Поведение TEMPLATE (TEMPLATE Behaviour)

### 7.1. Что получает TEMPLATE при Publish

| Слой | Применение |
|------|------------|
| **Code** | `runtime/template/current` → `releases/release-NNN/` из package |
| **Config** | Module/configuration snapshots → rows в `yasnopro_template` |
| **Structure** | Structure snapshots (когда реализованы) → template DB |
| **Governance** | `platform_environment_versions` pin `platform_version` |
| **Registry** | `platform_deployments` (target=template portal, succeeded) |

### 7.2. TEMPLATE получает весь релиз

**Да** — TEMPLATE является **первым полным materialization point** Unified Release Package. Частичная публикация (только code или только config) **не соответствует** данному ADR.

### 7.3. Фиксация версии TEMPLATE

```text
platform_environment_versions.tenant_id = template_portal_id
platform_environment_versions.platform_version = package.platform_version
platform_environment_versions.notes = deployment_key + release_package_id
```

Физический baseline: `runtime/template/releases/release-NNN/manifest.json` с digest match к `platform_code_builds`.

### 7.4. TEMPLATE как источник новых компаний

TEMPLATE DB (`yasnopro_template`) + pinned template package version — **эталон** для provisioning:

```text
CREATE DATABASE yasnopro_company_{code} WITH TEMPLATE yasnopro_template
```

Новая компания наследует **DB state на момент последнего template publish**, а code baseline — из **текущего template runtime release**, пока не реализован per-company materialization при provisioning.

---

## 8. Поведение компании (Company Behaviour)

### 8.1. Что получает компания при обновлении (accept)

| Слой | Применение |
|------|------------|
| **Code** | `runtime/company/{code}/releases/release-NNN/` activated |
| **Config** | Module/configuration deltas via controlled apply |
| **Structure** | Structure deltas (если в package) |
| **Migrations** | По migration plan |
| **Governance** | Version pin в `platform_environment_versions` |
| **Registry** | `platform_deployments` (target=company portal) |

Компания получает **ссылку на тот же immutable package**, что опубликован в TEMPLATE, не копию «части».

### 8.2. Отказ от обновления (reject)

```text
offer.status → skipped
company runtime и DB — без изменений
текущая platform_version — без изменений
```

### 8.3. Откладывание (defer)

```text
offer.status остаётся available
компания продолжает работу на текущей версии
повторное предложение возможно (тот же или новый offer)
```

**Compatibility risk:** при defer компания может отстать; compatibility rules определяют минимальную поддерживаемую версию и policy принудительного обновления (вне scope данного ADR, future policy WI).

### 8.4. Rollback

Per-company rollback — активация предыдущего `release-NNN` в `runtime/company/{code}/` + registry rollback record. **Не затрагивает** другие компании.

---

## 9. Материализация в runtime (Runtime Materialization)

### 9.1. Per-Company Runtime (целевая модель)

```text
Unified Release Package (registry)
        │
        ├─► TEMPLATE slot
        │     runtime/template/releases/release-NNN/
        │     runtime/template/current → junction
        │
        └─► COMPANY slot (per company, on accept)
              runtime/company/{tenant_code}/releases/release-NNN/
              runtime/company/{tenant_code}/current → junction
              mounts: uploads, data, logs (per company)
```

### 9.2. Связь registry ↔ filesystem

```text
platform_release_packages.package_key
  ↔ platform_code_builds (commit_sha, digests)
  ↔ runtime/.../release-NNN/manifest.json (release_id, git_commit, fingerprints)
```

Digest mismatch = **deployment blocked** (future gate).

### 9.3. Transitional state (interim)

До реализации per-company paths допускается **shared CLIENT runtime** (`runtime/client/`) как временный этап. ADR-REL-001 **не отменяет** interim, но фиксирует, что shared slot **не является** целевой моделью.

Bridge JWT routing к per-company DB сохраняется до per-company backend materialization.

---

## 10. Судьба legacy-контуров (Legacy Objects Status)

| Объект | Статус по ADR-REL-001 | Действие |
|--------|------------------------|----------|
| `runtime/.../release-NNN/` | **Materialized artifact** Release Package | Сохранить; link digest ↔ package |
| `platform_release_packages` | **Канонический объект** (Unified Release Package) | Расширить semantic scope (config/structure layers) |
| `platform_module_publications` | **Часть Release Package** (config snapshot source) | Converge: publication → snapshot embedded in package at publish |
| `platform_code_builds` | Служебный (provenance) | Без изменения роли |
| `platform_deployments` | Служебный (apply event) | Orchestrator writes on publish/apply |
| `platform_releases` | Legacy adapter | Deprecate после migration UI |
| `tenant_module_update_offers` | Legacy offer path | Converge к `tenant_update_offers` на package |

**Physical Code Release** как отдельное понятие **упраздняется** в продуктовой терминологии → «code layer materialization».

**Governance Release** как отдельное понятие **упраздняется** → «governance layer внутри package».

**Module Publication** как отдельный релиз **упраздняется** → «config snapshot source / sub-step publish».

---

## 11. Последствия и фазы внедрения

| Фаза | Scope | Код |
|------|-------|-----|
| **Phase 0** | ADR-REL-001 accepted | Документация only |
| **Phase 1** | Digest bridge package ↔ runtime manifest | WI-REL-003 |
| **Phase 2** | Bundle module publications into package | WI-REL-004 |
| **Phase 3** | Unified Publish orchestrator (CP) | WI-REL-005 |
| **Phase 4** | Per-company runtime materialization on accept | WI-RT-016B+ |

---

## 12. Architecture Invariants

1. **Technical keys only** — `package_key`, `platform_version`, `build_key`, `deployment_key`, `tenant_id`, `commit_sha`. Display fields не идентифицируют релиз.
2. **Immutability** — published package не редактируется.
3. **Single SoT** — один канонический объект релиза: `platform_release_packages`.
4. **Publication Guard** — config/structure apply не обходит guards.
5. **Per-company isolation** — apply и rollback scoped to company portal/runtime.
6. **TEMPLATE first** — полный package materializes в TEMPLATE до offer companies.

---

## 13. Отклонённые альтернативы

### Option A — Три раздельных релиза

Отклонено: сохраняет drift, не отвечает на вопрос «что в версии X», несовместимо с per-company lifecycle.

### Option C — Гибрид с независимыми hotfix sub-releases

Отклонено как основная модель: допустим только как временный escape hatch с explicit sub-package_key, не как параллельная терминология.

---

## 14. Риски

| Риск | Mitigation |
|------|------------|
| Big-bang migration | Phased rollout (§11) |
| Placeholder commit_sha в API adapter | Phase 1: real SHA from build pipeline |
| Structure layer не реализован | Optional layer; ADR не блокирует code+config MVP |
| Shared CLIENT runtime interim | Explicit deprecate path в Phase 4 |
| Terminology confusion в UI | Docs update list (§15) |

---

## 15. Документы, требующие обновления

| Документ | Изменение |
|----------|-----------|
| `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md` | Ссылка на ADR-REL-001; reconcile ADR-1 parallel `code_*` с unified package |
| `docs/architecture/platform/tenant-environment-strategy.md` | Unified release route DEV→TEMPLATE→Company |
| `docs/architecture/platform/control-plane-architecture.md` | CP as publish orchestrator |
| `docs/architecture/README.md` | Index ADR-REL-001 |
| `scripts/runtime/README.md` | release-NNN as materialized artifact |
| `docs/audit/RELEASE_PACKAGE_REGISTRY_DESIGN_AUDIT.md` | Supersede scope: code-only → unified |
| `docs/audit/DEV_TO_COMPANIES_PUBLICATION_INVENTORY.md` | Mark legacy contours |
| `frontend/.../platformDevelopmentManifest.js` | WI tracking (по отдельному WI) |

---

## 16. Критерии принятия ADR

- [x] Официальное определение релиза
- [x] Состав релиза
- [x] Источник истины
- [x] Жизненный цикл
- [x] Маршрут публикации
- [x] Поведение TEMPLATE
- [x] Поведение компании
- [x] Связь с Per-Company Runtime
- [x] Судьба legacy-контуров
