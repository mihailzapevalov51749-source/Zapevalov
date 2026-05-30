# UT Bridges Audit — Navigation / Sidebar / Shell / Portal Infrastructure

## STATUS

```text
AUDIT COMPLETE — code analysis only, no implementation (2026-05-30)
```

**Scope:** зависимости между Navigation, Sidebar, Header, Workspace Shell, Portal Infrastructure и `modules/universalTable`.

**Out of scope (не аудировались как целевые изменения):** Object Views, Object Entities, RuntimeRead/WriteGateway, EntityCardShell, Notifications routing, Designer Navigation (кроме sidebar shell), UniversalTable internals, Legacy Placeholder Boundary.

**Контекст этапа:** Legacy Isolation @ 60%. Следующий work item — *Remove UT Bridges from Navigation / Sidebar*.

---

## 1. Executive Summary

### Ответ на главный вопрос

**Shell / Navigation / Sidebar всё ещё удерживают Universal Table** через:

1. **Прямые вызовы `tableApi.updateTable`** при переименовании пунктов меню и заголовка страницы.
2. **Утилиты из `modules/universalTable`** (`resolvePrimaryTableIdForPage`, title events, dirty globals).
3. **Window event bus** (`universal-table:*`) для dirty-save при смене страницы (legacy sidebar path).
4. **Косвенную цепочку AppShell sidebar** → `usePlatformSidebarControls` → UT API.

Placeholder boundary (**BlockRenderer → Placeholder → lazy UT**) **не затронул** эти мосты — они живут **выше** canvas render path.

### Сводка

| Метрика | Значение |
|---------|----------|
| **UT Bridges (уникальные coupling points)** | **12** |
| **Critical** | **6** |
| **Medium** | **4** |
| **Low (UI / fixtures)** | **4** |
| **Adjacent (portal canvas → sidebar via events)** | **3** |

### Два sidebar-контура (важно)

| Контур | Компонент | UT bridges |
|--------|-----------|------------|
| **Runtime portal (основной)** | `PortalLayout` → `AppShellFrame` → `AppSidebarRenderer` → `usePlatformSidebarControls` | Title rename → `updateTable`; **нет** dirty leave guard |
| **Editor layout (legacy path)** | `EditorLayout` → `LeftSidebar` | Title rename → `updateTable` + **dirty leave guard** (`tableDirtySaveCompat`, `universal-table:request-leave-confirm`) |

---

## 2. Dependency Inventory

Легенда типов связи:

- **hard** — прямой import / вызов UT API или UT module
- **indirect** — делегирование в компонент с hard bridge
- **contract** — shell contract / callback без UT import
- **event** — window CustomEvent протокол между UT и shell
- **ui** — отображение типа `universal_table`, без UT API

| # | Файл | Используется | Для чего | Тип связи | Dependency class |
|---|------|--------------|----------|-----------|------------------|
| 1 | `shared/shell/sidebar/usePlatformSidebarControls.js` | `updateTable`, `resolvePrimaryTableIdForPage`, `isUniversalTableNavigationItem`, `dispatchUniversalTableTitleChanged` | Переименование nav item типа UT → синхронизация title в `universal_tables` | **hard** | Universal Table |
| 2 | `modules/navigation/components/LeftSidebar.jsx` | `updateTable`, `resolvePrimaryTableIdForPage`, `dispatchUniversalTableTitleChanged` | То же при inline edit пункта меню | **hard** | Universal Table |
| 3 | `modules/navigation/components/LeftSidebar.jsx` | `readGlobalDirty`, `writeGlobalDirty`, `readGlobalSaveHandler`, `clearGlobalSaveHandler` | Блокировка ухода со страницы при dirty UT session | **hard** + **event** | Universal Table |
| 4 | `modules/navigation/components/LeftSidebar.jsx` | `universal-table:request-leave-confirm` | Запрос save/discard перед navigation | **event** | Contract + UT |
| 5 | `portal/PortalPageView.jsx` | `updateTable`, `resolvePrimaryTableIdForPage`, `isUniversalTableNavigationItem` | Save page title для dedicated UT nav pages | **hard** | Universal Table |
| 6 | `portal/PortalPageView.jsx` | `syncUniversalTableTitleAcrossUi`, `UNIVERSAL_TABLE_TITLE_CHANGED_EVENT` | Синхронизация title: table ↔ nav ↔ page после rename | **hard** | Universal Table |
| 7 | `portal/PortalPageView.jsx` | `<UniversalTableView blockId={999999} />` | System route `/universal-table` | **hard** | Universal Table *(следующий work item)* |
| 8 | `portal/PortalPageView.jsx` | `registerPageEntities` → `entityLocationRegistry` (`tables.{id}`) | Реестр расположения legacy table entities | **indirect** | UI + legacy identity |
| 9 | `layouts/PortalLayout.jsx` | `usePlatformSidebarControls` | Подключение sidebar actions к UT rename bridge | **indirect** | Universal Table |
| 10 | `shared/shell/sidebar/components/AppSidebarRenderer.jsx` | `onAction("update-menu-item")` → #1 | Runtime sidebar edit без UT import в файле | **contract** → **hard** | Contract → UT |
| 11 | `shared/shell/sidebar/components/AppSidebarRenderer.jsx` | `handleSelectPage` → `onItemAction` | Navigation без dirty guard в runtime path | **contract** | Contract |
| 12 | `layouts/EditorLayout.jsx` | `<LeftSidebar />` | Legacy editor shell с полным UT dirty bridge | **indirect** | Universal Table |
| 13 | `portal/components/WorkspaceTopBar.jsx` | `save-title` → `onSavePageTitle` | Header action → PortalPageView #5 | **contract** → **hard** | Contract → UT |
| 14 | `shared/shell/header/headerAdapters.ts` | `editableTitle`, `saveActionKey: save-title` | Header contract для rename (без UT import) | **contract** | Contract |
| 15 | `shared/shell/AppShellFrame.jsx` | `AppSidebarRenderer` + header contract passthrough | Shell composition | **indirect** | Contract |
| 16 | `modules/universalTable/utils/resolvePrimaryTableId.js` | `getTableByBlock` | Resolve table id для nav rename (used by shell) | **hard** | Universal Table |
| 17 | `modules/universalTable/utils/syncUniversalTableTitle.js` | `updatePage`, `updateNavigationItem` | Cross-UI title sync orchestration | **hard** | Universal Table |
| 18 | `modules/universalTable/utils/universalTableTitleEvents.js` | `UNIVERSAL_TABLE_TITLE_CHANGED_EVENT` | Event bus title sync | **event** | Contract + UT |
| 19 | `modules/universalTable/session/tableDirtySaveCompat.js` | `window.__UNIVERSAL_TABLE_*__` | Global dirty/save handler store | **hard** | Universal Table |
| 20 | `modules/navigation/components/MenuItem.jsx` | `item.type === "universal_table"`, labels/icons | Отображение legacy nav type | **ui** | UI Dependency |
| 21 | `shared/shell/sidebar/components/AppSidebarIconRenderer.jsx` | `universal_table` icon glyph | Sidebar icon map | **ui** | UI Dependency |
| 22 | `shared/shell/sidebar/components/SidebarMenuIcon.jsx` | `universal_table` icon glyph | Sidebar icon map | **ui** | UI Dependency |
| 23 | `shared/shell/sidebar/sidebarPreviewData.ts` | fixture `type: "universal_table"` | Dev preview data | **ui** | UI Dependency |
| 24 | `App.jsx` | route `/universal-table` → `PortalPageView` | System UT page entry | **indirect** | Universal Table *(PortalPageView item)* |

### Adjacent: portal canvas ↔ sidebar (event coupling, не nav API)

| # | Файл | Связь | Тип |
|---|------|-------|-----|
| A1 | `modules/sections/hooks/useSectionUniversalTableControls.js` | Section toolbar ↔ UT hooks | hard (canvas) |
| A2 | `modules/sections/hooks/useTableStateEvents.js` | Listens `universal-table:mark-dirty`, `universal-table:state-changed` | event |
| A3 | `modules/universalTable/components/viewSettings/TableRepresentationsBar.jsx` | Handles `universal-table:request-leave-confirm` | event |

> Эти связи не в sidebar source files, но **питают** dirty bridge #3–#4 в `LeftSidebar`.

### Проверенные файлы без UT bridges

| Файл | Результат |
|------|-----------|
| `shared/shell/header/components/AppHeaderRenderer.jsx` | Нет import/call UT |
| `shared/shell/designer/designerRouteOwnership.js` | Нет UT |
| `shared/appMode/*` | Нет UT |
| `modules/navigation/hooks/useMenuEditor.js` | Только `shared/legacy` guard (block **new** UT nav) — не bridge |
| `modules/navigation/entityLocationRegistry.js` | Generic registry; заполняется из PortalPageView #8 |

---

## 3. Dependency Map

### 3.1. Title sync (Critical)

```text
Navigation / Sidebar / Header
│
├─ AppSidebarRenderer
│   └─ onAction("update-menu-item")
│       └─ usePlatformSidebarControls.handleUpdateMenuItem()
│           ├─ getPageFull(page_id)
│           ├─ resolvePrimaryTableIdForPage()     ← modules/universalTable
│           ├─ updateTable(tableId, { title })  ← tableApi
│           └─ dispatchUniversalTableTitleChanged()
│               └─ window "universal-table:title-changed"
│                   └─ PortalPageView listener
│                       └─ syncUniversalTableTitleAcrossUi()
│                           ├─ updateNavigationItem()
│                           └─ updatePage()
│
├─ LeftSidebar (EditorLayout path)
│   └─ handleUpdateItem() — та же цепочка updateTable + dispatch
│
└─ WorkspaceTopBar / Header contract
    └─ action "save-title"
        └─ PortalPageView.handleSavePageTitle()
            ├─ resolvePrimaryTableIdForPage()
            ├─ updateTable()  (if dedicated UT nav page)
            └─ dispatchUniversalTableTitleChanged()
```

### 3.2. Dirty navigation guard (Critical, EditorLayout path only)

```text
UniversalTableView (support mode)
  └─ tableSessionStore.markTableSessionDirty()
      └─ writeGlobalDirty(true)          ← window.__UNIVERSAL_TABLE_DIRTY__
      └─ writeGlobalSaveHandler(handler) ← window.__UNIVERSAL_TABLE_SAVE_HANDLER__

LeftSidebar.canLeaveCurrentPage()
  ├─ readGlobalDirty()
  └─ dispatch "universal-table:request-leave-confirm"
      └─ TableRepresentationsBar (in UT module) onConfirm
          └─ readGlobalSaveHandler() → save → writeGlobalDirty(false)

LeftSidebar.handleSelectPage()
  └─ await canLeaveCurrentPage()  ← блокирует nav при dirty

Runtime AppSidebarRenderer.handleSelectPage()
  └─ onItemAction({ pageId })  ← NO dirty guard
```

### 3.3. Shell composition

```text
PortalPageView
  └─ PortalLayout
      ├─ usePlatformSidebarControls()     ← UT API imports
      ├─ AppShellFrame
      │   ├─ AppSidebarRenderer           ← contract → UT via #1
      │   └─ Header (AppHeaderRenderer)   ← contract → save-title → PortalPageView
      └─ children (page canvas)
          └─ LegacyStorageBlockPlaceholderView  ← isolated (NOT part of this audit fix target)
```

### 3.4. System UT route (следующий work item, не текущий)

```text
App.jsx  /universal-table
  └─ PortalPageView
      └─ UniversalTableView blockId={999999}   ← direct UT, bypasses placeholder
```

---

## 4. Classification

### REMOVE (можно убрать после миграции сценариев)

| Bridge | Обоснование |
|--------|-------------|
| `LeftSidebar` duplicate of `usePlatformSidebarControls` title logic | Два параллельных implementation; EditorLayout path может перейти на shell contract |
| Global `window.__UNIVERSAL_TABLE_*__` dirty store | Anti-pattern; заменить на legacy adapter state или object-platform dirty contract |
| `universal-table:request-leave-confirm` cross-window protocol | Заменить на typed legacy leave guard в adapter layer |
| Direct `/universal-table` route render | Отдельный work item (PortalPageView decouple) |

### WRAP (перенести за Legacy Adapter / Boundary)

| Bridge | Целевой wrapper |
|--------|-----------------|
| `usePlatformSidebarControls` → `updateTable` | `shared/legacy/adapters/legacyNavigationTitleAdapter` |
| `LeftSidebar` → `updateTable` | Тот же adapter через shell action |
| `PortalPageView.handleSavePageTitle` → `updateTable` | `legacyPageTitleAdapter` (portal-level, Phase 4.4+) |
| `resolvePrimaryTableIdForPage` usage from shell | Move to `shared/legacy/utils/` re-export или adapter |
| `syncUniversalTableTitleAcrossUi` | `legacyTitleSyncAdapter` behind event contract |
| `dispatchUniversalTableTitleChanged` / title event bus | Narrow contract: `legacy-storage:title-changed` in `shared/legacy` |

### KEEP TEMPORARY

| Bridge | До когда |
|--------|----------|
| `MenuItem` / sidebar icons для `universal_table` | До Legacy Removal (existing nav items) |
| `sidebarPreviewData` fixture | Dev-only |
| `registerPageEntities` table locations | До migration notifications/files off UT identity |
| Section UT controls (A1–A3) | До section decoupling / placeholder expand |

---

## 5. Dependency Type Analysis

| Bridge cluster | UI | Contract | Universal Table |
|----------------|-----|----------|-----------------|
| Title rename (sidebar) | Menu inline edit UI | `update-menu-item` action | **`updateTable`** |
| Title rename (header) | Editable title field | `save-title` action | **`updateTable`** via PortalPageView |
| Title sync fan-out | Nav + page titles update | `universal-table:title-changed` event | **`syncUniversalTableTitleAcrossUi`** |
| Dirty leave guard | Confirm dialog UX | `request-leave-confirm` event | **`tableSessionStore` + save handler** |
| UT nav type display | Icon + label | nav item `type` field | none |
| System UT page | Full page layout | route `/universal-table` | **`UniversalTableView` direct** |

**UT Bridges (strict definition):** строки inventory **#1–#7, #9, #16–#19** — shell/nav/header вызывает UT module или tableApi.

---

## 6. Migration Plan (без кода)

### Phase 4.1 — Title Sync Isolation

**Цель:** sidebar/header не import'ят `modules/universalTable`.

- Создать `shared/legacy/adapters/legacyStorageTitleAdapter.*`
- Перенести: `resolvePrimaryTableIdForPage`, `updateTable(title)`, `dispatchTitleChanged`
- Переподключить: `usePlatformSidebarControls`, `LeftSidebar`
- Header path: PortalPageView вызывает adapter, не `tableApi` напрямую

**Acceptance:** grep `modules/universalTable` в `shared/shell/**` и `modules/navigation/**` → 0 (кроме allowlist).

### Phase 4.2 — Dirty Save Isolation

**Цель:** navigation leave guard не использует UT globals/events.

- Introduce `shared/legacy/session/legacyStorageLeaveGuard.*`
- Register save handler from **SupportModeBoundary** (inside placeholder mount), not UT bar directly
- Replace `universal-table:request-leave-confirm` with `legacy-storage:request-leave-confirm`
- Unify runtime `AppSidebarRenderer` navigation with leave guard (parity with LeftSidebar)

**Acceptance:** `tableDirtySaveCompat` не import'ится из navigation/shell.

### Phase 4.3 — Sidebar Decoupling

**Цель:** один sidebar path, один adapter.

- Deprecate `LeftSidebar` UT logic → delegate to `usePlatformSidebarControls` + leave guard adapter
- `AppSidebarRenderer` — единственный runtime sidebar
- `EditorLayout` migrates to AppShell sidebar or shared menu editor contract

### Phase 4.4 — PortalPageView Title Bridge

**Цель:** portal infra не orchestrates UT title sync.

- Extract title orchestration to legacy adapter
- PortalPageView listens to adapter-level events only

*(Пересекается со следующим work item «PortalPageView ↔ UniversalTableView», но title bridge можно отделить раньше.)*

### Phase 4.5 — Navigation Clean Separation

**Цель:** nav layer знает только:

```text
nav item type legacy_storage → adapter.onRename / adapter.canLeave
```

- `isUniversalTableNavigationItem` → `isLegacyStorageNavigationItem` in `shared/legacy`
- UI labels/icons остаются до Legacy Removal
- Analyzer work item check: no `updateTable` in shell/nav grep

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Runtime sidebar без dirty guard | Потеря unsaved UT view state при nav | Phase 4.2 — parity guard в AppSidebarRenderer |
| Dual sidebar implementations | Fix только в одном path | Phase 4.3 consolidation |
| Title sync regression | Nav/page/table titles desync | Adapter + integration test + manual QA dedicated UT pages |
| Breaking placeholder boundary | Accidental UT import in shell | ESLint boundary rule: shell → shared/legacy only |
| Existing `universal_table` nav items | Must keep working | KEEP TEMPORARY UI; WRAP API only |

---

## 8. Manual QA Scenarios (post-migration)

1. Dedicated UT nav page: rename in sidebar → title updates in header + table
2. Dedicated UT nav page: rename in header → sidebar + table sync
3. Portal page with UT block: dirty view → navigate away → confirm save works (runtime + editor paths)
4. Object type nav pages: rename unaffected (no UT adapter invoked)
5. New UT creation still blocked (Layer 2 guards)
6. Placeholder view mode: existing rows still work

---

## 9. Analyzer / Dashboard (future)

После Phase 4.5 добавить code-check в `stage_works.py` для work item «UT bridges»:

```text
grep "modules/universalTable" in shared/shell/** → 0
grep "modules/universalTable" in modules/navigation/** → 0
grep "updateTable" in usePlatformSidebarControls → 0
legacy adapter exists in shared/legacy/adapters/
```

Ожидаемый readiness после закрытия: **60% → 80%** (4/5 work items).

---

## 10. Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Initial UT bridges audit (Legacy Isolation @ 60%) |
