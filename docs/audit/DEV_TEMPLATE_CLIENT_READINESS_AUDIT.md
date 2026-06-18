# DEV → Template → Client Readiness Audit

**Дата:** 2026-06-15  
**Тип:** read-only аудит готовности (без изменений кода и данных)  
**Контекст:** после Publication Guard Foundation P0/P1 и исправления Cleanup vs UI  
**Источник Companies UI:** `GET /control-plane/tenants` → `list_tenant_registry()` → `portals`

---

## 1. Executive Summary

### Главный вопрос

> Можно ли уже сейчас принять правило: «любая разработка только в DEV; Template и Client получают изменения только через публикации»?

**Ответ:** **частично**.

| Слой | Вердикт |
|------|---------|
| Защита от прямой разработки в Template/Client (structure) | **В основном да** — P0/P1 закрыли HTTP, service, scripts |
| Публикация **конфигураций модулей** DEV → Template → Client | **Да, MVP готов** |
| Публикация **структуры** (pages, objects, views, …) DEV → Template → Client | **Нет** — используется **clone/bootstrap**, не publication pipeline |
| Полное правило без оговорок | **Пока нет** |

### Финальный вердикт

```text
READY WITH RISKS
```

### Процент готовности к модели

```text
DEV → Publication → Template → Publication → Client

Общая готовность: ~72%

  Write Protection (structure)     ~92%
  Module Config Publication        ~85%
  Structure Publication Pipeline   ~15%  (clone вместо publication)
  Journal & Audit completeness     ~70%
  Rollback completeness            ~55%
  Demo / operational readiness     ~80%
```

---

## 2. Write Protection Matrix

Политика: `tenant_write_policy.py` — `assert_tenant_allows_direct_structure_write` / `guard_direct_structure_write` разрешают прямую запись **только** при `tenant_type == DEV`.

| Канал изменения | DEV | Template | Client | Guard | Статус |
|-----------------|-----|----------|--------|-------|--------|
| **API — Designer** (`/designer/tenants/{id}/…`) | ALLOW | DENY | DENY | `enforce_dev_direct_structure_write_for_mutating_requests` | OK |
| **API — Pages/Sections/Blocks** | ALLOW | DENY | DENY | `require_dev_direct_structure_write_portal` + service guard | OK |
| **API — Navigation** (mutating) | ALLOW | DENY | DENY | router dep + `guard_direct_structure_write` | OK |
| **API — Navigation** (GET designer scope side-effect) | ALLOW | DENY | DENY | `ensure_designer_system_items` + service guard (P0) | OK |
| **API — Document Libraries** | ALLOW | DENY | DENY | `assert_tenant_allows_direct_structure_write` (P0) | OK |
| **API — Runtime menu settings** (tenant-level) | ALLOW | DENY | DENY | router dep + service guard | OK |
| **Service Layer** (17 structure services) | ALLOW | DENY | DENY | `guard_direct_structure_write` (P1) | OK |
| **Designer publish** (`publish_tenant_catalog`) | ALLOW | DENY | DENY | `assert_tenant_allows_direct_structure_write` / `bypass_write_policy` | OK |
| **Module config direct write** | ALLOW | DENY | DENY | `assert_tenant_allows_direct_module_config_write` (P0) | OK |
| **Module config publication apply** | N/A | via publish | via apply | `publish_source/target`, `apply_target` | OK |
| **Clone structure** | source | **bypass** | **bypass** | `bypass_write_policy=True` + audit (P1) | Controlled bypass |
| **Provisioning / portal create** | N/A | source | **bypass** (bootstrap) | `clone_tenant_structure` from Template id=2 | Controlled bypass |
| **Maintenance scripts** | ALLOW (DEV) | DENY | DENY | `guard_script_structure_write` (P1) | OK |
| **Backfill** (module config) | ALLOW | DENY | DENY | `assert_tenant_allows_direct_module_config_write` | OK |
| **Runtime data** (entities, notes, chats) | ALLOW | ALLOW | ALLOW | membership / RBAC (не structure) | By design |

### Детализация по сущностям

| Сущность | Router guard | Service guard | Template blocked | Client blocked |
|----------|--------------|---------------|------------------|----------------|
| Pages | yes | yes | yes | yes |
| Sections / Blocks | yes | yes | yes | yes |
| Navigation | yes | yes | yes | yes |
| Object Types | yes (designer) | yes | yes | yes |
| Fields | yes | yes | yes | yes |
| Relations | yes | yes | yes | yes |
| Views | yes | yes | yes | yes |
| Workspaces | yes | yes | yes | yes |
| Forms / Actions / Placements | yes | yes | yes | yes |
| Menu Settings (tenant) | yes | yes | yes | yes |
| Document Libraries | yes | yes | yes | yes |
| Designer catalog publish | yes | yes | yes | yes |
| Business Processes | N/A | N/A | N/A | N/A (не реализованы) |

---

## 3. Publication Pipeline Readiness

### 3.1 DEV → Template (module configuration)

| Этап | Реализация | Статус |
|------|------------|--------|
| Создание публикации | `create_publication` → `platform_module_publications` | **READY** |
| Проверка / review | submit → start_review → approve/reject | **READY** |
| Применение | `publish_publication_to_template` → `_apply_snapshot_to_template` | **READY** |
| Guards | `assert_tenant_allows_publish_source` (DEV), `publish_target` (TEMPLATE) | **READY** |
| Откат | нет dedicated rollback publication→template | **MISSING** |
| Журналирование | запись в `platform_module_publications`; **нет** `platform_event_journal` на publish | **PARTIAL** |
| Тесты | `test_dev_to_template_module_publication_pipeline_mvp.py`, P0 PG-01 | **READY** |

### 3.2 Template → Client (module configuration)

| Этап | Реализация | Статус |
|------|------------|--------|
| Генерация offers | `_generate_client_offers_from_publication` при publish | **READY** |
| Preview / diff | `tenant_module_update_previews`, `tenant_module_configuration_diffs` | **READY** |
| Apply | `apply_module_configuration_update` + `assert_tenant_allows_apply_target` | **READY** |
| Rollback | `rollback_module_configuration` + `assert_tenant_allows_rollback_target` | **READY** |
| Журналирование apply/rollback | `record_tenant_event` → tenant journal | **READY** |
| Тесты | apply/rollback MVP tests, full pipeline test | **READY** |

### 3.3 DEV → Template → Client (structure)

| Этап | Реализация | Статус |
|------|------------|--------|
| Structure publication DEV → Template | **не реализовано** | **MISSING** |
| Structure publication Template → Client | **не реализовано** | **MISSING** |
| Фактический механизм структуры | `clone_tenant_structure` (Template→Client при provisioning) | **Parallel path** |
| Designer `publish_tenant_catalog` | draft → snapshot **внутри одного tenant** | **Not cross-tenant** |

---

## 4. Source of Truth Audit

### Существует ли способ обойти публикацию и изменить Template/Client напрямую?

**Для structure (pages, objects, navigation, …):** прямой обход **заблокирован** для обычных API/service/script путей.

**Легитимные controlled bypass (не publication):**

| Механизм | Template напрямую | Client напрямую | Комментарий |
|----------|-------------------|-----------------|-------------|
| API (designer/pages/nav/…) | **Нет** | **Нет** | guards P0/P1 |
| Service layer | **Нет** | **Нет** | `guard_direct_structure_write` |
| Scripts (без bypass) | **Нет** | **Нет** | `guard_script_structure_write` |
| **Clone** (`bypass_write_policy=True`) | **Да** (platform admin) | **Да** (platform admin / bootstrap) | audit trail P1 |
| **Provisioning** (portal create) | N/A | **Да** (clone from Template) | by design |
| **Module publication** | **Да** (единственный штатный путь config) | через offers→apply | by design |
| **Backfill** (module config) | **Нет** (guard) | **Нет** (guard) | DEV only |
| Manual admin (Studio publish catalog) | **Нет** (structure guard) | **Нет** | DEV only |
| Raw SQL / DB admin | **Да** | **Да** | operational risk, вне scope кода |

**Вывод:** для прикладного кода **нет скрытого** обхода structure guard. Есть **явные** bypass: clone и provisioning.

---

## 5. Rollback Readiness

| Сценарий | Можно откатить | Журнал | Аудит | Тесты |
|----------|----------------|--------|-------|-------|
| **DEV → Template** (module publication) | **Нет** dedicated rollback | `platform_module_publications` status only | partial | нет |
| **Template → Client** (module apply) | **Да** | `tenant_module_configuration_rollbacks` + tenant event | `record_tenant_event` | `test_module_configuration_rollback_mvp.py` |
| **Structure clone** | **Нет** auto-rollback | clone audit event (P1) | `tenant_structure_clone_bypass` | P1 unit test |

---

## 6. Journal Audit

| Событие | Что фиксируется | Где хранится | Как просматривается |
|---------|-----------------|--------------|---------------------|
| **Publication** (module) | status workflow, snapshot, versions | `platform_module_publications` | Platform publications API/UI |
| **Publication publish** | published_at, offers_created | same table | same |
| **Apply** (client) | apply_id, versions, diff, actor | `tenant_module_configuration_applies` + tenant journal | tenant journal / API |
| **Rollback** (client) | rollback_id, apply link, versions | `tenant_module_configuration_rollbacks` + tenant journal | tenant journal / API |
| **Clone bypass** | source/target, objects_count, reason, actor | `platform_event_journal_entries` (`tenant_structure_clone_bypass`) | Platform event journal |
| **Designer catalog publish** | catalog_version, payload hash | `designer_publish_records`, `designer_metadata_snapshots` | Studio publish history |
| **Bypass (scripts)** | implicit via guard/bypass flag in code | code review | нет runtime journal |

**Gap:** publish to template не пишет в `platform_event_journal` / DEV journal автоматически.

---

## 7. Template Readiness

### Можно ли случайно разрабатывать в Template?

| Действие | Результат |
|----------|-----------|
| Редактировать pages/objects/views через Designer API | **403** |
| Прямой service call | **TenantWriteForbiddenError** |
| GET navigation designer (side-effect) | **403** на Template |
| Получить module config через publication | **Да** (штатный путь) |
| Clone structure into Template (platform admin) | **Да** (явный bypass) |

**Ответ:** случайная разработка structure в Template **заблокирована**. Намеренный обход — только через platform admin clone.

---

## 8. Client Readiness

### Можно ли случайно разрабатывать в Client (Розетка id=21)?

| Канал | Structure edit | Config update |
|-------|----------------|---------------|
| Designer API | **blocked** | blocked (direct) |
| Service layer | **blocked** | blocked (direct) |
| Module apply (offer) | N/A | **allowed** (publication path) |
| Runtime data API | allowed | allowed |
| Provisioning clone at create | structure copied once | modules provisioned |

**Ответ:** случайная structure-разработка в Client **заблокирована**. Runtime-данные и apply конфигурации — штатные операции клиента.

---

## 9. Demonstration Readiness

Read-only проверка БД (2026-06-15):

| Tenant | id | Статус | Наблюдение |
|--------|-----|--------|------------|
| DEV (Корпоративный портал) | 1 | ACTIVE | exists |
| Template (Шаблон) | 2 | ACTIVE | exists |
| Розетка | 21 | ACTIVE | exists |
| Platform Owner | zmn8@ya.ru | — | exists, `tenant_id=NULL` |
| Test companies | — | — | **0** (registry audit) |

| Критерий | Оценка |
|----------|--------|
| Функциональность demo tenants | OK |
| Консистентность Companies UI | OK (3 компании) |
| Структура DEV | OK (primary dev tenant) |
| Версии модулей / publication MVP | OK (тесты + pipeline code) |
| Навигация | OK (protected tenants intact) |
| Журналы | partial (gaps на publish→template event) |

---

## 10. Risks

| # | Risk | Severity |
|---|------|----------|
| 1 | **Structure не идёт через publication** — clone остаётся параллельным контуром | High (architectural) |
| 2 | **Clone bypass** доступен platform admin без publication review | Medium |
| 3 | **Нет rollback** DEV→Template module publication | Medium |
| 4 | **Journal gap** на publish to template | Low |
| 5 | **Новые service endpoints** без guard — регрессионный риск | Medium |
| 6 | DB-level access вне guards | Low (ops) |

---

## 11. Required Work Before Publication MVP (full rule)

1. **Structure Publication Pipeline** — проектирование и реализация DEV→Template→Client для metadata catalog (не только module config).
2. **Унификация clone** — либо ввести в publication workflow, либо жёстко ограничить clone только provisioning с approval.
3. **Rollback DEV→Template** для module publications.
4. **Journal на publish** — `record_platform_event` / DEV journal при `publish_publication_to_template`.
5. **Analyzer / CI gate** — проверка новых mutating services на `guard_direct_structure_write`.
6. **Документировать** два контура: «structure via clone» vs «config via publication» до слияния.

---

## 12. Final Verdict

### Можно ли принять правило сейчас?

| Формулировка | Принять? |
|--------------|----------|
| «Structure разрабатывается только в DEV» | **Да**, с оговоркой clone/provisioning |
| «Template/Client не редактируют structure напрямую» | **Да** (P0+P1) |
| «Все изменения Template/Client только через publication» | **Нет** для structure; **Да** для module config |
| «Полная модель DEV→Pub→Template→Pub→Client без clone» | **Нет** — NOT READY |

### Статус

```text
READY WITH RISKS
```

### Architecture Audit (read-only)

| Вопрос | Pass/Fail |
|--------|-----------|
| Source of Truth сохранён? | Pass |
| Write guards централизованы? | Pass |
| Publication bypasses явные? | Pass |
| Полный publication-only для structure? | Fail (by design gap) |

### Data Impact Audit

```text
Tables affected: none
Data changes: none
Deletions: none
Schema changes: none
```

### Test Data Audit

```text
Новые тестовые записи: не создавались
```

### Cleanup Audit

```text
visible_test_companies_count = 0
module_offers_companies = 0
module_previews_companies = 0
Cleanup status: PASSED
```

---

*Связанные артефакты: `PUBLICATION_GUARD_FOUNDATION_AUDIT.md`, `PUBLICATION_GUARD_FOUNDATION_P1_REPORT.md`, `cleanup_publication_test_leaks.audit_companies_via_tenant_registry()`*
