# Contextual Header Search — Audit & Architecture

## STATUS

```text
AUDIT COMPLETE — code analysis and architecture design only (2026-05-30)
```

**Work item:** Object Search (единый контекстный поиск платформы из шапки приложения).

**Scope:** аудит существующей инфраструктуры + проектирование модели области поиска для **Офис** (Runtime) и **Студия** (Designer).

**Out of scope (на этом этапе):** реализация кода, изменение App Header, маршрутов, Dashboard, Object Platform.

---

## 1. Current Search State

### 1.1. Executive summary

| Вопрос | Ответ |
|--------|--------|
| Есть ли единый search API платформы? | **Нет** |
| Работает ли поиск в App Header сегодня? | **UI есть, функциональность отсутствует** |
| Где живёт state строки поиска в production? | Локально в `PortalPageView` / `PortalObjectRuntimePage` |
| Есть ли Search Context Resolver? | **Нет** |
| Что реально ищет по тексту? | Только **локальные** и **доменные** поиски (библиотека, чаты, users, списки в UI) |

**Главный вывод:** инфраструктура **App Header Search** подготовлена на уровне contract/renderer, но **не подключена к поисковым backend-операциям**. Область поиска **нигде не вычисляется автоматически**.

---

### 1.2. Frontend — App Header & Shell

#### AppHeaderRenderer

Файл: `frontend/src/shared/shell/header/components/AppHeaderRenderer.jsx`

- Поле поиска всегда рендерится в правой зоне header.
- Интерактивность: `search.enabled` + `capabilities.canSearch`.
- События: `changeActionKey` / `clearActionKey` (fallback: `"search-change"` / `"search-clear"`).
- Placeholder по умолчанию: `"Поиск по системе..."`.
- **Нет:** debounce, submit, overlay результатов, keyboard navigation, связи с API.

#### AppHeaderContract / HeaderSearchContract

Файл: `frontend/src/shared/shell/header/headerContracts.ts`

```typescript
HeaderSearchContract = {
  enabled, value, placeholder, disabled, readOnly,
  actionKey, changeActionKey, clearActionKey
}
```

Contract описывает **только input**, не scope, не results, не ranking.

#### Header adapters

Файл: `frontend/src/shared/shell/header/headerAdapters.ts`

| Adapter | Search behavior |
|---------|-----------------|
| `createRuntimeHeaderContract` | `buildRuntimeSearch`: enabled если `canSearch !== false`, value из `searchQuery` |
| `createDesignerHeaderContract` | search enabled **только** если `canSearch === true` (сейчас всегда false в production) |

Runtime placeholder: `"Поиск по системе..."`.  
Designer reuse runtime search builder через `toDesignerRuntimeLikeInput`.

#### Production wiring (Runtime)

```text
PortalPageView / PortalObjectRuntimePage
  └─ useState(searchQuery)
      └─ WorkspaceTopBar (searchQuery, onChangeSearchQuery)
          └─ createRuntimeHeaderContract(...)
              └─ AppHeaderRenderer
                  onAction("search-change") → setSearchQuery
```

**Критично:** `searchQuery` в `PortalPageView.jsx` используется только для:

- передачи в `WorkspaceTopBar`;
- shadow snapshot (`emitRuntimeShadowSnapshot`).

**Ни один workspace-компонент не читает header `searchQuery`.**

#### Production wiring (Designer)

Файл: `frontend/src/modules/designer/components/shell/DesignerShell.jsx`

```javascript
searchQuery: "",
canSearch: false,
```

Поиск в header **намеренно отключён**. Legacy `DesignerHeader.jsx` (disabled input с другим placeholder) **не используется** — shell уже на `AppHeaderRenderer`.

#### AppShell Provider (canonical, not in production)

Файлы:

- `frontend/src/shared/shell/provider/AppShellProvider.jsx`
- `frontend/src/shared/shell/provider/appShellContracts.ts`
- `frontend/src/shared/shell/provider/appShellTypes.ts`

| Concern | State |
|---------|--------|
| `AppShellSearchState` | `{ value, enabled }` |
| Reducer action | `SET_SEARCH_VALUE` → `shell.header.search.set-value` |
| Header contract build | `searchQuery: state.search.value`, `canSearch: state.capabilities.canSearch` |
| Production connection | **Не подключён** (Phase 6.6 skeleton, см. `YASNOPRO_APPSHELL_PROVIDER_DESIGN.md`) |

#### Search action keys (зарезервированы)

Файл: `frontend/src/shared/shell/actions/appShellActionKeys.ts`

| Key | Назначение |
|-----|------------|
| `shell.header.search.set-value` | изменение value (local) |
| `shell.header.search.clear` | очистка |
| `shell.header.search` | submit search (не реализован) |
| `shell.search.submit` | **зарезервирован**, handler отсутствует |

---

### 1.3. Shell — context signals (без search resolver)

Существующие механизмы **контекста навигации**, пригодные как inputs для Search Context Resolver:

| Mechanism | File | Что даёт |
|-----------|------|----------|
| Route pathname | `App.jsx`, layouts | mode, section, ids |
| `activeNavigationItem` | `PortalPageView`, `useNavigationTree` | type, page_id, library_id, object_type_id |
| `libraryContextPath` | `PortalPageView` + `LibraryPageView.onContextPathChange` | root + folder breadcrumb chain |
| Header breadcrumbs meta | `PortalPageView` | `scope: document-library-root \| document-library-folder` |
| `resolveDesignerRouteOwner` | `designerRouteOwnership.js` | objects_section / root_section / object_shortcut |
| `buildDesignerBreadcrumbs` | `designerNavigationResolver.js` | tab (fields, views, relations, …) |
| `PORTAL_OBJECT_VIEW_HEADER_EVENT` | `portalObjectViewHeaderBridge` | active view adapter label (Таблица, …) |
| Entity card modal | `yasnopro:open-entity-card` event | entityId in overlay (не в URL) |

**Route ownership (Designer)** — sessionStorage-backed, решает breadcrumb/sidebar active state, **не search scope**.

**Workspace context** — размазан по page layouts; единого `WorkspaceContext` типа нет.

---

### 1.4. Backend — search endpoints

#### Сводная таблица

| Domain | Endpoint | Text search | Scope param | Ranking |
|--------|----------|-------------|-------------|---------|
| Document libraries | `GET /document-libraries/{id}/documents/search?query=` | `ilike %query%` по title, type, filename, author, dates | **Вся библиотека** (не папка) | updated_at desc |
| Users | `GET /users/?search=` | `ilike` start/word on name, email start | global users | name asc |
| Chats | `GET /chats?search=` | `ilike %query%` on title | user's chats | — |
| Platform runtime query | `GET /runtime/query/tenants/{id}/{object_type_key}` | **Нет** — только `filter.{field}` exact match | object type | sort field |
| Platform designer lists | `GET /designer/tenants/{id}/object-types`, `/fields`, `/views`, `/relations` | **Нет query param** | tenant / object type | list order |
| Comments | `GET /comments?entity_type=&entity_id=` | **Нет** | per entity | — |
| Notes | `GET /notes?...` | **Нет** | per entity | — |
| Navigation | tree API | **Нет** | portal | — |
| Universal tables (legacy) | table APIs | client-side `contains` filter | table block | client |

#### Document library — детали

- Backend: `backend/app/modules/document_libraries/service.py` → `search_documents`.
- Frontend API: `searchLibraryDocuments` в `documentLibrariesApi.js`.
- Hook: `useLibraryDocuments` — при непустом `searchQuery` вызывает **global library search**, иначе folder listing.
- **Дублирование UX:** `LibraryToolbar` имеет **собственное** поле поиска, не связанное с App Header.
- Client filter: `filterDocuments()` — дополнительная фильтрация уже загруженных items (`includes` case-insensitive).

#### Platform runtime query — ограничение

`backend/app/modules/platform/runtime/query/repository.py`:

- Filters: **exact equality** на `RuntimeEntityValue.value_json`.
- **Нет** substring / full-text / multi-field search.
- **Нет** cross-object-type query.

Для Object Search по runtime entities потребуется **новый search слой** поверх EAV (`RuntimeEntity` + `RuntimeEntityValue`).

---

### 1.5. Локальные UI-поиски (не header)

| Location | Pattern | Scope |
|----------|---------|-------|
| `ObjectTypesList.jsx` | client `includes` on name/key | designer object types page |
| `LibraryToolbar` + `useLibraryDocuments` | API + client filter | document library workspace |
| `ChatSidebar.jsx` | client filter on title/description | corporate chat page |
| `AdminUsersPage.jsx` | client filter | admin users |
| `UniversalTreeView.jsx` | client tree filter | legacy UT |
| `tableViewUtils.js` | operator `contains` | legacy table filters |

**Паттерн:** `query.trim().toLowerCase()` + `includes()` — соответствует требованию case-insensitive substring, **без ranking**.

---

### 1.6. Gap analysis

```text
┌─────────────────────────────────────────────────────────────┐
│ App Header Search UI          ████████████░░░░  ~60% shell  │
│ Search value state            ██████░░░░░░░░░░  local only  │
│ Search context resolution     ░░░░░░░░░░░░░░░░  0%          │
│ Unified search API            ░░░░░░░░░░░░░░░░  0%          │
│ Results overlay               ░░░░░░░░░░░░░░░░  0%          │
│ Ranking (exact/start/contains)░░░░░░░░░░░░░░░░  partial*    │
└─────────────────────────────────────────────────────────────┘
  * partial: users API (start/word), docs API (contains ilike), client lists (contains)
```

---

## 2. Search Context Model

### 2.1. Принцип

```text
mode
 ↓
scope
 ↓
search execution
```

- **mode** — `runtime` (Офис) | `designer` (Студия) | `admin` (подмножество runtime).
- **scope** — автоматически вычисляемая область; пользователь **не выбирает** вручную.
- **search execution** — adapter к конкретному API / client index + единый ranking + results overlay.

### 2.2. Типы данных

```typescript
type SearchMode = "runtime" | "designer" | "admin";

type SearchScopeKind =
  // Runtime
  | "runtime.company"           // вся компания / portal
  | "runtime.object_section"      // objects текущего navigation item (object_type)
  | "runtime.object_entity"     // внутри открытой карточки entity
  | "runtime.document_library"  // вся библиотека
  | "runtime.document_folder"   // папка + вложенные
  | "runtime.page"              // контент текущей portal page (blocks)
  | "runtime.admin_section"     // текущий admin раздел
  | "runtime.chat"              // корпоративный чат
  // Designer
  | "designer.tenant"           // весь конструктор tenant
  | "designer.object_type"      // текущий object type (all tabs metadata)
  | "designer.relations"        // relation definitions tenant-wide
  | "designer.fields"           // fields текущего object type
  | "designer.views"            // views текущего object type
  | "designer.navigation"       // navigation designer (future)
  | "designer.pages"            // pages designer (future)
  | "designer.platform";        // platform dashboard section

type SearchContext = {
  mode: SearchMode;
  scope: SearchScopeKind;
  tenantId: number;
  portalId?: number;
  // Runtime anchors
  navigationItemId?: number;
  navigationItemType?: string;
  objectTypeKey?: string;
  objectTypeId?: string;
  entityId?: string;           // when entity card open
  entityCardTab?: string;       // active tab in card
  libraryId?: number;
  folderId?: number | null;     // null = library root
  pageId?: number;
  // Designer anchors
  objectTypeUuid?: string;
  designerTab?: string;         // general|fields|relations|views|data|...
  routeOwner?: DesignerRouteOwner;
  // UX
  placeholder: string;
  enabled: boolean;
  depth: number;                // 0 = widest, higher = narrower
};
```

### 2.3. Search Context Resolver

**Новый модуль (design only):** `frontend/src/shared/shell/search/searchContextResolver.ts`

**Inputs:**

| Input | Source |
|-------|--------|
| `pathname`, `searchParams` | react-router |
| `mode` | `/designer/*` vs `/portal/*` vs `/admin/*` |
| `activeNavigationItem` | navigation tree |
| `libraryContextPath` | library breadcrumb events |
| `designerRouteOwner` | `resolveDesignerRouteOwner()` |
| `entityCardOverlay` | global overlay state / event bus |
| `activeDesignerTab` | pathname segment after `object-types/:id/` |

**Output:** `SearchContext` → передаётся в AppShell sources + header meta.

**Правило «чем глубже — тем уже»:** поле `depth` монотонно растёт при углублении в navigation / folder / entity / designer tab.

```text
depth 0  → company / designer.tenant
depth 1  → object section / designer section (relations, object-types list)
depth 2  → object type workspace tab / library root
depth 3  → library folder / entity card
depth 4  → entity card tab (comments, relations, …)
```

### 2.4. Scope resolution rules (Runtime / Офис)

| Контекст UI | Условие (resolver) | Scope | Placeholder (пример) |
|-------------|-------------------|-------|----------------------|
| Главная компании | portal home / dashboard page, нет object/library context | `runtime.company` | «Поиск по компании…» |
| Раздел объектов | `navigationItem.type === object_type` или route `/portal/:id/object-types/:ref` | `runtime.object_section` | «Поиск в {sectionTitle}…» |
| Карточка объекта | entity card modal open **или** dedicated entity route (future) | `runtime.object_entity` | «Поиск в {entityTitle}…» |
| Библиотека — корень | document_library page, `folderPath.length === 0` | `runtime.document_library` | «Поиск по библиотеке…» |
| Библиотека — папка | document_library, `folderPath.length > 0` | `runtime.document_folder` | «Поиск в папке…» |
| Portal page (generic) | обычная page без special type | `runtime.page` | «Поиск на странице…» |
| Admin | `/admin/*` or designer administration mirror | `runtime.admin_section` | «Поиск в {adminSection}…» |
| Corporate chat | corporate chat page | `runtime.chat` | «Поиск в чатах…» |

**Карточка объекта сегодня:** открывается преимущественно как **modal overlay** (`ObjectEntityCardModal`, legacy `EntityCardModal`), не отражена в URL. Resolver **обязан** слушать overlay state / event bus, иначе scope останется `object_section`.

**Inside entity — target domains:**

| Domain | Source today | Search approach |
|--------|--------------|-----------------|
| Вкладки/views | object view host | view names + visible field labels |
| Связанные записи | runtime relations API | related entity titles |
| Документы | file fields / library links | filename, title |
| Заметки | notes API | note body text |
| Комментарии | comments API | comment body text |

---

### 2.5. Scope resolution rules (Designer / Студия)

| Контекст UI | Условие | Scope |
|-------------|---------|-------|
| Главная студии | `/designer/tenant/:id` index / platform home | `designer.tenant` |
| Список object types | `/object-types` | `designer.tenant` (subset: object types) |
| Object type workspace | `/object-types/:id/:tab` | tab-specific (см. ниже) |
| Tab general/settings | tab = general | `designer.object_type` |
| Tab fields | tab = fields | `designer.fields` |
| Tab views | tab = views | `designer.views` |
| Tab relations | tab = relations | `designer.relations` (filtered to object type) |
| Global relations | `/relations` | `designer.relations` |
| Platform section | `/platform/*` | `designer.platform` |
| Administration | `/administration/*` | `runtime.admin_section` (reuse) |

**Route owner integration:** при `OBJECT_SHORTCUT` owner scope object section сужается до **menu shortcut context** (тот же object type, но breadcrumb label из menu).

---

### 2.6. Document library — рекомендация по папкам

**Текущее поведение:** API search всегда по **всей библиотеке**; folder listing — отдельный endpoint с `parent_id`.

**Рекомендуемый вариант (S2):**

| Header context | Search behavior |
|----------------|-----------------|
| Library root | `GET .../search?query=` — **вся библиотека** (как сейчас) |
| Inside folder | `GET .../search?query=&folder_id={id}&recursive=true` — **папка + все вложенные** |

`recursive=true` — default для folder scope (соответствует ожиданию «внутри текущей папки и вложенных»).

Альтернатива «только текущая папка без вложенных» — хуже для UX; допустима как query flag `recursive=false` для power users.

**Миграция UX:** убрать duplicate search из `LibraryToolbar` после подключения header search (Phase S4+).

---

## 3. Runtime Search Scopes — полный список

| ID | Scope kind | Что искать | Backend сегодня | Priority |
|----|------------|------------|-----------------|----------|
| R1 | `runtime.company` | Все object types portal, navigation, libraries, users, chats | **Нет** — federated search | P1 |
| R2 | `runtime.object_section` | Entities текущего object type (title + searchable fields) | partial: query API без substring | P1 |
| R3 | `runtime.object_entity` | Tabs, relations, docs, notes, comments inside entity | partial: per-API list only | P2 |
| R4 | `runtime.document_library` | Documents/folders in library | **Есть** | P1 |
| R5 | `runtime.document_folder` | Documents in folder subtree | **Нет** (needs folder_id) | P1 |
| R6 | `runtime.page` | Blocks/sections titles, legacy table rows on page | client / legacy | P3 |
| R7 | `runtime.admin_section` | Users, roles, org units — по текущему admin route | partial: users search | P2 |
| R8 | `runtime.chat` | Chat titles, messages preview | partial: chat title search | P3 |
| R9 | `runtime.navigation` | Menu items (для edit mode) | client on tree | P3 |

**Object section detection signals:**

- `NavigationItem.object_type_id` + enriched `display_title` (`navigation/enrichment.py`)
- Route `/portal/:portalId/object-types/:objectTypeRef`
- `activeNavigationItem.type === "object_type"`

---

## 4. Designer Search Scopes — полный список

| ID | Scope kind | Что искать | Backend сегодня | Priority |
|----|------------|------------|-----------------|----------|
| D1 | `designer.tenant` | Object types (name, key), sections, pages (future) | list API, client filter in UI | P1 |
| D2 | `designer.object_type` | OT name, key, settings labels | list/get API | P1 |
| D3 | `designer.fields` | Field name, key, type | list fields API | P1 |
| D4 | `designer.views` | View name, key | list views API | P1 |
| D5 | `designer.relations` | Relation name, keys, target types | list relations API | P1 |
| D6 | `designer.navigation` | Nav items, menu placements | menu_placements API | P2 |
| D7 | `designer.pages` | Designer pages | pages API | P2 |
| D8 | `designer.platform` | Platform dashboard artifacts | N/A (mostly static) | P3 |
| D9 | `designer.publish` | Publish history, versions | publish API | P3 |

**Designer tabs mapping** (`DESIGNER_TAB_LABELS` in `designerNavigationResolver.js`):

```text
general → designer.object_type
fields  → designer.fields
views   → designer.views
relations → designer.relations (object-type scoped)
data    → runtime.object_section (preview data — cross-mode)
runtime-preview → exclude from designer metadata search
```

---

## 5. Existing Reusable Components

### 5.1. Можно использовать без переписывания

| Component / module | Reuse for |
|--------------------|-----------|
| `AppHeaderRenderer` search input | UI trigger + controlled value |
| `HeaderSearchContract` + `buildRuntimeSearch` | wiring placeholder, enabled, action keys |
| `AppShellSearchState` + `SET_SEARCH_VALUE` | canonical search value owner (после provider swap) |
| `APP_SHELL_ACTION_KEYS` + `shell.search.submit` | submit / open overlay action |
| `designerRouteOwnership` + `designerNavigationResolver` | scope inputs для Designer |
| `libraryContextPath` + breadcrumb `meta.scope` | library folder vs root |
| `navigation/enrichment` object_type display | section titles in results |
| `document_libraries/search` API + `filterDocuments` | library scope MVP |
| `ObjectTypesList` filter pattern | client-side designer list MVP |
| `users` search API | admin/user picker ranking reference |
| `runtimeReadGateway` | runtime entity reads (extend, not replace) |

### 5.2. Требуют расширения (не reuse as-is)

| Module | Why |
|--------|-----|
| `platform/runtime/query` | exact filters only — нужен substring search |
| `WorkspaceTopBar` action handler | добавить `search-submit`, не только `search-change` |
| `LibraryToolbar` search | deprecate in favor of header (later) |
| Entity card stack | expose `entityId` + active tab to shell context |

### 5.3. Shared ranking utility (новый, design)

```text
shared/search/textMatchRanking.ts
```

**Algorithm** (case-insensitive, Unicode-aware lowercasing):

For each candidate string `text` and query `q`:

| Rank | Condition | Score |
|------|-----------|-------|
| 1 | `text.toLowerCase() === q` | 1000 |
| 2 | `text.toLowerCase().startsWith(q)` | 800 |
| 3 | word boundary start (`/\b${q}/i`) | 600 |
| 4 | `text.toLowerCase().includes(q)` | 400 |
| 5 | fuzzy / translit (optional later) | 200 |

Sort: score desc → label asc → id.

**Backend:** SQL `ILIKE '%' || q || '%'` + `CASE` ordering mirrors client rank.

---

## 6. Backend Strategy

### 6.1. Целевая архитектура API

**Единая точка входа (recommended):**

```http
GET /platform/search/tenants/{tenant_id}
  ?q={query}
  &scope={scope_kind}
  &...scope_params
  &limit=20
  &offset=0
```

**Scope params (examples):**

```text
scope=runtime.object_section     &object_type_key=projects
scope=runtime.document_folder    &library_id=5&folder_id=42&recursive=true
scope=runtime.object_entity      &entity_id=...&domains=notes,comments,relations
scope=designer.fields            &object_type_id=uuid
```

**Response shape (unified):**

```json
{
  "query": "про",
  "scope": "runtime.object_section",
  "items": [
    {
      "id": "...",
      "kind": "runtime.entity",
      "title": "Проект СДС",
      "subtitle": "projects · обновлён ...",
      "rank": 800,
      "href": "/portal/1/object-types/projects?entity=...",
      "meta": { "object_type_key": "projects" }
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 1, "has_more": false }
}
```

### 6.2. Implementation strategy — phased backends

| Phase | API | Notes |
|-------|-----|-------|
| MVP-1 | Extend document search with `folder_id`, `recursive` | Low risk, immediate folder scope |
| MVP-2 | `designer/search` dispatcher — in-memory filter over list endpoints | Matches current list sizes |
| MVP-3 | `runtime/search/entities` — PostgreSQL ILIKE on title field + text fields in EAV | Requires title_field from catalog |
| MVP-4 | `runtime/search/company` — federate R3 across published object types | Async gather + merge + rank |
| MVP-5 | Entity interior search (notes, comments) | Add `q` param to modules |

### 6.3. Runtime entity search (SQL sketch)

```sql
-- Pseudocode: search within object_type
SELECT e.id, title_value, ...
FROM runtime_entities e
JOIN runtime_entity_values title ON ...
WHERE e.tenant_id = :tenant
  AND e.object_type_key = :key
  AND e.deleted_at IS NULL
  AND (
    title.value_json #>> '{}' ILIKE '%' || :q || '%'
    OR EXISTS (text fields ILIKE ...)
  )
ORDER BY
  CASE WHEN lower(title) = lower(:q) THEN 1
       WHEN lower(title) LIKE lower(:q) || '%' THEN 2
       WHEN lower(title) LIKE '%' || lower(:q) || '%' THEN 3
       ELSE 4 END,
  title ASC
LIMIT :limit OFFSET :offset
```

**Catalog dependency:** `title_field` from published view projection (`ViewProjectionMeta.title_field`).

### 6.4. What NOT to do

- Не расширять legacy `universal_tables` API для нового header search.
- Не добавлять substring в `filter.{field}` runtime query (semantically exact match).
- Не строить company search только client-side (объём данных).

---

## 7. Frontend Strategy

### 7.1. Pipeline

```text
route + workspace signals
        ↓
searchContextResolver.resolve()
        ↓
AppShellSources.searchContext
        ↓
buildHeaderContract() → placeholder, enabled, meta.scope
        ↓
AppHeaderRenderer (input)
        ↓ on submit / debounced change
searchExecutionService.search(context, q)
        ↓
SearchResultsOverlay (new shell overlay)
        ↓ on select
navigate(href) | openEntityCard | focus tab
```

### 7.2. Header integration (без изменения renderer layout)

Расширение **contract meta**, не JSX:

```typescript
AppHeaderContract.meta.searchContext = SearchContext
HeaderSearchContract.placeholder = context.placeholder
```

Actions:

| Event | Handler |
|-------|---------|
| `shell.header.search.set-value` | update query state |
| `shell.search.submit` | execute search, open overlay |
| `shell.header.search.clear` | clear query + close overlay |

**Debounce:** 300ms для typeahead; Enter → immediate submit.

### 7.3. SearchResultsOverlay (new)

Shell-level overlay (аналог notification dropdown):

- grouped by result `kind`
- keyboard: ↑↓ navigate, Enter open, Esc close
- empty state / loading / error per scope
- показывать **active scope label** («Поиск в: Проекты») — read-only, не dropdown

### 7.4. Context propagation for library

Replace duplicate toolbar search:

```text
header search change
  → searchContext.scope = document_library | document_folder
  → documentSearchAdapter
  → LibraryPageView listens via shell event OR shared context
```

Until provider swap: CustomEvent bridge `yasnopro:header-search` (same pattern as `yasnopro:library:go-folder`).

### 7.5. Entity card context

Register overlay with shell:

```text
ObjectEntityCardModal onOpen → publishSearchAnchor({ entityId, objectTypeKey, tab })
onClose → clearSearchAnchor()
```

While modal open, resolver elevates scope to `runtime.object_entity` **over** table view scope.

### 7.6. Designer enablement

`DesignerShell`: change `canSearch: false` → `true` when `SearchContext.enabled`.

Pass `searchQuery` from shell state, wire `onChangeSearchQuery` in `handleHeaderAction`.

---

## 8. Recommended Implementation Phases

### S1 — Search Context Resolver

**Deliverables:**

- `searchContextResolver.ts` + unit tests on pathname fixtures
- `SearchContext` type exported from `shared/shell/search`
- Integration read-only: log context in dev shadow preview

**Fixtures:** portal home, object type section, library root/folder, designer object-type tabs, relations root.

---

### S2 — Runtime Search API

**Deliverables:**

- Document search: `folder_id`, `recursive`
- `GET /platform/search/.../entities` for single object type substring search
- Ranking CASE in SQL
- Frontend `runtimeSearchAdapter`

**MVP scopes:** R4, R5, R2.

---

### S3 — Designer Search API

**Deliverables:**

- `designerSearchAdapter` — server or client over list endpoints
- Scopes: D1, D3, D4, D5 (+ D2 via object type tab)

**Note:** acceptable MVP — **client filter** on already-loaded lists for Designer (low cardinality), with shared ranking util.

---

### S4 — Header Search UI

**Deliverables:**

- Wire `shell.search.submit`
- Dynamic placeholder from `SearchContext`
- Enable designer search (`canSearch: true`)
- Debounced execution
- Connect AppShellProvider OR bridge through WorkspaceTopBar (production path of least resistance)

**Do not:** redesign header layout.

---

### S5 — Search Results Overlay

**Deliverables:**

- `SearchResultsOverlay` component in AppShell
- Navigate on select
- Entity card open action
- Scope indicator
- Remove `LibraryToolbar` search duplicate (optional sub-task)

---

### S6 — Company-wide & Entity interior (follow-up)

- R1 federated company search
- R3 notes/comments/relations inside entity
- R7 admin sections

---

## 9. Answers to Definition of Done

### Где искать?

| Mode | Widest | Narrowest |
|------|--------|-----------|
| Офис | `runtime.company` (portal home) | `runtime.object_entity` (inside entity card tab) |
| Студия | `designer.tenant` (studio home) | `designer.fields` / `designer.views` / tab-specific |

Физически: **всегда App Header Search**; область определяется `SearchContextResolver`.

### Что искать?

Зависит от `SearchScopeKind` (см. §3, §4): entities, documents, designer metadata, notes, comments, relations, navigation.

### Как определять область поиска?

```text
pathname
+ activeNavigationItem (type, object_type_id, library_id)
+ libraryContextPath (folder depth)
+ entityCardOverlay (entityId, tab)
+ designerRouteOwner + designerTab
→ SearchContext { scope, depth, placeholder, params }
```

Правило: **более глубокий контекст перекрывает более широкий** (max depth wins).

### Как реализовать единый поиск для Офиса и Студии?

1. Один `AppHeaderRenderer` input (уже есть).
2. Один `SearchContextResolver` с веткой `mode`.
3. Один `searchExecutionService` с adapter registry по `scope`.
4. Один `SearchResultsOverlay`.
5. Backend: unified `/platform/search` dispatcher → domain adapters.
6. Постепенное включение через phases S1–S5.

---

## 10. Key file reference

| Area | Path |
|------|------|
| Header renderer | `frontend/src/shared/shell/header/components/AppHeaderRenderer.jsx` |
| Header contracts | `frontend/src/shared/shell/header/headerContracts.ts` |
| Header adapters | `frontend/src/shared/shell/header/headerAdapters.ts` |
| Runtime top bar | `frontend/src/portal/components/WorkspaceTopBar.jsx` |
| Portal layout | `frontend/src/portal/PortalPageView.jsx` |
| Object runtime | `frontend/src/portal/PortalObjectRuntimePage.jsx` |
| Designer shell | `frontend/src/modules/designer/components/shell/DesignerShell.jsx` |
| Route ownership | `frontend/src/shared/shell/designer/designerRouteOwnership.js` |
| Designer navigation | `frontend/src/shared/shell/designer/designerNavigationResolver.js` |
| AppShell provider | `frontend/src/shared/shell/provider/AppShellProvider.jsx` |
| Action keys | `frontend/src/shared/shell/actions/appShellActionKeys.ts` |
| Document search API | `backend/app/modules/document_libraries/router.py` |
| Runtime query | `backend/app/modules/platform/runtime/query/` |
| Designer lists | `backend/app/modules/platform/designer/router.py` |
| Navigation model | `backend/app/modules/navigation/models.py` |

---

## 11. Risks & open decisions

| Topic | Risk | Recommendation |
|-------|------|----------------|
| Entity card not in URL | scope leak to section | overlay anchor in resolver |
| Duplicate library search | confused UX | deprecate toolbar search in S5 |
| Runtime EAV search perf | slow on large tenants | limit + index JSONB text fields later |
| Company search scope creep | long queries | cap 20 results per kind, async federation |
| Legacy UT pages | ambiguous scope | `runtime.page` uses block/table local search until retirement |
| Designer placeholder pages | search enabled but empty | disable search on placeholder routes |

---

## 12. Related documents

- `docs/architecture/YASNOPRO APP SHELL ARCHITECTURE.md`
- `docs/architecture/YASNOPRO_APPSHELL_PROVIDER_DESIGN.md`
- `docs/architecture/YASNOPRO_OBJECT_ENTITY_CARD_UX_BASELINE.md`
- `docs/architecture/YASNOPRO_RUNTIME_FOUNDATION_PLAN.md`
