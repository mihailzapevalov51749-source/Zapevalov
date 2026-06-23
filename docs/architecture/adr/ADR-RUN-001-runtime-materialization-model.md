# ADR-RUN-001. Runtime Materialization Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-run-001-runtime-materialization-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- ADR-PROV-001 — Company Provisioning Model
- ADR-UPD-001 — Company Update & Rollback Model
- `scripts/runtime/README.md`
- `scripts/runtime/_physical_runtime_common.ps1`

---

## 1. Контекст

Принятые ADR используют термин **Materialize Runtime**, но не определяют:

- что такое materialization физически;
- как Unified Release Package становится исполняемым runtime;
- что такое `release-NNN`, `current`, immutable vs mutable;
- как работают verify, activate, rollback.

**As-is:** materialization реализована для `runtime/template/` и `runtime/client/` через PowerShell promote/verify scripts; per-company `runtime/company/{code}/` — **целевое** (ADR-RT-001). CP registry и physical runtime **не связаны** автоматически.

ADR-RUN-001 фиксирует **единую модель** physical runtime materialization для всех slots (TEMPLATE, COMPANY; CLIENT interim).

### Главный ответ

```text
Unified Release Package (code layer)
  → build/stage artifacts (DEV factory)
  → copy into immutable releases/release-NNN/
  → write manifest.json (digests + git_commit)
  → verify (mandatory)
  → activate: junction current → release-NNN (+ process reload)
```

Config/structure layers package **материализуются в БД**, не в `releases/`.

---

## 2. Решение (Decision)

**Runtime** — физический контур исполнения (filesystem slot + processes + mounts), обслуживающий один environment scope.

**Runtime Materialization** — детерминированное создание **immutable Release Artifact** (`releases/release-NNN/`) из code layer Unified Release Package с manifest provenance, верификацией и опциональной активацией через junction `current/`.

**SoT для «какой package должен быть активен»** — Control Plane registry (`platform_deployments`, `platform_environment_versions`). **SoT для физических bytes кода** — `releases/release-NNN/manifest.json` + artifact tree. Они **должны совпадать** (digest gate).

---

## 3. Определения

### 3.1. Runtime

**Runtime** — это **изолированный физический слот исполнения** платформы (filesystem root + persistent mounts + backend/frontend processes), идентифицируемый technical slot key (`template`, `company/{code}`, interim `client`), обслуживающий ровно один logical environment scope и активирующий **один** Release Artifact через junction `current/` в любой момент времени.

### 3.2. Runtime Materialization

**Runtime Materialization** — это **процесс преобразования code layer Unified Release Package** (или эквивалентного build output с тем же `commit_sha`/digests) в **immutable Release Artifact** `releases/release-NNN/` внутри runtime slot, включающий копирование frontend/backend артефактов, генерацию `manifest.json`, обязательную verification и регистрацию traceability к `platform_release_packages` / `platform_code_builds`, без мутации mounts и без in-place редактирования существующих releases.

---

## 4. Источник истины (Source Of Truth)

| Контур | SoT | Роль |
|--------|-----|------|
| **Unified Release Package** | `platform_release_packages` (CP DB) | Канон **что** должно быть развёрнуто |
| **Build provenance** | `platform_code_builds` | `commit_sha`, digests |
| **Deployment intent** | `platform_deployments` | Куда и когда apply |
| **Active version label** | `platform_environment_versions` | Per portal/slot label |
| **Physical code** | `releases/release-NNN/manifest.json` + artifacts | Канон **что реально лежит на диске** |
| **Active physical release** | `current/` junction target | Канон **что исполняется** |
| **TEMPLATE slot** | `runtime/template/` | Golden code reference |
| **Company slot** | `runtime/company/{code}/` | Per-company code (target) |

**Правило:** registry без matching manifest digest = **drift** (blocked in target orchestrator).

---

## 5. Release Artifact (`release-NNN`)

### 5.1. Определение

**Release Artifact** — immutable директория `releases/release-NNN/` (NNN — zero-padded serial per slot), содержащая unified frontend + backend + `manifest.json`.

### 5.2. Внутри release-NNN

| Содержимое | Обязательно |
|------------|-------------|
| `manifest.json` | ✓ |
| `frontend/` (built static assets) | ✓ |
| `backend/` (`app/`, `requirements.txt`, …) | ✓ |

### 5.3. Не внутри release-NNN

| Исключено | Почему |
|-----------|--------|
| `mounts/` (uploads, data, logs) | Persistent mutable |
| Config/structure snapshots | Materialize в PostgreSQL |
| User/tenant content | Company DB |
| Process PID/state | Ephemeral |
| `.env` secrets | External config |

### 5.4. Unified release policy (as-is)

Каждый новый `release-NNN` **должен** содержать frontend + backend + manifest. Rollback на frontend-only legacy releases **заблокирован** (`release-001`…`release-018` legacy).

### 5.5. manifest.json (канонические поля)

```json
{
  "release_id": "release-NNN",
  "git_commit": "<sha>",
  "created_at": "<iso8601>",
  "frontend_digest": "<sha256>",
  "backend_fingerprint": { "...": "..." },
  "artifacts": { "frontend": "frontend/", "backend": "backend/" }
}
```

**Target extension:** `package_key`, `platform_version`, `release_package_id`, `build_key` для registry link.

---

## 6. Current Runtime (`current/`)

### 6.1. Определение

**`current/`** — junction (Windows) или symlink (Unix target) на **активный** `releases/release-NNN/`. Единственная активная версия кода в slot.

### 6.2. Активная версия

```text
active_release_id = basename(readlink(runtime/{slot}/current))
```

Процессы используют:

```text
YASNOPRO_BACKEND_ROOT = .../current/backend
frontend served from .../current/frontend
```

### 6.3. Переключение (Activate)

```text
Remove-PhysicalCurrentJunction(current)
New-Item Junction current → releases/release-NNN
Reload/restart backend + frontend processes
```

**As-is:** `promote_*_backend.ps1 -SwitchToRelease release-NNN`; dev_stack restart.

### 6.4. Инвариант

`current/` **всегда** указывает ровно на **один** release; не на mounts, не на staging.

---

## 7. Физическая структура Runtime (Runtime Structure)

### 7.1. Целевая структура (per slot)

```text
../runtime/
├── template/                          # TEMPLATE golden slot
│   ├── current/          → junction → releases/release-NNN/
│   ├── releases/
│   │   ├── release-001/
│   │   ├── release-002/
│   │   └── release-NNN/
│   │       ├── manifest.json
│   │       ├── frontend/
│   │       └── backend/
│   └── mounts/
│       ├── uploads/
│       ├── data/
│       └── logs/
│
├── company/
│   └── {company_code}/                # Per-company slot (TARGET)
│       ├── current/
│       ├── releases/
│       │   └── release-NNN/
│       └── mounts/
│           ├── uploads/
│           ├── data/
│           └── logs/
│
└── client/                            # INTERIM shared (NOT TARGET)
    ├── current/
    ├── releases/
    └── mounts/
```

### 7.2. Расположение

Runtime roots **вне** git monorepo (`../runtime/` sibling) — WI-RUNTIME-ISOLATION.

### 7.3. Slot keys

| Slot | Key | DB (typical) |
|------|-----|--------------|
| TEMPLATE | `template` | `yasnopro_template` |
| COMPANY | `company/{code}` | `yasnopro_company_{code}` |
| CLIENT interim | `client` | per-company via Bridge JWT |

---

## 8. Модель хранения (Runtime Storage Model)

| Зона | Хранит | Mutable |
|------|--------|---------|
| **`releases/release-NNN/`** | Immutable code artifacts + manifest | **Immutable** after create |
| **`current/`** | Junction pointer only | **Mutable** (switch target) |
| **`mounts/uploads/`** | Tenant files | **Mutable** |
| **`mounts/data/`** | Runtime JSON stores (YASII, etc.) | **Mutable** |
| **`mounts/logs/`** | Backend logs | **Mutable** (append) |
| **DEV `.build-staging/`** | Factory output pre-promote | Ephemeral |

**Правило:** mounts **никогда** не входят в release artifact tree.

---

## 9. Immutable / Mutable Matrix

| Объект | Классификация |
|--------|---------------|
| `releases/release-NNN/` (целиком) | **Immutable** |
| `manifest.json` в release | **Immutable** |
| frontend/backend artifacts в release | **Immutable** |
| Config snapshots (package) | **Immutable** (logical); stored in DB |
| Structure snapshots (package) | **Immutable** (logical); stored in DB |
| `current/` junction target | **Conditionally mutable** (activate/rollback only) |
| `mounts/*` | **Mutable** |
| Tenant DB content | **Mutable** (not part of runtime FS) |
| Runtime process state | **Mutable** ephemeral |
| Legacy frontend-only releases | **Immutable** but **non-activatable** for rollback |

---

## 10. Materialization Lifecycle

### 10.1. Нормативный маршрут

```text
[1] RESOLVE_PACKAGE
      platform_release_packages + platform_code_builds
      (commit_sha, expected digests)
        │
[2] BUILD_OR_RESOLVE_ARTIFACTS
      DEV: vite build + backend stage → .build-staging/{slot}/
      (or copy from prior template release for company provision)
        │
[3] ALLOCATE_RELEASE_ID
      Get-NextPhysicalReleaseId → release-NNN
        │
[4] MATERIALIZE_TREE
      releases/release-NNN/{frontend,backend}
      Write-UnifiedReleaseManifest
        │
[5] VERIFY (mandatory)
      verify_{slot}_runtime.ps1
      digest/fingerprint match expected
        │
[6] REGISTER (target)
      platform_deployments + digest link to package
        │
[7] ACTIVATE (optional in same flow)
      Set-PhysicalCurrentJunction + process reload
        │
[8] AUDIT
      platform_event_journal + optional dev journal
```

### 10.2. Materialize без Activate

Допускается для **pre-stage** (release exists, `current` unchanged) — полезно для canary verify перед switch.

### 10.3. Кто инициирует

| Контекст | Initiator |
|----------|-----------|
| Publish To TEMPLATE | CP orchestrator → runtime scripts |
| Company provision | CP orchestrator → copy from template release |
| Company update accept | CP orchestrator → materialize from package |
| DEV operator promote | Manual scripts (interim; target: CP-gated) |

---

## 11. Activation Model

### 11.1. Что переключается

| Переключается | Не меняется |
|---------------|-------------|
| `current/` junction target | `mounts/` contents |
| Process code cwd / static root | Company DB data |
| Active `release_id` in runtime metadata (target) | Other releases in `releases/` |

### 11.2. Успешная активация

Все обязательны (target):

1. Junction `current` → intended `release-NNN`
2. VERIFY passes on activated release
3. Backend health endpoint OK
4. Frontend bundle serves
5. `platform_environment_versions` matches package (if registry step)
6. Audit event recorded

### 11.3. Activation lifecycle

```text
INACTIVE (release staged)
  → ACTIVATING (junction switch + reload)
  → ACTIVE | ACTIVATION_FAILED
```

---

## 12. Verification Model

### 12.1. Обязательные проверки

| Проверка | Описание |
|----------|----------|
| **Unified layout** | frontend + backend + manifest exist |
| **manifest.json** | Valid JSON, required fields |
| **frontend_digest** | Matches built bundle hash |
| **backend_fingerprint** | Matches `backend_runtime_fingerprint.py` |
| **Legacy guard** | Block frontend-only rollback targets |
| **Digest gate** (target) | Match `platform_code_builds` / package |

### 12.2. Опциональные

| Проверка | Когда |
|----------|-------|
| HTTP smoke `/health` | After activate |
| Import smoke backend app | CI / manual |
| Cross-slot parity template↔company | After company materialize |

### 12.3. As-is scripts

`verify_template_runtime.ps1`, `verify_client_runtime.ps1`, `verify_*_backend_runtime.ps1`.

---

## 13. Rollback Model

### 13.1. Источник предыдущей версии

```text
1. platform_deployments (company/template portal, succeeded, ordered by finished_at DESC)
2. Previous deployment → release_package_id → expected digests
3. Matching releases/release-NNN/ in slot (by manifest release_id or digest)
4. Activate that release-NNN
```

### 13.2. Rollback lifecycle

```text
ROLLBACK_REQUESTED
  → VALIDATE_TARGET_RELEASE (exists, unified, verified)
  → ACTIVATE_PREVIOUS (junction switch)
  → VERIFY
  → REGISTRY_REVERT (platform_environment_versions)
  → AUDIT
```

### 13.3. As-is

`-SwitchToRelease release-NNN` on promote scripts; registry revert **не автоматический**.

### 13.4. Что rollback **не** делает

- Не удаляет newer `releases/` (history retained)
- Не mutates mounts (unless explicit data migration undo — separate)
- Не affects other slots/companies

---

## 14. Failure scenarios

| Сценарий | Rollback | Retry | Recovery |
|----------|----------|-------|----------|
| **Materialization failure** | Delete partial `release-NNN` dir | Retry materialize | Operator |
| **Verification failure** | Do not activate; delete or quarantine release | Fix build, new NNN | DEV |
| **Activation failure** | Junction back to previous release | Retry activate | Restart processes |
| **Runtime corruption** | Activate last known good NNN | Re-materialize from package | Restore mounts from backup |

---

## 15. Release Package Relationship

| Package layer | Materialization surface |
|---------------|-------------------------|
| **Code (frontend, backend)** | `releases/release-NNN/` |
| **Manifest metadata** | `manifest.json` + CP registry |
| **Config snapshots** | Company/TEMPLATE **PostgreSQL** (not FS) |
| **Structure snapshots** | **PostgreSQL** |
| **Governance/changelog** | CP DB only |
| **Migration plan** | Executed against DB |

### Traceability chain (target)

```text
platform_release_packages.package_key
  → platform_code_builds.commit_sha + digests
  → manifest.json (git_commit, frontend_digest, backend_fingerprint)
  → platform_deployments.release_package_id
```

---

## 16. TEMPLATE Relationship

```text
Publish To TEMPLATE
  → materialize runtime/template/releases/release-NNN/
  → activate template current
  → verify

Company Provisioning / first company release
  → copy or re-materialize from template active release
  → into runtime/company/{code}/releases/release-001/
  → activate company current
```

TEMPLATE runtime — **authoritative code baseline** for new companies at provision time.

---

## 17. Company Relationship

| Принадлежит Runtime | Принадлежит Company (logical) | Принадлежит Database |
|---------------------|-------------------------------|---------------------|
| `releases/`, `current/`, `mounts/` FS | `portal_id`, `company_code` | All tenant rows |
| Process binaries | Lifecycle state in CP | User content |
| manifest provenance | Offer/apply decisions | Config rows post-apply |

**Runtime не хранит** canonical tenant data — только code + ephemeral/mount files.

---

## 18. Architectural Invariants

1. **`release-NNN` immutable** after materialization completes.
2. **`current` points to exactly one release** at any time per slot.
3. **`mounts` never inside `releases/`.**
4. **Unified release** — frontend + backend + manifest required for new releases.
5. **Verify before activate** (mandatory policy).
6. **Rollback = junction switch**, not in-place edit of release tree.
7. **Rollback does not delete user DB content** by default.
8. **One runtime slot per company** (`company/{code}`).
9. **TEMPLATE slot separate** from company slots.
10. **Registry digest must match manifest** (target gate).
11. **Runtime roots outside git workspace.**
12. **Technical keys** for slot paths (`company_code`, not display name).

---

## 19. Restrictions

| # | Запрет |
|---|--------|
| 1 | In-place edit files inside `releases/release-NNN/` |
| 2 | Activate without verify (policy) |
| 3 | Put mounts inside release tree |
| 4 | Rollback to non-unified legacy releases |
| 5 | Share `current/` between companies |
| 6 | Materialize without manifest.json |
| 7 | Activate release with digest mismatch vs package (target) |
| 8 | Delete only copy of release needed for rollback history (policy retention) |
| 9 | Runtime materialize config snapshots only to FS (must be DB) |
| 10 | Operator promote without audit in target orchestration |
| 11 | Use `runtime/client/` for new companies (interim only) |
| 12 | Identify slot by company display name |

---

## 20. As-is vs Target

| Capability | As-is | Target |
|------------|-------|--------|
| Template materialize | Manual promote scripts | CP orchestrator |
| Company materialize | ✗ | Provision + update apply |
| Registry ↔ manifest link | ✗ | Digest gate |
| Per-company slot | ✗ (`client` shared) | `company/{code}/` |
| manifest package fields | Partial | Full FK metadata |
| Auto registry on activate | ✗ | deployment + version pin |

---

## 21. Фазы внедрения

| Фаза | Scope |
|------|-------|
| Phase 0 | ADR-RUN-001 accepted |
| Phase 1 | Parametrize `_physical_runtime_common.ps1` for `company/{code}` |
| Phase 2 | manifest.json package linkage fields |
| Phase 3 | CP orchestrator invokes materialize+verify+activate |
| Phase 4 | Digest gate blocks drift |
| Phase 5 | Deprecate shared `runtime/client/` |

---

## 22. Документы, требующие обновления

| Документ |
|----------|
| `docs/architecture/adr/ADR-REL-001-unified-release-package.md` |
| `docs/architecture/adr/ADR-RT-001-per-company-runtime.md` |
| `docs/architecture/adr/ADR-CP-001-control-plane-orchestration-model.md` |
| `docs/architecture/adr/ADR-TPL-001-template-governance-model.md` |
| `docs/architecture/adr/ADR-PROV-001-company-provisioning-model.md` |
| `docs/architecture/adr/ADR-UPD-001-company-update-and-rollback-model.md` |
| `scripts/runtime/README.md` |
| `docs/architecture/README.md` |

---

## 23. Риски

| Риск | Mitigation |
|------|------------|
| Registry ↔ disk drift | Digest gate |
| Windows junction portability | Document Unix symlink equivalent |
| Disk growth (N releases × M companies) | Retention policy |
| Manual promote bypass | CP orchestrator |
| Partial materialize dirs | Cleanup on failure |

---

## 24. Критерии принятия ADR

- [x] Runtime definition
- [x] Runtime Materialization definition
- [x] Runtime structure
- [x] Materialization lifecycle
- [x] Activation model
- [x] Verification model
- [x] Rollback model
- [x] Immutable/mutable matrix
- [x] Relationships (package, template, company)
- [x] Invariants and restrictions
