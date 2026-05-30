# PortalPageView ↔ UniversalTableView Decoupling Audit

## STATUS

```text
AUDIT COMPLETE — code analysis only, no implementation (2026-05-30)
```

**Контекст этапа:** Legacy Isolation @ **80%** (4/5 work items done).  
**Последний pending work item:** *Отделить PortalPageView от UniversalTableView*.

**Scope:** только связь `PortalPageView` → `UniversalTableView` и system route `/universal-table`.

**Out of scope (не менять в рамках этого work item):** UniversalTable internals, Object Views, Object Entities, Runtime gateways, Designer Navigation, Platform Dashboard UI, удаление route `/universal-table`.

---

## 1. Executive Summary

### Ответ на главный вопрос

**Единственная оставшаяся прямая связь `PortalPageView` → `UniversalTableView`:**

```text
frontend/src/portal/PortalPageView.jsx
  import { UniversalTableView } from "../modules/universalTable";   ← static import (hard bridge)
  ...
  {isUniversalTablePage && (
    <UniversalTableView blockId={999999} isEditMode={isEditMode} />  ← direct render (hard bridge)
  )}
```

Это **не** canvas path для legacy blocks на portal pages. Canvas уже изолирован:

```text
BlockRenderer → LegacyStorageBlockPlaceholderView → LegacyStorageSupportModeBoundary → UniversalTableView (lazy)
```

Shell / navigation / sidebar bridges уже переведены на `legacyStorageAdapter.js` и **не** импортируют UT напрямую.

**Почему связь всё ещё существует:** исторический **system route** `/universal-table` — отдельная full-page «песочница» Universal Table, зарегистрированная в `App.jsx` и обслуживаемая тем же `PortalPageView`, что и обычные portal pages. При миграции placeholder boundary (Phase B) этот route **не был затронут**, потому что он не проходит через `blockRegistry`.

### Краткая сводка

| Метрика | Значение |
|---------|----------|
| Файлов с **static import** `UniversalTableView` вне `modules/universalTable` и `shared/legacy` | **1** (`portal/PortalPageView.jsx`) |
| Файлов с **direct JSX render** `UniversalTableView` вне legacy boundary | **1** (`portal/PortalPageView.jsx`) |
| Альтернативный путь `modules/pages/PortalPageView.jsx` | **не существует** |
| Каталог `frontend/src/routes/**` | **не существует** (routes в `App.jsx`) |

---

## 2. Current Render Path

### 2.1. System route (проблемный bridge)

```text
App.jsx
 └─ Route path="/universal-table" element={<PortalPageView />}
     └─ PortalPageView.jsx
         ├─ isUniversalTablePage = (pathname === "/universal-table")
         ├─ PortalLayout (sidebar, header, shell)
         │   ├─ activePageId = "system-universal-table"   (synthetic, не из navigation API)
         │   └─ legacyStorageAdapter (title sync subscribe — без UT import)
         └─ page canvas
             └─ UniversalTableView blockId={999999} isEditMode={...}   ← BYPASS placeholder boundary
                 └─ useUniversalTable → getTableByBlock(999999) | createTableForBlock(999999)
```

### 2.2. Legacy block on portal page (уже изолирован — не цель work item)

```text
App.jsx
 └─ Route path="/portal/:portalId/page/:pageId" element={<PortalPageView />}
     └─ PortalPageView → ContentSection → BlocksList → BlockRenderer
         └─ blockRegistry[universal_table | table | ...]
             └─ LegacyStorageBlockPlaceholderView
                 └─ LegacyStorageSupportModeBoundary (lazy import)
                     └─ UniversalTableView {...block props}
```

### 2.3. Сравнение двух контуров

| Аспект | System route `/universal-table` | Legacy block на canvas |
|--------|--------------------------------|------------------------|
| Entry | `App.jsx` route | `blockRegistry` |
| UT load | **Static import** | **Dynamic import** через boundary |
| `blockId` | Magic `999999` (standalone storage) | Real block id из page data |
| Placeholder UI | Нет | Edit shell + preview toggle |
| Error boundary / Suspense | Нет (direct mount) | `LegacyStorageSupportModeBoundary` |

---

## 3. Usage Analysis

### 3.1. Production runtime или legacy compatibility?

**Legacy compatibility route**, не object-centric сценарий.

Документирован как активный legacy artifact:

- AD-015 в `YASNOPRO_ARCHITECTURE_DEBT.md` — «системный маршрут legacy UT»
- Recovery Plan Q6 — судьба route (freeze / redirect / deprecate) **ещё не решена ADR**
- `YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md` §9 — `/universal-table` в `REMOVE_CANDIDATE (post Layer 5)`

Route **не** связан с Object Type runtime (`/portal/:portalId/object-types/...`).

### 3.2. Кто вызывает `/universal-table`?

| Источник | Найдено в коде |
|----------|----------------|
| React Router | `App.jsx` — `<Route path="/universal-table" element={<PortalPageView />} />` |
| Programmatic navigate / Link | **Не найдено** grep по frontend |
| Sidebar `system_page` injection | **Не найдено** (в отличие от `system-my-tasks` → `/my-tasks`) |
| Backend navigation seed | **Не найдено** `url=/universal-table` или `system-universal-table` |

**Вывод:** primary access — **direct URL** (закладки, старые ссылки, ручной ввод). Sidebar highlight через synthetic `activePageId="system-universal-table"` **без** matching nav item в текущем frontend-коде.

### 3.3. Ссылки в navigation / sidebar?

- **Hard link на `/universal-table` в navigation components:** не обнаружен.
- **`system-universal-table`:** используется только в `PortalPageView` для `activePageId` prop — не как id пункта меню из API.
- **`universal_table` nav type:** отображается в `MenuItem` / sidebar icons, но ведёт на **`page_id`** portal page, **не** на `/universal-table`.

### 3.4. Используется ли route новыми object-centric сценариями?

**Нет.**

Object-centric runtime:

- `PortalObjectRuntimePage` — object types / data
- `ObjectViewHost` / `ObjectTypeDataTableView` — табличные представления object platform
- Designer publish to menu — `object_type` navigation

Ни один из этих путей не импортирует и не навигирует на `/universal-table`.

### 3.5. Можно ли заменить direct render на legacy boundary?

**Да.** `LegacyStorageSupportModeBoundary` уже:

- делает `lazy(() => import("modules/universalTable"))`
- оборачивает в `Suspense` + error boundary
- принимает те же props (`blockId`, `isEditMode`, …)

Для system route достаточно передать `blockId={999999}` без `block` prop — `useUniversalTableController` резолвит `blockId` напрямую.

Placeholder shell (`LegacyStorageBlockPlaceholderView`) для system route **не обязателен** — он нужен для edit-mode UX на canvas blocks, не для full-page route.

---

## 4. Inventory — упоминания ключевых символов

### 4.1. `UniversalTableView`

| Файл | Роль |
|------|------|
| `portal/PortalPageView.jsx` | **Static import + direct render** ← target bridge |
| `shared/legacy/support/LegacyStorageSupportModeBoundary.jsx` | Lazy dynamic import (allowed legacy island) |
| `shared/legacy/components/LegacyStorageBlockPlaceholderView.jsx` | Comment only |
| `modules/universalTable/components/tableView/UniversalTableView.jsx` | Implementation |
| `modules/universalTable/index.js` | Re-export |

### 4.2. `/universal-table` (frontend route)

| Файл | Роль |
|------|------|
| `App.jsx` | Route registration |
| `portal/PortalPageView.jsx` | `isUniversalTablePage`, layout flags, render branch |

Backend API `/universal-tables/*` — отдельный REST contour, не путать с frontend route.

### 4.3. `LegacyStorageSupportModeBoundary` / `LegacyStorageBlockPlaceholderView`

| Файл | Роль |
|------|------|
| `shared/legacy/support/LegacyStorageSupportModeBoundary.jsx` | Lazy UT boundary |
| `shared/legacy/components/LegacyStorageBlockPlaceholderView.jsx` | Canvas placeholder + preview toggle |
| `modules/blocks/registry/blockRegistry.js` | Maps `table` / `universal_table` → placeholder |
| `shared/legacy/index.ts` | Public exports |

### 4.4. `universal_table` / `table` (blocks & nav — adjacent, не PortalPageView bridge)

| Область | Файлы | Связь с work item |
|---------|-------|-------------------|
| Block registry | `blockRegistry.js` | Already isolated ✓ |
| Block guard | `BlockRenderer.jsx`, `PortalPageView` creation guard | Already isolated ✓ |
| Nav UI type | `MenuItem.jsx`, sidebar icons | UI only, не UT import |
| Section toolbar | `ContentSection.jsx` → `useSectionUniversalTableControls` | Canvas adjacent (не decouple target) |

### 4.5. `PortalPageView` — прочие UT-related hooks (не direct render)

| Механизм | Статус после Phase 4.1 |
|----------|------------------------|
| `legacyStorageAdapter` imports | ✓ через adapter, не UT напрямую |
| `subscribeToLegacyStorageTitle` | ✓ event bus через adapter |
| `handleSavePageTitle` → `renameLegacyStorage` | ✓ для dedicated UT **portal pages** (`pageId` required) |
| `registerPageEntities` → `entityLocationRegistry` | Indirect legacy identity (не import UT) |
| `isUniversalTablePage` layout branching | Route orchestration (останется после decouple) |

---

## 5. Risk Analysis

Что может сломаться при удалении **static import** `UniversalTableView` из `PortalPageView` (при сохранении route и lazy boundary):

| Область | Риск | Комментарий |
|---------|------|-------------|
| **Existing legacy pages** (canvas blocks) | **LOW** | Отдельный render path через placeholder; не затронут |
| **Direct URL `/universal-table`** | **MEDIUM** | Route должен остаться; render через boundary с теми же props |
| **Magic `blockId=999999` storage** | **MEDIUM** | Lazy-init `createTableForBlock(999999)` должен сохраниться; не менять id без ADR |
| **Title sync (header)** | **LOW** | `handleSavePageTitle` уже no-op без `pageId`; system page title static «Универсальная таблица» |
| **Dirty state** | **LOW–MEDIUM** | UT dirty events продолжат работать внутри boundary; runtime sidebar dirty guard по-прежнему ограничен (pre-existing, не регресс этого шага) |
| **Save behavior** | **LOW** | In-table save внутри `UniversalTableView`; не зависит от import style в PortalPageView |
| **Navigation open behavior** | **LOW** | Нет nav link на route; synthetic `activePageId` не зависит от UT import |
| **Bundle / code splitting** | **POSITIVE** | Static import удерживает UT в chunk PortalPageView; lazy boundary вернёт split |
| **ESLint Phase 9 freeze** | **LOW** | `portal/` не в guard globs; decouple улучшает архитектурную согласованность |

### Что **нельзя** делать на этом шаге (по scope)

- Удалять route `/universal-table` — отложено до ADR Q6 / Legacy Removal
- Удалять `UniversalTableView` или менять UT internals
- Ломать placeholder boundary на canvas

---

## 6. Recommended Target Architecture

### Сравнение вариантов

| Вариант | Суть | Плюсы | Минусы |
|---------|------|-------|--------|
| **A** | `PortalPageView` → `LegacyStorageSupportModeBoundary` → lazy UT | Минимальный diff, boundary уже есть | PortalPageView знает про support boundary; magic `999999` остаётся в portal file |
| **B** | `PortalPageView` → `LegacyStorageSystemRouteView` (adapter) → boundary → lazy UT | Симметрия с `legacyStorageAdapter`; route contract в одном месте; чистый analyzer check | +1 thin file |
| **C** | Generic `LegacyRouteBoundary` registry | Масштабируется на N legacy routes | Over-engineering при одном route |

### Рекомендация: **Вариант B** (с внутренним использованием boundary из A)

```text
PortalPageView
 └─ LegacyStorageSystemRouteView          ← new: shared/legacy/routes/ or components/
     └─ LegacyStorageSupportModeBoundary  ← existing lazy boundary
         └─ UniversalTableView (dynamic import only)
```

**Почему B, а не чистый A:**

1. **Единый legacy layer:** shell bridges → `legacyStorageAdapter`, canvas blocks → placeholder, system route → dedicated route view.
2. **Analyzer-friendly:** `PortalPageView` импортирует только `shared/legacy/*`, не `modules/universalTable`.
3. **Инкапсуляция magic constants:** `blockId={999999}`, layout wrapper, `data-legacy-system-route` marker — в одном файле.
4. **ADR Q6 ready:** deprecate / redirect `/universal-table` можно сделать в adapter без правок PortalPageView.

**Предлагаемый контракт adapter (conceptual, без реализации):**

```jsx
// shared/legacy/routes/LegacyStorageSystemRouteView.jsx
import LegacyStorageSupportModeBoundary from "../support/LegacyStorageSupportModeBoundary";

const LEGACY_SYSTEM_ROUTE_BLOCK_ID = 999999;

export default function LegacyStorageSystemRouteView({ isEditMode }) {
  return (
    <LegacyStorageSupportModeBoundary
      blockId={LEGACY_SYSTEM_ROUTE_BLOCK_ID}
      isEditMode={isEditMode}
    />
  );
}
```

`PortalPageView` заменяет import UT на import adapter; render branch остаётся `{isUniversalTablePage && <LegacyStorageSystemRouteView ... />}`.

---

## 7. Migration Plan (без кода)

### Phase 5.1 — Audit current PortalPageView render path

**Status:** ✅ **DONE** (этот документ)

Deliverables:

- [x] Inventory `UniversalTableView` / `/universal-table` / legacy boundary paths
- [x] Подтверждение: единственный hard bridge = static import + JSX в `portal/PortalPageView.jsx`
- [x] Risk matrix и target architecture

### Phase 5.2 — Create legacy runtime route adapter / boundary wiring

- Добавить `LegacyStorageSystemRouteView` (или эквивалент) в `shared/legacy/`
- Экспорт через `shared/legacy/index.ts`
- Внутри — только `LegacyStorageSupportModeBoundary`, без static UT import
- Задокументировать `LEGACY_SYSTEM_ROUTE_BLOCK_ID = 999999` и связь с `GET/POST /universal-tables/by-block/999999`

**DoD:** новый файл существует; unit smoke: lazy chunk загружается на `/universal-table`.

### Phase 5.3 — Replace direct UniversalTableView import

- `PortalPageView.jsx`: удалить `import { UniversalTableView } from "../modules/universalTable"`
- Заменить JSX на `<LegacyStorageSystemRouteView isEditMode={isEditMode} />`
- Сохранить все `isUniversalTablePage` layout flags без изменений
- **Не** менять `App.jsx` route

**DoD:** `grep UniversalTableView portal/PortalPageView.jsx` → empty; `/universal-table` открывается, таблица загружается.

### Phase 5.4 — Add analyzer check

Расширить `stage_works.py` (work item «Отделить PortalPageView от UniversalTableView»):

```python
# Conceptual checks:
# - portal/PortalPageView.jsx exists
# - "modules/universalTable" NOT in PortalPageView content
# - "UniversalTableView" NOT in PortalPageView content  
# - LegacyStorageSystemRouteView (or boundary) used when isUniversalTablePage branch exists
# - App.jsx still has /universal-table route (must NOT be removed at this stage)
```

Обновить `test_legacy_isolation_readiness` → **100%** (5/5).

Опционально: добавить `portal/` в `frontend_scan.py` если ещё не сканируется.

### Phase 5.5 — Mark Legacy Isolation completed

- Platform dashboard analyzer: readiness **100%**
- Docs sync: `YASNOPRO_ARCHITECTURE_STATUS.md`, `MIGRATION_MAP`, manifest readiness
- AD-015 status: **MITIGATED** (isolated behind legacy layer; route removal — отдельный ADR)

---

## 8. Definition of Done (для аудита)

| Критерий | Статус |
|----------|--------|
| Код не изменён | ✅ |
| Создан отчёт `PORTAL_PAGE_VIEW_UNIVERSAL_TABLE_DECOUPLING_AUDIT.md` | ✅ |
| Однозначный ответ «как безопасно убрать прямую связь» | ✅ — см. §6–§7 |

### Однострочный ответ для implementer

**Безопасно убрать прямую связь `PortalPageView → UniversalTableView`, заменив static import на thin adapter `LegacyStorageSystemRouteView`, который рендерит существующий `LegacyStorageSupportModeBoundary` с `blockId={999999}`, сохранив route `/universal-table` и все `isUniversalTablePage` layout branches без изменений.**

---

## 9. Связанные документы

- [UT_BRIDGES_AUDIT.md](./UT_BRIDGES_AUDIT.md) — §3.4 system route, bridge #7
- [YASNOPRO_LEGACY_TABLE_PLACEHOLDER_ISOLATION.md](./YASNOPRO_LEGACY_TABLE_PLACEHOLDER_ISOLATION.md) — canvas path (done)
- [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md) — AD-015 `/universal-table`
- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md) — Q6 route fate

---

## 10. Версия

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Phase 5.1 audit complete |
