# Header Search Integration — Audit

## STATUS

```text
AUDIT COMPLETE — code analysis only, no implementation (2026-05-30)
```

**Work item:** Object Search — этап **S4 Header Search UI** (подготовка).

**Предпосылки:** S1 `resolveSearchContext`, S2 `executeSearch` + `POST /runtime/search/tenants/{id}` уже реализованы, но **не подключены** к production UI.

**Out of scope этого аудита:** изменение layout App Header, React Router warnings, Designer Search API (S3).

**Связанные документы:**

- `docs/architecture/CONTEXTUAL_HEADER_SEARCH_AUDIT.md`
- `docs/architecture/YASNOPRO_APPSHELL_PROVIDER_DESIGN.md`

---

## 1. Executive Summary

| Вопрос | Ответ |
|--------|--------|
| Где хранится `searchQuery`? | Локальный `useState` в page layouts; **не** в AppShellProvider (production) |
| Где UI поиска? | `AppHeaderRenderer` → `<input class="app-header-renderer__search">` |
| Есть ли submit? | **Нет** — только `onChange` → `search-change` |
| Подключены ли S1/S2? | **Нет** — `resolveSearchContext` / `executeSearch` нигде не импортируются вне `shared/search/` |
| Есть ли overlay для результатов? | **Нет** — только паттерны NotificationBell / ProfileSidePanel |
| Как интегрировать без смены layout? | Contract meta + action bridge + portal-overlay рядом с `AppShellFrame` |

**Главный вывод:** header search — **controlled input без side effects**. S4 должен добавить orchestration-слой **между** `WorkspaceTopBar`/`DesignerShell` и `shared/search/*`, не меняя DOM-структуру header.

---

## 2. Где хранится searchQuery

### 2.1. Production (активные пути)

| Место | Файл | Строки | Владелец state | Потребитель value |
|-------|------|--------|----------------|-------------------|
| Portal pages | `frontend/src/portal/PortalPageView.jsx` | ~411 | `useState("")` | `WorkspaceTopBar` → contract → `AppHeaderRenderer` |
| Object runtime | `frontend/src/portal/PortalObjectRuntimePage.jsx` | ~52 | `useState("")` | то же |
| Designer | `frontend/src/modules/designer/components/shell/DesignerShell.jsx` | ~562 | **нет state** — hardcoded `searchQuery: ""` | contract (search disabled) |

**Поток данных (Runtime):**

```text
PortalPageView / PortalObjectRuntimePage
  searchQuery, setSearchQuery
      ↓ props
WorkspaceTopBar (inlineRender=false)
  createRuntimeHeaderContract({ searchQuery, ... })
      ↓ useEffect onUnifiedHeaderModel
PortalLayout → AppShellFrame → AppHeaderRenderer
```

### 2.2. Shell canonical state (не production)

| Место | Файл | Статус |
|-------|------|--------|
| `AppShellProvider` | `frontend/src/shared/shell/provider/AppShellProvider.jsx` | `state.search.value`, action `shell.header.search.set-value` |
| Contract builder | `frontend/src/shared/shell/provider/appShellContracts.ts` | `searchQuery: state.search.value` |

`AppShellProvider` **не подключён** к `PortalLayout` / `DesignerShell` (Phase 6.6 skeleton).

### 2.3. Параллельные локальные поиски (не header)

| Место | Назначение | Конфликт с header |
|-------|------------|-------------------|
| `useLibraryDocuments.js` | `LibraryToolbar` search | **Да** — duplicate UX на document library pages |
| `ObjectTypesList.jsx` | Designer list filter | Нет (page-local) |
| `AdminUsersPage.jsx` | Admin users filter | Нет |

---

## 3. Header Search UI

### 3.1. Renderer

**Файл:** `frontend/src/shared/shell/header/components/AppHeaderRenderer.jsx`  
**Строки:** ~249–265

```jsx
<input
  value={searchValue}
  onChange → invokeAction(changeActionKey, { value })
  placeholder={search.placeholder || "Поиск по системе..."}
  className="app-header-renderer__search"
/>
```

| Свойство | Значение сегодня |
|----------|------------------|
| Submit (Enter) | **отсутствует** (`onKeyDown` нет) |
| Debounce | **нет** |
| Clear button | **нет** (только action key `search-clear`, UI-кнопки нет) |
| Results panel | **нет** |
| ARIA combobox | **нет** |

### 3.2. Contract

**Файл:** `frontend/src/shared/shell/header/headerContracts.ts` — `HeaderSearchContract`  
**Adapter:** `frontend/src/shared/shell/header/headerAdapters.ts` — `buildRuntimeSearch()` (~558–571)

| Поле | Runtime default |
|------|-----------------|
| `enabled` | `canSearch !== false` |
| `value` | `input.searchQuery` |
| `placeholder` | `"Поиск по системе..."` (static) |
| `changeActionKey` | `"search-change"` или `shell.header.search.set-value` |
| `clearActionKey` | `"search-clear"` |
| `actionKey` | `"search"` |

### 3.3. Где рендерится header в production

```text
PortalLayout / DesignerShell
  └─ AppShellFrame (shared/shell/AppShellFrame.jsx)
       └─ AppHeaderRenderer(contract, onAction)
```

`WorkspaceTopBar` при `inlineRender={false}` (**production**) **не рендерит** header — только собирает contract и отдаёт через `onUnifiedHeaderModel`.

**Legacy:** `DesignerHeader.jsx` — disabled input, **не используется** (Designer на `AppHeaderRenderer`).

---

## 4. Actions при вводе и submit

### 4.1. Что вызывается сегодня

**Файл:** `frontend/src/portal/components/WorkspaceTopBar.jsx` — `handleHeaderAction` (~224–314)

| Action key | Поведение |
|------------|-----------|
| `search-change` | `onChangeSearchQuery(value)` → parent `setSearchQuery` |
| `search` | то же (alias) |
| `search-clear` | `onChangeSearchQuery("")` |

**Designer:** `DesignerShell.handleHeaderAction` — **нет** обработки search actions (~598–655).

### 4.2. Зарезервировано, но не wired

**Файл:** `frontend/src/shared/shell/actions/appShellActionKeys.ts`

| Key | Назначение | Handler |
|-----|------------|---------|
| `shell.header.search` | submit search | **нет** |
| `shell.search.submit` | submit search | **нет** |
| `shell.header.search.set-value` | local value | только `AppShellProvider` reducer |
| `shell.header.search.clear` | clear | alias → `clearSearch` |

**AppShellActionBridge** (`appShellActionBridge.js`) — skeleton, **без** search handlers.

### 4.3. Submit сегодня

```text
Submit = не реализован.
Каждый keystroke → search-change → setSearchQuery (local state only).
API / executeSearch не вызывается.
```

---

## 5. Где подключить resolveSearchContext()

### 5.1. Рекомендуемая точка — orchestration hook

**Новый файл (S4):** `frontend/src/shared/search/useHeaderSearchContext.js`

Вызывается из **page shell owners**, не из `AppHeaderRenderer`:

| Owner | Файл | Доступные signals |
|-------|------|-------------------|
| Runtime portal | `PortalPageView.jsx` | `location.pathname`, `pageId`, `activeNavigationItem`, `libraryContextPath`, `portalId` |
| Object runtime | `PortalObjectRuntimePage.jsx` | pathname, `objectTypeRef`, `activeNavigationItem`, breadcrumbs |
| Designer | `DesignerShell.jsx` | `location.pathname`, `designerRouteOwner`, `activeObjectTypeName`, tab segment |

**Пример вызова (design):**

```js
const searchContext = useMemo(
  () =>
    resolveSearchContext({
      pathname: location.pathname,
      routeParams: { portalId, pageId, objectTypeRef, tenantId },
      currentSection: activeNavigationItem,
      currentLibrary: isDocumentLibraryPage
        ? { libraryId: activeNavigationItem?.library_id, folderPath: libraryContextPath.folderPath }
        : undefined,
      currentObjectType: objectTypeFromRoute,
      currentPage: { tenantId: portalId, pageId, isHome: pageId === 1 },
    }),
  [/* stable deps */],
);
```

### 5.2. Проброс в contract (без изменения layout)

**Файл:** `WorkspaceTopBar.jsx` — расширить input `createRuntimeHeaderContract`:

```js
createRuntimeHeaderContract({
  searchQuery,
  // NEW:
  searchPlaceholder: searchContext.label, // или «Поиск: {label}»
  meta: { searchContext },
})
```

**Файл:** `headerAdapters.ts` — `buildRuntimeSearch`:

- `placeholder` ← `input.searchPlaceholder ?? searchContext.label ?? default`
- **не менять** JSX renderer — только contract fields

### 5.3. Entity card scope (будущее)

`resolveSearchContext` для `runtime.object_entity` требует `currentEntity`.  
**Сигнал сегодня отсутствует** в page layouts.

| Источник | Файл |
|----------|------|
| Object entity modal | `NotificationOverlayHost.jsx` + `useObjectEntityCard` |
| Legacy UT card | `EntityCardModal.jsx` |

**S4 MVP:** без entity scope или через optional bridge `yasnopro:entity-card:context` (S4.1 follow-up).

### 5.4. Чего избегать

| Anti-pattern | Причина |
|--------------|---------|
| `resolveSearchContext()` внутри `AppHeaderRenderer` render | нет доступа к navigation/library/entity |
| Вызов на каждый render без `useMemo` | лишняя работа; риск cascade re-renders |
| Вызов в `headerAdapters.ts` напрямую | adapters должны оставаться pure mappers |

---

## 6. Где подключить executeSearch()

### 6.1. Рекомендуемая точка — search controller hook

**Новый файл (S4):** `frontend/src/shared/search/useHeaderSearchController.js`

Ответственность:

```text
searchQuery (value state)
searchContext (from useHeaderSearchContext)
searchResults / isLoading / error
runSearch(query) → executeSearch({ query, searchContext })
debouncedRunSearch (optional, 300ms on change OR on Enter only)
clearSearch()
```

### 6.2. Wiring через action handler (без изменения renderer layout)

**Runtime:** `WorkspaceTopBar.handleHeaderAction` — добавить cases:

```text
search-change     → setSearchQuery + optional debouncedRunSearch
search-clear      → clearSearch + close overlay
shell.search.submit / Enter action → runSearch immediately
```

**Designer:** `DesignerShell.handleHeaderAction` — те же cases после `canSearch: true`.

**Важно:** `executeSearch` вызывается **только** из action handler / debounced callback, **не** из render body или `useEffect` без deps guard.

### 6.3. Альтернатива (post AppShellProvider migration)

Register в `appShellActionRegistry`:

```text
shell.search.submit → executeSearch(...)
shell.header.search.set-value → set value only
```

Пока production идёт через `WorkspaceTopBar`, **быстрее** расширить `handleHeaderAction`.

### 6.4. API layer (готово)

| Файл | Функция |
|------|---------|
| `frontend/src/api/runtimeSearchApi.js` | `searchRuntime({ tenantId, query, scope, params, limit })` |
| `frontend/src/shared/search/searchExecutionAdapter.js` | `executeSearch({ query, searchContext, limit })` |

---

## 7. Dropdown / overlay infrastructure

### 7.1. Существующие паттерны

| Компонент | Файл | Паттерн | Z-index |
|-----------|------|---------|---------|
| NotificationBell dropdown | `modules/notifications/components/NotificationBell.jsx` | `createPortal` + fixed position под header | `Z_INDEX_LAYERS.notificationDropdown` (500) |
| ProfileSidePanel | `profile/components/ProfileSidePanel.jsx` | full-height overlay | side panel |
| NotificationOverlayHost | `modules/notifications/components/NotificationOverlayHost.jsx` | global entity/file overlays | `Z_INDEX_TOKENS.overlays.*` |
| UserSearchControl | `modules/universalTable/.../UserSearchControl.jsx` | positioned dropdown | inline |
| FileViewerModal | `shared/files/components/FileViewerModal.jsx` | modal overlay | high |

**Z-index registry:** `frontend/src/shared/layout/zIndexTokens.ts`

```text
dropdowns: 400
notificationDropdown: 500
popovers: 600
modal: 700
```

### 7.2. Dedicated search overlay

**Статус:** **не существует**.

**Рекомендация S4/S5:** новый компонент

```text
frontend/src/shared/search/components/SearchResultsOverlay.jsx
```

| Свойство | Значение |
|----------|----------|
| Mount point | sibling к `AppShellFrame` в `PortalLayout` / `DesignerShell` (как `NotificationOverlayHost`) |
| Position | anchored к header search input rect **или** full-width panel под header |
| Z-index | `Z_INDEX_LAYERS.dropdowns` (400) или новый `searchDropdown: 450` |
| Portal | `createPortal(document.body, ...)` — как NotificationBell |

### 7.3. Host placement (без изменения header DOM)

```text
PortalLayout
  ├─ AppShellFrame (header unchanged)
  ├─ NotificationOverlayHost
  └─ SearchResultsOverlayHost   ← NEW (reads context from React context or props drill)
```

State host может жить в `PortalPageView` и передаваться prop-drill:

```text
PortalPageView
  useHeaderSearchController()
      ↓ props
PortalLayout → SearchResultsOverlayHost
```

---

## 8. Интеграция без изменения layout App Header

### 8.1. Что можно менять (safe)

| Layer | Изменения |
|-------|-----------|
| Contract | `placeholder`, `meta.searchContext`, optional `submitActionKey` |
| Action handlers | `WorkspaceTopBar`, `DesignerShell` |
| Page layouts | hooks, overlay host siblings |
| CSS | новый файл overlay; **не** менять `appHeaderRenderer.css` grid |

### 8.2. Что требует минимального touch renderer (optional)

| Change | Layout impact | Альтернатива |
|--------|---------------|--------------|
| `onKeyDown` Enter → submit action | **нет** (same input) | document-level listener (хуже) |
| `aria-expanded` / `role="combobox"` | **нет** | post-MVP a11y |
| Clear button в input | **да** — меняет header content | clear via Escape action only |

**Рекомендация:** Enter → `invokeAction(submitActionKey)` в `AppHeaderRenderer` — **1 строка onKeyDown**, визуальный layout не меняется.

### 8.3. Placeholder UX без layout change

```text
static: "Поиск по системе..."
   ↓
dynamic: searchContext.label
   "По всей компании" / "В текущем разделе" / "В библиотеке"
```

Через `HeaderSearchContract.placeholder` only.

---

## 9. Production render path (reference)

### 9.1. Runtime

```text
App.jsx
 └─ Route /portal/:portalId/page/:pageId → PortalPageView
      ├─ useState searchQuery
      ├─ libraryContextPath, activeNavigationItem
      └─ PortalLayout
           ├─ headerContract ← runtimeHeaderModel (from WorkspaceTopBar)
           ├─ onHeaderAction ← stableHeaderAction
           └─ AppShellFrame → AppHeaderRenderer
                WorkspaceTopBar (inlineRender=false) — contract builder only
                children → page canvas / LibraryPageView / ...
```

### 9.2. Designer

```text
DesignerShell
  ├─ useMemo designerHeaderContract (canSearch: false)
  ├─ handleHeaderAction (no search)
  └─ AppShellFrame → AppHeaderRenderer
       Outlet → ObjectTypeWorkspacePage / ...
```

---

## 10. План S4 (Header Search Integration)

### S4.0 — Search controller (no UI)

| Task | Files |
|------|-------|
| `useHeaderSearchContext` | `shared/search/useHeaderSearchContext.js` |
| `useHeaderSearchController` | `shared/search/useHeaderSearchController.js` |
| Unit tests | deps memoization, no API on mount |

### S4.1 — Runtime wiring

| Task | Files |
|------|-------|
| Integrate hooks in `PortalPageView` | pass placeholder + handlers to `WorkspaceTopBar` |
| Integrate in `PortalObjectRuntimePage` | same |
| Extend `handleHeaderAction` | submit, clear, debounce |
| Dynamic placeholder | `headerAdapters.ts` `buildRuntimeSearch` |

### S4.2 — Designer wiring (shell only, API still S3)

| Task | Files |
|------|-------|
| Enable `canSearch: true` + search state | `DesignerShell.jsx` |
| Wire search actions | `handleHeaderAction` |
| `executeSearch` returns empty for designer | already in adapter |

### S4.3 — Submit trigger

| Task | Files |
|------|-------|
| Enter → submit action | `AppHeaderRenderer.jsx` onKeyDown (minimal) |
| Map `submitActionKey` in contract | `headerAdapters.ts` |

### S4.4 — Results overlay (S5 overlap)

| Task | Files |
|------|-------|
| `SearchResultsOverlay.jsx` | portal under header |
| `SearchResultsOverlayHost` in `PortalLayout` | sibling overlay |
| Navigate on select | `useNavigate` + entity card events |
| Scope label chip | read-only, not dropdown |

### S4.5 — Cleanup (follow-up)

| Task | Files |
|------|-------|
| Deprecate `LibraryToolbar` search when header active | `LibraryPageView.jsx` |
| Migrate to `AppShellProvider` | post Phase 6.9 |

---

## 11. Риски регрессии

| Risk | Severity | Source | Mitigation |
|------|----------|--------|------------|
| **Infinite re-render loop** | High | `WorkspaceTopBar` `useEffect` → `onUnifiedHeaderModel` (~325–342) if contract recreated every render | Memoize contract inputs; не класть `searchResults` в contract; stable `searchContext` deps |
| **API storm on each keystroke** | High | naïve wiring `executeSearch` in `onChange` | Debounce 300ms **или** search only on Enter/submit |
| **Duplicate library search** | Medium | `LibraryToolbar` + header on same page | Feature flag; hide toolbar search when header search active |
| **Designer empty results confusion** | Low | `executeSearch` returns `implemented: false` | Show «Поиск в Студии — скоро» until S3 |
| **Scope mismatch** | Medium | resolver params ≠ API params naming | Pass `searchContext.params` as-is; single mapping layer |
| **Entity card scope missing** | Medium | no `currentEntity` in layouts | Defer `runtime.object_entity` to S4.1+ |
| **Header edit mode interference** | Low | typing in search during title edit | Search input separate from title input — OK |
| **Notification dropdown z-index clash** | Low | both under header | Use `zIndexTokens`; search ≤ notification or separate horizontal offset |
| **Backend hang on company search** | Medium | `runtime.company` scans all OT | Limit 20; loading spinner; cancel in-flight request |
| **AppShellProvider dual ownership** | Medium | future migration | Until swap — keep `searchQuery` in page layout as SoT |

### 11.1. Подтверждение по S2 freeze incident

Зависание UI после S2 **не связано** с search loop:

- `resolveSearchContext` / `executeSearch` **не импортируются** в production components.
- Backend не стартовал из‑за `SyntaxError` в `search/service.py` (import merge) — UI могло «зависнуть» из‑за недоступности API.

---

## 12. File checklist (S4 touch map)

| File | Role in S4 |
|------|------------|
| `frontend/src/portal/PortalPageView.jsx` | hooks, context signals, overlay state |
| `frontend/src/portal/PortalObjectRuntimePage.jsx` | hooks for object routes |
| `frontend/src/portal/components/WorkspaceTopBar.jsx` | action handlers, contract build |
| `frontend/src/modules/designer/components/shell/DesignerShell.jsx` | designer search enable + handlers |
| `frontend/src/layouts/PortalLayout.jsx` | overlay host mount |
| `frontend/src/shared/shell/header/headerAdapters.ts` | dynamic placeholder, submitActionKey |
| `frontend/src/shared/shell/header/components/AppHeaderRenderer.jsx` | optional Enter → submit only |
| `frontend/src/shared/search/useHeaderSearchContext.js` | **NEW** |
| `frontend/src/shared/search/useHeaderSearchController.js` | **NEW** |
| `frontend/src/shared/search/components/SearchResultsOverlay.jsx` | **NEW** (S4/S5) |
| `frontend/src/api/runtimeSearchApi.js` | already done (S2) |
| `frontend/src/shared/search/searchExecutionAdapter.js` | already done (S2) |
| `frontend/src/shared/search/searchContextResolver.js` | already done (S1) |

**Не менять в S4:** backend routes, `LibraryPageView` data logic (кроме optional toolbar hide), Dashboard, Object Platform core.

---

## 13. Definition of Done (S4)

- [ ] `searchQuery` остаётся controlled; добавлен **submit path** (Enter / action key)
- [ ] `resolveSearchContext` вызывается из page shell с memoized deps
- [ ] `executeSearch` вызывается **только** из controller/handler, не из render
- [ ] Placeholder отражает текущий scope (`searchContext.label`)
- [ ] Results overlay открывается без изменения header grid
- [ ] Designer: search enabled in contract; graceful empty until S3 API
- [ ] Нет регрессии: navigation, notifications, profile panel, library browsing
