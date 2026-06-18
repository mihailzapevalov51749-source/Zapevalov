# Canonical Tenant Module Settings Architecture

```yaml
slug: canonical-tenant-module-settings-architecture
type: architecture_audit
version: "1.0"
status: accepted-design
date: 2026-06-14
scope: read-only design (no implementation)
authority: YASNOPRO Platform Architecture
depends_on:
  - canonical-tenant-module-configuration-architecture
  - configuration-and-ui-state-scope-standard
  - tenant-environment-strategy
related_code:
  - backend/app/modules/tenant_modules/models.py
  - backend/app/modules/platform_modules/manifest_models.py
  - backend/app/modules/platform/runtime/menu_settings/models.py
```

---

## Executive Summary

**`tenant_module_settings`** — каноническая persistence-точка **Tenant Configuration Layer** для одного установленного модуля `(tenant_id, module_key)`.

```text
tenant_module_settings =
  authoritative store of tenant module configuration
  validated by platform_module_manifests.settings_schema (+ permission/view/rule/template schemas)
  versioned independently but linked to tenant_modules.installed_version
  snapshotted before every Apply
  restored on Rollback
```

**Не является:** entity data, user UI state, navigation overrides (отдельный слой), platform code.

**Решение по storage:** **Hybrid (Option C)** — header + JSON sections + immutable snapshot tables. MVP может начать с unified JSON document (Option A subset) без отдельных block-таблиц, но snapshot table обязательна с первого Apply.

---

## 1. Storage Model Analysis

### Option A — Unified JSON Model

```json
{
  "settings": {},
  "permissions": {},
  "views": {},
  "rules": {},
  "templates": {}
}
```

| Критерий | Оценка |
|----------|--------|
| Простота | ★★★★★ — одна строка на модуль |
| Расширяемость | ★★★☆☆ — schema evolution через manifest |
| Apply | ★★★★☆ — один PATCH transaction |
| Rollback | ★★★☆☆ — нужна отдельная snapshot table |
| Diff | ★★★☆☆ — JSON deep diff; шум при reorder keys |
| Audit | ★★☆☆☆ — whole-document diff в journal |
| Performance | ★★★★☆ — один SELECT; large JSON при росте |

**Вывод:** оптимален для **MVP read/write**, недостаточен как единственный механизм rollback/audit без snapshots.

---

### Option B — Split Tables

```text
tenant_module_settings
tenant_module_permissions
tenant_module_views
tenant_module_rules
tenant_module_templates
```

| Критерий | Оценка |
|----------|--------|
| Сложность | ★★☆☆☆ — 5 CRUD + orchestration |
| Поддержка | ★★★☆☆ — чёткие границы блоков |
| Мigrations | ★★☆☆☆ — 5× DDL при эволюции |
| Snapshot | ★★★★☆ — per-block export возможен |
| Rollback | ★★★☆☆ — partial rollback риск inconsistent state |

**Вывод:** избыточен для текущего MVP; усложняет Apply atomicity.

---

### Option C — Hybrid (Recommended)

```text
tenant_module_configurations          — header (current state)
tenant_module_config_snapshots        — immutable rollback payloads
```

Header columns (conceptual):

```text
tenant_id, module_key
config_version          — semver/config lineage (see §6)
module_version          — mirror tenant_modules.installed_version
schema_bundle_version   — manifest settings_schema revision
settings                JSONB
permissions             JSONB
views                   JSONB
rules                   JSONB
templates               JSONB
provenance              JSONB  — source, overrides, propagation flags
updated_at, updated_by
```

| Критерий | Оценка |
|----------|--------|
| Простота | ★★★★☆ — один current row + append-only snapshots |
| Расширяемость | ★★★★★ — block JSON + schema per manifest |
| Apply | ★★★★★ — snapshot → patch → commit |
| Rollback | ★★★★★ — restore snapshot row |
| Diff | ★★★★☆ — block-scoped diff for Preview |
| Audit | ★★★★★ — snapshot id + diff summary |
| Performance | ★★★★☆ — indexed header; snapshots cold storage |

**Storage Model Decision:** adopt **Option C**. Option A semantics live inside JSON columns of header; Option B logical blocks without physical split tables.

---

## 2. Canonical Structure

Общий envelope (all blocks):

```json
{
  "_meta": {
    "block": "settings",
    "schema_key": "runtime.calendar/settings@1",
    "revision": 1
  },
  "values": { }
}
```

`_meta` optional in persisted form (can be header-level); `values` — payload validated against manifest.

---

### 2.1 Settings

**Назначение:** tenant-wide behavioral defaults модуля; влияют на всех пользователей до user override.

**Ограничения:**
- только scalar / structured defaults;
- no entity ids as primary config (except template refs);
- no timestamps of user actions;
- keys MUST be declared in `manifest.settings_schema`.

**Источник:** tenant admin UI, Template propagation, Apply merge from manifest defaults.

**Валидация:** JSON Schema (or equivalent) in `platform_module_manifests.settings_schema`; server-side on write and Apply.

**Пример (runtime.calendar):**

```json
{
  "default_view": "week",
  "week_starts_on": "monday",
  "timezone": "Europe/Moscow",
  "working_hours": { "start": "09:00", "end": "18:00" },
  "enabled_event_types": ["meeting", "deadline", "reminder"],
  "default_event_duration_minutes": 60,
  "default_reminder_offsets_minutes": [15, 60]
}
```

---

### 2.2 Permissions

**Назначение:** module-local authorization matrix — **какие действия разрешены каким tenant roles** в контексте модуля.

**Граница Platform RBAC vs Module Permissions:**

| Platform RBAC (`tenant_roles`) | Module Permissions |
|-------------------------------|-------------------|
| Кто admin/superadmin/user | Что модуль разрешает роли делать |
| Доступ к tenant / control plane | create_event, delete_others_event, create_chat |
| Глобальные политики безопасности | Действия внутри runtime module API |

**Composition rule:**

```text
effective_permission =
  platform_role_allows_tenant_access
  AND module_permission_matrix[role][action]
  AND rules (business constraints)
```

Module permissions **не заменяют** platform roles; **уточняют** модуль.

**Формат:**

```json
{
  "matrix": {
    "tenant_user": {
      "create_event": true,
      "edit_own_event": true,
      "edit_others_event": false,
      "delete_event": false,
      "create_chat": true
    },
    "tenant_admin": {
      "create_event": true,
      "edit_own_event": true,
      "edit_others_event": true,
      "delete_event": true,
      "create_chat": true
    }
  },
  "defaults_source": "manifest"
}
```

**Валидация:** manifest `permissions_schema` (future field) or embedded in `settings_schema.permissions`.

---

### 2.3 Views

**Назначение:** tenant default presentation contracts — **starting view**, not session state.

**Tenant defaults vs User preferences:**

| Tenant (views block) | User |
|---------------------|------|
| `default_calendar_view: "month"` | last selected view in session |
| `default_chat_layout: "sidebar"` | pinned chats order |
| enabled view modes list | hidden columns, modal bounds |

User preference MAY override tenant default **only where product allows** (opt-in override), stored outside `tenant_module_settings`.

**Пример:**

```json
{
  "default_calendar_view": "month",
  "enabled_views": ["day", "week", "month"],
  "default_list_page_size": 50,
  "show_mini_month_sidebar": true
}
```

---

### 2.4 Rules

**Назначение:** enforceable policies evaluated **server-side** on mutations.

**Типы:**

| Type | Example | Enforced where |
|------|---------|----------------|
| Server / business rules | `allow_external_invites: false` | service layer |
| Validation rules | `max_participants: 50` | schema + service |
| Automation rules | `mention_triggers_notification: true` | service (can be toggled) |

**Не путать:** validation in Pydantic = Platform contract; rules block = **tenant-configurable** toggles/thresholds on top.

**Пример:**

```json
{
  "allow_external_invites": false,
  "require_acceptance_for_invites": true,
  "auto_create_chat_on_event": false,
  "message_edit_window_minutes": 15,
  "retention_days": null
}
```

---

### 2.5 Templates

**Назначение:** idempotent seed definitions — **структура по умолчанию**, не live entities.

**Что относится к модулю:**

| In templates block | Not in templates block |
|-------------------|------------------------|
| default event type presets (metadata) | actual calendar_events rows |
| welcome chat definition (title, type) | chat messages |
| notification category enablement template | notification rows |
| folder taxonomy skeleton | library_documents rows |
| org department names (future) | user records |

**Формат:**

```json
{
  "seeds": [
    {
      "seed_key": "calendar.default_event_types",
      "kind": "reference",
      "payload": { "types": ["meeting", "standup"] }
    },
    {
      "seed_key": "chat.welcome_room",
      "kind": "entity_template",
      "idempotent": true,
      "payload": { "title": "Общий чат", "type": "group" }
    }
  ],
  "applied_seed_keys": ["chat.welcome_room"]
}
```

`applied_seed_keys` — runtime bookkeeping (may live in provenance, not templates block — implementation choice).

---

## 3. Ownership Matrix

| Field / concept | Owner |
|-----------------|-------|
| `settings_schema` structure | Platform |
| Manifest default values | Platform |
| Template tenant bundle | Template |
| Tenant admin edits | Tenant |
| `working_hours`, `timezone`, `week_starts_on` | Tenant |
| `default_calendar_view` (tenant default) | Tenant |
| `last_selected_calendar_view` | User |
| Module permission matrix values | Tenant (within manifest keys) |
| Platform roles (admin/user) | Platform + Tenant assignment |
| Chat messages, calendar events | Entity (operational) |
| Unread counters, last_read | User/entity runtime |
| Navigation title/icon override | Tenant (Navigation Layer table) |
| `CorporateCalendarPage` component | Platform |
| Seed templates content in TEMPLATE | Template |
| CLIENT override flag on key | Tenant |

---

## 4. Configuration Scope Rules

### MUST NOT store in `tenant_module_settings`

```text
entity data (chats, messages, events, notifications rows)
unread counters, last_read_message_id
user session UI state (last view, scroll, modal bounds)
navigation graph (pages, nav items) — except template seed refs
platform code paths, component names
secrets / API keys (use tenant secrets store)
```

### MAY store

```text
defaults (settings, views)
policies and toggles (rules)
role×action permissions (permissions)
idempotent seed definitions (templates)
provenance metadata (source template, override flags)
config_version, schema references
```

### Boundary rule

```text
If it describes ONE record instance → NOT tenant_module_settings
If it describes HOW the module behaves for the company → tenant_module_settings
```

Cross-reference: [configuration-and-ui-state-scope-standard.md](./configuration-and-ui-state-scope-standard.md).

---

## 5. Template Propagation Model

Chain: **DEV → TEMPLATE → CLIENT**

| Block | DEV → Template | Template → Client | Strategy |
|-------|----------------|-------------------|----------|
| **Settings** | replace template bundle | **merge** + tenant overrides preserved | additive keys; explicit `override: true` wins |
| **Permissions** | replace | **merge** matrix | missing roles filled; tenant false stays |
| **Views** | replace | **merge** | new keys additive; changed keys → manual override flag |
| **Rules** | replace | **merge** | stricter rule requires admin confirm (future) |
| **Templates** | replace seed catalog | **additive** seeds only | never delete CLIENT-applied seeds on propagate |

**Propagation modes:**

| Mode | Meaning |
|------|---------|
| `replace` | Full block copy when publishing Template from DEV |
| `merge` | Key-level union; tenant wins on conflict unless `force_propagate` |
| `additive` | Only new keys/seeds applied |
| `manual_override` | Tenant changed key → skip auto-merge until admin reset |

**Not propagated:** User prefs, entity data, snapshots.

---

## 6. Versioning Model

Two linked version axes:

```text
module_version     — from tenant_modules.installed_version (platform release)
config_version     — tenant config lineage (semver: major.minor.patch)
schema_bundle_version — manifest settings_schema revision
```

| Question | Answer |
|----------|--------|
| Config version stored separately? | **Yes** — `config_version` on header |
| Link to module version? | **Yes** — `module_version` column; Apply bumps both when module update |
| Config own version without module bump? | **Yes** — tenant admin edit increments config patch version |
| Manifest change without tenant edit? | Apply sets `schema_bundle_version`; may auto-migrate defaults |

**Version bump rules:**

```text
Tenant admin saves settings     → config_version patch +1
Module Apply (1.0.0 → 1.1.0)    → module_version = target; config minor + migration
Breaking schema change          → config major; migration map in manifest
```

Snapshots store full `(module_version, config_version, schema_bundle_version)`.

---

## 7. Snapshot Model

**Purpose:** immutable pre-Apply (and optional pre-admin-save) state for Rollback.

**Minimal snapshot record:**

```json
{
  "snapshot_id": "uuid",
  "tenant_id": 42,
  "module_key": "runtime.calendar",
  "created_at": "2026-06-14T12:00:00Z",
  "reason": "module_apply",
  "source_module_version": "1.0.0",
  "target_module_version": "1.1.0",
  "source_config_version": "1.2.0",
  "config_payload": {
    "settings": {},
    "permissions": {},
    "views": {},
    "rules": {},
    "templates": {}
  },
  "provenance": {},
  "offer_id": 123,
  "apply_id": "uuid"
}
```

**Minimum required fields:**

```text
snapshot_id, tenant_id, module_key, created_at, reason
source_module_version, target_module_version (nullable for admin save)
config_payload (full five blocks)
config_version at snapshot time
```

**Retention:** keep last N per module + all linked to completed Apply; GC policy — platform ops (future).

---

## 8. Diff Model

**Purpose:** feed `tenant_module_update_previews.impact_analysis` and admin UI.

**Diff format (canonical):**

```json
{
  "module_key": "runtime.calendar",
  "from": { "module_version": "1.0.0", "config_version": "1.2.0" },
  "to": { "module_version": "1.1.0", "config_version": "1.3.0" },
  "blocks": {
    "settings": {
      "added": ["default_reminder_offsets_minutes"],
      "removed": [],
      "changed": [
        { "key": "enabled_event_types", "from": ["meeting"], "to": ["meeting", "standup"] }
      ]
    },
    "permissions": {
      "added": ["delete_event"],
      "changed": [
        { "role": "tenant_user", "action": "delete_event", "from": false, "to": true }
      ]
    },
    "views": { "changed": [{ "key": "default_calendar_view", "from": "week", "to": "month" }] },
    "rules": { "added": ["retention_days"] },
    "templates": { "added_seeds": ["calendar.standup_preset"] }
  },
  "risk_hints": ["permissions relaxed", "new seed will run on apply"]
}
```

**Preview contract:** populate `affected_settings`, `affected_permissions` from diff blocks (replacing today's empty arrays).

**Diff sources:**

```text
manifest defaults (target) vs tenant_module_configurations (current)
OR snapshot A vs snapshot B
```

---

## 9. Apply Contract

**Preconditions:** offer available; preview generated; tenant_module.enabled; dependencies satisfied.

**Steps:**

```text
1. Load target manifest (module_version, settings_schema, defaults)
2. Load current tenant_module_configurations
3. Compute diff (current vs target defaults + migration map)
4. Validate merged payload against schema
5. CREATE snapshot (source = current full config)
6. PATCH settings (merge policy per §5)
7. PATCH permissions
8. PATCH views
9. PATCH rules
10. PATCH templates (additive seeds)
11. RUN idempotent seeders (templates only)
12. UPDATE tenant_modules.installed_version
13. UPDATE header config_version, module_version, schema_bundle_version
14. Reconcile navigation entry_points (side-effect, not stored in settings)
15. COMMIT; emit audit event
```

**Apply does NOT:**

```text
deploy platform code / frontend bundle
alter backend services deployment
modify entity tables (events, messages, notifications)
change user_menu_preferences or localStorage
replace navigation graph wholesale
delete tenant admin manual overrides (unless force flag)
```

---

## 10. Rollback Contract

**Preconditions:** snapshot exists for apply_id or latest apply.

**Steps:**

```text
1. LOAD snapshot by snapshot_id (or latest for module)
2. VALIDATE snapshot.module_key matches
3. RESTORE config_payload → tenant_module_configurations (all five blocks)
4. RESTORE tenant_modules.installed_version → source_module_version
5. RESTORE config_version → source_config_version
6. OPTIONAL reconcile navigation (if snapshot captured nav delta)
7. DO NOT delete entities created after apply
8. DO NOT revert user prefs
9. COMMIT; emit audit event
```

**Rollback semantics per block:** full block replace from snapshot (not merge).

**Failed rollback:** if snapshot corrupt/missing → manual recovery from Template tenant export.

---

## Recommended Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Platform Capability                                          │
│  platform_module_manifests.settings_schema (+ defaults)      │
└───────────────────────────┬─────────────────────────────────┘
                            │ validates
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Tenant Configuration Layer                                   │
│  tenant_module_configurations (header + 5 JSON blocks)         │
│  tenant_module_config_snapshots (immutable)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ read by
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Module runtime (chat/calendar/notifications/…)               │
│  services enforce rules + permissions + defaults             │
└─────────────────────────────────────────────────────────────┘

Adjacent (NOT inside tenant_module_settings):
  tenant_modules (adoption)
  tenant_runtime_menu_settings (navigation)
  user_menu_preferences / ui storage (user)
  entity tables (operational data)
```

**Naming note:** logical name `tenant_module_settings` maps to physical table `tenant_module_configurations` (preferred) to avoid confusion with JSON `settings` block column.

---

## Risks

| Risk | Mitigation |
|------|------------|
| JSON blob growth | block size limits; schema key whitelist |
| Partial Apply failure | single transaction; snapshot before write |
| Template overwrite CLIENT | merge + override flags |
| Permission drift vs code | manifest permission keys = code constants |
| Config without schema | reject write; empty schema blocks Apply config patch |
| Snapshot storage cost | retention policy + compression |

---

## Final Recommendation

1. Define **`tenant_module_configurations`** header with five JSON blocks (Hybrid C).
2. Define **`tenant_module_config_snapshots`** before any Apply implementation.
3. Extend manifest with **`settings_schema`** (+ defaults, permissions keys) per module.
4. Implement **diff generator** for previews (`affected_settings`, `affected_permissions`).
5. Separate **config_version** from **module_version** with explicit bump rules.
6. Enforce **scope rules** — reject entity/UI fields at validation layer.
7. Propagation: **merge/additive** Template → Client; **replace** DEV → Template.

---

## No Code Changes Applied

Architecture design only. No tables, migrations, API, ORM, or runtime data changes.

## Environment Integrity Check

NOT CHECKED — design-only session.
