# Publication Guard Foundation P1 Report

**Дата:** 2026-06-15  
**Work Item:** Publication Guard Foundation P1 (PG-04, PG-05, PG-06)  
**Предыдущий этап:** P0 (`publication-guard-foundation-p0`, DEV Journal #844)  
**DEV Journal:** #962, slug `publication-guard-foundation-p1`

---

## 1. Executive Summary

Этап P1 закрывает обходы publication guard на уровне **service layer**, **maintenance scripts** и добавляет **audit trail** для легитимного clone bypass.

| WI | Статус | Результат |
|----|--------|-----------|
| PG-04 Service Layer Protection | **DONE** | `guard_direct_structure_write()` подключён ко всем mutating public functions в 17 structure service-модулях |
| PG-05 Maintenance Script Protection | **DONE** | 11 maintenance scripts аудированы; каждый write path имеет `guard_script_structure_write()` или явный `bypass_write_policy=True` в bootstrap/clone/provisioning |
| PG-06 Clone Bypass Audit Trail | **DONE** | `record_tenant_structure_clone_bypass()` → `platform_event_journal_entries`, event `tenant_structure_clone_bypass` |

**Schema changes:** NO  
**Migration:** NO  
**Tests:** `pytest tests/test_publication_guard_foundation_p1.py` — **6 passed**  
**Cleanup:** `cleanup_publication_test_leaks.py --dry-run` → **0 leaks**

---

## 2. PG-04 Results

### Проблема

Router/dependency guards можно обойти прямым вызовом service layer.

### Решение

Новый модуль `app/modules/publication_guard/structure_write_service_guard.py`:

```python
guard_direct_structure_write(db, tenant_id, operation_name, *, bypass_write_policy=False)
```

- DEV → ALLOW  
- Template / Client → DENY (`TenantWriteForbiddenError`)  
- `bypass_write_policy=True` — только для явных clone/provisioning путей

### Поведение

| Tenant type | Direct service call |
|-------------|---------------------|
| DEV | ALLOW |
| TEMPLATE | DENY |
| CLIENT | DENY |

### Тесты

- `test_pg04_service_create_page_allowed_for_dev`
- `test_pg04_service_create_page_forbidden_for_non_dev` (TEMPLATE, CLIENT)

---

## 3. PG-05 Results

### Проблема

Maintenance/backfill scripts могли писать структуру без publication policy.

### Решение

Helper `scripts/structure_write_script_guard.py` → `assert_script_allows_direct_structure_write()`.

### Script Audit

| Script | Operation | Target Tables | Protection |
|--------|-----------|---------------|------------|
| `apply_phase1_restore_fields.py` | restore soft-deleted fields | `designer_field_definitions` | **Option A** guard (TARGET=1 DEV) |
| `apply_phase2_restore_relation_view.py` | create relation + view | `designer_relation_definitions`, `designer_view_definitions` | **Option A** guard |
| `apply_phase3_restore_workspaces.py` | create/update workspaces + tabs | `designer_workspaces`, `designer_workspace_tabs` | **Option A** guard |
| `apply_phase4_restore_navigation.py` | restore/create navigation | `navigation_items` | **Option A** guard |
| `apply_phase5_restore_actions.py` | create actions/forms/placements | `designer_action_*` | **Option A** guard |
| `apply_plan_role_mapping_migration.py` | update view settings + publish | `designer_view_definitions`, snapshots | **Option A** guard (tenant_id=1) |
| `ensure_plan_self_hierarchy_relations.py` | insert relations, update views | `designer_relation_definitions`, `designer_view_definitions` | **Option A** guard (TENANT_ID=1) |
| `normalize_page_statuses.py` | update page status | `pages`, `navigation_items` | **Option A** guard on `--apply` (per tenant) |
| `repair_dev_runtime_navigation_duplicates.py` | reconcile navigation | `navigation_items` | **Option A** guard on `--apply` |
| `repair_istoriya_default_table_projection.py` | update view projection | `designer_view_definitions` | **Option A** guard (TENANT_ID=1) |
| `publish_tenant_catalog_cli.py` | publish catalog | snapshots, publish records | **Option A** guard (refactored to shared helper) |

### Explicit bypass (Option B) — только легитимные сценарии

| Path | Mechanism | Reason |
|------|-----------|--------|
| `clone_tenant_structure()` | `bypass_write_policy=True` (default) | provisioning / template transfer |
| `clone_*_menu_settings()` | `bypass_write_policy` param from clone | structure clone |
| `provision_tenant_runtime_modules()` | `bypass_module_config_write_policy=True` | runtime provisioning during clone |
| `publish_tenant_catalog(..., bypass_write_policy=True)` | explicit flag during clone publish | publication apply after clone |

Все bypass **явно видны** в сигнатурах; скрытых обходов нет.

### Тесты

- `test_pg05_script_guard_blocks_template_direct_write`
- `test_pg05_script_guard_allows_explicit_bypass`

---

## 4. PG-06 Results

### Проблема

Clone — легитимный bypass write policy, но без прозрачного следа.

### Решение

`app/modules/tenant_bootstrap/clone_audit_trail.py`:

- `event_code`: `tenant_structure_clone_bypass`
- `event_category`: `publication_guard`
- Journal: `platform_event_journal_entries` (существующая инфраструктура)

### Metadata

| Field | Source |
|-------|--------|
| source_tenant_id | `CloneTenantStructureResult` |
| target_tenant_id | `CloneTenantStructureResult` |
| actor_user_id | API caller / script |
| reason | `audit_reason` param |
| time | `recorded_at` UTC |
| objects_count | pages, navigation, object_types, workspaces, menu settings |
| catalog_version | publish result |

### API integration

`POST /portals/{id}/clone-structure` передаёт `actor_user_id` и `audit_reason="portal_clone_structure_api"`.

### Тесты

- `test_pg06_clone_bypass_records_audit_trail`

---

## 5. Bypass Inventory

| Bypass | Location | Explicit | Audited |
|--------|----------|----------|---------|
| Structure clone | `clone_tenant_structure(bypass_write_policy=True)` | yes | yes (event journal) |
| Menu settings clone | `clone_*_menu_settings(bypass_write_policy=...)` | yes | via parent clone audit |
| Runtime module provision | `provision_tenant_runtime_modules(bypass_module_config_write_policy=True)` | yes | via clone audit |
| Catalog publish during clone | `publish_tenant_catalog(bypass_write_policy=...)` | yes | metadata.catalog_version |
| Module publication pipeline | separate guards (`publish_source/target`) | yes | P0 |
| Script explicit bypass param | `assert_script_allows_direct_structure_write(bypass_write_policy=True)` | yes | test coverage |

**Implicit bypass:** none identified in P1 scope.

---

## 6. Service Layer Protection Matrix

| Service | Operations guarded | Protection |
|---------|-------------------|------------|
| `pages/service.py` | create, update, delete | yes |
| `sections/service.py` | create, update, delete, move | yes |
| `blocks/service.py` | create, update, delete, move | yes |
| `navigation/service.py` | create, update, delete, move, ensure_designer_system_items | yes |
| `designer/object_types/service.py` | create, update, delete, purge | yes |
| `designer/field_definitions/service.py` | create, update, delete, reorder | yes |
| `designer/relation_definitions/service.py` | create, update, delete | yes |
| `designer/view_definitions/service.py` | all mutating CRUD/reorder/ensure | yes |
| `designer/workspaces/service.py` | all mutating (create/update/delete/publish/archive/ensure) | yes |
| `designer/pages/service.py` | bulk_delete, delete, duplicate | yes |
| `designer/trash/service.py` | restore, purge, cascade | yes |
| `designer/object_types/menu_placements/service.py` | upsert, publish | yes |
| `action_engine/action_definitions/service.py` | create, update, delete | yes |
| `action_engine/action_forms/service.py` | forms + fields CRUD | yes |
| `action_engine/action_placements/service.py` | create, update, delete | yes |
| `runtime/menu_settings/service.py` | tenant-level upsert/bulk/clone (not user prefs) | yes |
| `designer/system_menu_settings/service.py` | upsert/bulk/clone | yes |
| `document_libraries/service.py` | create (P0) | yes (pre-existing) |
| `designer/publish/service.py` | publish (P0) | yes (pre-existing) |

**Business Processes:** отдельная сущность не реализована; Action Engine покрыт.

---

## 7. Clone Audit Trail Verification

| Check | Result |
|-------|--------|
| Event journal entry created | pass (unit test) |
| `event_type=tenant_structure_clone_bypass` | pass |
| `event_category=publication_guard` | pass |
| source/target tenant in metadata | pass |
| `bypass_write_policy=true` in metadata | pass |
| objects_count breakdown | pass |
| API passes actor_user_id | pass (`portals/router.py`) |

---

## 8. Test Data Audit

### Before tests

| Data | Purpose |
|------|---------|
| Ephemeral portals `PubGuard P1 {DEV\|TEMPLATE\|CLIENT} {suffix}` | PG-04/05 tenant type checks |
| Ephemeral pages (via `create_page`) | PG-04 DEV allow test |
| Platform event journal entry (flush only, rollback) | PG-06 audit test |

### After tests

| Data | Status |
|------|--------|
| Test portals | removed via session rollback + committed_test_registry teardown |
| Test pages | rolled back |
| Journal entries from PG-06 test | rolled back (commit=False) |

`cleanup_publication_test_leaks.py --dry-run` post-run: **0 candidates**.

---

## 9. Cleanup Audit

```
Test records created: ephemeral PubGuard P1 portals/pages (in-transaction)
Test records removed: all (rollback + registry teardown)
Remaining test records: 0
Visible in UI: no
Cleanup status: PASSED
```

---

## 10. Demo Environment Audit

| Check | Result |
|-------|--------|
| DEV exists (id=1) | yes |
| Template exists (id=2) | yes |
| Розетка exists (id=21) | yes |
| Platform Owner exists (`zmn8@ya.ru`) | yes |
| Platform Owner `tenant_id` | **NULL** |

Protected tenants не затронуты.

---

## 11. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Новые service write functions без guard | medium | Code review checklist; follow `publication_guard` import pattern |
| Новые maintenance scripts без guard | medium | Require `guard_script_structure_write()` in script template |
| Clone audit only on successful clone | low | Acceptable; failed clones rollback without audit noise |
| Business Processes entity absent | low | Track separately when BP module lands |
| Manual UI smoke not executed in CI | low | Operator smoke: DEV edit OK, Template/Client blocked, clone logged |

---

## 12. Recommendations

1. **P2:** Extend guards to any new structure writers (process definitions when implemented).
2. Add pre-commit or analyzer check: mutating service function must call `guard_direct_structure_write`.
3. Document `bypass_write_policy` contract in `tenant_write_policy.py` module docstring.
4. Optional: surface `tenant_structure_clone_bypass` events in Control Plane audit UI filter.
5. Run manual smoke in DEV/Template UI before demo.

---

## Architecture Audit

| Question | Result |
|----------|--------|
| Source of Truth сохранён? | **Pass** — policy in `tenant_write_policy.py` |
| Нет дублирования логики? | **Pass** — single guard helpers |
| Новые сущности обоснованы? | **Pass** — `publication_guard` package only |
| Tenant/user архитектура? | **Pass** |
| Display-поля не как id/protection? | **Pass** |

## Data Impact Audit

```
Tables affected: platform_event_journal_entries (runtime audit entries only during clone API usage)
Schema changes: NO
Migration: NO
Destructive operation: none
Protected rows touched: none (tests rolled back)
```

## Tests

```
pytest tests/test_publication_guard_foundation_p1.py -q → 6 passed
```

## Manual Smoke

```
Status: NOT PERFORMED
Reason: automated guard tests cover service/script/audit paths; UI verification deferred to operator
Recommended steps:
  1. DEV — create/edit page → success
  2. Template — direct structure edit → blocked (403)
  3. Client — direct structure edit → blocked (403)
  4. Clone structure → event journal entry tenant_structure_clone_bypass
```

## DEV Journal

| Поле | Значение |
|------|----------|
| Created | yes |
| id | 962 |
| slug | publication-guard-foundation-p1 |
| tenant_id | 1 (DEV) |
| journal_kind | dev_development |

## Success Criteria

| Criterion | Status |
|-----------|--------|
| PG-04 completed | yes |
| PG-05 completed | yes |
| PG-06 completed | yes |
| service layer protected | yes |
| all maintenance scripts audited | yes |
| all bypasses explicit | yes |
| clone audit trail works | yes |
| tests passed | yes |
| remaining_test_records = 0 | yes |
| visible_test_records = 0 | yes |
| DEV / Template / Розетка / Owner intact | yes |
| Schema changes = NO | yes |
| DEV Journal created | yes |

**Вердикт: DONE**
