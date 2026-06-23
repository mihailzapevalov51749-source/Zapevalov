# Runtime scripts (WI-RUNTIME-ISOLATION-03B, WI-RT-014C, WI-RT-014D, WI-RT-015B)

Physical TEMPLATE and CLIENT runtimes live **outside** the DEV git workspace:

```text
../runtime/template/          # golden template
../runtime/client/            # client runtime (WI-RT-015B)
├── current/              # junction -> releases/release-NNN
├── mounts/
│   ├── uploads/
│   ├── data/
│   └── logs/
└── releases/
    └── release-NNN/
        ├── manifest.json
        ├── frontend/
        └── backend/
```

## CLIENT promote / verify / rollback

Same unified release policy as TEMPLATE. Shared helpers: `_physical_runtime_common.ps1`.

```powershell
.\scripts\runtime\promote_client_frontend.ps1
.\scripts\runtime\promote_client_backend.ps1
.\scripts\runtime\verify_client_runtime.ps1
.\scripts\runtime\promote_client_backend.ps1 -SwitchToRelease release-005
```

CLIENT dev-stack after promote:

| Component | Path |
|-----------|------|
| CLIENT backend cwd | `runtime/client/current/backend` |
| CLIENT frontend | `runtime/client/current/frontend` (preview) |
| Uploads | `runtime/client/mounts/uploads` |
| Data | `runtime/client/mounts/data` |
| **Backend logs** | `runtime/client/mounts/logs/client-backend.log` |

Env for CLIENT backend:

```text
DATABASE_URL=postgresql://...@localhost:5434/yasnopro_client
APP_ENV=CLIENT
YASNOPRO_ENV=CLIENT
YASNOPRO_BACKEND_ROOT=<runtime>/current/backend
YASNOPRO_UPLOADS_DIR=<runtime>/mounts/uploads
YASNOPRO_DATA_DIR=<runtime>/mounts/data
```

## TEMPLATE (unchanged)

```text
../runtime/template/
├── current/              # junction -> releases/release-NNN
├── mounts/
│   ├── uploads/          # TEMPLATE persistent uploads
│   ├── data/             # TEMPLATE YASII JSON stores
│   └── logs/             # TEMPLATE backend logs (dev-stack)
└── releases/
    └── release-NNN/
        ├── manifest.json
        ├── frontend/
        └── backend/
            ├── app/
            └── requirements.txt
```

## Unified release policy

Every `release-NNN` **must** contain **frontend + backend + manifest**.
Rollback to frontend-only releases is **blocked**.

### Baseline

| Release | Type | Notes |
|---------|------|-------|
| release-001 … release-018 | frontend only | legacy; rollback blocked |
| **release-019** | **unified** | **first full frontend + backend baseline** |

Baseline fingerprint (release-019):

```text
backend: 118984a8686739bf4c7500ecef0f336e082e9ee62039829fe8030674e2d7cbeb
production_file_count: 830
```

## Promote frontend

```powershell
.\scripts\runtime\promote_template_frontend.ps1
```

Builds frontend and creates a release. If `current/backend` exists, forward-copies it into the new release.

## Promote backend

```powershell
.\scripts\runtime\promote_template_backend.ps1
```

Stages monorepo `backend/app` (production-only) and creates a **unified** release with forward-copied `frontend/` from `current`.

Typical first-time flow:

```text
promote_template_frontend.ps1   # frontend artifact
promote_template_backend.ps1    # backend + unified manifest + junction switch
```

## Verify

Unified verifier: `Invoke-TemplateRuntimeVerification` in `_template_runtime_common.ps1`.

```powershell
.\scripts\runtime\verify_template_runtime.ps1          # full (frontend + backend + mounts)
.\scripts\runtime\verify_template_backend_runtime.ps1  # backend scope (subset, backward compatible)
```

Checks: `current`, `manifest`, mounts, artifacts, no `test_*.py` leak, fingerprint, `import app.main`.

## Rollback

```powershell
.\scripts\runtime\promote_template_backend.ps1 -SwitchToRelease release-019
.\scripts\runtime\promote_template_backend.ps1 -ListReleases
```

`-SwitchToRelease` repoints the `current` junction **without rebuild**.
Blocked when target release lacks `frontend/`, `backend/`, `manifest.json`, or valid fingerprints.

## TEMPLATE dev-stack

After promote, `dev-stack` starts:

| Component | Path |
|-----------|------|
| TEMPLATE backend cwd | `runtime/template/current/backend` |
| TEMPLATE frontend | `runtime/template/current/frontend` (preview) |
| Uploads | `runtime/template/mounts/uploads` |
| Data | `runtime/template/mounts/data` |
| **Backend logs** | `runtime/template/mounts/logs/template-backend.log` |

DEV frontend logs and CLIENT/TEMPLATE frontend logs remain in monorepo `logs/`.

Env for TEMPLATE backend:

```text
DATABASE_URL=postgresql://...@localhost:5434/yasnopro_template
APP_ENV=TEMPLATE
YASNOPRO_ENV=TEMPLATE
YASNOPRO_BACKEND_ROOT=<runtime>/current/backend
YASNOPRO_UPLOADS_DIR=<runtime>/mounts/uploads
YASNOPRO_DATA_DIR=<runtime>/mounts/data
```

## Release provenance (WI-IMPL-002, ADR-PROVENANCE-001)

Physical `manifest.json` schema **1.1** adds registry linkage for Digest Bridge (future WI-IMPL-003).

### Legacy fields (unchanged)

```json
{
  "release_id": "release-NNN",
  "git_commit": "<40-char sha>",
  "created_at": "<iso8601>",
  "frontend_digest": "<sha256>",
  "backend_fingerprint": { "hash": "...", "version": "1" },
  "artifacts": { "frontend": "frontend/", "backend": "backend/" }
}
```

### Provenance extension (new promotes)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `manifest_schema_version` | string | when provenance present | `"1.1"` |
| `runtime_slot_key` | string | ✓ on new materialize | `template` or `client` |
| `release_package_id` | int | optional* | CP registry FK |
| `package_key` | string | optional* | `PKG-YYYYMMDD-NNNN` |
| `build_id` | int | optional* | CP registry FK |
| `build_key` | string | optional* | `BLD-YYYYMMDD-NNNN` |

\*Registry linkage fields are **all-or-nothing**: pass every provenance param together.

### Promote with full registry linkage

```powershell
.\scripts\runtime\promote_template_backend.ps1 `
  -ReleasePackageId 42 `
  -PackageKey PKG-20260619-0001 `
  -BuildId 17 `
  -BuildKey BLD-20260619-0001
```

Without registry params, new releases still get `runtime_slot_key` and `manifest_schema_version`.

### Package digest (CP DB)

`platform_release_packages.package_manifest_json` now includes:

```json
{
  "code_layer": {
    "build_id": 17,
    "build_key": "BLD-...",
    "commit_sha": "...",
    "backend_digest": "...",
    "frontend_digest": "...",
    "schema_revision": "..."
  },
  "package_digest": "<sha256 hex>"
}
```

Algorithm: SHA-256 of canonical JSON (`package_key`, `platform_version`, `code_layer`, `module_bom_json`). See `backend/app/modules/platform_release_provenance/digest.py`.

## Digest Bridge (WI-IMPL-003)

Read-only verification service: `backend/app/modules/platform_release_provenance/bridge.py`.

### Verification flow

```text
verify_package_against_build()
verify_manifest_against_package()
verify_runtime_against_manifest()
        ↓
verify_release_provenance()   # full chain
detect_release_drift()        # same + drift_detected flag
```

### CLI (read-only)

```powershell
cd backend
python scripts/verify_release_provenance.py `
  --package-id 42 `
  --runtime-slot template `
  --release-id release-020
```

Or with explicit manifest:

```powershell
python scripts/verify_release_provenance.py `
  --package-id 42 `
  --manifest-path ..\runtime\template\releases\release-020\manifest.json
```

Exit code `0` = `status: passed`; `1` = failed/partial.

### Verify result contract

```json
{
  "status": "passed",
  "build_match": true,
  "package_match": true,
  "manifest_match": true,
  "runtime_match": true,
  "drift_detected": false,
  "issues": [],
  "checks": [{"name": "package_digest", "ok": true}]
}
```

`status`: `passed` | `partial` (legacy/incomplete linkage) | `failed` (mismatch).

## Deployment Verify Gate (WI-IMPL-004)

Mandatory gate before `mark_succeeded()` in `platform_deployment_registry/service.py`.

### Target flow

```text
Deployment (RUNNING)
        ↓
run_deployment_verify_gate()
        ↓
verify_release_provenance()   # Digest Bridge — single verification mechanism
        ↓
VerifyResult + verify_proof in deployment_manifest_json
        ↓
status == passed AND drift_detected == false
        ↓
mark_succeeded() → SUCCEEDED
```

Any other outcome (`partial`, `failed`, `drift_detected`) blocks SUCCEEDED and transitions deployment to `FAILED` with a structured failure reason.

### Verify proof contract

Stored in `platform_deployments.deployment_manifest_json.verify_proof`:

```json
{
  "verify_proof_version": "1.0",
  "status": "passed",
  "verified_at": "2026-06-19T12:00:00Z",
  "build_match": true,
  "package_match": true,
  "manifest_match": true,
  "runtime_match": true,
  "drift_detected": false,
  "issues": [],
  "checks": []
}
```

Implementation: `backend/app/modules/platform_release_provenance/verify_gate.py`.

### Success requirements

| Requirement | Gate |
|-------------|------|
| `status` | must be `passed` |
| `drift_detected` | must be `false` |
| Digest Bridge | sole verification path (no duplicate checks) |

### Failure reasons (`failure_reason` on deployment)

| Code | Typical cause |
|------|----------------|
| `BUILD_MISMATCH` | build ↔ package linkage or digest mismatch |
| `PACKAGE_MISMATCH` | package digest / linkage missing or invalid |
| `MANIFEST_MISMATCH` | physical manifest missing or registry mismatch |
| `RUNTIME_MISMATCH` | runtime release / artifacts / fingerprint mismatch |
| `DRIFT_DETECTED` | drift without a more specific layer mismatch |
| `VERIFY_FAILED` | generic verify failure |

### Audit (ADR-AUD-001)

On verify failure: `deployment_verify_failed` (platform or tenant journal by target type).

On verify success: `deployment_verify_passed`.

### Drift detection

`detect_release_drift()` flags:

- digest / key mismatches between build, package, manifest
- missing registry linkage in physical manifest
- missing runtime release or artifacts
- recomputed fingerprint ≠ manifest

**WI-IMPL-007** materializes TEMPLATE release on disk and sets `deployment_manifest_json.materialized_release_id`. Does **not** switch `current/` junction or invoke verify gate.

## Template Runtime Materialization (WI-IMPL-007)

Orchestrator `materialize()` creates immutable:

```text
runtime/template/releases/release-NNN/
  frontend/
  backend/
  manifest.json
```

Python SoT: `backend/app/modules/platform_publish_orchestrator/template_runtime_materialization.py`

Manual companion: `scripts/runtime/materialize_template_release.ps1` (no `current/` switch).

Audit events: `template_materialization_started|succeeded|failed`.

After success orchestrator phase → `verify_pending`.

## Publish Orchestrator (WI-IMPL-006)

See `docs/architecture/platform/PUBLISH_ORCHESTRATOR.md` for the full coordinator model.

Foundation entry point: `backend/app/modules/platform_publish_orchestrator/service.py` → `run_template_publish()`.

The orchestrator creates a **PLANNED** deployment, materializes TEMPLATE `release-NNN`, and stops at `verify_pending`. No activate/version pin.

## Deployment Kind Model (WI-IMPL-005)

Normative deployment classification per ADR-DEP-001 §6. Stored in `platform_deployments.deployment_kind` and mirrored in `deployment_manifest_json.deployment_kind`.

### Deployment kinds

| `deployment_kind` | Trigger (target) | Allowed `target_environment_type` |
|-------------------|------------------|-------------------------------------|
| `template_publish` | `publish_release_to_template` | `template` |
| `company_update` | `apply_tenant_update` | `client` |
| `provision_baseline` | company provisioning (target) | `client` |
| `rollback` | operator rollback | `template`, `client` |
| `dev_deploy` | DEV slot ops | `dev` |

Implementation: `backend/app/modules/platform_deployment_registry/deployment_kind.py`.

### Runtime routing

At `create_deployment()` routing hints are written into `deployment_manifest_json` (verify gate reads `runtime_slot_key` / `materialized_release_id` without duplicating materialization):

| Kind | `runtime_slot_key` | `materialized_release_id` |
|------|--------------------|---------------------------|
| `template_publish` | `template` | optional / `current` |
| `company_update` | `company/{portal.code}` | optional / `current` |
| `provision_baseline` | `company/{portal.code}` | `release-001` (default) |
| `rollback` | `company/{portal.code}` or `template` | previous succeeded release |
| `dev_deploy` | `dev` | optional / `current` |

`portal.code` is the technical routing key (not display name).

### Deployment classification & audit

Lifecycle audit per kind (`started` / `succeeded` / `failed`):

- `template_publish_*`
- `company_update_*`
- `provision_baseline_*`
- `rollback_*`
- `dev_deploy_*`

Recorded by `deployment_audit.py` on `start_deployment`, `mark_succeeded`, `mark_failed`.

### Backward compatibility

Existing rows backfilled by migration `20260619_0082` from `deployment_manifest_json.created_via` and `target_environment_type`. New API calls may omit `deployment_kind` — inference applies legacy rules.
