# ADR-DEP-001. Deployment Execution Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-dep-001-deployment-execution-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- ADR-PROV-001 — Company Provisioning Model
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-UPD-001 — Company Update & Rollback Model
- ADR-RUN-001 — Runtime Materialization Model
- `backend/app/modules/platform_deployment_registry/`
- `backend/app/modules/platform_version_registry/`

---

## 1. Контекст

Принятые ADR описывают цепочку:

```text
Release Package → Materialization → Runtime Release → Activation → Version Pin
```

и используют термины deployment / deployment succeeded / rollback deployment без **единого определения**.

**As-is (`platform_deployments`):**

- registry table с `deployment_key` (`DPL-YYYYMMDD-NNNN`);
- статусы: `planned`, `running`, `succeeded`, `failed`, `cancelled`, `rolled_back`;
- `mark_succeeded` обновляет `platform_environment_versions` (если `target_tenant_id` задан);
- model docstring: **«no execution engine»**;
- `publish_release_to_template` и `apply_tenant_update` создают deployment и **мгновенно** `mark_succeeded` без materialize/verify/activate.

ADR-DEP-001 фиксирует **нормативную модель Deployment** как связующее звено между CP orchestration, Release Package и Runtime (ADR-RUN-001).

### Главный ответ

**Deployment** — это **зафиксированная в CP registry попытка применения** конкретного Unified Release Package к конкретному target (TEMPLATE slot или Company runtime/portal), проходящая через validate → materialize → verify → activate → version pin → audit, с терминальным статусом и неизменяемой историей.

---

## 2. Решение (Decision)

Deployment — **не** Release Package и **не** Runtime Release. Deployment — **процесс + audit record**, связывающий:

```text
platform_release_packages.id  (what)
+ target_tenant_id / slot       (where)
+ runtime release-NNN           (how, physical)
+ platform_environment_versions (resulting pin)
```

Physical execution делегируется runtime layer; CP владеет lifecycle record и orchestration policy.

---

## 3. Определение Deployment (Deployment Definition)

**Deployment** — это **оркестрируемая операция Control Plane** по применению immutable Unified Release Package к целевому environment scope (TEMPLATE или CLIENT company), представленная записью `platform_deployments` с уникальным `deployment_key`, проходящая нормативные фазы validate → materialize → verify → activate → version pin → audit, и завершающаяся терминальным статусом (`succeeded`, `failed`, `cancelled`, `rolled_back`).

Deployment **всегда** ссылается на **один** `release_package_id` и **один** primary target (`target_tenant_id` + `target_environment_type`).

---

## 4. Определение Deployment Rollback (Deployment Rollback Definition)

**Deployment Rollback** — это **отдельная deployment-class операция** (тип `rollback`), инициируемая для восстановления target к состоянию **предыдущего succeeded deployment**, выполняющая activate предыдущего `release-NNN` в runtime slot, revert version pin и config rollback (если применимо), и записывающая **новую** deployment/rollback audit запись со ссылкой на `previous_release_package_id` / `previous_platform_version` — **без** мутации immutable history исходного forward deployment.

---

## 5. Предмет и результат Deployment

### 5.1. Предмет (что разворачивается)

| Сущность | Роль в Deployment |
|----------|-------------------|
| **Release Package** | **Primary subject** — `release_package_id` |
| **Runtime slot** | **Execution surface** — `template`, `company/{code}` |
| **Runtime Release** | **Physical artifact** — `release-NNN` (outcome) |
| **Company / Template portal** | **Target** — `target_tenant_id` |
| **Environment type** | **Scope label** — `template` / `client` / `dev` |

### 5.2. Результат (что получаем при success)

| Результат | Описание |
|-----------|----------|
| **Activated Runtime** | `current/` → `release-NNN` |
| **Version Pin** | `platform_environment_versions` updated |
| **Deployment Record** | `platform_deployments.status=succeeded` |
| **Version History** | `platform_version_history` append |
| **Audit Records** | `platform_event_journal` (+ tenant journal if company) |
| **Offer state** (if company update) | `tenant_update_offers.applied` |

---

## 6. Типы Deployment (Deployment Types)

| Тип | `deployment_kind` (target) | Trigger | Target |
|-----|------------------------------|---------|--------|
| **TEMPLATE_PUBLISH** | `template_publish` | `publish_release_to_template` | TEMPLATE portal + `runtime/template/` |
| **COMPANY_UPDATE** | `company_update` | Accept Offer → `apply_tenant_update` | Company portal + `runtime/company/{code}/` |
| **PROVISION_BASELINE** | `provision_baseline` | Company provisioning (target) | New company initial release |
| **ROLLBACK** | `rollback` | Operator / auto on failed apply | Same target, previous package/release |
| **DEV_DEPLOY** | `dev_deploy` | Optional DEV slot ops | `runtime/dev` / DEV portal |

**As-is:** фактически TEMPLATE_PUBLISH и COMPANY_UPDATE без `deployment_kind` field (only manifest `created_via`).

---

## 7. Lifecycle Deployment (Deployment Lifecycle)

### 7.1. Нормативный state machine

```text
PLANNED
  ▼
VALIDATING
  │  package published, target allowed, compatibility, guards
  ▼
RUNNING
  ├─ MATERIALIZING   (ADR-RUN-001)
  ├─ VERIFYING
  ├─ ACTIVATING      (junction switch + reload)
  ├─ PINNING_VERSION (platform_environment_versions)
  └─ APPLYING_LAYERS (config/structure/migrations — DB)
  ▼
SUCCEEDED

Failure paths from any RUNNING sub-phase:
  ▼
FAILED
  ├─ compensating runtime rollback (target)
  └─ offer.status=failed (company update)

PLANNED/RUNNING → CANCELLED (operator)

SUCCEEDED (forward) later reversed by:
  ▼
ROLLBACK_DEPLOYMENT → … → SUCCEEDED | FAILED
Original forward deployment may be marked ROLLED_BACK (target)
```

### 7.2. Маппинг as-is

| Нормативный | As-is |
|-------------|-------|
| VALIDATING | skipped |
| MATERIALIZING / VERIFYING / ACTIVATING | skipped |
| RUNNING | instant transition |
| SUCCEEDED | ✓ (registry only) |
| FAILED | enum exists; rare in apply path |
| ROLLED_BACK | enum exists; **no rollback service** |

---

## 8. Lifecycle Rollback Deployment (Rollback Lifecycle)

```text
ROLLBACK_REQUESTED
  ▼
RESOLVE_PREVIOUS
  │  last succeeded deployment for target_tenant_id
  │  → previous_release_package_id, release-NNN
  ▼
CREATE_ROLLBACK_DEPLOYMENT_RECORD
  │  kind=rollback, links forward deployment id (target)
  ▼
VALIDATING
  ▼
RUNNING
  ├─ ACTIVATE_PREVIOUS_RELEASE (junction)
  ├─ CONFIG_ROLLBACK (if needed)
  └─ REVERT_VERSION_PIN
  ▼
VERIFY
  ▼
SUCCEEDED | FAILED
  ▼
AUDIT
```

---

## 9. Шаги внутри Deployment (нормативная последовательность)

```text
1. Validate Package      — published, approved, template gate (company)
2. Resolve Runtime       — slot path, target_tenant_id, previous version
3. Materialize           — releases/release-NNN/ (ADR-RUN-001)
4. Verify                — digests, unified layout, health (mandatory)
5. Activate              — current junction + process reload
6. Apply DB layers       — migrations, config, structure (guarded)
7. Pin Version           — platform_environment_versions + history
8. Audit                 — platform + tenant events
9. Terminal status       — succeeded | failed
```

**Критерии success (все обязательны):**

- Runtime active on intended `release-NNN`
- Verify passed
- Version pin matches `target_platform_version`
- Audit recorded
- No unresolved drift vs package digests

**Критерии failed:**

- Materialization failure
- Verification failure (digest mismatch)
- Activation failure (junction/process)
- Pin failure (registry)
- DB layer apply failure

---

## 10. Source Of Truth Model

| Объект | SoT для | Роль |
|--------|---------|------|
| **`platform_deployments`** | **Deployment history & attempt facts** | Canonical audit of each apply/rollback attempt |
| **`platform_environment_versions`** | **Current version label** per portal | Derived from last **succeeded** deployment |
| **`platform_version_history`** | **Append-only version timeline** | Audit trail |
| **`manifest.json`** | **Physical code provenance** per `release-NNN` | Must match package build digests |
| **`runtime/current`** | **Active physical release** | Must match succeeded deployment manifest |
| **`tenant_update_offers`** | **Company decision state** | Links accept to deployment |

**Consistency rule:**

```text
last_succeeded_deployment(release_package_id, target)
  ↔ platform_environment_versions.platform_version
  ↔ runtime/current → manifest.release_id + digests
```

Drift = operational incident.

---

## 11. Deployment History Model

### 11.1. Хранение

| Store | Content |
|-------|---------|
| `platform_deployments` | One row per attempt; immutable after terminal |
| `deployment_manifest_json` | `release_id`, `runtime_slot`, `digests`, `kind`, `parent_deployment_id` |
| `platform_version_history` | Version transitions |
| `platform_event_journal` | Human-readable audit |
| Runtime `releases/` tree | Physical artifact retention |

### 11.2. Обязательные поля записи

```text
deployment_key
release_package_id
target_environment_type
target_tenant_id
target_platform_version
previous_platform_version (if upgrade)
previous_release_package_id (rollback)
status, started_at, finished_at
failure_reason (if failed)
created_by
```

### 11.3. История rollback

Rollback — **новая** deployment row (`kind=rollback`), не редактирование forward row. Forward deployment may reference `rolled_back_at` (target field).

---

## 12. Runtime Relationship (ADR-RUN-001)

| Deployment phase | Runtime operation |
|------------------|-----------------|
| Materialize | Create `releases/release-NNN/` |
| Verify | `verify_*_runtime.ps1` / health |
| Activate | Junction `current/` switch |
| Rollback | Activate **previous** `release-NNN` |

Deployment **командует**; runtime **исполняет**. Deployment record **фиксирует** `release_id` в manifest.

---

## 13. Release Package Relationship (ADR-REL-001)

| Связь | Правило |
|-------|---------|
| Deployment ↔ Package | FK `release_package_id`; package must be `published` |
| Deployment ↔ Version | `target_platform_version = package.platform_version` |
| Traceability | `deployment_manifest_json` stores `package_key`, `build_key`, expected digests |
| Immutability | Deployment never mutates package; only applies it |

Config/structure layers applied **after** code deployment phases, still under same deployment record.

---

## 14. Control Plane Relationship (ADR-CP-001)

| Actor | Responsibility |
|-------|----------------|
| **Control Plane** | Create deployment, orchestrate phases, write registry, audit |
| **Runtime scripts/processes** | Materialize, verify, activate |
| **Company admin** | Accept offer (triggers deployment); not execute phases |
| **Operator** | Manual recovery, rollback initiate |

CP **запрещено** mark `succeeded` без verify+activate (target policy). As-is violates this — gap documented.

---

## 15. Update Model Relationship (ADR-UPD-001)

```text
Publish To TEMPLATE
  → TEMPLATE_PUBLISH Deployment (succeeded)
  → Offer To Companies

Company Admin Accept Offer
  → COMPANY_UPDATE Deployment
       ├─ materialize + activate company runtime
       ├─ DB layers
       └─ version pin
  → offer APPLIED

Failure
  → deployment FAILED
  → optional ROLLBACK Deployment
```

One active RUNNING deployment per `target_tenant_id` (target lock).

---

## 16. Provision Relationship (ADR-PROV-001)

```text
Create Company
  → PROVISION_BASELINE Deployment (target)
       ├─ initial release-001 from template
       └─ version pin at template baseline
```

Distinct from COMPANY_UPDATE (subsequent packages).

---

## 17. Architectural Invariants

1. **Каждый deployment ссылается на ровно один `release_package_id`.**
2. **Каждый forward deployment имеет один primary target (`target_tenant_id`).**
3. **Каждый succeeded deployment имеет audit event.**
4. **Каждый rollback ссылается на previous succeeded deployment/package.**
5. **Terminal deployment rows не редактируются** (append new row for correction).
6. **`deployment_key` уникален** (technical key).
7. **Succeeded implies version pin** for targets with `target_tenant_id`.
8. **Succeeded implies verify passed** (target).
9. **Failed deployment не обновляет version pin.**
10. **Company update deployment только после Accept Offer.**
11. **Template publish deployment before company offers.**
12. **Physical activation evidenced in `deployment_manifest_json.release_id`.**

---

## 18. Restrictions

| # | Запрет |
|---|--------|
| 1 | `mark_succeeded` без verify + activate (target) |
| 2 | Deployment из non-`published` package |
| 3 | Deployment без `target_tenant_id` для version pin targets |
| 4 | Concurrent RUNNING deployments same target |
| 5 | Mutate terminal deployment status in place |
| 6 | Rollback без previous succeeded reference |
| 7 | Cross-target deployment (one row, multiple companies) |
| 8 | Company deployment без offer accept |
| 9 | Skip audit on terminal state |
| 10 | Identify target by display name |
| 11 | Deployment that mutates immutable `release-NNN` tree |
| 12 | Auto-succeeded registry-only deploy (interim anti-pattern) |

---

## 19. As-is vs Target

| Capability | As-is | Target |
|------------|-------|--------|
| Deployment registry | ✓ | ✓ |
| Execution engine | ✗ | CP orchestrator |
| Phased RUNNING | ✗ | ✓ |
| manifest release_id in deployment | partial | required |
| Rollback deployment | ✗ | ✓ |
| `deployment_kind` | ✗ | ✓ |
| Digest gate on succeed | ✗ | ✓ |
| PROVISION_BASELINE record | ✗ | ✓ |

---

## 20. Фазы внедрения

| Фаза | Scope |
|------|-------|
| Phase 0 | ADR-DEP-001 accepted |
| Phase 1 | Block instant succeed; require manifest proof |
| Phase 2 | Orchestrator sub-phases + deployment_kind |
| Phase 3 | Rollback deployment service |
| Phase 4 | PROVISION_BASELINE deployments |
| Phase 5 | Full drift detection job |

---

## 21. Документы, требующие обновления

| Документ |
|----------|
| `docs/architecture/adr/ADR-REL-001-unified-release-package.md` |
| `docs/architecture/adr/ADR-CP-001-control-plane-orchestration-model.md` |
| `docs/architecture/adr/ADR-RUN-001-runtime-materialization-model.md` |
| `docs/architecture/adr/ADR-UPD-001-company-update-and-rollback-model.md` |
| `docs/architecture/adr/ADR-PROV-001-company-provisioning-model.md` |
| `docs/architecture/CODE_RELEASE_FOUNDATION_MVP.md` |
| `docs/architecture/README.md` |

---

## 22. Риски

| Риск | Mitigation |
|------|------------|
| Registry lies (succeeded without runtime) | Phase 1 gate |
| No rollback service | Phase 3 |
| Concurrent deploys | Per-target lock |
| History clutter | Retention policy for failed attempts |
| Missing deployment_kind | Phase 2 migration |

---

## 23. Критерии принятия ADR

- [x] Deployment definition
- [x] Deployment Rollback definition
- [x] Deployment types
- [x] Deployment lifecycle
- [x] Rollback lifecycle
- [x] Source of truth model
- [x] History model
- [x] Runtime, Package, CP, Update relationships
- [x] Invariants and restrictions
