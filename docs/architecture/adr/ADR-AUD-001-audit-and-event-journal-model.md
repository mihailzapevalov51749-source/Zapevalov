# ADR-AUD-001. Audit & Event Journal Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-aud-001-audit-and-event-journal-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- ADR-PROV-001 — Company Provisioning Model
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-UPD-001 — Company Update & Rollback Model
- ADR-RUN-001 — Runtime Materialization Model
- ADR-DEP-001 — Deployment Execution Model
- `backend/app/modules/platform_event_journal/`
- `backend/app/modules/platform_deployment_registry/`
- `backend/app/modules/platform_version_registry/`

---

## 1. Контекст

Принятые ADR требуют **Audit / Journal / History** на каждом этапе release, deployment, provisioning, update. В коде сосуществуют:

- `platform_event_journal_entries` (platform + tenant scopes, multiple `journal_kind`);
- structured registries (`platform_deployments`, `platform_version_history`, `tenant_update_offers`);
- module apply/rollback tables;
- DEV development journal (`dev_development` on DEV tenant).

Единой архитектурной модели «что такое событие / журнал / audit» **не было**.

ADR-AUD-001 фиксирует **нормативную модель** записи истории действий платформы.

### Главный ответ

**ЯсноПро фиксирует историю** через **два слоя**:

1. **Narrative Event Journals** — человекочитаемые append-only события (`platform_event_journal_entries`).
2. **Structured Registries** — машиночитаемые факты состояния (`platform_deployments`, version history, offers).

Оба слоя обязательны для governance-операций; registry — **SoT для state**, journal — **SoT для audit narrative**.

---

## 2. Решение (Decision)

- **Audit** — политика и практика обязательной фиксации значимых изменений состояния.
- **Event** — атомарная запись факта изменения.
- **Journal** — append-only хранилище events с классификацией по `scope` + `journal_kind`.

Удаление production audit записей **запрещено** (кроме controlled test cleanup по slug/id).

---

## 3. Определение Audit (Audit Definition)

**Audit** — это **архитектурная обязанность платформы** фиксировать значимые изменения состояния (release, deployment, provisioning, company update, security, governance) с идентификацией actor, target, timestamp, result и неизменяемой историей, достаточной для восстановления «кто / что / когда / к чему применилось» без опоры на display names.

Audit реализуется **комбинацией** narrative journals и structured registries.

---

## 4. Определение Event (Event Definition)

**Event** — это **атомарная неизменяемая запись** о совершённом или неуспешном **изменении состояния** системы (или попытке изменения), содержащая минимальный нормативный набор полей (код, actor, target, timestamp, scope, result) и опциональный structured `metadata`.

**Событие — это не:**

- read-only GET / list / view;
- health ping без state change;
- вычисление rollups / dashboard refresh без persistence;
- duplicate slug re-insert (идемпотентный skip).

### 4.1. Критерии «является событием»

| Критерий | Пример |
|----------|--------|
| Меняет lifecycle state | deployment `planned` → `succeeded` |
| Меняет version pin | `platform_environment_versions` |
| Меняет offer decision | accept / skip |
| Меняет access / security | login failed, role change |
| Меняет tenant structure/config (governed) | module apply |
| Создаёт/архивирует company | provisioning |

---

## 5. Определение Journal (Journal Definition)

**Journal** — это **логическое append-only хранилище событий** с единой физической таблицей или dedicated registry, классифицированное по `scope` и `journal_kind`, с политикой доступа read/write и запретом in-place mutation production записей.

Физически narrative journals в ЯсноПро: **`platform_event_journal_entries`**.

---

## 6. Модель журналов (Journal Model)

### 6.1. Нормативный перечень

| Journal / Registry | Физическое хранение | `scope` / kind | SoT для |
|--------------------|---------------------|----------------|---------|
| **Platform Event Journal** | `platform_event_journal_entries` | `scope=platform`, `journal_kind=platform_audit` | Platform ops narrative audit |
| **DEV Development Journal** | `platform_event_journal_entries` | `scope=tenant`, `journal_kind=dev_development`, DEV `tenant_id` | WI / Cursor development log |
| **Tenant Event Journal** | `platform_event_journal_entries` | `scope=tenant`, tenant codes | Company admin / designer actions |
| **Deployment History** | `platform_deployments` | structured registry | Deployment attempt facts |
| **Version History** | `platform_version_history` | structured registry | Version install timeline |
| **Environment Version (current)** | `platform_environment_versions` | structured registry | Current version pin |
| **Offer Registry** | `tenant_update_offers` | structured registry | Offer decisions state |
| **Config Apply History** | `tenant_module_configuration_applies` | structured registry | Config apply facts |
| **Config Rollback History** | `tenant_module_configuration_rollbacks` | structured registry | Config rollback facts |
| **Runtime release tree** | `runtime/.../releases/` | filesystem | Physical artifact provenance |

### 6.2. Канон vs производный vs служебный

| Класс | Members |
|-------|---------|
| **Канон (state SoT)** | `platform_deployments`, `platform_environment_versions`, `tenant_update_offers`, apply/rollback tables |
| **Канон (narrative SoT)** | `platform_event_journal_entries` per scope/kind |
| **Производный** | Dashboard rollups, UI aggregates, analyzer readiness |
| **Служебный** | Idempotency slug index, ephemeral logs (`mounts/logs/`) |

### 6.3. Назначение, write/read (summary)

| Journal | Пишет | Читает |
|---------|-------|--------|
| Platform Event Journal | CP services (`record_platform_event`) | Platform admin / registry reader |
| DEV Development Journal | Agents, scripts (`record_cursor_dev_event`) | DEV tenant, platform admin |
| Tenant Event Journal | Tenant services (`record_tenant_event`) | Tenant admin, company journal UI |
| Deployment History | Deployment registry service | Control Plane, operators |
| Version History | Version registry on succeed deploy | Control Plane |

---

## 7. Классификация событий (Event Classification Model)

### 7.1. Обязательные governance events (норматив)

| Домен | Event (code) | Journal / Registry |
|-------|--------------|-------------------|
| **Release** | created, submitted, review_started, approved, changes_requested | Platform journal + package registry |
| **Publish TEMPLATE** | `template_published` | Platform journal + deployment |
| **Offer** | `template_update_sent` (batch) | Platform journal + offers rows |
| **Provision** | `company_created`, provisioning started/succeeded/failed | Platform journal |
| **Offer accept** | `platform_update_applied` | Tenant journal + deployment + offer |
| **Offer reject** | `platform_update_skipped` | Tenant journal + offer |
| **Deployment** | started, succeeded, failed (target explicit codes) | Deployment registry + platform/tenant journal |
| **Rollback** | rollback started/completed | Deployment registry + journals |
| **Version** | pin changed | `platform_version_history` + journal |
| **Security** | login_failed, guard violation | Platform journal |
| **Config apply** | module configuration applied | apply table + tenant journal |

### 7.2. As-is gaps (target)

- Deployment **started/failed** narrative codes не всегда пишутся;
- Materialize/verify/activate phases без отдельных events (target);
- Rollback deployment без journal (target).

### 7.3. Не обязательные (не события audit)

- Page view, list companies, get release details;
- Dashboard refresh, analyzer scan (unless persists journal);
- Read-only health checks.

---

## 8. Обязательные поля события (норматив)

### 8.1. Narrative journal (`platform_event_journal_entries`)

| Поле | Обязательно | Примечание |
|------|-------------|------------|
| `id` | ✓ | system |
| `slug` | ✓ | unique, idempotency |
| `event_type` / `event_code` | ✓ | taxonomy |
| `event_category` | ✓ | grouping |
| `scope` | ✓ | platform / tenant |
| `journal_kind` | ✓ | platform_audit / dev_development / … |
| `title` | ✓ | human summary |
| `status` | ✓ | done / error / … |
| `occurred_at` | ✓ | event time |
| `created_at` | ✓ | record time |
| `author_user_id` / `actor_email` | ✓ (one of) | actor |
| `tenant_id` / `company_id` | if tenant-scoped | technical ids |
| `target_type`, `target_id` | ✓ when applicable | technical target |
| `metadata_json` | recommended | structured payload |
| `description` | optional | long text |
| `target_name` | optional | display only — **не SoT** |

### 8.2. Structured registry (deployment example)

`deployment_key`, `release_package_id`, `target_tenant_id`, `status`, timestamps, `failure_reason`, `deployment_manifest_json`.

---

## 9. Жизненный цикл события (Event Lifecycle)

```text
OCCURRED (business time)
  ▼
RECORDED (persisted to journal/registry)
  ▼
INDEXED (DB indexes, UI lists)
  ▼
[ARCHIVED] (cold storage policy — future)
  ▼
[DELETED] — only test/sandbox slugs under cleanup policy; production forbidden
```

**Idempotency at RECORDED:** duplicate `slug` → skip insert (`get_journal_entry_by_slug`).

---

## 10. Модель хранения (Storage Model)

| Что | Где | Retention (policy) |
|-----|-----|-------------------|
| Narrative events | CP DB `platform_event_journal_entries` | Long-term; archive after N years (future) |
| Deployments | CP DB `platform_deployments` | Permanent |
| Version history | CP DB `platform_version_history` | Permanent append-only |
| DEV WI log | Same table, DEV tenant scope | Permanent for governance WI |
| Process logs | `runtime/.../mounts/logs/` | Rotation; **не** audit SoT |
| Test journal slugs | Same table | Deletable by id/slug in test cleanup only |

---

## 11. Модель неизменности (Immutability Model)

| Запись | Mutable? |
|--------|----------|
| `platform_event_journal_entries` (production) | **Immutable** append-only |
| `platform_deployments` terminal rows | **Immutable** |
| `platform_version_history` | **Append-only immutable** |
| `tenant_update_offers` terminal | **Status transition only** via defined API |
| `metadata_json` after record | **Immutable** |
| Seed/backfill corrections | **Exception:** new compensating event, not edit |
| Display `title`/`target_name` in old entries | **Не редактировать** retroactively |

**Корректировка ошибок:** новое compensating event + optional new registry row; **не** UPDATE старых audit rows.

---

## 12. Модель архивирования (Archiving Model)

| Архивируется (future) | Не архивируется |
|-----------------------|-----------------|
| Old narrative events beyond hot window | Deployment registry |
| Rotated file logs | Version history |
| | DEV WI entries for accepted ADRs |
| | Security violation records |

Archive = **move/copy**, не delete, для compliance classes.

---

## 13. Deployment Relationship (ADR-DEP-001)

| Deployment transition | Обязательные записи |
|-----------------------|---------------------|
| `planned` | `platform_deployments` row |
| `running` | deployment `started_at` + journal (target) |
| `succeeded` | deployment terminal + version history + platform/tenant journal |
| `failed` | `failure_reason` + error journal |
| `rolled_back` | rollback deployment row + journals |

**Автоматически:** registry row on create; version history on `mark_succeeded` (as-is); journal on publish/apply (partial).

---

## 14. Release Package Relationship (ADR-REL-001)

| Release milestone | Audit |
|-------------------|-------|
| Package created | Platform journal (dev or platform) |
| Review started / approved / changes requested | `release_*` platform codes |
| Published to template | `template_published` + deployment |
| Offered to tenants | `template_update_sent` |

Package registry (`platform_release_packages`) — **state SoT**; journal — **narrative SoT**.

---

## 15. Company Lifecycle Relationship (ADR-PROV-001, ADR-UPD-001)

| Milestone | Audit |
|-----------|-------|
| Provisioning started/succeeded/failed | Platform journal + optional DEV journal |
| Company created | `company_created` |
| Offer available | offer row (registry) |
| Accept update | `platform_update_applied` + deployment |
| Skip update | `platform_update_skipped` |
| Rollback | deployment rollback + tenant/platform journal |

Company **user content** changes — tenant journal (`object_*`, etc.), не platform journal.

---

## 16. Control Plane Relationship (ADR-CP-001)

| Класс | Scope | Примеры |
|-------|-------|---------|
| **Platform events** | `scope=platform` | publish, offer batch, company create, platform users |
| **Tenant events** | `scope=tenant` | apply update, designer edits, config apply |
| **DEV development** | `scope=tenant`, DEV id, `dev_development` | WI completion, ADR acceptance |

CP orchestrator **обязан** писать platform events; tenant admin actions → tenant journal.

**Write access:** platform journal write — platform admin; tenant journal — tenant context services; DEV journal — dev scripts/agents on DEV tenant.

**Read access:** platform admin / registry reader; tenant admin for own tenant journal.

---

## 17. Architectural Invariants

1. **Significant state change → audit record** (journal and/or registry).
2. **Deployment terminal state → audit** (registry minimum; journal target).
3. **Rollback → audit** (never silent).
4. **Journal append-only** for production.
5. **Event has `occurred_at` timestamp.**
6. **Actor identified** by `user_id` / service source — not display name alone.
7. **Target identified** by `target_type` + `target_id` technical keys.
8. **Slug uniqueness** for idempotent writes.
9. **Registry is SoT for machine state; journal is SoT for human narrative** — both required.
10. **DEV journal ≠ platform audit journal** (separate `journal_kind`).
11. **Test cleanup only by explicit id/slug** — never pattern delete production.
12. **Display fields in events не используются как protection keys.**

---

## 18. Restrictions

| # | Запрет |
|---|--------|
| 1 | DELETE production audit/journal entries (except approved test slugs) |
| 2 | UPDATE `metadata_json` / `title` retroactively to «исправить историю» |
| 3 | Запись platform ops в tenant user content tables как audit |
| 4 | Пропуск audit на terminal deployment |
| 5 | Использование `name`/`title` как target_id |
| 6 | Дублирующий parallel audit store без sync plan |
| 7 | Hard-delete deployment history |
| 8 | Запись DEV WI в platform_audit scope |
| 9 | Skip slug (non-idempotent flood) для automated ops без policy |
| 10 | Архивирование как substitute delete для compliance events |

---

## 19. As-is vs Target

| Capability | As-is | Target |
|------------|-------|--------|
| Unified writers (`record_platform_event`, `record_tenant_event`) | ✓ | ✓ |
| Deployment phase events | partial | full lifecycle codes |
| Rollback journal | ✗ | required |
| Materialize/verify events | ✗ | optional sub-events |
| Retention/archive policy | undocumented | documented WI |

---

## 20. Фазы внедрения

| Phase | Scope |
|------|-------|
| Phase 0 | ADR-AUD-001 accepted |
| Phase 1 | Deployment started/failed/rollback event codes |
| Phase 2 | Orchestrator auto-journal on each DEP phase |
| Phase 3 | Audit completeness gate in ADR completion rules |
| Phase 4 | Archive/retention policy |

---

## 21. Документы, требующие обновления

| Документ |
|----------|
| All ADR-REL through ADR-DEP |
| `docs/architecture/platform/control-plane-architecture.md` |
| `.cursor/rules/dev-journal-mandatory.mdc` (cross-ref) |
| `.cursor/rules/03_QUALITY_CONTROL.mdc` |
| `docs/architecture/README.md` |

---

## 22. Риски

| Риск | Mitigation |
|------|------------|
| Journal/registry drift | Dual-write in orchestrator |
| Missing failed deployment journal | Phase 1 codes |
| Log files as audit substitute | Policy: mounts/logs not SoT |
| DEV journal conflation | Strict journal_kind |
| Table growth | Archive policy |

---

## 23. Критерии принятия ADR

- [x] Audit, Event, Journal definitions
- [x] Journal catalog
- [x] Event classification
- [x] Event lifecycle
- [x] Storage, immutability, archiving
- [x] Relationships (DEP, REL, Company, CP)
- [x] Invariants and restrictions
