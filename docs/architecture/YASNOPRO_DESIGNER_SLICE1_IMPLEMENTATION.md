# YASNOPRO Designer Slice 1 Implementation

**Тип:** implementation blueprint (не код)  
**Slice:** Designer Core Metadata Slice  
**Authority:** `YASNOPRO_ARCHITECTURE_DIRECTION.md` → `YASNOPRO_DESIGNER_FOUNDATION_PLAN.md` → GLOSSARY / VIEW_OWNERSHIP / SCOPE_TENANT  
**Статус:** готов к передаче в разработку  

---

## 1. Slice 1 Goal

Создать **минимальное platform-safe ядро Designer** — сторону аналитика — которое позволяет:

1. Моделировать **ObjectType**, **FieldDefinition**, **RelationDefinition** в изолированном контуре.
2. Хранить metadata **отдельно** от legacy `universal_tables` / runtime controllers.
3. Выполнять **Publish Flow MVP**: draft → validation → publish → runtime read-only catalog.
4. Дать Runtime **read-only** доступ к published metadata **без** переписывания Universal Table и без giant refactor.

**Не цель Slice 1:** Entity runtime, BPMN, Workflow/Process execution, Permissions Designer, AI Context Designer, ViewTemplate/Layout полноценный UI, Runtime Personalization.

**Критерий успеха** (из Designer Foundation Plan):

- Аналитик создаёт ObjectType, Fields, Relations.
- Publish работает; Runtime читает только published.
- Legacy runtime не сломан.

---

## 2. Slice 1 Boundaries

### IN scope

| Область | Включено |
|---------|----------|
| Designer Shell | Отдельный route, layout, navigation |
| ObjectType CRUD (draft) | key, name, description, icon, metadata |
| FieldDefinition CRUD (draft) | Slice 1 field types |
| RelationDefinition CRUD (draft) | cardinality, from/to ObjectType |
| Metadata storage | Новые таблицы, tenant-scoped |
| Publish Flow MVP | Validation + publish + immutable snapshot |
| Runtime Consumption MVP | Read-only published catalog API |
| Tenant boundary | `tenant_id` на всех сущностях (см. §6) |
| Basic auth | Существующий auth; роль designer/analyst |

### OUT of scope

| Область | Исключено |
|---------|-----------|
| BPMN / Process / Workflow runtime | Placeholder nav only |
| Permissions Designer (полный) | Ownership placeholders + tenant only |
| AI Context Designer | Hooks в metadata JSON optional |
| ViewTemplate / LayoutTemplate UI | Slice 2 |
| Entity / EntityValue storage | Slice 2+ (после metadata stable) |
| Legacy UT refactor | Только bugfix по Runtime Foundation Plan |
| Runtime Personalization | RuntimeRepresentation, Workspace |
| Event Engine persistence | Только optional audit fields в PublishRecord |
| Alembic всего проекта | Рекомендуется **только для designer tables** (см. §6) |

### Architectural invariants (не нарушать)

- **Designer ≠ Runtime** (`RUNTIME_DESIGNER_MODEL`, `DESIGNER_FOUNDATION_PLAN`).
- **Designer metadata ≠ Universal Table schema** (отдельные tables/modules).
- **Runtime читает только published**; draft недоступен runtime API.
- **One resource — one owner** (GLOSSARY, View Ownership).
- **Новые capabilities не в** `useUniversalTableController`, `PortalPageView`, `UniversalTableView`.

---

## 3. Backend Architecture

### 3.1 Принципы

| Принцип | Реализация в Slice 1 |
|---------|----------------------|
| Parallel platform layer | Новый FastAPI module tree, отдельный router prefix |
| No legacy extension | Не менять `universal_tables` models/service для designer data |
| Tenant-first | Все запросы scoped by `tenant_id` |
| Draft vs published | Два контура данных + audit trail |
| Thin routers | Business logic в services; publish в отдельном layer |
| Runtime read path | Отдельный sub-router `runtime-catalog` (read-only) |

### 3.2 Высокоуровневая схема

```text
┌─────────────────────────────────────────────────────────────┐
│                     Designer API (write)                     │
│  /designer/object-types | fields | relations | publish      │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
 ObjectTypeService   FieldDefinitionService   RelationDefinitionService
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                   PublishService (validation + snapshot)
                            │
                            ▼
              published_metadata_snapshots (immutable)
              designer_publish_records (audit)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Runtime Catalog API (read-only)                 │
│  GET /runtime/platform-metadata/...                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Связь с Platform Core (логическая)

| Platform primitive | Slice 1 реализация |
|--------------------|-------------------|
| ObjectType | `designer_object_types` + versions |
| Field Definition | `designer_field_definitions` |
| Relation Definition | `designer_relation_definitions` |
| Entity | **не создаётся** в Slice 1 (только definitions) |
| ViewTemplate | **не создаётся** в Slice 1 |
| Publish | PublishService + snapshots |

---

## 4. Backend Entities

### 4.1 Сводная таблица

| Entity | Purpose | Owner | Tenant | Scope | Draft/Publish |
|--------|---------|-------|--------|-------|---------------|
| **DesignerObjectType** | Тип бизнес-объекта (стабильный id + key) | Designer Layer | required | company (designer artifact) | head + draft version |
| **DesignerObjectTypeVersion** | Версия конфигурации ObjectType | Designer Layer | via parent | company | draft editable / published immutable |
| **DesignerFieldDefinition** | Поле ObjectType | Designer Layer | via ObjectType | company | draft; copied into snapshot on publish |
| **DesignerRelationDefinition** | Связь между ObjectType | Designer Layer | required | company | draft; snapshot on publish |
| **DesignerPublishRecord** | Audit: кто, когда, что опубликовал | Publish Layer | required | — | append-only |
| **DesignerMetadataSnapshot** | Immutable published bundle для Runtime | Publish Layer | required | company | published only |
| **DesignerMetadataVersion** (logical) | Номер версии snapshot per tenant/catalog | Publish Layer | required | — | monotonic integer |

**Не создавать отдельные таблицы `DraftModel` / `PublishedModel` как generic store** — в Slice 1 достаточно **status enum** на рабочих строках + **immutable snapshot** для runtime.

### 4.2 DesignerObjectType (head)

| Аспект | Описание |
|--------|----------|
| **Purpose** | Стабильная идентичность типа в платформе (`key` в рамках tenant). |
| **Ownership** | Designer Layer. |
| **Tenant** | `tenant_id` NOT NULL, FK → `portals.id` (до появления `tenants` — portal = tenant boundary). |
| **Scope** | `scope = company` (default); Slice 1 не использует personal/team для ObjectType. |
| **Draft/Publish** | Head всегда существует; editable content в `current_draft_version_id` или embedded draft fields. |
| **Fields (логические)** | `id`, `tenant_id`, `key` (unique per tenant), `name`, `description`, `icon`, `color`, `status` (active/archived), `created_by`, `updated_by`, timestamps. |

### 4.3 DesignerObjectTypeVersion (optional normalized — рекомендуется для publish)

| Аспект | Описание |
|--------|----------|
| **Purpose** | Версионирование конфигурации ObjectType при publish. |
| **Draft** | Одна open draft version per ObjectType (`status=draft`). |
| **Published** | Каждый publish создаёт новую row `status=published`, **immutable**. |
| **Runtime** | Читает latest published version pointer с head или из snapshot. |

**Упрощение MVP:** если команда хочет меньше таблиц — draft хранить на head + fields/relations с `object_type_id`; при publish — только **snapshot JSON**. Versions table можно отложить до Slice 1.1.

### 4.4 DesignerFieldDefinition

| Аспект | Описание |
|--------|----------|
| **Purpose** | Metadata поля ObjectType (не значения Entity). |
| **Ownership** | Designer Layer. |
| **Tenant** | `tenant_id` + `object_type_id` FK. |
| **Scope** | company. |
| **Draft/Publish** | Редактируется только в draft; published state = frozen in snapshot. |
| **Fields** | `key`, `name`, `field_type`, `config` (JSONB), `validation` (JSONB), `position`, `is_required`, `is_system`, timestamps. |
| **Field types Slice 1** | text, long_text, number, boolean, date, datetime, choice, multi_choice, user, relation (per Foundation Plan). |

### 4.5 DesignerRelationDefinition

| Аспект | Описание |
|--------|----------|
| **Purpose** | Relation Definition между ObjectType (не Relation Instance). |
| **Ownership** | Designer Layer. |
| **Tenant** | `tenant_id`. |
| **Scope** | company. |
| **Draft/Publish** | Draft editable; published via snapshot. |
| **Fields** | `key`, `name`, `from_object_type_id`, `to_object_type_id`, `relation_type`, `cardinality`, `direction`, `reverse_name`, `config` (JSONB), `position`. |
| **Cardinality** | one-to-one, one-to-many, many-to-one, many-to-many. |

### 4.6 DesignerPublishRecord

| Аспект | Описание |
|--------|----------|
| **Purpose** | Audit trail publish events (будущий Event Engine adapter). |
| **Ownership** | Publish Layer. |
| **Tenant** | `tenant_id`. |
| **Immutable** | append-only. |
| **Fields** | `id`, `tenant_id`, `snapshot_id`, `published_by`, `published_at`, `catalog_version`, `summary` (JSON: counts, object_type keys), `status` (success/failed), `error_details` (nullable). |

### 4.7 DesignerMetadataSnapshot (PublishedModel — physical)

| Аспект | Описание |
|--------|----------|
| **Purpose** | **Единый immutable published catalog** для Runtime read MVP. |
| **Ownership** | Publish Layer. |
| **Tenant** | `tenant_id`. |
| **Scope** | company. |
| **Immutable** | после insert — no update/delete (only supersede by newer snapshot). |
| **Payload** | JSONB: `{ catalog_version, object_types: [...], fields: [...], relations: [...], published_at }` |
| **Runtime** | `GET latest` returns one snapshot per tenant (or per catalog line). |

**Почему snapshot:** избегает сложных join для Runtime MVP; соответствует «Runtime Availability» без orchestration.

### 4.8 DesignerMetadataVersion (logical)

| Аспект | Описание |
|--------|----------|
| **Purpose** | Monotonic `catalog_version` per tenant (integer). |
| **Storage** | На `DesignerMetadataSnapshot.catalog_version` и `DesignerPublishRecord.catalog_version`. |
| **Runtime** | Clients may send `If-None-Match` / `?since_version=` в Slice 1.1. |

---

## 5. Backend Module Structure

### 5.1 Рекомендуемый путь

```text
backend/app/modules/designer/
```

**Почему не `platform_designer`:** краткость + соответствие `frontend/src/designer/`; в router tag — `designer`.

**Альтернатива (если модуль разрастётся):**

```text
backend/app/modules/platform/
  designer/
  metadata/
  publish/
```

Slice 1 — один модуль `designer` с подпакетами.

### 5.2 Структура каталогов

```text
backend/app/modules/designer/
├── __init__.py
├── router.py                 # aggregate: designer + runtime_catalog routers
├── dependencies.py           # tenant_id, designer_role, db session helpers
├── constants.py              # field types, cardinality, statuses
├── exceptions.py             # domain errors
│
├── object_types/
│   ├── models.py
│   ├── schemas.py
│   ├── repository.py
│   ├── service.py
│   ├── validators.py
│   └── router.py             # prefix: /object-types
│
├── field_definitions/
│   ├── models.py
│   ├── schemas.py
│   ├── repository.py
│   ├── service.py
│   ├── validators.py
│   └── router.py             # nested or /fields
│
├── relation_definitions/
│   ├── models.py
│   ├── schemas.py
│   ├── repository.py
│   ├── service.py
│   ├── validators.py
│   └── router.py
│
├── publish/
│   ├── models.py             # PublishRecord, MetadataSnapshot
│   ├── schemas.py
│   ├── repository.py
│   ├── service.py              # PublishService
│   ├── validators.py           # cross-entity validation
│   └── router.py             # /publish
│
└── runtime_catalog/
    ├── schemas.py              # read DTOs only
    ├── service.py              # read snapshots only
    └── router.py             # prefix: /runtime-catalog (read-only)
```

### 5.3 Слои ответственности

| Layer | Responsibility |
|-------|----------------|
| **router** | HTTP, auth deps, tenant path param, status codes |
| **schemas** | Pydantic request/response; no ORM |
| **validators** | Business rules: unique keys, relation integrity, field type config |
| **service** | Transactions, draft rules, orchestration |
| **repository** | SQLAlchemy queries only |
| **publish/service** | Validation graph + snapshot build + version bump |
| **runtime_catalog** | Read latest snapshot; **no write** |

### 5.4 Регистрация в `main.py`

```text
from app.modules.designer.router import router as designer_router
app.include_router(designer_router)
```

`designer/router.py`:

```text
APIRouter(prefix="/designer", tags=["designer"])
  include object_types.router
  include field_definitions.router
  include relation_definitions.router
  include publish.router

APIRouter(prefix="/runtime/platform-metadata", tags=["runtime-platform-metadata"])
  include runtime_catalog.router   # read-only
```

**Важно:** runtime catalog **вне** `/designer` prefix — явное разделение write (designer) vs read (runtime).

---

## 6. Database Strategy

### 6.1 Принципы

| Принцип | Решение |
|---------|---------|
| Отдельно от legacy | Префикс таблиц `designer_*` |
| Tenant isolation | `tenant_id` на всех таблицах |
| Versioning | `catalog_version` + immutable snapshots |
| Draft | Editable rows; runtime never reads |
| Published | Snapshot JSON immutable |
| Migrations | **Alembic revision(s) только для designer_*** (не полагаться на `create_all` для prod) |
| FK | `tenant_id` → `portals.id` (interim) |

### 6.2 Таблицы Slice 1

| Table | Назначение | Mutable |
|-------|------------|---------|
| `designer_object_types` | Head ObjectType | yes (draft fields) |
| `designer_field_definitions` | Fields per ObjectType | yes (draft only) |
| `designer_relation_definitions` | Relations | yes (draft only) |
| `designer_metadata_snapshots` | Published catalog | **immutable** |
| `designer_publish_records` | Audit | **append-only** |

**Optional Slice 1.1:** `designer_object_type_versions` — если нужен per-ObjectType publish history без full catalog snapshot.

### 6.3 Связи (ER logical)

```text
portals (tenant)
  └── designer_object_types (1:N)
        └── designer_field_definitions (1:N)

designer_object_types (N:M via relation_definitions)
  from_object_type_id ── designer_relation_definitions ── to_object_type_id

designer_metadata_snapshots (per tenant, many versions)
designer_publish_records → snapshot_id FK
```

### 6.4 Индексы (минимум)

- `UNIQUE (tenant_id, key)` on `designer_object_types`
- `UNIQUE (tenant_id, object_type_id, key)` on `designer_field_definitions`
- `UNIQUE (tenant_id, key)` on `designer_relation_definitions`
- `INDEX (tenant_id, catalog_version DESC)` on `designer_metadata_snapshots`

### 6.5 Что НЕ хранить в designer tables

- Table rows / column values (`universal_table_rows`)
- RuntimeRepresentation / ViewSession
- Block/section/page layout
- Workflow/Process instances
- User personalization

---

## 7. API Contracts

### 7.1 Общие правила

| Rule | Value |
|------|-------|
| Base URL | `{api}/designer/tenants/{tenant_id}/...` |
| Auth | `get_current_user` (existing) |
| Designer write roles | `platform_designer`, `admin`, `superadmin` (определить в constants) |
| Runtime read roles | any authenticated runtime user with portal access to tenant |
| Content-Type | JSON |
| Errors | 409 conflict (duplicate key), 422 validation, 404 not found |
| Runtime impact | Write APIs: **none** on legacy. Read catalog: **additive** |

### 7.2 Designer — ObjectTypes

| Method | Path | Purpose | Runtime impact |
|--------|------|---------|----------------|
| GET | `/designer/tenants/{tenant_id}/object-types` | List (draft heads + publish metadata summary) | none |
| POST | `.../object-types` | Create ObjectType (draft) | none |
| GET | `.../object-types/{id}` | Get with fields count, draft status | none |
| PATCH | `.../object-types/{id}` | Update draft head | none |
| DELETE | `.../object-types/{id}` | Archive (soft) if no published dep | none |

**Ownership:** Designer Layer. **Permissions:** designer role. **Tenant:** path param enforced in service.

### 7.3 Designer — FieldDefinitions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `.../object-types/{object_type_id}/fields` | List fields |
| POST | `.../object-types/{object_type_id}/fields` | Create field |
| PATCH | `.../fields/{field_id}` | Update field |
| DELETE | `.../fields/{field_id}` | Delete field (if draft-only) |
| POST | `.../fields/reorder` | Optional: position update |

**Validation:** field_type in allowlist; relation fields reference valid ObjectType keys.

### 7.4 Designer — RelationDefinitions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/designer/tenants/{tenant_id}/relations` | List all relations for tenant |
| POST | `.../relations` | Create relation definition |
| PATCH | `.../relations/{id}` | Update |
| DELETE | `.../relations/{id}` | Delete (draft) |

**Validation:** from/to exist same tenant; no self-loop unless allowed; cardinality enum.

### 7.5 Designer — Publish

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/designer/tenants/{tenant_id}/publish/validate` | Dry-run validation report |
| POST | `/designer/tenants/{tenant_id}/publish` | Build snapshot + bump catalog_version |
| GET | `/designer/tenants/{tenant_id}/publish/history` | List PublishRecords |
| GET | `/designer/tenants/{tenant_id}/publish/latest` | Latest publish metadata (not full snapshot) |

**Publish body (optional):** `{ "object_type_ids": [...] }` or full tenant catalog — Slice 1: **full tenant catalog publish** (проще).

### 7.6 Runtime — Platform Metadata (read-only)

| Method | Path | Purpose | Runtime impact |
|--------|------|---------|----------------|
| GET | `/runtime/platform-metadata/tenants/{tenant_id}/catalog` | Latest **published** snapshot | additive read |
| GET | `.../catalog/version` | `{ catalog_version, published_at }` only | caching |
| GET | `.../object-types` | Denormalized list from snapshot | optional convenience |

**Запрещено:** POST/PATCH/DELETE on runtime-catalog routes.

**Ownership:** Publish Layer (data); Runtime Catalog Service (read API only).

### 7.7 API — что НЕ делать в Slice 1

- `/universal-tables/*` для designer metadata
- `/object-types` без tenant prefix (leak risk)
- Embedded publish в PATCH object-type (explicit publish only)

---

## 8. Frontend Architecture

### 8.1 Принципы

| Принцип | Решение |
|---------|---------|
| Отдельный контур | `frontend/src/designer/` — shell + routes |
| Не в PortalPageView | No imports from portal canvas |
| API layer | `frontend/src/designer/api/` — axios wrappers |
| State | Slice 1: React state + context; Zustand optional Slice 1.1 |
| Reuse UI | `shared/ui`, `admin` form patterns where neutral |
| Auth | Same `apiClient`; designer role guard |

### 8.2 Структура каталогов

```text
frontend/src/designer/
├── index.js                    # public exports if needed
├── routes/
│   └── DesignerRoutes.jsx
├── shell/
│   ├── DesignerShell.jsx       # layout: sidebar + outlet
│   ├── DesignerSidebar.jsx
│   └── DesignerTopBar.jsx
├── pages/
│   ├── DesignerHomePage.jsx
│   ├── ObjectTypeListPage.jsx
│   ├── ObjectTypeEditorPage.jsx
│   └── RelationListPage.jsx    # or embedded in editor
├── components/
│   ├── objectType/
│   ├── fields/
│   │   ├── FieldList.jsx
│   │   └── FieldEditorPanel.jsx
│   ├── relations/
│   │   └── RelationForm.jsx
│   └── publish/
│       ├── PublishValidationPanel.jsx
│       └── PublishConfirmDialog.jsx
├── api/
│   ├── designerClient.js       # base path /designer/tenants/:id
│   ├── objectTypesApi.js
│   ├── fieldsApi.js
│   ├── relationsApi.js
│   └── publishApi.js
├── hooks/
│   ├── useDesignerTenant.js
│   └── usePublishFlow.js
├── context/
│   └── DesignerContext.jsx     # tenantId, user, draft dirty flags
└── utils/
    └── fieldTypeRegistry.js    # Slice 1 field type metadata
```

**Не использовать:** `frontend/src/modules/universalTable/*` в designer pages.

### 8.3 Routing (App.jsx integration — описание only)

| Path | Page |
|------|------|
| `/designer` | Redirect → `/designer/tenant/:tenantId` |
| `/designer/tenant/:tenantId` | DesignerHomePage |
| `/designer/tenant/:tenantId/objects` | ObjectTypeListPage |
| `/designer/tenant/:tenantId/objects/:objectTypeId` | ObjectTypeEditorPage (tabs: General, Fields, Relations inline optional) |
| `/designer/tenant/:tenantId/relations` | Relation list (optional separate) |
| `/designer/tenant/:tenantId/publish` | Publish center (validate + publish) |

**Guard:** `ProtectedDesignerRoute` — role check (не смешивать с `/admin` unless intentional).

### 8.4 Stores (Slice 1 MVP)

| Store / Context | Responsibility |
|-----------------|----------------|
| `DesignerContext` | `tenantId`, `catalogVersion` (read-only hint), navigation |
| Local page state | ObjectType editor form |
| `usePublishFlow` | validate → publish → show catalog_version |

**Не создавать:** global `window.__*`; CustomEvent bus for designer state.

---

## 9. Designer Shell

### 9.1 Внешний вид (logical)

```text
┌──────────────────────────────────────────────────────────┐
│ Designer TopBar   [Tenant: Portal X]  [Publish] [User]   │
├────────────┬─────────────────────────────────────────────┤
│ Sidebar    │  Main workspace (Outlet)                    │
│ · Home     │                                             │
│ · Objects  │                                             │
│ · Relations│                                             │
│ · Views *  │  * disabled / placeholder                   │
│ · Processes*│ * placeholder                              │
│ · Publish  │                                             │
│ · Settings │                                             │
└────────────┴─────────────────────────────────────────────┘
```

### 9.2 Separation от Runtime UI

| Aspect | Designer | Runtime |
|--------|----------|---------|
| Route prefix | `/designer/...` | `/portal/...`, `/tasks`, `/universal-table` |
| Layout component | `DesignerShell` | `PortalLayout` |
| Data APIs | `/designer/*` | legacy + future `/runtime/platform-metadata` |
| State | DesignerContext | portal/section/table state |
| Visual cue | «Конструктор платформы» / analyst mode | рабочий портал |

### 9.3 Designer Workspace boundaries (Slice 1)

| INCLUDE | EXCLUDE |
|---------|---------|
| Sidebar navigation | Composable multi-panel workspace |
| Single-tenant context per URL | Cross-tenant federation |
| Draft editing surfaces | RuntimeRepresentation editors |
| Publish action in top bar | Embedded table view |

### 9.4 Designer session

- **Designer session** = auth session (existing JWT/cookie) + `tenantId` from route.
- **Не путать** с ViewSession (GLOSSARY).

---

## 10. MVP Screens

### 10.1 Designer Home

| Element | Behavior |
|---------|----------|
| Welcome + tenant name | Read-only |
| Stats cards | Count object types, fields, relations (draft) |
| Last publish | `catalog_version`, `published_at` from API |
| CTA | «Создать ObjectType», «Перейти к публикации» |

### 10.2 ObjectType List

| Element | Behavior |
|---------|----------|
| Table/cards | key, name, fields count, draft/published badge |
| Actions | Create, Open, Archive |
| Filter | Search by name/key |

### 10.3 ObjectType Editor

| Tab | Content |
|-----|---------|
| **General** | name, key, description, icon, color |
| **Fields** | Field list + add/edit drawer (Field Designer) |
| **Relations** | Outgoing relations list + add (optional tab) |

**Dirty state:** local «есть несохранённые изменения»; не global dirty.

### 10.4 Field Designer (panel)

| Field type | Config UI (MVP) |
|------------|-------------------|
| text / long_text | min/max length optional |
| number | min/max optional |
| boolean | default |
| date/datetime | — |
| choice / multi_choice | options list |
| user | — |
| relation | target ObjectType picker |

### 10.5 Relation Designer

| Screen | Behavior |
|--------|----------|
| Relation list (tenant-wide) | from → relation → to, cardinality |
| Relation form modal | create/edit |

### 10.6 Publish (can be page or modal)

| Step | UI |
|------|-----|
| Validate | Show errors/warnings list |
| Confirm | Dialog with summary counts |
| Success | Display new `catalog_version` |

---

## 11. Publish Flow MVP

### 11.1 State machine (tenant catalog)

```text
[Draft workspace]
   designer_object_types + fields + relations (editable)

        │ POST /publish/validate
        ▼
[Validation report] ──errors──► stop

        │ POST /publish (transaction)
        ▼
[PublishRecord created]
[MetadataSnapshot inserted]  (immutable)
[catalog_version++]

        ▼
[Runtime Available]
```

### 11.2 Validation rules (MVP)

| Rule | Severity |
|------|----------|
| Unique `key` per tenant for ObjectTypes | error |
| Each ObjectType has ≥0 fields (warning if 0) | warning |
| Field `key` unique per ObjectType | error |
| Relation from/to reference existing ObjectTypes in tenant | error |
| field_type in allowlist | error |
| choice fields have ≥1 option | error |
| No archived ObjectType in publish set | error |
| Circular relation policy (optional) | warning |

### 11.3 Publish transaction (atomic)

1. Load all draft entities for `tenant_id`.
2. Run validators.
3. Build canonical JSON snapshot (sorted keys, stable order).
4. Insert `designer_metadata_snapshots` with `catalog_version = max+1`.
5. Insert `designer_publish_records`.
6. Optional: mark ObjectTypes `last_published_at` on head (not required for runtime read).

**Не делать в MVP:** delete draft after publish; runtime still uses draft workspace for next edit cycle.

### 11.4 Runtime availability semantics

- **Available** = latest snapshot exists for tenant.
- Runtime **never** reads partial publish.
- Old snapshot retained for audit/rollback analysis (Slice 2: rollback UI).

---

## 12. Runtime Consumption MVP

### 12.1 Strategy

| Principle | Implementation |
|-----------|----------------|
| No legacy rewrite | New read API only |
| No UT controller changes | Optional thin hook later |
| Read-only | `runtime_catalog` module |
| Cache-friendly | Return `catalog_version` + ETag header (optional) |

### 12.2 Consumer types (Slice 1)

| Consumer | Slice 1 usage |
|----------|----------------|
| Debug/admin page | Simple JSON viewer of catalog |
| Future Table View Engine adapter | Slice 2 — map columns from FieldDefinitions |
| Future Entity Service | Slice 2+ |
| UniversalTableView | **DO NOT wire in Slice 1** |

### 12.3 Runtime read flow

```text
Runtime app (future or debug page)
  → GET /runtime/platform-metadata/tenants/{tenant_id}/catalog
  → receives DesignerMetadataSnapshot payload
  → uses object_types + fields + relations for rendering/config only
```

### 12.4 Compatibility bridge (explicitly later)

| Bridge | When |
|--------|------|
| `universal_tables` columns ← FieldDefinitions | Slice 2 Table View Engine |
| Entity rows ← Entity API | Slice 2+ |
| Admin «import catalog to table» | Not Slice 1 |

---

## 13. Safe Implementation Order

### 13.1 Dependency graph

```text
                    ┌─────────────────┐
                    │ DB tables +     │
                    │ Alembic rev     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ObjectType repo   Field repo    Relation repo
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ObjectType/Field/Relation
                         services
                             │
                             ▼
                    Designer write APIs
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       PublishService                  DesignerShell (FE)
              │                             │
              ▼                             ▼
       Snapshot + Publish API          ObjectType UI
              │                             │
              ▼                             ▼
       Runtime catalog API            Field + Relation UI
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    Publish UI + E2E test
                             ▼
                    Runtime read smoke (debug)
```

### 13.2 Phased steps (recommended)

| Phase | Step | Deliverable |
|-------|------|-------------|
| **A** | 1 | Alembic + SQLAlchemy models (all designer tables) |
| **A** | 2 | Repositories + unit tests for validators |
| **A** | 3 | ObjectType service + router |
| **A** | 4 | FieldDefinition service + router |
| **A** | 5 | RelationDefinition service + router |
| **B** | 6 | PublishService + publish router |
| **B** | 7 | Runtime catalog read service + router |
| **C** | 8 | Register routers in `main.py`; OpenAPI smoke |
| **D** | 9 | DesignerShell + routes + auth guard |
| **D** | 10 | designer API client layer |
| **D** | 11 | ObjectType List + Editor (General) |
| **D** | 12 | Field Designer panel |
| **D** | 13 | Relation Designer |
| **D** | 14 | Publish UI + E2E: publish → read catalog |
| **E** | 15 | Internal debug page for runtime catalog (optional) |

**Foundation first:** A → B → C before D. **Metadata first:** ObjectType → Field → Relation before Publish.

---

## 14. Legacy Runtime Boundaries

### 14.1 Нельзя трогать (кроме точечных bugfix)

| Legacy area | Reason |
|-------------|--------|
| `useUniversalTableController.js` | Giant controller; no new ownership |
| `useUniversalTableEvents.js` | CustomEvent bus |
| `PortalPageView.jsx` | Runtime/designer mix risk |
| `UniversalTableView.jsx` | No designer embedding |
| `useSectionUniversalTableControls.js` | Split-brain view state |
| `useUniversalTableDispatch.js` / `useTableStateEvents.js` | Hidden sync |
| `tableSessionStore` (partial) | Complete only per Runtime Foundation Plan |
| `universal_tables` models/service | Not metadata SoT |
| Global `window.__UNIVERSAL_TABLE_*` | No new globals |
| `window.__YASNOPRO_*` navigation hacks | No new coupling |

### 14.2 Нельзя расширять

| Pattern | Reason |
|---------|--------|
| New features in `universal_tables` schema for ObjectType | Wrong layer |
| Designer routes inside `App.jsx` portal tree | Separation |
| Storing designer draft in `block.settings` / localStorage | Wrong persistence |
| CustomEvent `universal-table:*` for designer | EVENT_BUS model |

### 14.3 Нельзя использовать как foundation

| Legacy | Replacement |
|--------|-------------|
| `universal_table_columns` as FieldDefinition | `designer_field_definitions` |
| `universal_views` as ViewTemplate | Slice 2 designer_view_templates |
| `blocks` JSON for ObjectType | designer tables |
| Admin pages as Designer Shell | separate `/designer` |

### 14.4 Разрешено параллельно (Runtime Foundation)

- Local bugfix in legacy (1 bug / 1 patch).
- Ownership cleanup **only** if bounded and documented in Runtime Foundation Plan (file currently empty — заполнить).

---

## 15. Risks

| ID | Risk | Type | Mitigation |
|----|------|------|------------|
| R1 | Implementing designer inside admin/portal UI | ownership | Enforce `/designer` route + code review checklist |
| R2 | `tenant_id` = portal confusion | tenant | Document in API; SCOPE_TENANT alignment |
| R3 | `create_all` vs Alembic drift | migration | Designer tables only via Alembic |
| R4 | Publish without atomic transaction | data | Single DB transaction in PublishService |
| R5 | Runtime reads draft via misconfigured API | security | Separate router; integration tests deny draft paths |
| R6 | Duplicate keys across modules | data | DB unique constraints + 409 |
| R7 | Scope creep (ViewTemplate, Entity) | process | Stick to DESIGNER_FOUNDATION_PLAN OUT list |
| R8 | Early wiring into UniversalTable | runtime | Explicit «DO NOT» in PR template |
| R9 | Architectural drift (terminology) | docs | PR requires GLOSSARY terms |
| R10 | Empty RUNTIME_FOUNDATION_PLAN | parallel work | Fill plan before large legacy touches |

---

## 16. Recommended First Code Step

**Первый коммит кода (один vertical slice, minimal UI):**

1. **Alembic migration** creating `designer_object_types` only (+ `tenant_id`, unique key).
2. **SQLAlchemy model** + repository + service + **one endpoint**:  
   `POST /designer/tenants/{tenant_id}/object-types`  
   `GET /designer/tenants/{tenant_id}/object-types`
3. **Register router** in `main.py`.
4. **Smoke test** (manual or pytest): create + list ObjectType for `tenant_id=1`.
5. **No frontend** in commit 1 (optional commit 2: DesignerShell stub route).

**Почему это первый шаг:**

- Проверяет tenant boundary + module wiring без publish complexity.
- Не затрагивает legacy files.
- Даёт foundation для Field/Relation FK.
- Соответствует «backend first, metadata first» (Designer Foundation Plan §709–721).

**Второй коммит:** Field definitions nested under ObjectType.  
**Третий коммит:** Relations.  
**Четвёртый:** Publish + snapshot + runtime catalog GET.  
**Пятый:** Designer Shell + ObjectType List UI.

---

## Appendix A — Alignment checklist (pre-PR)

Перед каждым PR:

1. Это Designer или Runtime?  
2. Это metadata или runtime state?  
3. Кто owner сущности?  
4. Это draft или published path?  
5. Есть ли `tenant_id` на всех запросах?  
6. Затронуты ли legacy forbidden files? (должно быть **нет**)  
7. Термины из GLOSSARY (RuntimeRepresentation, ViewTemplate, …)?  

---

## Appendix B — Slice 2 preview (не реализовывать)

- ViewTemplate Designer + LayoutTemplate  
- Entity + EntityValue + Entity API  
- Table View Engine adapter (read catalog → column model)  
- Permissions Designer  
- Process/Workflow definition UI (non-executable)  
- Event Engine domain events on publish  

---

*Blueprint соответствует `YASNOPRO_DESIGNER_FOUNDATION_PLAN.md`, `YASNOPRO_ARCHITECTURE_DIRECTION.md`, GLOSSARY, VIEW_OWNERSHIP, SCOPE_TENANT, TECHNICAL_ARCHITECTURE. Код не включён.*
