# YASNOPRO Dual Source of Truth Recovery Plan

## Статус

```text
ACTIVE
```

Нормативный план реализации. Утверждает порядок устранения dual source of truth между legacy storage (`universal_table_rows`) и целевым Entity Layer (`runtime_entities` / `runtime_entity_values`).

Связанные документы:

- [YASNOPRO_PLATFORM_CORE.md](./YASNOPRO_PLATFORM_CORE.md)
- [YASNOPRO_ENTITY_MODEL.md](./YASNOPRO_ENTITY_MODEL.md)
- [YASNOPRO_VIEW_ENGINE_MODEL.md](./YASNOPRO_VIEW_ENGINE_MODEL.md)
- [YASNOPRO_PHASE9_LEGACY_FREEZE.md](./YASNOPRO_PHASE9_LEGACY_FREEZE.md)
- [YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md)
- [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md) (AD-001)
- [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md) — Layer 1 (PR #1)

**Текущая задача:** **Object Platform Independence** → Legacy Removal (ADR-001). Phase 9.6 **UNBLOCKED**. Layers 1–6 + Phase 9.5 **DONE**.

> Superseded: «Phase 9.6 / data migration planning» — UT migration **cancelled**.

---

## 1. Purpose

Документ фиксирует **рабочий план реализации** устранения **dual source of truth** в ЯсноПро.

### 1.1. Проблема

Платформа одновременно использует два несовместимых хранилища бизнес-данных:

| Путь | Цепочка | Роль в продукте |
|------|---------|-----------------|
| **Legacy** | Portal Page → Block `universal_table` → `universal_tables` → `universal_table_rows` | Исторический source of truth для portal-данных |
| **Target** | Object Type → Publish → Runtime Entity → `runtime_entities` / `runtime_entity_values` → Table View | Целевой source of truth |

Это создаёт split-brain: новые capabilities могут писать в legacy rows, комментарии и уведомления привязаны к `universal_table:*`, а object-centric контур уже читает/пишет Runtime Entity.

### 1.2. Цель плана

1. Остановить рост legacy storage (новые blocks, rows, nav items).
2. Закрепить **Runtime Entity** как единственный целевой SoT для **новых** бизнес-данных.
3. Сохранить работоспособность существующих portal-страниц и UT-блоков.
4. Не запрещать **Table View** и табличный UI — только legacy **storage path**.
5. Задать порядок слоёв реализации, границы «не трогать» и критерии готовности.

### 1.3. Вне scope этого плана

- ~~Big-bang ETL: массовая миграция всех `universal_table_rows` → `runtime_entities`.~~ **CANCELLED** (ADR-001).
- **Legacy Removal** вместо data migration — см. [adr/ADR-001-universal-table-retirement.md](./adr/ADR-001-universal-table-retirement.md).
- Удаление модуля `universalTable` и DROP таблиц БД.
- Permission Engine, Event Engine, AI Context Engine (отдельные программы).
- Полная унификация `universal_views` и Designer View Definitions (отдельная фаза после isolation).

---

## 2. Corrected Architecture Principle

### 2.1. Source of truth

| Сущность | Роль | SoT для бизнес-данных? |
|----------|------|------------------------|
| **Object Type** (Designer) | Описание бизнес-сущности: поля, связи, views (draft → publish) | Нет — **метаданные** |
| **Runtime Entity** | Экземпляр Object Type, значения полей | **Да — целевой SoT** |
| **Table View** | Adapter отображения списка/реестра entities | Нет — **UI** |
| **View Engine** (`shared/viewEngine`) | Переиспользуемый UI таблицы | Нет — **UI** |
| **Block / Page** | Композиция портала (layout) | Нет |
| **`universal_table_rows`** | Строки legacy-таблицы | **Legacy SoT** (только existing + read/edit до migration) |
| **`universal_views`** | Настройки представлений в scope `table_id` | Legacy view metadata, не Entity |

### 2.2. Обязательная формулировка

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

По-русски (для UX и code review):

```text
Таблица — это UI. universal_table_rows — legacy-хранилище. Runtime Entity — источник истины для бизнес-данных.
```

### 2.3. Что разрешено и что запрещено

| Разрешено | Запрещено |
|-----------|-----------|
| Table View поверх `runtime_entities` | Создание **новых** бизнес-записей через `createTableRow` / новые UT-blocks |
| Редактирование **существующих** legacy rows | Новые product features на `tableApi` вне allowlist |
| `UniversalTableView` для **существующих** blocks | Называть Universal Table «бизнес-сущностью» или Object Type |
| Lazy `createTableForBlock` для block **без** `table_id` | Big-bang migration без Entity Identity Contract |
| Publish → Office → ObjectViewHost | Новый source of truth (третий контур данных) |

### 2.4. Целевой поток данных

```text
Studio (Designer)
  → Object Type + Field/View Definitions
  → Publish → Published Catalog
Office (Runtime)
  → Navigation (object_type)
  → ObjectViewHost
  → Runtime Query API (read)
  → runtimeWriteGateway (write)
  → runtime_entities / runtime_entity_values
  → Table View (shared/viewEngine) — только отображение
```

Legacy-поток **не удаляется** в рамках этого плана — **изолируется** и перестаёт принимать новые данные.

---

## 3. Legacy vs Non-Legacy Boundary

### 3.1. Legacy

Следующие артефакты относятся к **legacy data path** или **legacy metadata в scope таблицы**:

| Артефакт | Описание |
|----------|----------|
| **`universal_tables`** | Storage-контейнер; часто `block_id` |
| **`universal_table_rows`** | JSON `values` — **legacy storage бизнес-данных** |
| **`universal_table_columns`** | Legacy schema колонок (не Designer Field Definitions) |
| **`universal_views`** | Views/filters/representations, привязанные к `table_id` |
| **Portal `universal_table` block creation** | Создание нового legacy data source на странице |
| **Nav type `universal_table`** | `useMenuEditor`: page + nav + section + block |
| **`tableApi` row CRUD** | `createTableRow`, `updateTableRow`, `deleteTableRow` |
| **Comments `entity_type=universal_table:{id}`** | Legacy identity (строка/таблица, не Runtime Entity) |
| **`EntityCardModal` (UT)** | Legacy entity card поверх row |
| **`modules/universalTable/**`** | Controller, session, representations (legacy stack) |

**Legacy — это не «таблица как UI».** Legacy — путь **хранения и создания** данных через portal block и `universal_table_rows`.

### 3.2. Non-Legacy

Следующие артефакты — **целевая архитектура** или разрешённый UI поверх неё:

| Артефакт | Описание |
|----------|----------|
| **Table View** | `ObjectTableView`, adapter `viewType: table` |
| **`shared/viewEngine`** | UI-движок таблицы для object-centric path |
| **`ObjectViewHost`** | Маршрутизация view types, contract, session |
| **Runtime Query API** | `platform/runtime/query` — list + projection |
| **`runtimeReadGateway`** | Граница чтения (query provider) |
| **`runtimeWriteGateway`** | Граница записи entities |
| **Designer View Definitions** | `designer/view_definitions` |
| **Publish to Office** | Snapshot → published catalog → nav |
| **Runtime Entity API** | `runtime/entities` CRUD |
| **`modules/objectViews/**`** | Object View contract, persistence к designer views |
| **`modules/objectEntities/**`** | Runtime entity card (целевой) |

**`UniversalTableView` (render)** — legacy **renderer** для existing blocks; в non-legacy **не** входит как паттерн для новых данных, но **не удаляется** до retirement программы.

---

## 4. What Must Stop

После прохождения соответствующих слоёв (§6) в продукте **должно быть остановлено**:

| # | Действие | Слой |
|---|----------|------|
| 1 | Создание новых blocks типа `universal_table` (и алиасов: `table`, `table_block`, `tableBlock`) на portal pages | Layer 2 |
| 2 | Создание navigation items типа `universal_table` (auto page + section + block) | Layer 2 |
| 3 | Создание **новых** бизнес-строк как primary path (`createTableRow` для greenfield) | Layer 2 + 3 |
| 4 | Новые product features, использующие `tableApi` / прямой доступ к `universal_table_rows` вне [allowlist](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md) | Layer 2 + 5 |
| 5 | Новые `universal_views` как **основной** путь представлений для новых объектов (новые object types → только Designer views) | Layer 2 / 5 |
| 6 | Новые comments/notes с identity `universal_table:*` в object-centric path | Layer 4 |

### 4.1. Явные исключения (НЕ останавливать)

| Действие | Причина |
|----------|---------|
| `createTableForBlock(block_id)` при 404 `getTableByBlock` | Lazy-init storage для **существующего** block без `table_id` |
| `updateTableRow` / `deleteTableRow` для existing rows | Поддержка legacy data |
| `POST /universal-tables` с `block_id` существующего block | То же — не creation нового source |
| Render `UniversalTableView` | Existing pages |

### 4.2. Backend guard (подфаза Layer 2)

`POST /blocks` с типом `universal_table` (+ aliases) → **422** `legacy_creation_forbidden`.

- **Не** блокировать: `PATCH /blocks`, `POST /universal-tables` (lazy-init), runtime entities API.
- Рекомендуемый момент: **после** стабилизации frontend guards (см. §10 Open Questions).

---

## 5. What Must Continue Working

До завершения Legacy Removal **временно** могут продолжать работать existing portal pages с UT blocks (placeholder после Phase 2).

> Superseded: «До отдельной программы data migration и retirement обязаны продолжать работать» — migration **не выполняется** (ADR-001).

| Область | Поведение |
|---------|-----------|
| **Existing UT blocks** | Открытие, загрузка данных, редактирование ячеек |
| **Existing portal pages** | Все страницы с legacy blocks без регрессий |
| **Existing rows** | CRUD через legacy controller / `tableApi` |
| **Existing comments / notes / attachments** | Чтение и отображение со legacy `entity_type` |
| **`UniversalTableView`** | Полный render path в `blockRegistry` |
| **`useTableBlock` + `createTableForBlock`** | Lazy-init для старых blocks |
| **Section hooks** | `useSectionUniversalTableControls`, dirty bridge (до state cleanup) |
| **`/universal-table` route** | До отдельного ADR (см. §10) |
| **Office object routes** | `/portal/:id/object-types/:ref` без регрессий |
| **Publish → menu** | Object type navigation |
| **Notifications → legacy card** | До Layer 4 bridge (allowlist Phase 9.5) |

**Критерий:** ни один слой §6 не должен ломать открытие production portal pages только ради «чистоты» архитектуры.

---

## 6. Implementation Layers

Порядок реализации: **L1 → L2 → (L3 параллельно L2) → L4 → L5 → L6 (финальная синхронизация)**.

---

### Layer 1 — Entity Identity Contract

**Цель:** единый canonical identity для бизнес-экземпляров во всех новых интеграциях (comments, notes, notifications, relations, AI).

**Решение (canonical):**

```text
runtime_entity:{uuid}
```

где `{uuid}` — `RuntimeEntity.id`.

**Legacy identity (read / compat only):**

| Формат | Назначение |
|--------|------------|
| `universal_table:{tableId}` | Комментарии/уведомления к legacy table scope |
| `universal_table_row:{rowId}` | Опционально — к конкретной строке (если используется) |
| `file:{fileId}` | Вложения (существующий контракт) |

**Что меняем (план файлов):**

- `docs/architecture/YASNOPRO_ENTITY_IDENTITY_CONTRACT.md` (новый)
- `frontend/src/shared/entityIdentity/*` (новый) — format, parse, `isLegacyEntityType`

**Что НЕ трогаем:** массовый UPDATE существующих comment rows в БД; UT row CRUD.

**Критерий готовности:**

- Контракт утверждён в architecture review.
- Новый код использует только canonical identity для **write**.
- Legacy identity поддерживается для **read** через documented bridge.
- В PR checklist: «нет новых `universal_table:*` writes в object-centric modules».

---

### Layer 2 — Stop New Legacy Data Creation

**Цель:** закрыть все UI и (в подфазе) API пути создания **новых** legacy data sources.

**Затрагивает (frontend):**

| Файл / модуль | Изменение |
|---------------|-----------|
| `modules/editor/components/WidgetLibrary.jsx` | Убрать / disable UT из creatable |
| `portal/constants/pageCanvasBlockTypes.js` | Фильтр типов |
| `portal/components/PageCanvasContextMenu.jsx` | Список без UT |
| `portal/PortalPageView.jsx` | Guard вместо открытия create modal |
| `modules/editor/hooks/useWidgetDragAndDrop.js` | Registry aliases + blocked drop |
| `modules/sections/components/ContentSection.jsx` | `isTableWidget` → registry |
| `modules/navigation/hooks/useMenuEditor.js` | Удалить / guard branch `universal_table` |
| `modules/navigation/components/CreateMenuItemModal.jsx` | Убрать option UT |
| `api/blocksApi.js` | FE guard на `createBlock` |

**Затрагивает (новые артефакты):**

- `frontend/src/shared/legacy/legacyStorageRegistry.ts` (или `legacyRegistry.ts` с `legacyKind: data_storage`)
- `shared/legacy/components/LegacyFeatureNotice.jsx`
- `docs/architecture/YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md`

**Подфаза Layer 2b (backend):**

- `backend/app/modules/blocks/service.py` — reject create `universal_table` (+ aliases)
- Тесты: create denied; patch allowed; `POST /universal-tables` для existing `block_id` allowed

**Что НЕ трогаем:** `UniversalTableView`, `useTableBlock`, `createTableForBlock`, `blockRegistry` render.

**Критерий готовности:**

- Из UI нельзя создать новый UT-block или UT-page/menu item.
- Manual QA matrix (existing page, drag blocked, Office route OK) пройден.
- `npm run build`, lint, `check:runtime-boundaries` — green.

---

### Layer 3 — Table View over Runtime Entity

**Цель:** табличное отображение **новых** данных работает только через Runtime Entity; не через `tableApi` / `universal_table_rows`.

**Затрагивает:**

- `modules/objectViews/table/**`
- `modules/objectViews/hooks/useObjectViewCreateEntity.js`
- `modules/runtimeWriteGateway/**`
- `shared/viewEngine/**` (при необходимости inline edit)
- `portal/pages/PortalObjectDataPage.jsx`, `designer/.../ObjectTypeDataPage.jsx`, `RuntimePreviewTab.jsx`

**Не через:**

- `tableApi`
- `createTableRow` / `updateTableRow` в `objectViews/**`

**Что НЕ трогаем:** весь `modules/universalTable/**` write path для existing tables.

**Критерий готовности:**

- Создание/редактирование записи в Office/Studio Table View идёт через `runtimeWriteGateway` → `/runtime/entities`.
- Нет импортов `tableApi` в `objectViews/**` (ESLint / boundary check).
- `legacyFallback={false}` на production object routes подтверждён.

---

### Layer 4 — Comments / Notes / Attachments Identity Migration

**Цель:** новые коммуникации привязаны к `runtime_entity:{uuid}`; legacy types читаются через compatibility bridge.

**Затрагивает:**

- `universalTable/.../EntityCardComments.jsx`, `EntityCardNotes.jsx` (read + stop new legacy writes)
- `modules/objectEntities/**` (comments panel для runtime card)
- `modules/comments/**`, `modules/notes/**` (client helpers)
- `modules/notifications/navigation/notificationNavigationMapper.js`
- `modules/notifications/components/NotificationOverlayHost.jsx`
- Опционально: `backend/.../comments/service.py` — validation / logging deprecated types

**Legacy bridge:**

- Чтение `universal_table:{id}` и row JSON `runtime_entity_id` → resolve canonical для UI/navigation.

**Что НЕ трогаем:** массовый SQL migration comment rows (отдельная программа).

**Критерий готовности:**

- Новый comment из Object Entity Card / object table path → canonical identity.
- Старые UT comments открываются и отображаются.
- Нет новых `universal_table:*` **writes** из object-centric modules.

---

### Layer 5 — Legacy UT Storage Isolation

**Статус:** `DONE` (PR #5)

**Цель:** legacy stack обслуживает **только existing data**; creation chain удалена; границы закреплены в eslint/allowlist.

**Сделано (PR #5):**

- Удалены `TableBlockAddModal.jsx`, `createUniversalTableBlock`, `tableBlockAddState` и handlers в `PortalPageView.jsx`
- Маркеры existing: `LegacyStorageExistingBadge`, `LegacyStorageExistingSupportNotice`, titles в `blockRegistry.js`
- Type checks в `BlockWrapper` / `BlockRenderer` / `PortalPageView` → `isLegacyUniversalTableStorageBlockType`
- Allowlist: снят `TableBlockAddModal`; см. [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md §8](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md)

**Что НЕ трогали:** render path, `tableSessionStore`, `tableApi`, backend tables.

**Критерий готовности:** выполнен (см. isolation doc §8 QA).

---

### Layer 6 — Documentation Alignment

**Статус:** `DONE` (PR #6)

**Цель:** архитектурные документы отражают corrected principle; Universal Table storage не именуется бизнес-сущностью; Table View отделён от legacy storage.

**Сделано (PR #6):**

- `YASNOPRO_ARCHITECTURE_STATUS.md` — Object Type / Runtime Entity / Object Views IMPLEMENTED; legacy UT existing-only
- `YASNOPRO_MIGRATION_MAP.md` — §24 Dual-SoT track, Layer 1–6, Phase 9.5 / 9.6
- `docs/architecture/README.md` — Current Architecture Status
- `YASNOPRO_ARCHITECTURE_DEBT.md` — AD-001 PARTIAL; AD-011…017
- Phase 9 docs согласованы с Layer 5

**Критерий готовности:** выполнен.

---

## 7. Do Not Touch List

До отдельного ADR на retirement **запрещено** ломать или удалять следующее без замены и migration:

| Категория | Пути / компоненты |
|-----------|-------------------|
| Legacy render | `UniversalTableView`, `modules/universalTable/**` |
| Block lifecycle | `useTableBlock`, `createTableForBlock` |
| Existing row writes | `updateTableRow`, `deleteTableRow` для existing rows |
| Registry | `blockRegistry.universal_table` render path |
| Portal runtime | `portal/PortalPageView.jsx` (render sections; не путать с creation cleanup) |
| Object-centric core | `modules/objectViews/**`, `modules/objectEntities/**` |
| View UI | `shared/viewEngine/**`, `ObjectViewHost` |
| Platform API | `backend/.../runtime/entities/**`, `runtime/query/**` |
| Publish | `platform/designer/publish/**`, menu_placements |
| Gateways | `runtimeReadGateway`, `runtimeWriteGateway` (contracts) |
| DB | DROP `universal_tables`, `universal_table_rows`, `universal_views` |

---

## 8. Risk Map

| Risk | Level | Mitigation |
|------|-------|------------|
| Сломать existing UT block без `table_id` (нет lazy-init) | **HIGH** | Не блокировать `POST /universal-tables` с `block_id` existing block; тест QA |
| Backend guard слишком рано / слишком широкий | **MEDIUM** | Layer 2b после FE guards; scope только `POST /blocks` create |
| Потерять старые comments / deep links | **HIGH** | Layer 1 contract + Layer 4 dual-read bridge; не DELETE legacy rows |
| Перепутать Table View и Universal Table Storage в коде/review | **MEDIUM** | Обязательная формулировка §2.2; registry `legacyKind: data_storage` |
| Заблокировать `updateTableRow` для existing | **HIGH** | Do Not Touch §7; Layer 2 только **create** paths |
| Новый source of truth (третий контур) | **CRITICAL** | Только `runtime_entities`; запрет новых rows |
| Удалить `UniversalTableView` при «очистке» | **HIGH** | Explicit Do Not Touch |
| Документы снова расходятся с кодом | **MEDIUM** | Layer 6 + owner STATUS после каждой фазы |
| API bypass до Layer 2b | **MEDIUM** | Мониторинг + быстрый 2b |
| `useObjectViewPersistence` → designer API из Office | **MEDIUM** | Отдельный ADR Runtime vs Designer (вне критического path dual-SoT) |

---

## 9. Recommended First PR

### PR #1 — Architecture Contract Only

**Scope:** документы + тонкие shared helpers **без** изменения runtime поведения.

**Создано в PR #1:**

| Артефакт | Назначение |
|----------|------------|
| `docs/architecture/YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md` | Recovery plan (этот документ) |
| `docs/architecture/YASNOPRO_ENTITY_IDENTITY_CONTRACT.md` | Canonical + legacy identity rules |
| `frontend/src/shared/entityIdentity/*` | format, parse, legacy detection |
| `frontend/src/shared/legacy/legacyStorageRegistry.ts` | Legacy storage path metadata (`legacyKind: data_storage`) |

**PR #2 (Layer 2) — создано:**

- [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md)
- Creation guards (WidgetLibrary, canvas, PortalPageView, menu, blocksApi, …)
- `LegacyStorageNotice.jsx`

**PR #2b (Layer 2b) — создано:**

- `backend/app/modules/blocks/legacy_guard.py`
- Guard в `service.create_block` → 422 `legacy_storage_creation_forbidden`

**PR #3 (Layer 3) — верификация:**

- [YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md](./YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md) — audit-only, код object-centric не менялся

**PR #4 (Layer 4) — DONE:** comments, notes, attachments → `runtime_entity` в object path; UT legacy compatibility сохранена.

**PR #5 (Layer 5) — DONE:** isolation existing-only UT storage; см. [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md §8](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md).

**PR #6 (Layer 6) — DONE:** documentation alignment (STATUS, MIGRATION_MAP, DEBT, README, Phase 9 sync).

**PR #8 (Phase 9.5) — DONE:** [YASNOPRO_NOTIFICATION_ROUTING_HARDENING.md](./YASNOPRO_NOTIFICATION_ROUTING_HARDENING.md).

**Следующий этап:** **Object Platform Independence** → Legacy Isolation → Phase **9.6** (adapter cleanup) → **Legacy Removal**.

> Superseded: «Phase 9.6 или программа data migration» — migration **cancelled** (ADR-001).

**Критерий merge PR #1:** review architecture; CI green; **нулевое** изменение user-visible behavior.

### PR #2 (после PR #1)

Layer 2 — Stop New Legacy Data Creation (frontend guards + `YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md`).

---

## 10. Open Questions

Вопросы должны быть закрыты до или в начале соответствующего слоя:

| # | Вопрос | Слой |
|---|--------|------|
| Q1 | Окончательный canonical format: только `runtime_entity:{uuid}` или также составной `object_type:{key}:{id}`? | L1 |
| Q2 | Поле `runtime_entity_id` в JSON UT row — официальный bridge для L4 или deprecated? | L4 |
| Q3 | Разрешать ли создание/редактирование `universal_views` для **existing** legacy tables после Layer 2? | L2, L5 |
| Q4 | Когда включать backend `POST /blocks` guard — сразу после FE или отдельный релиз? | L2b |
| Q5 | Когда начинать migration comment/note **rows** в БД vs только dual-read? | L4+ |
| Q6 | Судьба `/universal-table` system route: freeze / redirect / deprecate? | L5 |
| Q7 | Может ли Office runtime user вызывать `designerApi.updateView` (сохранение view definition)? | L3, отдельный ADR |
| Q8 | Backend: strict whitelist `entity_type` на POST comments или warn-only? | L4 |
| Q9 | Owner синхронизации `ARCHITECTURE_STATUS` с фазами Recovery? | L6 |
| Q10 | ~~ETL `universal_table_rows` → `runtime_entities`~~ | **CANCELLED** — ADR-001 Legacy Removal |

---

## Appendix A — Layer summary table

| Layer | Цель | Критерий готовности (кратко) | Статус |
|-------|------|------------------------------|--------|
| L1 | Entity Identity Contract | Canonical write; legacy read | **DONE** |
| L2 | Stop new legacy creation | UI cannot create UT block/page | **DONE** |
| L3 | Table View → Runtime Entity | objectViews writes via gateway only | **VERIFIED** |
| L4 | Communication identity | No new `universal_table:*` in object path | **DONE** |
| L5 | Legacy isolation | Creation removed; render works | **DONE** |
| L6 | Docs alignment | STATUS/README match code | **DONE** |

---

## Appendix B — Связь с Phase 9 Legacy Freeze

| Phase 9 | Recovery Plan |
|---------|---------------|
| 9.1 Legacy Freeze (ESLint) | Сохраняется; L5 ужесточает allowlist |
| 9.2 Portal object routes | Target path; не откатывать |
| 9.3 Legacy block isolation | = Layer 2 (+ Layer 5 cleanup) **DONE** |
| 9.5 Notifications → object card | **DONE** — [NOTIFICATION_ROUTING_HARDENING.md](./YASNOPRO_NOTIFICATION_ROUTING_HARDENING.md) |
| 9.6 Adapter removal | **UNBLOCKED** — Legacy Removal (ADR-001) |

Новый код в object-centric зонах по-прежнему обязан следовать [YASNOPRO_PHASE9_LEGACY_FREEZE.md](./YASNOPRO_PHASE9_LEGACY_FREEZE.md).

---

*Документ версии 1.0. Утверждён как рабочий план реализации dual-SoT recovery.*

> **Superseded by ADR-001 (2026-05-30):** data migration **cancelled**; следующий этап — Object Platform Independence → Legacy Removal. Dual SoT — **временное** legacy-состояние, не целевая архитектура.
