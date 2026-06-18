# Canonical Module Settings Schemas

```yaml
slug: canonical-module-settings-schemas
type: architecture_audit
version: "1.0"
status: accepted-design
date: 2026-06-14
scope: read-only design (no manifest/code changes)
authority: YASNOPRO Platform Architecture
depends_on:
  - canonical-tenant-module-configuration-architecture
  - canonical-tenant-module-settings-architecture
related_code:
  - backend/app/modules/platform_modules/manifest_constants.py
  - backend/app/modules/platform_modules/constants.py
```

---

## Executive Summary

Определён канонический состав **`manifest.settings_schema`** для семи модулей ЯсноПро. Схема — не плоский JSON `{}`, а **структурированный контракт из пяти блоков**:

```json
{
  "schema_version": "1.0.0",
  "module_key": "runtime.calendar",
  "blocks": {
    "settings": { "fields": {}, "defaults": {} },
    "permissions": { "roles": [], "actions": {}, "defaults": {} },
    "views": { "fields": {}, "defaults": {} },
    "rules": { "fields": {}, "defaults": {} },
    "templates": { "seed_catalog": [], "defaults": {} }
  }
}
```

**Роли permissions matrix:** `user`, `admin`, `superadmin` (см. `tenant_roles.constants`).

**Статус manifests сегодня:** `settings_schema: {}` для chat, calendar, notifications — **блокирует** tenant_module_configurations, Apply, Rollback, Diff, Preview.

**Приоритет реализации:** calendar → chat → notifications → documents → yasii → processes → org_structure.

---

## Schema Envelope (Canonical)

Каждый `settings_schema` в manifest MUST содержать:

| Key | Purpose |
|-----|---------|
| `schema_version` | Semver revision схемы (не module_version) |
| `module_key` | Дублирует FK для validation |
| `blocks.settings` | Field defs + defaults |
| `blocks.permissions` | Actions × roles + defaults matrix |
| `blocks.views` | Tenant view defaults |
| `blocks.rules` | Server-enforced policies |
| `blocks.templates` | Idempotent seed catalog |

Field definition shape:

```json
{
  "type": "boolean|string|integer|enum|time|object|array",
  "required": true,
  "default": "...",
  "owner": "Platform|Template|Tenant",
  "apply": true,
  "validation": { "min": 0, "max": 100, "enum": [], "pattern": "" }
}
```

---

## 1. Chat Schema (`runtime.chat`)

**Complexity:** Medium | **Manifest readiness:** Готов к реализации (MVP v1.0.0)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `direct_chat_enabled` | boolean | yes | `true` | Platform |
| `group_chat_enabled` | boolean | yes | `true` | Platform |
| `allow_external_participants` | boolean | yes | `false` | Tenant |
| `max_participants_per_chat` | integer | no | `100` | Tenant |
| `attachments_enabled` | boolean | yes | `true` | Tenant |
| `max_attachments_per_message` | integer | no | `10` | Platform |
| `max_attachment_size_mb` | integer | no | `25` | Mixed (Platform cap, Tenant value) |
| `mentions_enabled` | boolean | yes | `true` | Tenant |
| `reactions_enabled` | boolean | yes | `true` | Tenant |
| `replies_enabled` | boolean | yes | `true` | Platform |
| `message_edit_window_minutes` | integer | no | `null` (unlimited) | Tenant |
| `message_delete_window_minutes` | integer | no | `null` | Tenant |
| `retention_days` | integer | no | `null` | Tenant |
| `default_chat_type` | enum | yes | `"group"` | Platform |
| `auto_add_on_mention` | boolean | yes | `true` | Tenant |

`default_chat_type` enum: `direct`, `group`.

### Permissions (actions × roles)

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `create_chat` | ✓ | ✓ | ✓ |
| `create_direct_chat` | ✓ | ✓ | ✓ |
| `delete_chat` | ✗ | ✓* | ✓ |
| `edit_chat_metadata` | ✗ | ✓* | ✓ |
| `manage_participants` | ✗ | ✓* | ✓ |
| `send_message` | ✓** | ✓ | ✓ |
| `edit_own_message` | ✓ | ✓ | ✓ |
| `delete_own_message` | ✓ | ✓ | ✓ |
| `delete_others_messages` | ✗ | ✗ | ✓ |
| `manage_module_settings` | ✗ | ✓ | ✓ |

\* chat admin OR tenant admin (composition) — MVP: chat admin for entity; module matrix for tenant-wide.  
\** participant only.

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_layout` | enum | yes | `"sidebar"` | Tenant |
| `show_unread_counters` | boolean | yes | `true` | Tenant |
| `show_user_status` | boolean | no | `false` | Tenant |
| `sidebar_sort_default` | enum | no | `"recent"` | Tenant |
| `composer_attachments_visible` | boolean | yes | `true` | Tenant |

`default_layout` enum: `sidebar`, `compact`.  
`sidebar_sort_default` enum: `recent`, `alphabetical`, `pinned_first`.

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `participants_must_belong_to_tenant` | boolean | yes | `true` | Platform |
| `exclude_hidden_users_from_search` | boolean | yes | `true` | Platform |
| `allow_external_mentions` | boolean | yes | `false` | Tenant |
| `allow_cross_tenant_chat` | boolean | yes | `false` | Platform |
| `require_real_name` | boolean | no | `false` | Tenant |
| `mention_triggers_notification` | boolean | yes | `true` | Tenant |
| `reply_triggers_notification` | boolean | yes | `true` | Tenant |

### Templates (seed_catalog)

| seed_key | kind | Description |
|----------|------|-------------|
| `chat.welcome_room` | entity_template | Общий чат компании |
| `chat.support_room` | entity_template | Чат поддержки |
| `chat.announcement_room` | entity_template | Объявления (read-heavy policy via rules) |

Payload shape: `{ title, type, participant_role_ids?, is_system? }`.

---

## 2. Calendar Schema (`runtime.calendar`)

**Complexity:** Medium | **Manifest readiness:** Готов к реализации (MVP v1.0.0)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_view` | enum | yes | `"week"` | Tenant |
| `week_starts_on` | enum | yes | `"monday"` | Tenant |
| `timezone` | string | yes | `"Europe/Moscow"` | Tenant |
| `working_hours` | object | no | `{start:"09:00",end:"18:00"}` | Tenant |
| `working_days` | array | no | `[1,2,3,4,5]` | Tenant |
| `default_event_duration_minutes` | integer | yes | `60` | Tenant |
| `default_reminder_offsets_minutes` | array | no | `[15,60]` | Tenant |
| `enabled_event_types` | array | yes | all Platform types | Mixed |
| `invite_policy` | enum | yes | `"notify_all"` | Tenant |
| `video_meeting_enabled` | boolean | yes | `false` | Tenant |
| `video_meeting_provider` | enum | no | `null` | Mixed |
| `auto_create_event_chat_default` | boolean | yes | `false` | Tenant |

Enums:  
- `default_view`: `day`, `week`, `month`, `list`  
- `week_starts_on`: `monday`, `sunday`  
- `invite_policy`: `notify_all`, `creator_only`, `disabled`  
- `video_meeting_provider`: `placeholder`, `external_url` (future providers)  
- `enabled_event_types`: subset of Platform `CALENDAR_EVENT_TYPES`

### Permissions

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `create_event` | ✓ | ✓ | ✓ |
| `edit_own_event` | ✓ | ✓ | ✓ |
| `edit_others_events` | ✗ | ✓ | ✓ |
| `delete_own_event` | ✓ | ✓ | ✓ |
| `delete_others_events` | ✗ | ✓ | ✓ |
| `invite_participants` | ✓ | ✓ | ✓ |
| `respond_to_invite` | ✓ | ✓ | ✓ |
| `manage_calendar_settings` | ✗ | ✓ | ✓ |

Aligns with `can_edit_calendar_event` (creator OR admin/superadmin).

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `enabled_views` | array | yes | `["day","week","month"]` | Tenant |
| `default_view` | enum | yes | `"week"` | Tenant |
| `show_mini_month_sidebar` | boolean | yes | `true` | Tenant |
| `show_event_type_filter` | boolean | yes | `true` | Tenant |
| `list_page_size` | integer | no | `50` | Tenant |

Note: `default_view` duplicated in settings/views intentionally — settings = behavior default, views = presentation contract (same value, validated in sync).

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `allow_external_invites` | boolean | yes | `false` | Tenant |
| `require_invite_response` | boolean | no | `false` | Tenant |
| `allow_overlap` | boolean | yes | `true` | Tenant |
| `participants_must_belong_to_tenant` | boolean | yes | `true` | Platform |
| `end_must_be_after_start` | boolean | yes | `true` | Platform |
| `max_participants_per_event` | integer | no | `null` | Tenant |

### Templates

| seed_key | kind | Payload highlights |
|----------|------|-------------------|
| `calendar.meeting` | event_preset | type=meeting, duration=60 |
| `calendar.standup` | event_preset | type=standup, duration=15 |
| `calendar.vacation` | event_preset | type=reminder, all-day |
| `calendar.business_trip` | event_preset | type=site_visit |

---

## 3. Notifications Schema (`runtime.notifications`)

**Complexity:** Medium–High | **Manifest readiness:** Готов к реализации (MVP v1.0.0)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `enabled_categories` | array | yes | all Platform categories | Tenant |
| `enabled_target_types` | array | yes | manifest targets | Mixed |
| `default_priority` | enum | yes | `"normal"` | Tenant |
| `digest_enabled` | boolean | yes | `false` | Tenant |
| `digest_schedule_cron` | string | no | `null` | Tenant |
| `quiet_hours` | object | no | `null` | Tenant |
| `delivery_channels` | array | yes | `["in_app"]` | Tenant |
| `overlay_enabled` | boolean | yes | `true` | Tenant |
| `bell_enabled` | boolean | yes | `true` | Tenant |
| `retention_days` | integer | no | `90` | Tenant |
| `batch_mark_read_enabled` | boolean | yes | `true` | Platform |

`enabled_categories`: comments, tasks, documents, workflow, system, processes, calendar (add calendar for runtime.calendar invites).  
`delivery_channels`: `in_app`, `email` (future), `push` (future).  
`quiet_hours`: `{ enabled, start, end, timezone }`.

### Permissions

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `read_own` | ✓ | ✓ | ✓ |
| `mark_read_own` | ✓ | ✓ | ✓ |
| `mark_all_read_own` | ✓ | ✓ | ✓ |
| `broadcast_tenant` | ✗ | ✓ | ✓ |
| `manage_module_settings` | ✗ | ✓ | ✓ |
| `view_delivery_logs` | ✗ | ✗ | ✓ |

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_category_filter` | enum | no | `null` (all) | User*** |
| `group_by_date` | boolean | yes | `true` | Tenant |
| `show_priority_badges` | boolean | yes | `true` | Tenant |
| `overlay_auto_open` | boolean | yes | `true` | Tenant |
| `max_visible_in_bell` | integer | no | `20` | Tenant |

\*** `default_category_filter` — User UI if persisted; omit from tenant_module_configurations MVP or store as tenant default only.

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `skip_self_notify` | boolean | yes | `true` | Platform |
| `respect_quiet_hours` | boolean | yes | `false` | Tenant |
| `dedupe_window_seconds` | integer | no | `60` | Platform |
| `require_target_payload` | boolean | yes | `true` | Platform |
| `allow_critical_during_quiet` | boolean | yes | `true` | Tenant |

### Templates

| seed_key | kind | Description |
|----------|------|-------------|
| `notifications.category_enablement` | reference | Default enabled categories bundle |
| `notifications.system_welcome` | notification_template | One-time tenant welcome (optional) |

---

## 4. Documents Schema (`runtime.documents`)

**Complexity:** High | **Manifest readiness:** Требует уточнения (split document_library vs runtime module)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_library_key` | string | no | `null` | Tenant |
| `versioning_policy` | enum | yes | `"none"` | Tenant |
| `approval_required` | boolean | yes | `false` | Tenant |
| `retention_policy_days` | integer | no | `null` | Tenant |
| `allowed_extensions` | array | yes | Platform list | Mixed |
| `max_file_size_mb` | integer | yes | `50` | Mixed |
| `max_files_per_upload_batch` | integer | no | `20` | Platform |
| `virus_scan_required` | boolean | no | `false` | Platform |
| `watermark_enabled` | boolean | no | `false` | Tenant |
| `external_storage_binding` | string | no | `null` | Tenant |

`versioning_policy`: `none`, `major_minor`, `full_history`.

### Permissions

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `view_documents` | ✓ | ✓ | ✓ |
| `upload` | ✓ | ✓ | ✓ |
| `delete_own` | ✓ | ✓ | ✓ |
| `delete_any` | ✗ | ✓ | ✓ |
| `approve` | ✗ | ✓ | ✓ |
| `share_external_link` | ✗ | ✗ | ✓ |
| `manage_libraries` | ✗ | ✓ | ✓ |
| `manage_module_settings` | ✗ | ✓ | ✓ |

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_layout` | enum | yes | `"tree"` | Tenant |
| `enabled_layouts` | array | yes | `["tree","list"]` | Tenant |
| `show_metadata_panel` | boolean | yes | `true` | Tenant |
| `preview_inline` | boolean | yes | `true` | Tenant |

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `naming_convention_regex` | string | no | `null` | Tenant |
| `mandatory_metadata_fields` | array | no | `[]` | Tenant |
| `block_duplicate_filenames` | boolean | yes | `true` | Tenant |
| `require_approval_before_publish` | boolean | yes | `false` | Tenant |

### Templates

| seed_key | kind |
|----------|------|
| `documents.root_folders` | folder_taxonomy |
| `documents.contracts_library` | library_skeleton |
| `documents.hr_library` | library_skeleton |

**Clarification needed:** map to existing `document_libraries` tables vs new runtime entry.

---

## 5. Processes Schema (`runtime.processes`)

**Complexity:** High | **Manifest readiness:** Требует уточнения (Designer-only today)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_sla_hours` | integer | no | `72` | Tenant |
| `escalation_policy` | object | no | `null` | Tenant |
| `auto_start_rules` | array | no | `[]` | Tenant |
| `approval_chain_default` | array | no | `[]` | Tenant |
| `enabled_process_types` | array | yes | `[]` | Template |
| `allow_parallel_instances` | boolean | yes | `true` | Tenant |
| `notify_on_completion` | boolean | yes | `true` | Tenant |

### Permissions

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `start_process` | ✓ | ✓ | ✓ |
| `view_own_tasks` | ✓ | ✓ | ✓ |
| `reassign_task` | ✗ | ✓ | ✓ |
| `cancel_process` | ✗ | ✓ | ✓ |
| `design_processes` | ✗ | ✓* | ✓ |
| `manage_module_settings` | ✗ | ✓ | ✓ |

\* designer role composition — future.

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_task_view` | enum | yes | `"list"` | Tenant |
| `enabled_task_views` | array | yes | `["list","kanban"]` | Tenant |
| `show_sla_indicators` | boolean | yes | `true` | Tenant |

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `require_comment_on_reject` | boolean | yes | `true` | Tenant |
| `auto_complete_when_all_tasks_done` | boolean | yes | `true` | Platform |
| `max_open_instances_per_user` | integer | no | `null` | Tenant |

### Templates

| seed_key | kind |
|----------|------|
| `processes.onboarding` | process_blueprint |
| `processes.approval_simple` | process_blueprint |
| `processes.incident` | process_blueprint |

Source: Designer publish catalog — **integration TBD**.

---

## 6. Org Structure Schema (`runtime.org_structure`)

**Complexity:** Medium | **Manifest readiness:** Не определён (`is_tenant_installable: false`)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `hierarchy_depth_limit` | integer | no | `10` | Tenant |
| `sync_source` | enum | yes | `"manual"` | Tenant |
| `sync_schedule_cron` | string | no | `null` | Tenant |
| `visible_fields` | array | yes | `["full_name","position","department"]` | Tenant |
| `show_avatars` | boolean | yes | `true` | Tenant |

`sync_source`: `manual`, `hr_import`, `api` (future).

### Permissions

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `view_org_chart` | ✓ | ✓ | ✓ |
| `edit_structure` | ✗ | ✗ | ✓ |
| `assign_manager` | ✗ | ✓ | ✓ |
| `manage_module_settings` | ✗ | ✗ | ✓ |

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_view` | enum | yes | `"tree"` | Tenant |
| `enabled_views` | array | yes | `["tree","cards"]` | Tenant |
| `expand_depth_default` | integer | no | `2` | Tenant |

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `single_root_required` | boolean | yes | `true` | Platform |
| `prevent_circular_managers` | boolean | yes | `true` | Platform |
| `visibility_rules` | object | no | `{}` | Tenant |

### Templates

| seed_key | kind |
|----------|------|
| `org.departments_default` | department_templates |
| `org.positions_default` | position_templates |
| `org.executive_branch` | department_templates |

---

## 7. YASII Schema (`runtime.yasii`)

**Complexity:** High | **Manifest readiness:** Требует уточнения (file-based tenant memory today)

### Settings

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `enabled_surfaces` | array | yes | `["embedded"]` | Tenant |
| `enabled_tools` | array | yes | Platform catalog subset | Mixed |
| `memory_policy` | enum | yes | `"session_and_tenant_facts"` | Tenant |
| `allowed_models` | array | yes | Platform allowlist | Mixed |
| `default_model_profile_id` | string | yes | Platform default | Mixed |
| `rate_limits` | object | yes | Platform defaults | Mixed |
| `safety_policy` | enum | yes | `"standard"` | Platform |
| `context_policy` | object | yes | `{ max_tokens: 8192 }` | Mixed |
| `trace_visible_to_users` | boolean | yes | `false` | Tenant |
| `tenant_facts_enabled` | boolean | yes | `true` | Tenant |

`safety_policy`: `strict`, `standard`, `permissive` (Platform-defined behavior).  
`memory_policy`: `session_only`, `session_and_tenant_facts`, `disabled`.  
`enabled_surfaces`: `embedded`, `workspace`, `admin`.

### Permissions

| Action | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| `invoke_yasii` | ✓ | ✓ | ✓ |
| `view_trace` | ✗ | ✓ | ✓ |
| `edit_tenant_memory` | ✗ | ✓ | ✓ |
| `manage_module_settings` | ✗ | ✓ | ✓ |
| `configure_tools` | ✗ | ✗ | ✓ |

### Views

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `default_panel_layout` | enum | yes | `"embedded"` | Tenant |
| `show_source_labels` | boolean | yes | `true` | Tenant |
| `composer_placeholder` | string | no | Platform i18n | Mixed |

### Rules

| Field | Type | Required | Default | Owner |
|-------|------|----------|---------|-------|
| `pii_redaction_enabled` | boolean | yes | `true` | Platform |
| `block_cross_tenant_context` | boolean | yes | `true` | Platform |
| `max_session_turns` | integer | no | `50` | Platform |
| `require_admin_for_memory_delete` | boolean | yes | `true` | Tenant |

### Templates

| seed_key | kind |
|----------|------|
| `yasii.starter_prompts` | prompt_pack |
| `yasii.tenant_facts_bootstrap` | tenant_fact_seeds |
| `yasii.ace_handoff_defaults` | reference |

---

## 8. Validation Rules (Cross-Module)

### Time fields

| Field pattern | Format | Range |
|---------------|--------|-------|
| `working_hours.start/end` | `HH:mm` | `00:00`–`23:59`, start < end |
| `quiet_hours.start/end` | `HH:mm` | same |
| `timezone` | IANA string | valid tz database id |

### Integer bounds

| Field pattern | Min | Max |
|---------------|-----|-----|
| `retention_days` | 1 | 3650 |
| `max_participants_per_chat` | 2 | 500 |
| `max_file_size_mb` | 1 | Platform cap |
| `message_edit_window_minutes` | 0 | 10080 (7d) |
| `default_event_duration_minutes` | 5 | 1440 |
| `hierarchy_depth_limit` | 1 | 50 |

### Enums (shared)

| Enum | Values |
|------|--------|
| `week_starts_on` | monday, sunday |
| `default_priority` | low, normal, high, critical |
| `calendar.default_view` | day, week, month, list |

### Array rules

- `enabled_event_types` ⊆ Platform `CALENDAR_EVENT_TYPES`
- `enabled_categories` ⊆ Platform notification categories + `calendar`
- `delivery_channels` ⊆ `{ in_app, email, push }`
- No duplicate array entries

### Permissions matrix validation

- Every action MUST define boolean for each role in `{ user, admin, superadmin }`
- Unknown action keys rejected on write
- Platform-locked actions (`participants_must_belong_to_tenant` enforcement) cannot be disabled via permissions

### Templates validation

- `seed_key` unique within module
- `kind` ∈ `{ entity_template, event_preset, reference, folder_taxonomy, library_skeleton, process_blueprint, prompt_pack, tenant_fact_seeds, notification_template }`
- Payload MUST NOT contain live entity ids

---

## 9. Ownership Matrix (Consolidated)

| Pattern | Owner |
|---------|-------|
| Schema structure, enum catalogs | Platform |
| Platform caps (max file size ceiling) | Platform |
| Manifest defaults | Platform |
| TEMPLATE bundle values | Template |
| Tenant admin overrides | Tenant |
| last_selected_* , pinned order | User |
| Entity rows | Entity |

---

## 10. Complexity Matrix

| Module | Complexity | Rationale |
|--------|------------|-----------|
| runtime.chat | **Medium** | Many toggles; permissions split chat-admin vs tenant |
| runtime.calendar | **Medium** | Timezone/types/views; aligns with existing MVP |
| runtime.notifications | **Medium–High** | Categories × channels × quiet hours |
| runtime.documents | **High** | Libraries, approval, retention, legacy split |
| runtime.processes | **High** | Designer integration, SLA, blueprints |
| runtime.org_structure | **Medium** | Tree rules; module not installable yet |
| runtime.yasii | **High** | Models, memory, safety, Platform mixed ownership |

---

## 11. Apply / Rollback / Diff / Preview Matrix

Block-level (all modules):

| Block | Apply | Rollback | Diff | Preview |
|-------|:-----:|:--------:|:----:|:-------:|
| settings | ✓ | ✓ | ✓ | ✓ |
| permissions | ✓ | ✓ | ✓ | ✓ |
| views | ✓ | ✓ | ✓ | ✓ |
| rules | ✓ | ✓ | ✓ | ✓ |
| templates | ✓ (additive seeds) | ✓ | ✓ | ✓ |

Field-level exceptions:

| Field | Apply | Rollback | Diff | Preview | Note |
|-------|:-----:|:--------:|:----:|:-------:|------|
| Platform-locked rules (`allow_cross_tenant_chat`) | defaults only | ✓ | ✓ | ✓ | tenant cannot disable |
| `max_attachment_size_mb` | ✓ | ✓ | ✓ | ✓ | capped by Platform |
| User-scoped view fields | ✗ | ✗ | ✗ | ✗ | excluded from schema |
| Applied seed runtime keys | ✗ | partial | ✓ | ✓ | rollback does not delete entities |

---

## 12. Manifest Readiness Matrix

| Module | Status | Blockers |
|--------|--------|----------|
| runtime.chat | **Готов к реализации** | Wire permissions to `ensure_chat_admin` |
| runtime.calendar | **Готов к реализации** | Move view default from React state |
| runtime.notifications | **Готов к реализации** | Add `calendar` category |
| runtime.documents | **Требует уточнения** | document_library boundary |
| runtime.processes | **Требует уточнения** | Designer publish contract |
| runtime.org_structure | **Не определён** | Module not installable; admin placeholder |
| runtime.yasii | **Требует уточнения** | Migrate file memory to config layer |

---

## Recommended Implementation Order

1. **Define envelope + validation library** (shared, no DB)
2. **runtime.calendar** schema v1.0.0 — smallest behavioral gap vs code
3. **runtime.chat** schema v1.0.0
4. **runtime.notifications** schema v1.0.0
5. Populate manifests (`settings_schema` only — seed update)
6. **tenant_module_configurations** persistence
7. Diff generator → Preview `affected_*`
8. Apply/Rollback with snapshots
9. Planned modules after boundary decisions (documents, yasii, processes, org)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Schema drift from code | Manifest keys = code constants registry |
| Duplicate keys settings vs views | validation: `default_view` must match |
| documents vs document_library | ADR before schema v1 |
| YASII Platform/Tenant mixed fields | explicit `owner` on each field |
| Over-large schemas block MVP | phase v1 = required fields only; v1.1 additive |

---

## Final Recommendation

1. Adopt **five-block settings_schema envelope** with `schema_version` per module.
2. Ship **MVP schemas v1.0.0** for chat, calendar, notifications first.
3. Every field MUST declare: type, required, default, owner, apply participation.
4. Permissions matrix MUST use roles `user`, `admin`, `superadmin`.
5. Do not populate manifests until **validation rules** and **readiness** signed off per module.
6. Preview/Apply MUST reject writes when `settings_schema` empty or `schema_version` incompatible.

---

## No Code Changes Applied

Design only. Manifests, code, tables, migrations unchanged.

## Environment Integrity Check

NOT CHECKED — design-only session.
