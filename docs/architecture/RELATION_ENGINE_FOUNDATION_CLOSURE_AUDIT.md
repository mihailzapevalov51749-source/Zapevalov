# Relation Engine Foundation — Final Closure Audit

## STATUS

```text
CLOSURE AUDIT COMPLETE — no code changes (2026-05-30)
```

**Work item:** `Relation engine foundation` (этап «Новая рабочая среда» / `runtime-foundation`)

**Предшествующий документ:** [RELATION_ENGINE_FOUNDATION_AUDIT.md](./RELATION_ENGINE_FOUNDATION_AUDIT.md)

**Scope:** формальный Definition of Done для закрытия work item. Код, Dashboard и analyzer **не менялись**.

---

## Executive Answer

### Можно ли закрыть `relation engine foundation` сейчас?

**Нет.**

### Что конкретно отсутствует для статуса DONE?

Минимально не хватает **runtime write-path в продукте**:

1. **Frontend runtime API:** POST / DELETE для relation instances (сейчас только GET)
2. **Object Entity Card UI:** создание и удаление связи (сейчас только просмотр)
3. **Automated tests:** backend tests для `relation_instances` (отсутствуют)

Backend definition + instance + validation + read UI **готовы**. End-to-end **без ручного API** — **не замкнут**.

---

## Current Completion

```text
~70%
```

### Расчёт (Foundation DoD rubric)

| Блок | Вес | Факт | Балл |
|------|-----|------|------|
| Relation Definition (Designer CRUD + publish) | 15% | READY | 15% |
| Runtime Instance (backend CRUD + validation) | 25% | READY | 25% |
| Runtime API (GET/POST/DELETE) | 10% | READY | 10% |
| Frontend runtime API client | 15% | PARTIAL (GET only) | 5% |
| Runtime UI (Object Card) | 20% | PARTIAL (read only) | 7% |
| Automated tests | 10% | MISSING | 0% |
| End-to-end без manual API | 5% | PARTIAL | 2% |
| **Итого** | **100%** | | **~64–70%** |

> Контур Dashboard «Связи объектов» (~90%) измеряет **наличие модулей**, не **замкнутый Foundation DoD** с write-path и тестами.

---

## Full Cycle Verification

### 1. Relation Definition

| Capability | Evidence | Status |
|------------|----------|--------|
| Создание | `POST /designer/tenants/{id}/relations`, `RelationsTab.handleCreate`, `designerApi.createRelation` | **READY** |
| Редактирование | `PATCH .../relations/{id}`, `RelationsTab.handleSave`, `designerApi.updateRelation` | **READY** |
| Удаление | `DELETE .../relations/{id}`, `RelationsTab.handleDelete`, `designerApi.deleteRelation` | **READY** |
| Publish | `designerApi.publishCatalog` → `snapshot_builder.py` включает `relations[]`, publish validators | **READY** |

**Итог блока: READY**

---

### 2. Runtime Relation Instance

| Capability | Evidence | Status |
|------------|----------|--------|
| Create | `service.create_relation_instance`, `repository.create_relation_instance` | **READY** |
| Delete | `service.delete_relation_instance` (soft delete) | **READY** |
| Read | `list_for_entity`, `list_outgoing`, `list_incoming`, `list_by_relation_key` | **READY** |
| Validation | `validators.validate_relation_instance_create`, catalog metadata, duplicate / one-to-one checks in repository | **READY** |

**Итог блока: READY** (backend)

---

### 3. Runtime API

| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/runtime/relations/tenants/{tenant_id}/entities/{entity_id}` (+ outgoing/incoming) | **READY** |
| POST | `/runtime/relations/tenants/{tenant_id}/{relation_key}` | **READY** |
| DELETE | `/runtime/relations/tenants/{tenant_id}/{relation_instance_id}` | **READY** |

**Итог блока: READY**

---

### 4. Frontend API

| Client | GET | POST | DELETE | Status |
|--------|-----|------|--------|--------|
| `runtimeRelationsApi.js` (runtime instances) | ✓ `listRuntimeEntityRelations`, outgoing, incoming | ✗ | ✗ | **PARTIAL** |
| `designerApi.js` (relation **definitions**) | ✓ `listRelations` | ✓ `createRelation` | ✓ `deleteRelation` | **READY** (Designer only) |

**Итог блока: PARTIAL** — runtime instance write operations **не обёрнуты** во frontend client.

---

### 5. Runtime UI (Object Entity Card)

| Capability | Evidence | Status |
|------------|----------|--------|
| Просмотр связанных записей | `useObjectEntityRelations` → `ObjectEntityRelatedEntities`, tab `relations` | **READY** |
| Создание связи | UI / actions **не найдены** | **MISSING** |
| Удаление связи | UI / actions **не найдены** | **MISSING** |

Дополнительно (не блокирует Foundation, но ограничивает UX):

- открытие related entity для **другого** object type частично disabled (`canOpen` / disabled rows)
- нет picker «выбрать target entity + relation_key»

**Итог блока: PARTIAL**

---

### 6. End-to-End Flow

```text
Definition (Designer RelationsTab)
    ↓  READY
Publish (publishCatalog → catalog.relations[])
    ↓  READY
Create Runtime Relation (POST /runtime/relations/...)
    ↓  READY backend only — нет UI / frontend API wrapper
View Runtime Relation (Object Card tab)
    ↓  READY (если instance создан)
Delete Runtime Relation (DELETE /runtime/relations/...)
    ↓  READY backend only — нет UI / frontend API wrapper
```

**Итог: PARTIAL**

| Путь | Результат |
|------|-----------|
| Studio → publish → **ручной POST** → card read | **WORKING** (технический) |
| Studio → publish → **card create/delete** | **BROKEN** (нет UI/API client) |
| Полный продуктовый цикл для пользователя портала | **PARTIAL** |

---

## Missing Items

Только **реально отсутствующее** для Foundation closure:

1. **`runtimeRelationsApi.js`:** функции `createRuntimeRelationInstance(tenantId, relationKey, payload)` и `deleteRuntimeRelationInstance(tenantId, instanceId)`
2. **Object Entity Card:** UI «Добавить связь» (relation picker + target entity picker) и «Удалить связь»
3. **Backend tests:** pytest для `relation_instances` (validators, duplicate, one-to-one, catalog binding) — **0 test files** найдено
4. **Formal Dashboard criterion:** code-check в `stage_works.py`, возвращающий `done` для work item (отсутствует; сейчас max `in_progress`)

**Не считаются blockers для Foundation** (следующие фазы):

- relation field type на Object Platform
- graph traversal / summary API
- relation events (Event Engine)
- object-level relation permissions
- cross-object-type card navigation polish
- Designer RelationsTab UX (window.prompt)

---

## Minimal Closure Scope

Минимальный объём, чтобы **обоснованно** перевести `relation engine foundation` → **`done`**:

### Must-have (продуктовый Foundation)

| # | Deliverable | Оценка |
|---|-------------|--------|
| M1 | `runtimeRelationsApi` POST + DELETE | Small |
| M2 | Object Card: create relation instance UI | Medium |
| M3 | Object Card: delete relation instance UI | Small |
| M4 | Backend pytest: `relation_instances` core paths | Medium |

### Must-have (формальное закрытие в Dashboard)

| # | Deliverable | Оценка |
|---|-------------|--------|
| M5 | Analyzer code-check: Foundation DoD (definition published + instance CRUD API + frontend write client + card read/write hooks exist) | Small |
| M6 | Test `test_relation_engine_foundation_work_item_completed` | Small |

### Explicit non-goals для closure

- Relation field type
- Graph queries
- Event Engine integration
- Permission engine
- UT lookup migration

### Proposed Definition of Done (для adoption)

Work item **`relation engine foundation`** = **done**, когда одновременно:

```text
1. Designer: RelationDefinition CRUD + publish в catalog          ✓ already
2. Runtime: RelationInstance POST/DELETE/GET + validators         ✓ already
3. Frontend: runtimeRelationsApi GET + POST + DELETE              ✗ M1
4. Object Card: view + create + delete related records            ✗ M2–M3
5. Backend: automated tests relation_instances                    ✗ M4
6. Analyzer: code-check returns done for work item                ✗ M5–M6
```

---

## Recommendation

```text
NEEDS IMPLEMENTATION
```

### Обоснование

**Закрывать сейчас нельзя**, потому что Foundation по смыслу [RELATION_ENGINE_FOUNDATION_AUDIT.md](./RELATION_ENGINE_FOUNDATION_AUDIT.md) и [YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md](./YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md) — это **end-to-end semantic relation на Object Platform**, а не только backend storage + read-only tab.

Уже готово (~70%):

- полный Designer definition lifecycle
- publish в catalog
- runtime persistence и REST CRUD
- read path в Object Card

Не готово (~30% для closure):

- **продуктовый write path** (frontend API + card UI)
- **tests**
- **формальный analyzer `done`**

### Альтернатива (не рекомендуется)

Можно формально закрыть work item как «backend foundation only», если переопределить DoD **только** на пункты 1–2. Это **расходится** с:

- PR-C4 в RUNTIME_RELATIONS doc («create/delete relation UI»)
- proposed Foundation completion в R1 audit
- ожиданием пользователя портала управлять связями из карточки

**Рекомендация:** не закрывать до M1–M4.

---

## Dashboard Context (why `done` is impossible today)

Текущая логика `evaluate_stage_work_status` для `runtime-foundation`:

```python
if "relation engine" in lower:
    return "in_progress" if _frontend_has(ctx, "relation") else "planned"
# "done" branch отсутствует
```

Даже после реализации M1–M4 потребуется **отдельный code-check** (M5), иначе work item останется `in_progress` и readiness этапа **0%** (считаются только `done` items).

---

## Definition of Done (этого аудита)

| Критерий | Статус |
|----------|--------|
| Однозначный ответ «можно ли закрыть сейчас?» | ✓ **Нет** |
| Список минимальных изменений | ✓ M1–M6 |
| Код не изменён | ✓ |

---

## Version

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-30 | Final closure audit |
