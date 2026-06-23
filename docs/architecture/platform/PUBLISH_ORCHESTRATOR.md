# Publish Orchestrator (WI-IMPL-006)

Normative coordinator for Control Plane publish operations (ADR-CP-001, ADR-DEP-001, ADR-TPL-001).

## As-is vs foundation

| Capability | Before WI-IMPL-006 | After foundation |
|------------|-------------------|------------------|
| Publish entry | `publish_release_to_template()` direct deployment + instant succeed | `PublishOrchestrator` via `run_template_publish()` |
| Lifecycle phases | implicit / skipped | explicit `PublishPhase` contract |
| Runtime execution | registry-only succeed (anti-pattern) | **blocked** — stubs only |
| Deployment | created + instant succeed | created **PLANNED**, orchestrator `in_progress` |

## Normative target flow

```text
Release Package
        ↓
Publish Orchestrator          ← WI-IMPL-006 (coordinator)
        ↓
Deployment (registry)         ← WI-IMPL-005 deployment_kind
        ↓
Materialize                   ← WI-IMPL-007 (template release-NNN, no current switch)
        ↓
Verify                        ← WI-IMPL-008 (stub; Digest Bridge exists)
        ↓
Activate                      ← WI-IMPL-008 (stub)
        ↓
Version Pin                   ← WI-IMPL-009 (stub)
        ↓
Audit                         ← completion audit (stub)
```

## Module layout

```text
backend/app/modules/platform_publish_orchestrator/
  constants.py     # PublishPhase, PublishOrchestratorStatus
  types.py         # PublishContext, PublishResult
  orchestrator.py  # PublishOrchestrator + extension stubs
  service.py       # run_template_publish(), run_publish()
  template_runtime_materialization.py  # WI-IMPL-007 physical release-NNN
  template_materialization_audit.py    # materialization audit events
  schemas.py       # API DTOs
```

## Publish lifecycle phases

| Phase | Foundation behavior |
|-------|---------------------|
| `validating` | context + published package checks |
| `deployment_created` | `platform_deployments` row PLANNED |
| `materialization_pending` | pre-materialize checkpoint |
| `verify_pending` | **terminal phase for WI-IMPL-007** (release-NNN on disk) |
| `activation_pending` … `audit_pending` | extension stubs (`not_implemented`) |
| `completed` / `failed` | reserved |

## Publish context (minimum)

```text
release_package_id
package_key
platform_version
deployment_kind
target_environment_type
target_tenant_id
deployment_key
deployment_manifest_json
```

Stored snapshot also written to `deployment_manifest_json.publish_orchestrator`.

## Publish result

```json
{
  "status": "in_progress",
  "release_package_id": 42,
  "current_phase": "verify_pending",
  "materialized_release_id": "release-042",
  "deployment_id": 501,
  "deployment_key": "DPL-20260619-0501",
  "errors": []
}
```

Returned in API as `PublishToTemplateResult.orchestrator`.

## Extension points (stubs)

| Method | Future WI |
|--------|-----------|
| `materialize()` | **WI-IMPL-007** — creates `runtime/template/releases/release-NNN/` |
| `verify()` | WI-IMPL-008 Verify & Activation |
| `activate()` | WI-IMPL-008 |
| `pin_version()` | WI-IMPL-009 Environment Version Pin |
| `audit()` | WI-IMPL-008 / completion audit |

**WI-IMPL-006 does not invoke runtime scripts, promote, or `current/` junction changes.**

## Integration boundaries

| Component | Role |
|-----------|------|
| `PublishOrchestrator` | Coordinator / single entry point |
| `platform_deployments` | Execution record (deployment_kind + manifest routing) |
| Digest Bridge / Verify Gate | unchanged — invoked in future WI-008 |
| `apply_tenant_update()` | unchanged (update lifecycle out of scope) |

## Future execution flow

1. **WI-IMPL-008** — wire `verify()` + `activate()` through existing verify gate
2. **WI-IMPL-009** — `pin_version()` + governance `published_to_template`
3. **WI-IMPL-010** — registry ↔ manifest drift validation job
