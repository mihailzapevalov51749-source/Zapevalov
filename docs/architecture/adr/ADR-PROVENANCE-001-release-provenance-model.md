# ADR-PROVENANCE-001. Release Provenance Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-provenance-001-release-provenance-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- ADR-PROV-001 — Company Provisioning Model
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-UPD-001 — Company Update & Rollback Model
- ADR-RUN-001 — Runtime Materialization Model
- ADR-DEP-001 — Deployment Execution Model
- ADR-AUD-001 — Audit & Event Journal Model
- ADR-SEC-001 — Security & Isolation Model
- WI-ARCH-001 — Architecture Gap Register
- WI-IMPL-001 — Release Provenance Model (initiator)
- `backend/app/modules/platform_release_package_registry/models.py`
- `backend/app/modules/platform_build_registry/models.py`
- `backend/app/modules/platform_deployment_registry/models.py`
- `backend/app/modules/platform_version_registry/models.py`
- `scripts/runtime/_physical_runtime_common.ps1`

---

## 1. Контекст

Этап 1 дорожной карты WI-ARCH-001 требует **Digest Bridge** и запрет `deployment succeeded` без verify. Перед реализацией отсутствовала единая нормативная модель **происхождения релиза** (provenance): какие сущности являются Source of Truth, как строится traceability, как определяется drift и как доказывается соответствие Runtime ↔ Release Package.

**As-is (аудит кода):**

| Сущность | Таблица / путь | Связи | Gap |
|----------|----------------|-------|-----|
| Build | `platform_code_builds` | `build_key`, `commit_sha`, digests | Placeholder `commit_sha` при create package через API |
| Release Package | `platform_release_packages` | FK `build_id`, `package_key`, `platform_version` | Нет linkage в physical manifest |
| Deployment | `platform_deployments` | FK `release_package_id`, `deployment_manifest_json` | Нет `deployment_kind`, instant succeed без verify |
| Version Pin | `platform_environment_versions` | `platform_version` label only | Нет FK `release_package_id` |
| Physical Manifest | `runtime/{slot}/releases/release-NNN/manifest.json` | `release_id`, `git_commit`, digests | Нет `package_key` / `release_package_id` |
| Active Runtime | `runtime/{slot}/current/` junction | filesystem | Не связан с registry автоматически |

ADR-PROVENANCE-001 **не вводит новый контур** и **не дублирует** REL/RUN/DEP. Он фиксирует **сквозную модель идентификаторов, digest и доказательств** для реализации WI-IMPL-002+.

---

## 2. Решение (Decision)

### 2.1. Определение

**Release Provenance Model** — это нормативная модель ЯсноПро, определяющая:

1. **канонические источники истины** для governance, build, deployment, physical runtime и version pin;
2. **обязательные технические идентификаторы** и reference chain между ними;
3. **digest-контракт** между registry и filesystem;
4. **правила drift detection** и **runtime verification** как условие успешного deployment.

### 2.2. Главный ответ

```text
Откуда появился данный Runtime?
  → active junction current/ указывает на releases/release-NNN/
  → manifest.json внутри release-NNN содержит registry linkage + digests
  → succeeded deployment фиксирует apply package_key к slot/tenant
  → release_package_id → build_id → commit_sha

Какому Release Package соответствует?
  → manifest.release_package_id (target) или manifest.package_key
  → сверка digests с platform_code_builds

Как доказать?
  → verify_proof в deployment_manifest_json
  → повторный digest check manifest ↔ build ↔ package
  → audit events + immutable deployment history
```

---

## 3. Карта сущностей и связей

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ GOVERNANCE PLANE (CP DB)                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  git commit                                                             │
│      ↓                                                                  │
│  PlatformCodeBuild          build_key, commit_sha, backend/frontend digest│
│      ↓ build_id (FK, immutable after package ready)                     │
│  PlatformReleasePackage     package_key, platform_version, layers JSON  │
│      ↓ release_package_id (FK)                                            │
│  PlatformDeployment         deployment_key, target, deployment_kind     │
│      ↓ on succeeded + verify_proof                                      │
│  PlatformEnvironmentVersion platform_version pin (+ release_package_id) │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ orchestrated materialize + verify
┌─────────────────────────────────────────────────────────────────────────┐
│ EXECUTION PLANE (filesystem per runtime slot)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  runtime/{slot}/releases/release-NNN/                                   │
│      manifest.json  ← provenance bridge                                 │
│      frontend/ + backend/                                               │
│  runtime/{slot}/current/ → release-NNN   (active execution)             │
│  runtime/{slot}/mounts/                  (mutable, out of provenance)   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Slot keys (`target_environment_id` / runtime path):**

| Slot | Path (target) | Deployment target |
|------|---------------|-------------------|
| TEMPLATE | `runtime/template/` | `target_environment_type=template` |
| COMPANY | `runtime/company/{code}/` | `target_environment_type=client`, `target_tenant_id` |
| CLIENT interim | `runtime/client/` | interim only; must record `deviation` flag |

Config/structure layers **не** входят в `releases/release-NNN/`; их provenance — snapshots в `package_manifest_json` + DB migration audit (вне physical manifest).

---

## 4. Source Of Truth (нормативно)

| Вопрос | Канонический SoT | Производные | Служебные |
|--------|------------------|-------------|-----------|
| **Что должно быть развёрнуто?** | `platform_release_packages` (published, immutable) | `tenant_update_offers` | `platform_releases` (legacy) |
| **Из какого кода собран пакет?** | `platform_code_builds` | `build_manifest_json` | CI job metadata (future) |
| **Была ли попытка apply?** | `platform_deployments` (append-only history) | `platform_version_history` | UI deployment list |
| **Какая версия закреплена за portal?** | `platform_environment_versions` | `portals.template_version` (legacy display) | — |
| **Какие bytes кода на диске?** | `releases/release-NNN/manifest.json` + artifact tree | — | `current/` junction |
| **Что исполняется сейчас?** | `basename(readlink(current/))` → manifest того release | process health | dev_stack local overrides |

**Правило согласованности (invariant P-1):** для succeeded deployment на target slot:

```text
deployment.release_package_id
  → package.build_id
  → build.(commit_sha, backend_digest, frontend_digest)
  ≡ manifest.(release_package_id, git_commit, backend_fingerprint, frontend_digest)
  ≡ active current/ → release-NNN
```

Нарушение = **drift** → deployment **blocked** (target policy, ADR-SEC-001 digest gate).

---

## 5. Обязательные идентификаторы

### 5.1. Release Package (`platform_release_packages`)

| Поле | Обязательность | Роль |
|------|----------------|------|
| `id` | ✓ PK | internal reference |
| `package_key` | ✓ unique | стабильный внешний ключ (`PKG-YYYYMMDD-NNNN`) |
| `platform_version` | ✓ unique | версия продукта (`vX.Y.Z` / policy) |
| `build_id` | ✓ FK | provenance к сборке |
| `status` | ✓ | lifecycle gate |
| `package_manifest_json` | ✓ | governance + layer snapshots |
| `module_bom_json` | optional | BOM metadata |

**Запрещено** использовать `release_notes`, display labels как идентификаторы.

### 5.2. Build (`platform_code_builds`)

| Поле | Обязательность | Роль |
|------|----------------|------|
| `id` | ✓ PK | |
| `build_key` | ✓ unique | `BLD-...` |
| `commit_sha` | ✓ 40 hex | git provenance |
| `backend_digest` | ✓ target | sha256/fingerprint summary |
| `frontend_digest` | ✓ target | sha256 built assets |
| `schema_revision` | recommended | DB schema layer |
| `build_manifest_json` | optional | extended build metadata |

**As-is gap:** API adapter допускает placeholder `commit_sha = 0*40` — **нарушение P-1**; target: reject publish if placeholder.

### 5.3. Physical Manifest (`manifest.json`)

**As-is поля (обязательны):**

```json
{
  "release_id": "release-NNN",
  "git_commit": "<40-char sha>",
  "created_at": "<iso8601>",
  "frontend_digest": "<digest>",
  "backend_fingerprint": { "hash": "...", "...": "..." },
  "artifacts": { "frontend": "frontend/", "backend": "backend/" }
}
```

**Target extension (обязательны после WI-IMPL-002):**

```json
{
  "package_key": "PKG-...",
  "platform_version": "v...",
  "release_package_id": 123,
  "build_key": "BLD-...",
  "build_id": 456,
  "runtime_slot_key": "template | company/{code}",
  "materialized_at": "<iso8601>",
  "materialized_by_deployment_key": "DPL-..."
}
```

**Запрещено в manifest:**

- tenant business data, secrets, `.env`
- mutable mount paths as version identifiers
- display names (`name`, `title`) как keys

### 5.4. Deployment (`platform_deployments`)

| Поле | Обязательность | Роль |
|------|----------------|------|
| `id` | ✓ PK | |
| `deployment_key` | ✓ unique | `DPL-YYYYMMDD-NNNN` |
| `release_package_id` | ✓ FK | what |
| `deployment_kind` | ✓ target | `template_publish`, `company_update`, `provision_baseline`, `rollback` |
| `target_environment_type` | ✓ | template / client / dev |
| `target_tenant_id` | conditional | company scope |
| `target_environment_id` | ✓ target | slot key (`template`, `company/{code}`) |
| `target_platform_version` | ✓ | denormalized from package |
| `previous_release_package_id` | rollback | prior state |
| `deployment_manifest_json` | ✓ | traceability + verify_proof |

### 5.5. Runtime Release (physical, не ORM)

| Идентификатор | Формат | Роль |
|---------------|--------|------|
| `runtime_slot_key` | `template`, `company/{code}`, interim `client` | isolation boundary |
| `release_id` | `release-NNN` | immutable artifact serial per slot |
| composite key | `{runtime_slot_key}/{release_id}` | human + machine trace |

### 5.6. Version Pin (`platform_environment_versions`)

| Поле | As-is | Target |
|------|-------|--------|
| `tenant_id` | ✓ | ✓ |
| `environment_key` | ✓ | ✓ |
| `platform_version` | ✓ | ✓ |
| `release_package_id` | ✗ | ✓ FK (provenance) |
| `active_release_id` | ✗ | ✓ `release-NNN` in slot |
| `last_deployment_id` | ✗ | ✓ FK |

---

## 6. Состав `package_manifest_json` (governance manifest)

Логический manifest пакета (CP DB), **не** путать с physical `manifest.json`.

| Секция | Обязательность | Содержание |
|--------|----------------|------------|
| `code_layer` | ✓ | `build_id`, `build_key`, `commit_sha`, digests |
| `governance_layer` | ✓ | review state snapshot, `platform_version`, changelog ref |
| `config_layer` | optional | module publication snapshot ids |
| `structure_layer` | optional | structure delta refs |
| `delivery_layer` | recommended | compatibility, migration plan refs |
| `package_digest` | ✓ target | hash canonical immutable package fields at publish |

**Запрещено:** хранить в package manifest физические пути mounts, tenant record payloads, display-only labels как keys.

---

## 7. Состав `deployment_manifest_json` (traceability record)

| Поле | Обязательность | Назначение |
|------|----------------|------------|
| `deployment_kind` | ✓ target | тип операции |
| `release_package_id` | ✓ | duplicate FK for audit readability |
| `package_key` | ✓ | |
| `build_id`, `build_key`, `commit_sha` | ✓ | build provenance snapshot |
| `runtime_slot_key` | ✓ | where |
| `materialized_release_id` | ✓ after materialize | `release-NNN` |
| `phases` | ✓ target | validate/materialize/verify/activate/pin timestamps |
| `verify_proof` | ✓ before succeed | см. §9 |
| `previous_release_id` | rollback | prior physical release |
| `deviation_flags` | interim | e.g. `shared_client_runtime` |

**Traceability chain в deployment record:**

```text
deployment_key
  → release_package_id + package_key + platform_version
  → build_id + commit_sha + digests (snapshot at start)
  → materialized_release_id + manifest path
  → verify_proof (digests match)
  → environment version pin result
```

---

## 8. Digest Model

### 8.1. Что хэшируется

| Digest | Input | Хранится в |
|--------|-------|------------|
| `commit_sha` | git tree at build | `platform_code_builds`, manifest.git_commit |
| `frontend_digest` | sha256 built `frontend/` | build, manifest |
| `backend_fingerprint` | canonical backend tree hash | build.backend_digest, manifest.backend_fingerprint |
| `package_digest` | canonical JSON immutable package fields | `package_manifest_json` |
| `manifest_digest` | canonical JSON physical manifest (excluding `created_at`) | `verify_proof` |
| `artifact_tree_digest` | optional future | full release-NNN tree |

### 8.2. Сверка (Digest Bridge)

**Gate D-1 (materialize):** перед записью manifest при materialize:

```text
manifest.git_commit == build.commit_sha
manifest.frontend_digest == build.frontend_digest
manifest.backend_fingerprint.hash == build.backend_digest (or equivalent)
manifest.release_package_id == deployment.release_package_id
```

**Gate D-2 (verify):** `Invoke-PhysicalRuntimeVerification` / orchestrator verify step:

- artifacts exist (frontend, backend, manifest)
- fingerprints recomputed from disk match manifest
- manifest registry linkage present (target)

**Gate D-3 (succeed):** `mark_succeeded` **запрещён** без `verify_proof.status == "passed"` в `deployment_manifest_json` (target policy WI-IMPL-004).

### 8.3. Placeholder и weak provenance

`commit_sha = 000...0` → **non-publishable** / **non-materializable** in target.

---

## 9. Drift Detection Model

### 9.1. Что считается drift

| Класс | Пример |
|-------|--------|
| **Registry drift** | `platform_environment_versions` указывает `v2`, на диске manifest `v1` |
| **Manifest drift** | manifest.git_commit ≠ build.commit_sha |
| **Activation drift** | `current/` → release-005, last succeeded deployment materialized release-007 |
| **Orphan physical** | `release-NNN` на диске без deployment / package linkage |
| **Ghost registry** | succeeded deployment без physical manifest |
| **Manual bypass** | promote script без deployment record |
| **Interim deviation** | company на shared `runtime/client/` при target per-company slot |

### 9.2. Как обнаруживается

1. **On-demand:** orchestrator verify step (pre-succeed, pre-offer).
2. **Scheduled:** drift job: для каждого active slot сравнить `current/manifest` ↔ last succeeded deployment ↔ version pin.
3. **On-read (CP UI):** deployment detail показывает drift badge.

### 9.3. Как фиксируется

- deployment остаётся `failed` или не переходит в `succeeded`
- audit event: `deployment_verify_failed`, `runtime_drift_detected`
- optional `architecture_deviation` record (future Architecture Navigator)
- **не** auto-mutate immutable package/build

---

## 10. Runtime Verification Model

**Цель:** доказать, что active Runtime соответствует конкретному Release Package.

### 10.1. Verification algorithm (normative)

```text
1. Resolve slot: runtime_slot_key + target_tenant_id
2. Read active_release_id from current/ junction
3. Load manifest.json from releases/{active_release_id}/
4. Assert manifest.release_package_id present (target)
5. Load package + build from CP DB
6. Assert manifest.git_commit == build.commit_sha
7. Assert manifest.frontend_digest == build.frontend_digest
8. Recompute backend fingerprint from manifest.backend path; assert match
9. Assert last succeeded deployment for target references same release_package_id
   and deployment_manifest_json.materialized_release_id == active_release_id
10. Emit verify_proof object; attach to deployment
```

### 10.2. `verify_proof` schema (minimum)

```json
{
  "status": "passed | failed",
  "verified_at": "iso8601",
  "runtime_slot_key": "template",
  "active_release_id": "release-003",
  "release_package_id": 42,
  "package_key": "PKG-20260619-0001",
  "commit_sha": "...",
  "checks": [
    { "name": "manifest_registry_link", "ok": true },
    { "name": "git_commit_match", "ok": true },
    { "name": "frontend_digest_match", "ok": true },
    { "name": "backend_fingerprint_match", "ok": true },
    { "name": "artifacts_present", "ok": true }
  ],
  "manifest_digest": "...",
  "scanner_version": "..."
}
```

### 10.3. Security coupling (ADR-SEC-001)

Digest gate — **security control**, не только QA:

- блокирует подмену кода без governance trail
- блокирует cross-tenant manifest reuse (manifest must include slot key)
- operator manual promote без deployment = **policy violation** (break-glass future ADR)

---

## 11. As-is vs Target (WI-IMPL roadmap)

| Capability | As-is | Target (post provenance ADR) |
|------------|-------|------------------------------|
| manifest registry linkage | ✗ | ✓ |
| package_digest | ✗ | ✓ |
| deployment_kind | ✗ | ✓ |
| verify_proof gate | ✗ | ✓ |
| version pin FK to package | ✗ | ✓ |
| automatic drift job | ✗ | ✓ |
| placeholder commit rejected | ✗ | ✓ |

---

## 12. Architecture Invariants

1. **P-1 Consistency chain** — succeeded deployment implies digest match registry ↔ manifest ↔ active release.
2. **Immutability** — published package, build, succeeded deployment history не редактируются.
3. **Technical keys only** — `package_key`, `build_key`, `deployment_key`, `release_id`, `tenant_id`, `commit_sha`.
4. **Separation of planes** — governance manifest (DB) ≠ physical manifest (filesystem); связь через digest bridge.
5. **No succeed without verify** — ADR-DEP-001 + ADR-SEC-001.
6. **Slot isolation** — manifest scoped to one `runtime_slot_key`; no shared manifest across companies (target).

---

## 13. Отклонённые альтернативы

### Option A — Filesystem as sole SoT

Отклонено: нет governance, review, offer gates; несовместимо с CP model.

### Option B — Deployment as SoT for code

Отклонено: deployment — audit/process record; bytes на диске и build — отдельные доказательства.

### Option C — `platform_version` string as only identifier

Отклонено: display/version label недостаточен; обязателен `package_key` + `release_package_id` + digests.

---

## 14. Последствия и фазы внедрения

| WI | Scope |
|----|-------|
| **WI-IMPL-001** | ADR-PROVENANCE-001 (this document) |
| **WI-IMPL-002** | manifest extension + package_digest |
| **WI-IMPL-003** | Digest Bridge service + tests |
| **WI-IMPL-004** | deployment_kind + verify_proof gate on succeed |
| **WI-IMPL-005** | version pin FK + drift job |

---

## 15. Architecture Audit (self-check vs ADR)

| ADR | Alignment |
|-----|-----------|
| ADR-REL-001 | ✓ package as canonical release; build as subordinate |
| ADR-RUN-001 | ✓ manifest + release-NNN; extends linkage fields |
| ADR-DEP-001 | ✓ deployment as traceability record; verify before succeed |
| ADR-UPD-001 | ✓ company apply uses same provenance chain |
| ADR-SEC-001 | ✓ digest gate as security control |

**Не создаёт новый контур.** **Не дублирует** orchestrator. **Закрывает gap** WI-ARCH-001 B-04 (digest bridge specification).

---

## 16. Открытые вопросы (future)

- CI integration for real `commit_sha` (out of MVP)
- `artifact_tree_digest` full-tree hash policy
- break-glass manual promote audit (ADR-SEC future WI)
