# WI-ARCH-001 — Architecture Gap Register

```yaml
slug: wi-arch-001-architecture-gap-register
status: accepted
date: 2026-06-19
authority: YASNOPRO Platform Architecture
related_adrs:
  - adr-rel-001-unified-release-package
  - adr-cp-001-control-plane-orchestration-model
  - adr-tpl-001-template-governance-model
  - adr-prov-001-company-provisioning-model
  - adr-rt-001-per-company-runtime
  - adr-upd-001-company-update-and-rollback-model
  - adr-run-001-runtime-materialization-model
  - adr-dep-001-deployment-execution-model
  - adr-aud-001-audit-and-event-journal-model
  - adr-sec-001-security-and-isolation-model
```

## Назначение

Единый реестр разрывов между **AS-IS** (код + runtime) и **TARGET** (принятые ADR REL→SEC). Основа для плана реализации архитектуры.

---

## Сводка AS-IS vs TARGET

| Направление | AS-IS | TARGET |
|-------------|-------|--------|
| Release model | 3 контура + `platform_release_packages` adapter | Unified Release Package |
| CP role | Registry + review UI | Registry + orchestrator |
| TEMPLATE publish | Registry succeed; manual promote | Full package materialize |
| Provisioning | Per-company DB + catalog | + runtime + version pin |
| Runtime | `template/` + shared `client/` | + `company/{code}/` |
| Company update | Registry label only | Full apply + rollback |
| Deployment | Instant `mark_succeeded` | Phased execution + verify |
| Audit | Partial dual-write | Full lifecycle events |
| Security | DB isolation + JWT routing | + runtime/mount isolation |

---

*Полный gap register, roadmap и dependency map — в отчёте WI-ARCH-001 (chat) и секциях ниже.*

## Architectural Blockers (кратко)

1. **B-01** — Нет CP execution orchestrator (publish/apply/provision).
2. **B-02** — Нет per-company runtime slot (`runtime/company/{code}/`).
3. **B-03** — Registry-only deployment/update без physical apply.
4. **B-04** — Нет digest gate registry ↔ manifest.
5. **B-05** — Shared `runtime/client/` против ADR-RT-001 / ADR-SEC-001 target.

## Critical Path (кратко)

```text
WI-IMPL-01 Orchestrator skeleton + digest bridge
  → WI-IMPL-02 Template publish materialize (full)
  → WI-IMPL-03 Company runtime slot + provision materialize
  → WI-IMPL-04 Company apply (offer → full apply)
  → WI-IMPL-05 Rollback + audit completeness
  → WI-IMPL-06 Deprecate shared client runtime
```
