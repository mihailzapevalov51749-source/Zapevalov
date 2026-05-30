# Relation Engine Foundation Audit (R1)

## STATUS

```text
AUDIT COMPLETE — code and architecture analysis only, no implementation (2026-05-30)
```

**Контекст:** Legacy Isolation закрыт (100%). Следующий крупный контур roadmap — **Runtime Foundation → Relation Engine Foundation**.

**Scope:** фактическое состояние платформы по связям между объектами. Код, БД, API и UI **не менялись**.

**Связанные документы (обязательный анализ):**

| Документ | Роль |
|----------|------|
| [YASNOPRO_RELATION_ENGINE_MODEL.md](./YASNOPRO_RELATION_ENGINE_MODEL.md) | Целевая модель: Definition / Instance / Type / Graph / Events |
| [YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md](./YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md) | Фактическая runtime-интеграция в Object Entity Card (PR-C2/C3) |
| [YASNOPRO_EVENT_ENGINE_MODEL.md](./YASNOPRO_EVENT_ENGINE_MODEL.md) | Целевые `relation.created/updated/deleted` |
| [YASNOPRO_ARCHITECTURE_GLOSSARY.md](./YASNOPRO_ARCHITECTURE_GLOSSARY.md) | Relation Definition / Instance / graph ownership |
| [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md) | AD-010: lookup as pseudo-relation |
| [YASNOPRO_DESIGNER_SLICE1_IMPLEMENTATION.md](./YASNOPRO_DESIGNER_SLICE1_IMPLEMENTATION.md) | Designer RelationDefinition CRUD (Slice 1) |
| [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) | Phase 4 Runtime Foundation → relation engine foundation |

> **Р расхождение документов:** [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md) помечает Relation Engine как `NOT IMPLEMENTED`. По коду это **устаревший статус** — foundation **частично реализован** (см. §2–§3).

---

## 1. Executive Summary

### Есть ли Relation Engine сейчас?

**Да — частичный (Foundation slice), не полноценный Relation Engine.**

В платформе уже существует **двухслойная модель связей object platform**:

```text
Designer Layer (draft)
  designer_relation_definitions
       ↓ publish
Published Catalog (snapshot JSON: relations[])
       ↓ runtime validation
Runtime Layer
  runtime_relation_instances  (source_entity ↔ target_entity)
```

Это соответствует целевой архитектуре **Relation Definition → Relation Instance**, но **без** graph engine, relation field types, events, permissions и полного runtime UX.

### Что существует вместо полноценного engine

| Механизм | Контур | Роль |
|----------|--------|------|
| **Platform RelationDefinition + RelationInstance** | Object Platform | Semantic relations (целевой путь) |
| **UT lookup columns** | Legacy Universal Table | Pseudo-relation между таблицами (AD-010) |
| **UT row hierarchy (`parent_id`)** | Legacy Universal Table | Дерево строк, не object graph |
| **SQLAlchemy FK / ORM `relationship()`** | Portal, chats, nav, docs | Инфраструктурные связи БД, не business graph |

**Вывод:** Relation Engine **не отсутствует**, но реализован как **read-heavy foundation** (~55% readiness по manifest). Полноценный engine требует завершения runtime UX, graph queries, field-level relations, events и тестов.

---

## 2. Current State

| Область | Статус | Факт |
|---------|--------|------|
| **Backend relations** | **PARTIAL — IMPLEMENTED (core)** | `designer/relation_definitions/*`, `runtime/relation_instances/*`, publish snapshot, catalog metadata resolver, validators (cardinality, object types) |
| **DB relations** | **PARTIAL — IMPLEMENTED (core tables)** | `designer_relation_definitions`, `runtime_relation_instances`; FK на `runtime_entities`, `designer_object_types`, `portals` |
| **API** | **PARTIAL — IMPLEMENTED (CRUD backend)** | Designer CRUD + Runtime list/create/delete; frontend использует mostly **read** |
| **Frontend** | **PARTIAL — IMPLEMENTED (designer + read-only card)** | `RelationsTab`, `useObjectEntityRelations`, `ObjectEntityRelatedEntities`; **нет** runtime create/delete UI |
| **Object Platform** | **PARTIAL** | ObjectType ✓, Field ✓ (без `relation` type), Entity ✓, RelationDefinition ✓, RelationInstance ✓; Reference/Lookup field ✗ |

**Platform Dashboard (manifest):** component `relations` — `in_progress`, readiness **55%**.

**Analyzer (`runtime-foundation`):** work item «Relation engine foundation» → `in_progress` if frontend marker `relation` exists.

---

## 3. Existing Relation Mechanisms

### 3.1. Object Platform — Relation Definition (Designer)

**Таблица:** `designer_relation_definitions`  
**Модель:** `DesignerRelationDefinition`  
**Модуль:** `backend/app/modules/platform/designer/relation_definitions/`

| Поле | Назначение |
|------|------------|
| `key`, `name`, `description` | Identity + label |
| `source_object_type_id`, `target_object_type_id` | From / To ObjectType |
| `relation_type` | `one_to_one`, `one_to_many`, `many_to_many` |
| `reverse_name`, `bidirectional` | Direction / reverse label |
| `cascade_delete`, `is_required`, `is_system`, `is_active` | Behavior flags |
| `settings_json`, `validation_json` | Extensibility |

**API (Designer):**

```text
GET    /designer/tenants/{tenant_id}/relations
POST   /designer/tenants/{tenant_id}/relations
GET    /designer/tenants/{tenant_id}/relations/{relation_id}
PATCH  /designer/tenants/{tenant_id}/relations/{relation_id}
DELETE /designer/tenants/{tenant_id}/relations/{relation_id}
GET    /designer/tenants/{tenant_id}/object-types/{object_type_id}/relations
```

**Frontend:** `frontend/src/modules/designer/components/tabs/RelationsTab.jsx` + `designerApi.listRelations/createRelation/...`

**Publish path:** `snapshot_builder.py` включает `relations[]` в published catalog; `publish/validators.py` проверяет source/target, relation_type, reverse_name, cascade rules.

---

### 3.2. Object Platform — Relation Instance (Runtime)

**Таблица:** `runtime_relation_instances`  
**Модель:** `RuntimeRelationInstance`  
**Модуль:** `backend/app/modules/platform/runtime/relation_instances/`

| Поле | Назначение |
|------|------------|
| `relation_key`, `relation_id`, `catalog_version` | Binding к published definition |
| `source_entity_id`, `target_entity_id` | FK → `runtime_entities.id` |
| `source_object_type_key`, `target_object_type_key` | Denormalized type keys |
| `status`, `deleted_at` | Soft lifecycle |

**Unique constraint:** active pair `(tenant, relation_key, source, target)` — migration `20250525_0007`.

**API (Runtime, prefix `/runtime/relations`):**

```text
GET    /tenants/{tenant_id}/entities/{entity_id}           — all relations for entity
GET    /tenants/{tenant_id}/entities/{entity_id}/outgoing
GET    /tenants/{tenant_id}/entities/{entity_id}/incoming
POST   /tenants/{tenant_id}/{relation_key}                 — create instance
GET    /tenants/{tenant_id}/{relation_key}                 — list by relation type
DELETE /tenants/{tenant_id}/{relation_instance_id}         — soft delete
```

**Validation (`validators.py`):** published catalog metadata, object type key match, no self-link, supported relation_type, duplicate / one-to-one constraints in repository.

**Frontend API:** `frontend/src/api/runtimeRelationsApi.js` — **только GET** (list/outgoing/incoming). POST/DELETE **не обёрнуты** во frontend client.

---

### 3.3. Object Entity Card — Read Integration

**Документ:** [YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md](./YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md)

```text
ObjectEntityCardView
  └─ useObjectEntityRelations
       └─ listRuntimeEntityRelations (GET)
       └─ mapRelationInstancesToGroups + getRuntimeEntity enrichment
       └─ ObjectEntityRelatedEntities (tab "Связанные записи")
```

**Ограничения (из docs + code):**

- Read-only UI (no create/delete in card)
- Single-hop only (no graph traversal)
- N+1 enrichment via `getRuntimeEntity`
- Tenant scope only (no relation-level permissions)
- Cross-object-type open partially disabled

---

### 3.4. Entity Layer (prerequisite)

**Таблицы:**

| Table | Purpose |
|-------|---------|
| `runtime_entities` | Entity identity (`object_type_key`, `catalog_version`) |
| `runtime_entity_values` | Field values (EAV JSONB) |

Relation instances **ссылаются на `runtime_entities`**, не на legacy UT rows.

---

### 3.5. Legacy — Universal Table Lookup (pseudo-relation)

**Не Relation Engine**, но активный параллельный механизм:

| Artifact | Location |
|----------|----------|
| Column type `lookup` | `universal_table_columns.lookup` (JSONB) |
| UI editors | `ChoiceCellEditor`, `FilterValueControl`, `TableHeader` |
| API | `GET /universal-tables/lookup-options` |
| Entity card | `EntityCardDynamicFields` maps `relation` → `lookup` |

**Debt:** AD-010 — lookup partially replaces semantic relations; AI/platform graph incomplete.

**Explicitly NOT used for platform relations:** `universal_table_rows.parent_id`, UT `EntityCardRelatedRows` (per RUNTIME_RELATIONS doc).

---

### 3.6. Infrastructure FK (not business relations)

Стандартные SQLAlchemy `ForeignKey` / `relationship()` в:

- `navigation_items`, `pages`, `sections`, `blocks`
- `chats`, `notifications`, `notes`, `document_libraries`
- `tasks`, `users`, `roles`

Это **не** object-centric Relation Engine и **не** входят в semantic graph.

---

### 3.7. Database Map (relation-relevant)

```text
portals (tenant)
  │
  ├─ designer_object_types
  │     ├─ designer_field_definitions
  │     └─ designer_relation_definitions ──► source/target object_type FK
  │
  ├─ designer_publish_snapshots (JSONB: object_types, fields, relations)
  │
  ├─ runtime_entities ◄──── runtime_relation_instances ────► runtime_entities
  │     └─ runtime_entity_values
  │
  └─ universal_tables (legacy, isolated)
        ├─ universal_table_columns.lookup
        └─ universal_table_rows.parent_id
```

**Migrations:**

- `20250525_0003_create_designer_relation_definitions.py`
- `20250525_0007_create_runtime_relation_instances.py`

---

### 3.8. Object Platform Field Model (relation gap)

**Enum `FieldType`** (`backend/app/modules/platform/shared/enums.py`):

```text
text, textarea, number, boolean, date, datetime, choice, multi_choice, uuid
```

**Отсутствует:** `relation`, `lookup`, `reference`.

**Runtime entity validators** reject unsupported field types — relation-as-field **не реализован** на platform layer.

**Designer Foundation Plan** упоминает `relation` как planned field type — **не в коде**.

---

### 3.9. Tests & Observability

| Check | Status |
|-------|--------|
| Dedicated backend tests for relation_instances | **NOT FOUND** |
| Platform dashboard analyzer component `relations` | Checks module + table + frontend marker |
| Event `relation.created` etc. | **NOT IMPLEMENTED** (Event Engine NOT STARTED) |
| Relation permissions | **NOT IMPLEMENTED** |

---

## 4. Architecture Gaps

### Critical

| Gap | Why critical |
|-----|--------------|
| **No runtime relation UI (create/delete/link)** | Backend POST/DELETE exist; frontend read-only → users cannot manage links in Object Card |
| **No relation field type on Object Platform** | Relations exist only as separate instances, not as first-class field on entity forms/tables |
| **No automated tests for relation_instances** | Foundation unstable for next phases |
| **Dual relation models (platform vs UT lookup)** | AD-010 active; object graph fragmented |
| **ARCHITECTURE_STATUS out of sync** | Says NOT IMPLEMENTED — hides ~55% actual progress |

### Important

| Gap | Notes |
|-----|-------|
| **Graph queries / traversal** | Single-hop list only; no multi-hop, no summary endpoint |
| **Relation events** | No `relation.created/updated/deleted` in Event Engine |
| **Permissions** | Tenant scope only; no object-level relation ACL |
| **N+1 enrichment** | Card loads related entities one-by-one (`getRuntimeEntity`) |
| **Designer UX maturity** | RelationsTab uses `window.prompt`; tenant-wide relations page partially disabled in sidebar |
| **View Engine integration** | Table views don't show relation columns from platform relations |
| **Cascade delete runtime behavior** | Flag in definition; runtime enforcement unclear from audit |

### Optional (post-Foundation)

| Gap | Notes |
|-----|-------|
| Graph visualization UI | Not in current codebase |
| AI Context from relations | Blocked on Relations + Search maturity |
| Bidirectional auto-sync of instances | Definition has `bidirectional`; instance model is directed edge |
| Relation versioning / history | Not present |

---

## 5. Proposed Foundation Scope (MVP)

Основано **только на фактических пробелах**, не на greenfield design.

Foundation = **закрыть минимальный vertical slice**, при котором semantic relation работает end-to-end на Object Platform **без UT lookup workaround**.

### MVP must-have (Relation Engine Foundation complete)

| # | Capability | Already exists | Missing for MVP |
|---|------------|----------------|-----------------|
| 1 | **RelationDefinition in Designer** | ✓ CRUD + publish | Polish UX (optional) |
| 2 | **RelationInstance persistence** | ✓ table + validators | Tests |
| 3 | **RelationInstance API** | ✓ backend CRUD | Frontend API client (POST/DELETE) |
| 4 | **Read relations in Object Card** | ✓ tab + grouping | — |
| 5 | **Write relations in Object Card** | ✗ | Create/link + unlink UI |
| 6 | **Catalog-driven labels** | ✓ `mapRelationInstancesToGroups` | — |
| 7 | **Analyzer / dashboard truth** | partial | Code-check + doc sync |

### Explicitly OUT of Foundation MVP (next phases)

- Relation **field type** on entity (can be R4+ if instances-first strategy)
- Multi-hop **graph queries**
- **Event Engine** relation events
- **Permission engine** for relations
- UT lookup **migration/off**
- Graph visualization

### Foundation completion criteria (proposed)

```text
1. User can create and delete RelationInstance from Object Entity Card
2. Backend validators + tests cover one_to_one / one_to_many / many_to_many
3. runtimeRelationsApi exposes create + delete
4. No new relation logic in Universal Table
5. Platform dashboard relations readiness ≥ 80%
6. ARCHITECTURE_STATUS reflects PARTIAL → FOUNDATION COMPLETE
```

---

## 6. Recommended Architecture

### Target stack (aligned with existing code + YASNOPRO_RELATION_ENGINE_MODEL)

```text
Designer Studio
  ObjectType + FieldDefinition + RelationDefinition (draft)
       ↓ Publish
Published Catalog (immutable snapshot)
  catalog.relations[]
       ↓
Runtime Entity Layer
  runtime_entities + runtime_entity_values
       ↓
Relation Engine (Foundation → Full)
  runtime_relation_instances
  + validators (cardinality, type match)
  + Relation API (CRUD)
  + Relation UI (card, future: table columns)
       ↓
View Engine
  Object Views / Entity Card / future graph views
       ↓
Event Engine (future)
  relation.created | updated | deleted
       ↓
AI Context (future)
  semantic graph from instances + catalog
```

### Key architectural decision (recommended)

**Keep Relation Instance as first-class storage** (already implemented).  
Do **not** start with relation-as-field only — field type should **project** instances later (Relation Engine Model §29).

**Deprecate UT lookup for new object-centric scenarios** — keep isolated in legacy island until Legacy Removal.

### Layer ownership

| Layer | Owns |
|-------|------|
| Designer | RelationDefinition schema, publish validation |
| Catalog | Published relation metadata |
| Relation Engine | Instance CRUD, cardinality rules, (future) graph queries |
| Entity Layer | Entity identity + field values |
| View Engine | Presentation of related records |
| Legacy UT | lookup columns only — no new features |

---

## 7. Migration Strategy (no code)

### R1 — Audit (this document)

**Status:** ✅ DONE

Deliverables: inventory, gaps, MVP scope, architecture alignment.

---

### R2 — Backend Foundation Hardening

- Add automated tests: `relation_instances` validators, duplicate rules, one-to-one constraints, catalog binding
- Verify cascade_delete / soft-delete semantics
- Optional: `GET .../entities/{id}/relations/summary` to reduce N+1

**DoD:** pytest suite green; no API contract breaks.

---

### R3 — Relation API (Frontend Gateway)

- Extend `runtimeRelationsApi.js`: `createRelationInstance`, `deleteRelationInstance`
- Typed payloads aligned with `RelationInstanceCreate` schema
- Error mapping for 409/422

**DoD:** frontend can call all runtime relation endpoints without direct platformApiClient scatter.

---

### R4 — Relation UI (Runtime)

- Object Entity Card: add link / unlink actions in `ObjectEntityRelatedEntities`
- Relation picker (source entity fixed; choose target entity + relation_key from catalog)
- Reload groups after mutation

**DoD:** end-to-end create/delete from card; read path unchanged.

---

### R5 — Graph Queries & View Integration

- Backend: relation traversal / summary (single relation_key filter, optional depth=2)
- Object Views: related records column or side panel from platform relations (not UT lookup)
- Optional: parent entity hero (PR-C5 from RUNTIME_RELATIONS doc)

**DoD:** table/card views show semantic relations without UT.

---

### R6 — Relation Engine Complete (Foundation → Full)

- Relation field type in Designer + runtime entity validators (if prioritized)
- Relation events → Event Engine
- Object-level permissions on relation CRUD
- Sync ARCHITECTURE_STATUS, MIGRATION_MAP, dashboard analyzer code-checks
- Mark `runtime-foundation` work item «Relation engine foundation» = done

**DoD:** manifest relations ≥ 85%; analyzer readiness; AD-010 mitigation plan for UT lookup documented.

---

## 8. Answers to Definition of Done Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | **Что уже существует?** | Designer RelationDefinition, publish in catalog, RuntimeRelationInstance + CRUD API, read-only Object Card integration, Designer RelationsTab |
| 2 | **Что отсутствует?** | Runtime write UI, relation field type, graph queries, events, permissions, tests, doc sync; UT lookup still acts as parallel pseudo-relation |
| 3 | **Что является Foundation?** | End-to-end **RelationDefinition → RelationInstance → Card read/write** on Object Platform with tests and dashboard truth — **without** full graph/AI/events |
| 4 | **Следующий этап?** | **R2 Backend Foundation Hardening** (tests + validator coverage), затем **R3 Frontend API** + **R4 Card UI** |

---

## 9. File Inventory (audit trace)

### Backend (platform relations)

```text
backend/app/modules/platform/designer/relation_definitions/
backend/app/modules/platform/runtime/relation_instances/
backend/app/modules/platform/runtime/catalog/service.py  (get_published_relation_metadata)
backend/app/modules/platform/designer/publish/snapshot_builder.py
backend/app/modules/platform/designer/publish/validators.py
backend/app/modules/platform/shared/enums.py  (RelationType)
```

### Frontend

```text
frontend/src/modules/designer/components/tabs/RelationsTab.jsx
frontend/src/modules/designer/api/designerApi.js
frontend/src/api/runtimeRelationsApi.js
frontend/src/modules/objectEntities/hooks/useObjectEntityRelations.js
frontend/src/modules/objectEntities/components/ObjectEntityRelatedEntities.jsx
frontend/src/modules/objectEntities/services/mapRelationInstancesToGroups.js
```

### Docs

```text
docs/architecture/YASNOPRO_RELATION_ENGINE_MODEL.md
docs/architecture/YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md
docs/architecture/YASNOPRO_ARCHITECTURE_DEBT.md  (AD-010)
docs/architecture/YASNOPRO_DESIGNER_SLICE1_IMPLEMENTATION.md
```

### Not found (checked)

```text
frontend/src/modules/pages/PortalPageView.jsx  — N/A
docs/architecture/YASNOPRO_ENTITY_LAYER_*        — N/A (entity layer described in platform modules + glossary)
docs/architecture/YASNOPRO_OBJECT_MODEL_*        — N/A (see OBJECT_ENTITY_CARD, DESIGNER_FOUNDATION_PLAN)
```

---

## 10. Version

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-30 | R1 audit complete |
