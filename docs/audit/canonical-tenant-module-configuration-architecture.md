# Canonical Tenant Module Configuration Architecture

```yaml
slug: canonical-tenant-module-configuration-architecture
type: architecture_audit
date: 2026-06-14
status: accepted-audit
scope: read-only
authority: YASNOPRO Platform Architecture
related:
  - configuration-and-ui-state-scope-standard
  - platform_modules/manifest_constants
  - tenant_modules/models
```

---

## Executive Summary

Подтверждено: **Tenant Configuration Layer фактически отсутствует**. Сегодня для модулей существуют только:

| Слой | Таблица / механизм | Что хранит |
|------|-------------------|------------|
| Tenant Adoption | `tenant_modules` | installed_version, enabled, source |
| Navigation Layer (частично) | `tenant_runtime_menu_settings` | title/icon/visibility runtime nav items |
| User prefs (не tenant config) | `user_menu_preferences`, localStorage | персональные prefs shell |
| Platform Capability | `platform_module_manifests.settings_schema` | `{}` — пусто для всех runtime-модулей |

**Module Apply** (`tenant_modules → offers → previews → apply → rollback`) не имеет конфигурационного payload: preview generator явно возвращает `affected_settings: []`, `affected_permissions: []`.

Канонический вывод:

```text
Tenant Module Configuration =
  Settings      — tenant-wide module behavior defaults
  Permissions   — role/action matrix per module
  Views         — tenant-default presentation contracts
  Rules         — business policies enforced by module
  Templates     — seed/propagate bundles for new tenants
```

Navigation overrides (`tenant_runtime_menu_settings`) — **смежный слой**, не замена `tenant_module_settings`. User prefs и runtime entity data (chats, events, notifications) — **вне** Tenant Configuration Layer.

---

## Existing Module Configuration Audit

### runtime.chat

**Текущее состояние:** конфигурация tenant-модуля не персистится. Поведение зашито в код + entity tables.

#### Settings (логически принадлежат модулю)

| Ключ | Сейчас | Комментарий |
|------|--------|-------------|
| `direct_chat_enabled` | hardcoded true | MVP всегда разрешает DM |
| `group_chat_enabled` | hardcoded true | |
| `max_participants_per_chat` | нет | |
| `attachments_enabled` | hardcoded true | files integration |
| `max_attachment_size_mb` | platform/files | Mixed |
| `mentions_enabled` | hardcoded true | |
| `reactions_enabled` | hardcoded true | |
| `message_edit_window_minutes` | нет | |
| `message_delete_policy` | author-only (implicit) | |
| `retention_days` | нет | |
| `default_chat_type` | `"group"` in model | Platform default |

#### Permissions

| Право | Сейчас | Источник |
|-------|--------|----------|
| Создание чата | любой tenant user | router |
| Удаление чата | creator + chat admin | `ensure_chat_admin`, `isChatCreator` |
| Редактирование метаданных чата | chat admin | `ensure_chat_admin` |
| Управление участниками | chat admin | participant routes |
| Отправка сообщений | chat participant | `ensure_chat_participant` |
| Удаление чужих сообщений | нет (author only) | |
| Tenant access | `chats.tenant_access` | manifest placeholder |

#### Views

| View | Scope сейчас | Tenant config? |
|------|--------------|----------------|
| Sidebar + window layout | Platform component | Platform |
| Chat list sort (pinned/muted) | per participant row | User/entity |
| Unread badge | `ChatUnreadProvider` | User UI state |
| File viewer overlay | Platform shared | Platform |

#### Rules

| Rule | Сейчас |
|------|--------|
| Participant must belong to tenant | enforced (`tenant_access.py`) |
| Hidden users excluded from search | enforced |
| Mention → auto-add participant + notification | hardcoded service |
| Reply → notification to parent author | hardcoded service |

#### Templates

| Template | Сейчас |
|----------|--------|
| Welcome / system chats | нет |
| Default group naming | нет |
| Chat avatar defaults | `DEFAULT_AVATAR_SETTINGS` (Platform UI) |

---

### runtime.calendar

**Текущее состояние:** view mode `"week"` — React local state; event types — Platform constants; edit policy — role-based in code.

#### Settings

| Ключ | Сейчас |
|------|--------|
| `default_view` | UI state (`useState("week")`) — **не tenant config** |
| `week_starts_on` | browser locale — **должен быть tenant** |
| `working_hours_start/end` | нет |
| `timezone` | нет (tenant-level planned in scope standard) |
| `enabled_event_types` | all `CALENDAR_EVENT_TYPES` hardcoded |
| `default_event_duration_minutes` | нет |
| `default_reminder_offsets` | нет |
| `invite_notification_enabled` | hardcoded true |
| `auto_create_event_chat` | per-event flag only |
| `video_meeting_provider` | placeholder URL in service |
| `search_enabled` | hardcoded true |

#### Permissions

| Право | Сейчас |
|-------|--------|
| Создание событий | any tenant user with access |
| Редактирование своих | creator |
| Редактирование чужих | `TENANT_ADMIN`, `TENANT_SUPERADMIN` |
| Удаление | same as edit (`can_edit_calendar_event`) |
| Приглашение участников | implicit via create/update |
| Ответ на приглашение | participant self |

#### Views

| View | Реализовано | Default owner |
|------|-------------|---------------|
| day | `CalendarDayView` | User UI state |
| week | `CalendarWeekView` | User UI state |
| month | `CalendarMonthView` | User UI state |
| list | `CalendarListView` | not in toolbar MVP |
| mini-month sidebar | `CalendarMiniMonth` | Platform layout |

#### Rules

| Rule | Сейчас |
|------|--------|
| Event types whitelist | Platform `CALENDAR_EVENT_TYPES` |
| End ≥ start | schema validator |
| Participants ∈ tenant | `assert_participant_ids_belong_to_tenant` |
| Invite notifications | `notify_event_invites` always |
| Optional event chat creation | per-request `create_event_chat` |

#### Templates

| Template | Сейчас |
|----------|--------|
| Event type presets | Platform labels only |
| Recurring events | не реализовано |
| Meeting room / location templates | нет |

---

### runtime.notifications

**Текущее состояние:** platform service; categories/types — Platform constants; delivery — entity-triggered; нет tenant notification policy.

#### Settings

| Ключ | Сейчас |
|------|--------|
| `enabled_categories` | all categories allowed |
| `enabled_target_types` | manifest `notification_targets` (Platform) |
| `default_priority` | `NOTIFICATION_PRIORITY_NORMAL` |
| `overlay_enabled` | Platform layout |
| `bell_enabled` | Platform layout |
| `email_digest_enabled` | нет |
| `quiet_hours` | нет |
| `retention_days` | нет |

#### Permissions

| Право | Сейчас |
|-------|--------|
| Read own notifications | authenticated user |
| Mark read | recipient self |
| Tenant-scoped view | `notifications.tenant_access` |
| Admin broadcast | нет |

#### Views

| View | Owner |
|------|-------|
| Bell dropdown | Platform |
| Overlay host | Platform |
| Category filter | query param only |
| Target routing | Platform orchestrator |

#### Rules

| Rule | Сейчас |
|------|--------|
| Skip self-notify | service |
| Target payload canonical | `target_context.py` |
| Cross-module targets | Platform registry in manifest |

#### Templates

| Template | Сейчас |
|----------|--------|
| Notification title/message patterns | hardcoded per producer |
| Category → icon mapping | Platform frontend |

---

## Future Module Configuration Audit

### runtime.documents (planned)

Неизбежные tenant settings:

- `default_library_id`, `folder_structure_template`
- `upload_policy`, `max_file_size`, `allowed_mime_types`
- `versioning_policy`, `approval_workflow_enabled`
- `retention_policy`, `external_storage_binding`
- Permissions: upload, delete, approve, share link, library admin
- Views: list/grid/tree, default sort, preview panel
- Rules: naming convention, mandatory metadata fields
- Templates: library skeleton, folder taxonomy, document types catalog

*Сейчас:* `document_libraries` — отдельная подсистема без module config binding.

### runtime.yasii (planned)

- `enabled_surfaces` (embedded, workspace, admin)
- `default_role_persona`, `allowed_tools`, `memory_policy`
- `tenant_facts_enabled`, `retention_for_sessions`
- `rate_limits`, `model_profile_id` (Mixed: platform model catalog)
- Permissions: who can invoke YASII, who can edit tenant memory
- Views: panel layout mode, trace visibility policy
- Rules: PII redaction, scope boundaries (tenant vs user memory)
- Templates: starter prompts, ACE handoff defaults

*Сейчас:* `yasii_tenant_memory` — file-based facts, не module settings table.

### runtime.processes (planned)

- `default_process_catalog`, `enabled_process_types`
- `sla_defaults`, `escalation_policy`
- Permissions: start process, reassign, admin override
- Views: kanban/table/timeline defaults per process type
- Rules: auto-start triggers, completion policies
- Templates: process blueprints from Designer publish

*Сейчас:* Designer Studio routes only; no runtime module config.

### runtime.org_structure (planned)

- `hierarchy_depth_limit`, `sync_source` (manual/HR import)
- `visible_fields`, `manager_chain_rules`
- Permissions: view org chart, edit structure, assign managers
- Views: tree, matrix, department cards
- Rules: single root, circular manager prevention
- Templates: default departments/roles skeleton

*Сейчас:* admin placeholder; `is_tenant_installable: false` in seed.

---

## Configuration Classification Matrix

| Элемент | Platform | Tenant | Mixed |
|---------|----------|--------|-------|
| CorporateChatPage / CorporateCalendarPage | ✓ | | |
| CALENDAR_EVENT_TYPES catalog | ✓ | | |
| Enabled subset of event types | | ✓ | |
| Default calendar view | | ✓ | |
| Last calendar view (session) | | | User UI |
| Week starts on | | ✓ | |
| Working hours | | ✓ | |
| Chat mention/reply rules | ✓ | | ✓ (tenant toggle) |
| Chat admin role | | ✓ | |
| Notification categories registry | ✓ | | |
| Tenant enabled notification categories | | ✓ | |
| Notification target routing | ✓ | | |
| Runtime nav title/icon override | | ✓ | |
| User menu hide/reorder | | | User |
| tenant_modules.enabled | | ✓ | |
| installed_version | | ✓ | |
| Platform module code/components | ✓ | | |
| settings_schema in manifest | ✓ | | ✓ (schema Platform, values Tenant) |
| Video meeting URL placeholder | ✓ | | ✓ (provider config Tenant) |
| File attachment limits | | | ✓ |
| YASII model profiles | ✓ | | ✓ |
| Document library structure | | ✓ | |
| Process blueprints (Designer) | ✓ | | ✓ (publish → tenant) |

---

## Template Propagation Matrix

Цепочка: **DEV → TEMPLATE → CLIENT** (см. `tenant-environment-strategy`, `portals.template_version`, `source_tenant_id`).

| Конфигурация | Наследуется | Причина |
|--------------|-------------|---------|
| Module enabled/disabled defaults | Да | Adoption baseline для новых CLIENT |
| installed_version target | Да | Template фиксирует эталон версии |
| Settings bundle (timezone, default views, policies) | Да | Корпоративный эталон компании |
| Permissions matrix defaults | Да | RBAC эталон |
| Views defaults (calendar view, doc layout) | Да | UX эталон tenant |
| Rules (retention, invite policy) | Да | Compliance baseline |
| Templates (libraries, org skeleton) | Да | Основная ценность Template tenant |
| Navigation menu overrides | Да | Уже tenant-scoped; часть propagation |
| User notification preferences | Нет | Personal |
| User menu preferences | Нет | Personal |
| Chat/event/message entity data | Нет | Operational data |
| Unread counters / last_read | Нет | Runtime state |
| Modal bounds / sidebar collapsed | Нет | UI state |
| YASII session memory | Нет | User/session scoped |
| Platform code / manifest | Нет | Platform release pipeline |

---

## Versioning Analysis

| Конфигурация | Версионируется | Механизм |
|--------------|----------------|----------|
| Tenant module settings bundle | Да | per `installed_version` snapshot |
| Permissions matrix | Да | migration steps in apply |
| Views defaults | Да | schema version in manifest |
| Rules | Да | rule pack version |
| Templates | Да | template_version bump |
| Navigation menu overrides | Частично | reconcile, не module version |
| User preferences | Нет | |
| Entity data | Нет | |
| Unread/read state | Нет | |

---

## Apply Scope Analysis

| Конфигурация | Apply | Rollback |
|--------------|-------|----------|
| Sync `installed_version` | Да | Да |
| Merge manifest `settings_schema` defaults | Да | Да |
| Patch tenant settings keys (additive) | Да | Да |
| Update permissions defaults | Да | Да |
| Refresh view defaults | Да | Да |
| Import/update rule packs | Да | Да |
| Propagate templates (new keys only) | Да | Да (previous snapshot) |
| Reconcile navigation seeds | Да | Частично |
| Rewrite user preferences | Нет | Нет |
| Migrate chat/calendar events | Нет | Нет |
| Platform code deployment | Нет | Нет |

---

## Rollback Analysis

| Конфигурация | Rollback semantics |
|--------------|-------------------|
| Settings bundle | Restore previous `tenant_module_settings` snapshot for module_key + version |
| Permissions | Restore previous matrix; effective after cache invalidation |
| Views defaults | Restore tenant defaults; user session overrides remain |
| Rules | Disable new rules; restore previous rule pack |
| Templates | Remove keys introduced by failed apply; keep pre-apply template refs |
| installed_version | Revert to `from_version` in offer |
| Navigation overrides | Restore menu snapshot if captured in apply transaction |
| Entity data | **Out of scope** — rollback не удаляет события/сообщения |

---

## Canonical Configuration Model

```text
Tenant Module Configuration
├── Settings
│   ├── purpose: tenant-wide behavioral defaults
│   ├── boundary: affects all users unless overridden by user UI state
│   ├── source: tenant_module_settings (future), validated by manifest.settings_schema
│   ├── inheritance: DEV → TEMPLATE → CLIENT clone
│   └── versioning: snapshot per module version apply
├── Permissions
│   ├── purpose: module-local RBAC extensions beyond global tenant roles
│   ├── boundary: enforced in module routers/services
│   ├── source: tenant_module_permissions or settings.permissions JSON
│   ├── inheritance: yes from template
│   └── versioning: yes, with migration map per version
├── Views
│   ├── purpose: tenant default presentation contracts
│   ├── boundary: not session layout; default mode only
│   ├── source: tenant_module_views or settings.views
│   ├── inheritance: yes
│   └── versioning: yes (schema additive)
├── Rules
│   ├── purpose: enforceable business policies
│   ├── boundary: evaluated server-side on mutations
│   ├── source: tenant_module_rules
│   ├── inheritance: yes
│   └── versioning: yes (rule pack id)
└── Templates
    ├── purpose: seed content/structure for module adoption
    ├── boundary: idempotent seed, not live entity edits on rollback
    ├── source: tenant_module_templates + platform template catalog
    ├── inheritance: primary Template tenant payload
    └── versioning: template_version on portals row
```

**Explicit exclusions:** Navigation Layer (`tenant_runtime_menu_settings`) remains adjacent; User prefs; Platform Capability code; operational entities.

---

## Storage Model Recommendation

### Option A — Unified document (recommended MVP)

```text
tenant_module_settings
  tenant_id, module_key, config_version, settings JSONB,
  permissions JSONB, views JSONB, rules JSONB, templates JSONB,
  applied_from_version, snapshot_id, updated_at
```

| Плюсы | Минусы |
|-------|--------|
| Один Apply transaction | Large JSON diffs |
| Simple rollback snapshot | Cross-module queries harder |
| Matches empty settings_schema growth | Fine-grained ACL on sub-blocks harder |

### Option B — Split tables

```text
tenant_module_settings
tenant_module_permissions
tenant_module_views
tenant_module_rules
tenant_module_templates
```

| Плюсы | Минусы |
|-------|--------|
| Clear ownership per block | 5× migrations, joins |
| Independent versioning | Apply orchestration complex |
| Fine-grained audit | Risk of inconsistent partial apply |

### Option C — Hybrid (recommended target)

```text
tenant_module_configurations     — header: tenant_id, module_key, version, snapshot
tenant_module_config_entries     — key, block_type (settings|permissions|views|rules|templates), value JSONB
tenant_module_config_snapshots   — immutable rollback payloads
```

| Плюсы | Минусы |
|-------|--------|
| Normalized + snapshot rollback | More application code |
| Manifest-driven keys | Initial build cost |

**Recommendation:** start **Option A** for Apply MVP; evolve to **Option C** when Marketplace and multi-step rollback require granular audit.

---

## Future Apply Model

When Tenant Configuration Layer exists, **Apply** for version `from → to`:

1. Load active manifest for `to_version` (`settings_schema`, permissions declarations).
2. Diff tenant config vs manifest defaults → compute patch.
3. Write new `tenant_module_settings` snapshot (pre-apply snapshot stored for rollback).
4. Update `tenant_modules.installed_version`.
5. Reconcile navigation seeds if manifest entry_points changed.
6. Run idempotent template seeders (no user data mutation).
7. Invalidate module config cache.

**Apply does not:** deploy platform code, alter user prefs, rewrite entity tables, force-close UI sessions.

**Rollback:** restore last snapshot; revert `installed_version`; optional navigation reconcile; does not delete entities created under new rules.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Confusion Navigation vs Module config | Duplicate keys | Separate `item_key` nav from `module_key` settings |
| settings_schema stays `{}` | Apply remains no-op | Manifest governance gate before version release |
| UI state stored as tenant config | Wrong propagation | Enforce scope standard |
| Template propagation overwrites CLIENT edits | Data loss | Apply = additive keys + explicit override flags |
| Permissions split global vs module | Authorization bugs | Module checks compose with tenant_roles |
| Empty rollback snapshots | Irreversible apply | Mandatory pre-apply snapshot write |

---

## Final Recommendation

1. Introduce **`tenant_module_settings`** (Option A MVP) keyed by `(tenant_id, module_key)`.
2. Populate **`settings_schema`** in manifests for runtime.chat, runtime.calendar, runtime.notifications first.
3. Classify existing persistence: move tenant-wide defaults out of React state / hardcoded constants into Settings; keep session prefs as UI state.
4. Wire **Apply** to: version bump + config patch + snapshot; wire **Rollback** to snapshot restore.
5. Keep **Navigation Layer** separate but include nav reconcile in Apply side-effects.
6. Template propagation: bundle Settings + Permissions + Views + Rules + Templates in TEMPLATE tenant export.

---

## No Code Changes Applied

Read-only audit. No tables, migrations, API, or runtime data mutations.

## Environment Integrity Check

NOT CHECKED — audit-only session.
