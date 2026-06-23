# ADR-UPD-001. Company Update & Rollback Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-upd-001-company-update-and-rollback-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- ADR-PROV-001 — Company Provisioning Model
- `backend/app/modules/platform_release/service.py`
- `backend/app/modules/platform_release/constants.py`
- `backend/app/modules/tenant_module_configuration_rollbacks/rollback_service.py`

---

## 1. Контекст

Принятые ADR фиксируют:

- Unified Release Package публикуется в TEMPLATE первым (ADR-REL-001, ADR-TPL-001);
- компании **не обновляются автоматически** при publish to TEMPLATE;
- обновление — через **Offer → Decision → Apply** (ADR-CP-001);
- компания имеет изолированный runtime, releases, lifecycle, rollback (ADR-RT-001).

**As-is реализация** (`apply_tenant_update`):

- создаёт `platform_deployments` и сразу `mark_succeeded`;
- обновляет version label (`tenant_versions` / `platform_environment_versions`);
- **не** materialize company runtime;
- **не** apply config/structure/migrations автоматически;
- journal: «Конфигурационные изменения не применялись автоматически».

ADR-UPD-001 фиксирует **целевую полную модель** update + rollback и явно документирует gap.

### Главный ответ (после publish нового Release Package)

```text
1. CP Publish To TEMPLATE (full package materialization)
2. CP Offer To Companies (tenant_update_offers per CLIENT)
3. Компании остаются на текущей версии до решения
4. При Accept → CP orchestrates Apply Release Package к одной компании
5. При Defer/Reject → без изменений runtime/DB (offer state only)
6. При Failure → scoped rollback или retry per policy
```

---

## 2. Решение (Decision)

**Company Update** — контролируемое применение **immutable Unified Release Package** к одной CLIENT-компании после явного **Accept** Update Offer, с materialization code/config/structure/migrations в company scope, version pin, audit и optional rollback.

**Update Offer** — CP registry record, связывающий компанию с конкретным `platform_release_packages.id`, фиксирующий `from_version` → `to_version` и lifecycle decision компании.

**Company Rollback** — scoped восстановление предыдущего succeeded deployment state компании (runtime junction + config rollback + version pin), **не затрагивая** другие компании и TEMPLATE.

---

## 3. Определения

### 3.1. Company Update

**Company Update** — это **платформенная операция Apply**, инициируемая после Accept Update Offer, в которой Control Plane orchestrator атомарно (с compensating rollback) применяет все слои Unified Release Package к **одной** компании: materialize `runtime/company/{code}/releases/release-NNN/`, apply guarded config/structure deltas и migration plan к `yasnopro_company_{code}`, обновляет `platform_environment_versions`, завершает `platform_deployments` и переводит offer в terminal success state.

### 3.2. Update Offer

**Update Offer** — это **запись реестра Control Plane** (`tenant_update_offers`), представляющая **предложение** компании обновиться с `from_version` на `to_version` путём применения конкретного immutable `platform_release_packages` record, требующая **явного решения** tenant administrator (accept / defer / reject) до любой materialization.

### 3.3. Company Rollback

**Company Rollback** — это **scoped операция восстановления** предыдущего succeeded platform deployment для одной компании: активация предыдущего `release-NNN` в company runtime, откат применённых config layers (если были), revert `platform_environment_versions`, запись rollback audit — **без** mutation user business content unless migration rollback explicitly requires it.

---

## 4. Когда создаётся Offer

### 4.1. Нормативный триггер

```text
Unified Release Package
  → Publish To TEMPLATE succeeded (deployment + template version pin)
  → [optional gates: compatibility scan, operator approval]
  → CP: offer_release_to_tenants(release_package_id)
```

**Offer создаётся после** успешного Publish To TEMPLATE, **не** одновременно с draft и **не** до template materialization.

### 4.2. Условия создания (per company)

| Условие | Правило |
|---------|---------|
| `package.status == published` | Обязательно |
| Template deployment succeeded | Обязательно (target gate) |
| `tenant_type == CLIENT` (ACTIVE) | Обязательно |
| Exclude DEV / TEMPLATE / LEGACY_TEMPLATE | Обязательно |
| No duplicate offer for same `release_id` + `tenant_id` | Обязательно |
| `to_version` > current version (semver policy) | Рекомендуется |
| Compatibility rules pass | Target gate |

### 4.3. As-is

Offer создаётся при `package.status == published` без проверки template deployment digest match.

---

## 5. Содержимое Offer

Данные offer + linked package (denormalized for read):

| Поле / элемент | Обязательно | Опционально | Не требуется |
|----------------|-------------|-------------|--------------|
| **Release Package ID** (`release_id` FK) | ✓ | | |
| **from_version** | ✓ | | |
| **to_version** (`platform_version`) | ✓ | | |
| **Compatibility summary** | ✓ (target) | | |
| **Changelog** (from package manifest) | ✓ | | |
| **Breaking changes flag** | | ✓ | |
| **Migration requirements** | ✓ (if present in package) | | |
| **Rollback information** (previous deployment ref) | ✓ (target) | | |
| **Approval metadata** (reviewer, dates) | | ✓ | |
| Full artifact blobs | | | ✓ (by reference only) |
| User content preview | | | ✓ |

---

## 6. Lifecycle Offer (Offer Lifecycle)

### 6.1. Рекомендуемый state machine

```text
AVAILABLE
  │
  ├─ defer (implicit) ──► AVAILABLE (unchanged; decision deferred)
  │
  ├─ reject ──► REJECTED (skipped)
  │
  ├─ accept ──► ACCEPTED ──► APPLYING
  │                              │
  │                              ├─ success ──► APPLIED
  │                              └─ failure ──► FAILED
  │
  └─ expire (policy) ──► EXPIRED
```

### 6.2. Маппинг as-is

| Целевой | As-is (`TenantUpdateOfferStatus`) |
|---------|-----------------------------------|
| AVAILABLE | `available` |
| REJECTED | `skipped` |
| APPLIED | `applied` |
| FAILED | `failed` (enum exists; apply path rarely sets) |
| APPLYING | **нет** |
| ACCEPTED | **нет** (immediate apply) |
| EXPIRED | **нет** |
| DEFERRED | **нет** (implicit = stay `available`) |

---

## 7. Lifecycle Update (Update Lifecycle)

```text
OFFER_ACCEPTED
  ▼
VALIDATE
  │  offer available, package published, compatibility, guards
  ▼
LOCK (target)
  │  per-company update lock (one apply at a time)
  ▼
DEPLOYMENT_PLANNED
  │  platform_deployments status=planned
  ▼
APPLYING
  ├─ materialize runtime release-NNN
  ├─ apply migrations (company DB)
  ├─ apply config/structure (guarded)
  └─ deployment status=running
  ▼
VERIFY (target)
  │  health check, digest match, smoke probes
  ▼
ACTIVATE
  │  junction current → new release-NNN
  ▼
VERSION_PIN
  │  platform_environment_versions + history
  ▼
COMPLETE
  │  offer=applied, deployment=succeeded, audit events
```

**As-is:** VALIDATE → DEPLOYMENT (instant succeeded) → VERSION_PIN (partial) → COMPLETE. Без LOCK, APPLY layers, VERIFY, ACTIVATE runtime.

---

## 8. Lifecycle Rollback (Rollback Lifecycle)

```text
ROLLBACK_REQUESTED (operator or auto on failed apply)
  ▼
VALIDATE_ROLLBACK
  │  previous succeeded deployment exists; tenant allows rollback
  ▼
RUNTIME_ROLLBACK
  │  junction → previous release-NNN
  ▼
CONFIG_ROLLBACK (if config was applied)
  │  tenant_module_configuration_rollbacks pattern
  ▼
MIGRATION_ROLLBACK (if applicable / future)
  ▼
VERSION_REVERT
  │  platform_environment_versions → previous
  ▼
DEPLOYMENT_ROLLBACK_RECORD
  ▼
AUDIT_COMPLETE
```

**As-is:** platform-level company update rollback **не реализован**; module config rollback pattern существует отдельно.

---

## 9. Accept — полный маршрут (нормативный)

| Шаг | Действие |
|-----|----------|
| 1. **Validate** | Offer `available`; package `published`; package was published to TEMPLATE; compatibility |
| 2. **Lock** | Per-company update mutex |
| 3. **Deployment planned** | `platform_deployments` created |
| 4. **Materialize code** | `runtime/company/{code}/releases/release-NNN/` |
| 5. **Apply migrations** | Company DB per `migration_plan` |
| 6. **Apply config/structure** | Guarded services; Publication Guard |
| 7. **Verify** | Digest + health |
| 8. **Activate** | Junction switch |
| 9. **Version pin** | `platform_environment_versions` |
| 10. **Complete** | deployment succeeded, offer applied, journals |

---

## 10. Defer

| Вопрос | Нормативный ответ |
|--------|-------------------|
| Сколько живёт Offer | До `EXPIRED` policy или newer offer supersedes (target) |
| Можно ли принять позже | **Да**, пока `AVAILABLE` / not expired |
| Несколько Offer одновременно | **Да** для разных packages; **один** active apply per company |
| Актуальность | Highest compatible `to_version` recommended; stale offers may expire |
| Side effects | **Нет** mutation runtime/DB |

**As-is:** defer = no action; offer stays `available` indefinitely.

---

## 11. Reject

| Вопрос | Нормативный ответ |
|--------|-------------------|
| Изменить решение | **Нет** для same offer after `REJECTED`/`skipped` |
| Принять позже | **Да** via **new offer** for same or newer package |
| История отказов | Offer row retained (`skipped`); tenant event journal |

---

## 12. Failure scenarios

| Сценарий | Rollback | Retry | Manual recovery | Escalation |
|----------|----------|-------|-----------------|------------|
| **Deployment failure** | Auto to previous release (target) | Yes with lock | CP operator | Platform journal |
| **Migration failure** | DB rollback / restore point (target) | After fix | DBA + operator | High risk flag |
| **Config failure** | Config rollback service | Yes | Tenant admin notify | Publication guard log |
| **Runtime failure** | Junction previous release | Yes | Runtime operator | Health dashboard |
| **Verification failure** | Full apply rollback (target) | Yes | CP re-apply | Block APPLIED state |

**As-is:** apply rarely sets `failed`; no auto rollback on company update.

---

## 13. Update Scope Matrix

| Элемент | Обновляется | Не обновляется | Зависит от package |
|---------|-------------|----------------|-------------------|
| **Code** | ✓ | | |
| **Runtime** (junction + new release) | ✓ | | |
| **Configuration** | | | ✓ (if in package) |
| **Structure** | | | ✓ (if in package) |
| **Navigation** | | | ✓ (structure layer) |
| **Permissions** | | | ✓ (config layer) |
| **Pages** | | | ✓ (structure layer) |
| **Processes** | | | ✓ (structure layer) |
| **Actions** | | | ✓ (structure layer) |
| **Reference Data** | | | ✓ (explicit migration only) |
| **User Content** | | ✓ | |
| **Business Data** | | ✓ | rare explicit migration |

---

## 14. Rollback Scope Matrix

| Элемент | Откатывается | Не откатывается |
|---------|--------------|-----------------|
| **Runtime / Code** | ✓ (junction) | |
| **Configuration** | ✓ (if apply recorded) | |
| **Structure** | ✓ (if apply recorded) | |
| **Permissions** | ✓ (with config) | |
| **Pages / Navigation / Processes / Actions** | ✓ (with structure) | |
| **Reference Data** | | ✓ unless migration undo |
| **Business Data** | | ✓ |
| **User Content** | | ✓ |
| **Audit history** | | ✓ (append-only) |
| **Other companies** | | ✓ |

---

## 15. Критерии успешного обновления

Все обязательны (target):

1. **Deployment** `status=succeeded` for company `target_tenant_id`
2. **Runtime** active release digest matches package build
3. **Verification** health checks passed
4. **Version pin** `platform_environment_versions.platform_version == offer.to_version`
5. **Offer** `status=applied`, `applied_at` set
6. **Audit** platform + tenant journal events recorded
7. **No partial state** without explicit FAILED + rollback completed

**As-is:** (4) partial, (2)(3) not enforced, (7) not guaranteed.

---

## 16. Compatibility Model

### 16.1. Forward compatibility

Company on version **V** may accept package **V+n** only if `compatibility_rules` in package declare support for upgrade path from **V**.

### 16.2. Backward compatibility

Rollback restores **V-1** (previous succeeded deployment), not arbitrary version.

### 16.3. Breaking changes

| Type | Policy |
|------|--------|
| **Non-breaking** | Auto-offer eligible |
| **Breaking** | Explicit acknowledgment in Accept UI (target); may block auto-offer |
| **Migration required** | Apply blocked until migration plan validated |

### 16.4. Minimum supported version (future policy)

CP may mark companies below **Vmin** as **must-update** — separate governance WI; not auto-apply without accept.

---

## 17. Audit Model

### 17.1. Реестры истории

| Реестр | SoT для |
|--------|---------|
| `tenant_update_offers` | Offer decisions |
| `platform_deployments` | Apply attempts |
| `platform_environment_versions` | Current version |
| `platform_version_history` | Version timeline |
| `platform_event_journal` | Platform-scope events |
| Tenant event journal | Company-scope apply/skip |
| `tenant_module_configuration_applies` | Config apply detail |
| `tenant_module_configuration_rollbacks` | Config rollback detail |
| Runtime `releases/` history | Physical artifact timeline |

### 17.2. Обязательные события

| Событие | Scope |
|---------|-------|
| Offer created (batch) | Platform |
| Offer accepted / skipped | Tenant |
| Apply started | Tenant + Platform |
| Apply succeeded / failed | Tenant + Platform |
| Rollback started / completed | Tenant + Platform |
| Version pin changed | Platform registry |

---

## 18. Release Package Relationship

```text
Unified Release Package (published to TEMPLATE)
        │
        ▼
CP: offer_release_to_tenants
        │
        ▼
tenant_update_offers (per company)
        │
        ├─ defer / reject → no apply
        │
        └─ accept
              ▼
        Apply Release Package (company scope)
              ├─ runtime/company/{code}/release-NNN
              ├─ company DB layers
              └─ platform_environment_versions pin
```

Package **immutable**; company applies **reference** to same package id published in TEMPLATE.

---

## 19. Control Plane Relationship

```text
Control Plane
  ├─ offer_release_to_tenants (after template publish)
  ├─ list_tenant_updates (company admin read)
  ├─ apply_tenant_update (orchestrator — target full)
  ├─ skip_tenant_update (reject)
  └─ rollback_company_update (target)
        │
        ▼
Registry + Audit + Runtime commands
```

CP **не** apply без accept. CP **не** apply к нескольким компаниям одной кнопкой без per-company offers.

---

## 20. Ограничения (Restrictions)

| # | Запрет |
|---|--------|
| 1 | Apply без Accept Offer |
| 2 | Auto-apply to companies on template publish |
| 3 | Apply package not published to TEMPLATE |
| 4 | Apply bypassing Publication Guard |
| 5 | Cross-company rollback |
| 6 | Mutate immutable published package |
| 7 | Rollback without deployment history |
| 8 | Update company by direct runtime edit without registry |
| 9 | Use display name for offer targeting |
| 10 | Overwrite user business data without explicit migration |
| 11 | Concurrent apply to same company |
| 12 | Offer to DEV/TEMPLATE |

---

## 21. Архитектурные инварианты

1. **Template publish ≠ company update.**
2. **One offer references one package id.**
3. **Accept triggers apply for that company only.**
4. **Successful apply pins version in CP registry.**
5. **Rollback scoped per company.**
6. **User content preserved by default.**
7. **Audit append-only.**
8. **Technical keys for targeting (`tenant_id`, `release_id`).**

---

## 22. As-is vs Target summary

| Capability | As-is | Target |
|------------|-------|--------|
| Offer creation | ✓ | ✓ + template gate |
| Accept / Skip | ✓ | ✓ + defer/expiry |
| Runtime materialize | ✗ | ✓ |
| Config/structure apply | ✗ | ✓ |
| Migrations | ✗ | ✓ |
| Verify step | ✗ | ✓ |
| FAILED + rollback | ✗ | ✓ |
| APPLYING state | ✗ | ✓ |

---

## 23. Фазы внедрения

| Фаза | Scope |
|------|-------|
| Phase 0 | ADR-UPD-001 accepted |
| Phase 1 | Apply orchestrator: runtime materialize |
| Phase 2 | Config/structure apply from package |
| Phase 3 | VERIFY + FAILED + rollback |
| Phase 4 | Offer expiry + compatibility gates |
| Phase 5 | Deprecate `tenant_module_update_offers` parallel path |

---

## 24. Документы, требующие обновления

| Документ |
|----------|
| `docs/architecture/adr/ADR-REL-001-unified-release-package.md` |
| `docs/architecture/adr/ADR-RT-001-per-company-runtime.md` |
| `docs/architecture/adr/ADR-CP-001-control-plane-orchestration-model.md` |
| `docs/architecture/platform/tenant-environment-strategy.md` |
| `docs/architecture/platform/control-plane-architecture.md` |
| `docs/architecture/README.md` |

---

## 25. Риски

| Риск | Mitigation |
|------|------------|
| Registry-only apply (as-is) | Phased orchestrator |
| No rollback | Phase 3 |
| Version label drift from runtime | Digest verify gate |
| Multiple stale offers | Expiry policy |
| Breaking migration data loss | Backup + dry-run migrations |

---

## 26. Критерии принятия ADR

- [x] Company Update definition
- [x] Update Offer definition
- [x] Offer lifecycle
- [x] Update lifecycle
- [x] Rollback lifecycle
- [x] Compatibility model
- [x] Audit model
- [x] Release Package + CP relationships
- [x] Scope matrices
- [x] Restrictions
