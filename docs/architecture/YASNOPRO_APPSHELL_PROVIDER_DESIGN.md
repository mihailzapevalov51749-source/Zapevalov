# YASNOPRO_APPSHELL_PROVIDER_DESIGN

## Статус документа

| Поле | Значение |
|---|---|
| Документ | YASNOPRO_APPSHELL_PROVIDER_DESIGN |
| Фаза | 6.6 — design / skeleton only |
| Статус | DRAFT — approved for implementation track |
| Production | **Not connected** |
| Связанные документы | YASNOPRO_APPSHELL_FUNCTIONAL_COVERAGE_MATRIX.md, YASNOPRO APP SHELL ARCHITECTURE.md, YASNOPRO_MIGRATION_MAP.md |
| Следующая фаза | **6.7 — Action Bridge design** |

---

## 1. Purpose

Зафиксировать **AppShellProvider** как единый canonical owner состояния оболочки (AppShell) для Runtime и Designer.

Цели:

- устранить размазанное ownership (`useShellSidebarState` в каждом layout, AD-SHELL-001);
- централизовать сборку `AppSidebarContract` / `AppHeaderContract` для renderers;
- подготовить точку подключения **action dispatch** и **routing bridge** без переноса логики в renderers;
- позволить shadow mode (Phase 6.8) и controlled production swap (Phase 6.9).

---

## 2. Problem

### Текущее состояние (legacy)

| Concern | Где живёт сейчас | Проблема |
|---|---|---|
| Sidebar collapse | `useShellSidebarState` + localStorage + CustomEvent | Дублирование подписчиков, AD-SHELL-001 |
| Active menu item | `MenuTree` / `LeftSidebar` | Не в unified contract owner |
| Header search | `WorkspaceTopBar` / `PortalPageView` | Не синхронизировано с contract layer |
| Notifications | `NotificationBell` + TopBar | Отдельный источник правды |
| Edit mode (page/menu) | Разные флаги в Portal/TopBar/Sidebar | Нет единой модели |
| Contracts | Adapters вызываются ad-hoc в preview / DesignerShell flag | Нет canonical pipeline |
| Geometry | `useShellGeometry`, `shellSidebarGeometry` | Параметры разбросаны по layouts |

Renderers (Phase 6.3 / 6.4) **визуально** покрывают contract, но **не владеют state** и **не исполняют actions** — это корректно для foundation layer.

---

## 3. Scope

### In scope (Phase 6.6+)

- Дизайн state model и boundaries.
- Skeleton: `AppShellProvider`, reducer, `useAppShell`, types (без production wiring).
- Contract generation pipeline (adapters ← provider state ← external **sources**).
- Action dispatch **interface** (реализация handlers — Phase 6.7).
- Routing bridge **interface** (навигация делегируется зарегистрированным bridges).
- Shadow / rollback стратегии (design).
- Интеграционные контракты для Runtime (`PortalLayout`) и Designer (`DesignerShell`).

### Out of scope для 6.6

- Подключение в `PortalLayout` / `DesignerShell`.
- Замена `LeftSidebar`, `WorkspaceTopBar`, `DesignerHeader`.
- Изменение feature flags.
- Реальные API / router calls в provider.
- Parity tests (Phase 6.9).

---

## 4. Non-goals

AppShellProvider **не**:

| Запрет | Пояснение |
|---|---|
| Renderer | UI остаётся в `AppSidebarRenderer` / `AppHeaderRenderer` |
| Business data owner | Страницы, таблицы, entity, menu JSON — внешние sources |
| Direct routing | `useNavigate` только в routing bridge, не в provider core |
| Direct API | Notifications/search API — в bridge handlers |
| Page content | Canvas, tables, forms — вне shell |
| Production replacement | До Phase 6.9 и явного go/no-go |
| PortalLayout / DesignerShell replacement | Только будущая обёртка / parallel shadow |

---

## 5. State ownership model

### 5.1 Canonical state (`AppShellState`)

```text
AppShellState
├── mode: 'runtime' | 'designer' | ...
├── collapsed: boolean                    # persisted (localStorage delegate)
├── navigation
│   ├── activeItemId?: string
│   ├── activePageId?: string | number
│   └── expandedItemIds?: string[]        # tree UI state (future)
├── editMode
│   ├── sidebarMenu: boolean              # menu structure editing
│   ├── headerPage: boolean               # page edit mode (WorkspaceTopBar)
│   └── titleEditing: boolean
├── search
│   ├── value: string
│   ├── enabled: boolean
│   └── debounceMeta?: ...                # bridge-owned timing
├── notifications
│   ├── unreadCount: number
│   └── enabled: boolean
├── titleEdit
│   ├── draft: string
│   └── isEditing: boolean
├── menuScale: number                     # sidebar density preference
├── capabilities: ShellCapabilities       # merged runtime/designer caps
├── geometry: ShellGeometrySnapshot       # derived from collapsed + mode
├── meta
│   ├── hydrated: boolean
│   └── persistenceVersion?: number
└── (no page/business payloads)
```

### 5.2 External inputs (`AppShellSources`) — не ownership

Provider **читает** sources, но **не владеет** ими:

| Source field | Поставщик (будущий) | Назначение |
|---|---|---|
| `navigationItems` | Portal / menu API | Adapter → sidebar sections |
| `pathname`, `activePath` | Router | Active item, breadcrumbs |
| `page`, `portal` | PortalPageView | Title/subtitle |
| `user`, `tenant` | Auth / portal context | Header user block |
| `tenantId` | Route params | Designer links |
| `designerActiveKey` | Designer route resolver | Designer active item |

Sources обновляются через props / `setSources()` — provider кладёт snapshot в ref или derived memo, **без копирования бизнес-дерева в reducer**.

### 5.3 Persistence

| State | Persist | Механизм |
|---|---|---|
| `collapsed` | YES | Делегат `writeShellSidebarCollapsed` / `readShellSidebarCollapsed` (существующий ключ) |
| `menuScale` | OPTIONAL | `yasnopro:shell-menu-scale` (future) |
| search value | NO (session) | Owned by Portal until bridge |
| edit flags | NO (session) | Sync from page controller via sources |

Phase 6.6 skeleton: persistence только **collapsed** через существующие utils.

### 5.4 Single source of truth rule

```text
UI event → dispatchAction(actionKey) → reducer (shell-local) OR bridge handler (side effects)
Bridge / sources update → recompute contracts → renderers re-render
```

Renderers получают **только** immutable contracts + callbacks, которые вызывают `dispatchAction` (не прямой setState в layout).

---

## 6. Contract generation model

### 6.1 Pipeline

```text
AppShellState + AppShellSources + dispatchAction
        ↓
 createRuntimeSidebarContract / createDesignerSidebarContract
 createRuntimeHeaderContract / createDesignerHeaderContract
        ↓
 AppSidebarContract / AppHeaderContract (memoized)
        ↓
 AppSidebarRenderer / AppHeaderRenderer
```

### 6.2 Adapter input mapping

Provider собирает adapter inputs из state + sources:

| Adapter input | From state | From sources |
|---|---|---|
| `collapsed` | `state.collapsed` | — |
| `onToggleCollapse` | `() => dispatch('shell.sidebar.toggle-collapse')` | — |
| `isEditMode` | `state.editMode.sidebarMenu` / header | — |
| `searchQuery` | `state.search.value` | fallback sources |
| `navigationItems` | — | `sources.navigationItems` |
| `activePath` | — | `sources.pathname` |
| `notificationUnreadCount` | `state.notifications.unreadCount` | bridge poll |

### 6.3 Contract callbacks

Все `onToggleCollapse`, action keys в contract — **обёртки** над `dispatchAction`:

```typescript
onToggleCollapse: () => dispatchAction('shell.sidebar.toggle-collapse')
```

Renderers остаются dumb: при подключении provider передаёт contracts с реальными dispatch stubs (Phase 6.8+); до этого renderers в dev остаются no-op.

### 6.4 Memoization

- `selectSidebarContract(state, sources, mode)` — `useMemo` deps: relevant state slices + source version/id.
- `selectHeaderContract(...)` — аналогично.
- Geometry: `useShellGeometry({ mode, collapsed })` внутри provider → `geometry` slice.

---

## 7. Action dispatch model

### 7.1 Action key namespace

```text
shell.sidebar.*       collapse, menu-scale, edit-menu, add-item, ...
shell.header.*        search.change, search.clear, notifications.open, ...
shell.navigation.*    back, select-item, mode-switch (delegates to bridge)
shell.edit.*          enter-page-edit, exit-page-edit, save-title, ...
```

### 7.2 Dispatch flow (target)

```text
dispatchAction(actionKey, payload?)
  ├─ if shell-local key → appShellReducer
  └─ else if registry[actionKey] → handler(payload)  // Phase 6.7
       └─ handler may call routingBridge / apiBridge
```

### 7.3 Registry (`AppShellActionRegistry`)

```typescript
type AppShellActionHandler = (payload: unknown, ctx: AppShellDispatchContext) => void;

type AppShellActionRegistry = Record<string, AppShellActionHandler>;
```

- Provider **хранит** registry ref (immutable map, replaceable per mode).
- Runtime регистрирует handlers при mount bridge (Phase 6.7).
- Renderer **никогда** не регистрирует handlers.

### 7.4 Phase 6.6 skeleton behavior

- `dispatchAction` — reducer для `shell.sidebar.toggle-collapse`, `shell.set-collapsed`; остальное — `console.debug` в DEV или no-op.
- **No routing, no API.**

---

## 8. Routing bridge model

### 8.1 Responsibility

| Layer | Responsibility |
|---|---|
| AppShellProvider | Emits intent via `dispatchAction('shell.navigation.select-item', { itemId, path })` |
| Routing bridge | `useNavigate`, tenant path builders, Designer route map |
| React Router | Actual URL change |

### 8.2 Interface (design)

```typescript
type AppShellRoutingBridge = {
  navigateToPath: (path: string, options?: { replace?: boolean }) => void;
  navigateBack: () => void;
  switchAppMode: (target: 'runtime' | 'designer', tenantId?: string) => void;
  resolveActiveItem: (pathname: string) => { itemId?: string; pageId?: string };
};
```

Provider получает bridge через React context **sibling** или registration:

```typescript
registerRoutingBridge(bridge) // called by PortalLayout once
```

**Phase 6.6:** interface only; implementation empty.

### 8.3 Запрет

Provider **не** импортирует `react-router-dom` напрямую в core (допускается тонкий optional adapter package позже).

---

## 9. Runtime integration model

### 9.1 Current production stack

```text
PortalLayout
  ├── useShellSidebarState()          ← replace eventually
  ├── LeftSidebar (MenuTree)          ← legacy
  └── children → PortalPageView
        └── WorkspaceTopBar           ← legacy
```

### 9.2 Target stack (post 6.9)

```text
PortalLayout
  └── AppShellProvider mode="runtime" sources={portalShellSources}
        ├── AppSidebarRenderer contract={sidebarContract}
        ├── AppHeaderRenderer contract={headerContract}  // or slot in page view
        └── workspace (unchanged business content)
```

### 9.3 Transitional: shadow mode (6.8)

```text
PortalLayout
  ├── legacy LeftSidebar (visible)
  └── dev flag: AppShellProvider shadow (hidden/offscreen or overlay compare)
```

Sources: PortalPageView поднимает `searchQuery`, `isEditMode`, `navigationItems` в ref/context consumed by provider.

### 9.4 Source ownership (unchanged)

| Data | Owner |
|---|---|
| Menu tree JSON | Portal / API |
| Page title/content | PortalPageView / page store |
| Search results | Search module |
| Shell UI state | **AppShellProvider** |

---

## 10. Designer integration model

### 10.1 Current

```text
DesignerShell
  ├── useShellSidebarState()
  ├── feature flag → AppSidebarRenderer OR DesignerSidebar
  └── DesignerHeader (legacy)
```

### 10.2 Target

```text
DesignerShell
  └── AppShellProvider mode="designer" sources={designerShellSources}
        ├── AppSidebarRenderer
        ├── AppHeaderRenderer
        └── Outlet (designer routes)
```

### 10.3 Designer specifics

- `designerActiveKey` из pathname → adapter `activeKey`.
- Search/notifications often disabled → `capabilities` override in provider.
- Mode switch → routing bridge `switchAppMode('runtime', tenantId)`.

---

## 11. Shadow mode strategy

| Aspect | Policy |
|---|---|
| Flag | New dev-only flag **отдельно** от production flags (не менять `shellFeatureFlags` в 6.6) |
| Placement | Parallel render inside layout; legacy remains interactive |
| Contracts | Provider builds real contracts; renderers may use dispatch stub |
| Compare | Visual diff checklist + action key log |
| Performance | Shadow unmounted when flag off |

---

## 12. Rollback strategy

| Level | Mechanism |
|---|---|
| Instant | Feature flag off → только legacy components |
| Partial | Provider mounted but renderers not used |
| Data | Collapsed key backward compatible (`yasnopro-sidebar-collapsed`) |
| Release | 6.9 go/no-go checklist required |

Rollback **не** требует миграции state: localStorage key сохраняется.

---

## 13. Migration phases

| Phase | Deliverable | Provider role |
|---|---|---|
| 6.3–6.4 | Renderers visual | None |
| **6.6** | **This design + skeleton** | Types, reducer, stub dispatch |
| 6.7 | Action bridge design | Registry + handlers spec |
| 6.8 | Shadow integration | Provider in layout, dev flag |
| 6.9 | Readiness review | Production go/no-go |

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Provider becomes god-object | Strict non-goals; sources vs state split |
| Duplicate collapse with legacy hook | Single write path via provider; deprecate direct hook use |
| Contract drift from adapters | Single pipeline; preview uses same selectors |
| Premature production wiring | Explicit non-goals; shadow first |
| Router coupling | Routing bridge interface only |

---

## 15. Definition of Done

### Phase 6.6 (this phase)

- [x] Design document approved structure (this file)
- [x] State fields and boundaries defined
- [x] Skeleton compiles, **not imported** by production
- [ ] Phase 6.7 action bridge spec
- [ ] Phase 6.8 shadow wiring
- [ ] Phase 6.9 parity + rollback sign-off

### AppShellProvider implementation complete (future)

- [ ] Single collapse owner (AD-SHELL-001 closed)
- [ ] Contracts generated only via provider selectors
- [ ] All shell UI actions flow through `dispatchAction`
- [ ] Routing/API only in registered bridges
- [ ] Runtime + Designer parity tests pass
- [ ] Production swap behind flag with rollback

---

## Appendix A — File layout (skeleton)

```text
frontend/src/shared/shell/provider/
  AppShellProvider.jsx      # Context + reducer host
  useAppShell.js            # Consumer hook
  appShellReducer.js        # Pure shell state transitions
  appShellTypes.ts          # State, actions, context types
  index.ts                  # Public exports (not wired to layouts)
```

## Appendix B — Relationship to existing modules

| Module | Role after migration |
|---|---|
| `useShellSidebarState` | Deprecated → provider collapse actions |
| `sidebarAdapters` / `headerAdapters` | Called by provider selectors |
| `useShellGeometry` | Called inside provider for geometry slice |
| `shellFeatureFlags` | Unchanged until 6.8 shadow flag spec |
| Renderers | Unchanged visual layer; receive contracts from provider |
