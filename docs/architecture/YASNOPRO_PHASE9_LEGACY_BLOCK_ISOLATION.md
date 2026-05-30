# YASNOPRO Phase 9.3 — Legacy Block Isolation (Layer 2)

## Статус

```text
COMPLETED — Layer 2 DONE · Layer 5 DONE · Legacy Block Types Isolation COMPLETED (2026-05-30)
```

Нормативный документ Phase 9.3 / **Dual-SoT Recovery Plan Layer 2**: остановка создания новых legacy data sources через Universal Table storage path.

**Completion doc:** [YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md](./YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md)

Связанные документы:

- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md)
- [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md)
- [YASNOPRO_PHASE9_LEGACY_FREEZE.md](./YASNOPRO_PHASE9_LEGACY_FREEZE.md)
- [YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md)

Реализация helpers (PR #1): `frontend/src/shared/entityIdentity/`, `frontend/src/shared/legacy/legacyStorageRegistry.*`

---

## 1. Цель

Устранить рост **dual source of truth**: запретить создание новых цепочек

```text
Portal Page → Block universal_table → universal_tables → universal_table_rows
```

при сохранении работоспособности **существующих** portal-страниц, блоков, строк и коммуникаций.

### Обязательная формулировка

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

---

## 2. Legacy = storage path, не Table View

| Понятие | Статус |
|---------|--------|
| **Legacy** | `universal_tables`, `universal_table_rows`, `universal_views`, portal block creation, nav `universal_table`, `tableApi` row **create** |
| **Не legacy** | Table View, `shared/viewEngine`, `ObjectViewHost`, Runtime Query/Entity API, render `UniversalTableView` |

Universal Table **не** является бизнес-сущностью. Запрещён **старый способ хранения данных**, не табличный UI.

---

## 3. Что блокируется

| # | Действие |
|---|----------|
| B1 | Создание block типа `universal_table` (+ aliases: `table`, `tableBlock`, `table_block`) |
| B2 | ~~`TableBlockAddModal`~~ — **удалён** (Layer 5); создание блокируется guard в `handleAddBlockToSection` |
| B3 | Drag/create из Widget Library |
| B4 | Пункт контекстного меню canvas (creatable list) |
| B5 | Drop widget на page/section (free layout) |
| B6 | Navigation item `universal_table` (page + section + block) |
| B7 | Option в `CreateMenuItemModal` |
| B8 | `blocksApi.createBlock` — frontend throw без HTTP |

---

## 4. Что продолжает работать

| Область | Поведение |
|---------|-----------|
| Existing UT blocks | Render через `UniversalTableView` |
| Existing rows | Read/edit через legacy controller / `tableApi` |
| `createTableForBlock` | Lazy-init для block **без** `table_id` |
| `updateTableRow` / `deleteTableRow` | Existing data |
| Comments/notes/attachments | Legacy identity, без изменений в Layer 2 |
| Office object routes | Object Type → Publish → Office |
| Table View (object path) | `ObjectViewHost` + `runtime_entities` |

---

## 5. Закрытые entry points

> **Formal closure:** [YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md](./YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md) — STATUS: COMPLETED (2026-05-30)

| ID | Файл | Механизм | Статус |
|----|------|----------|--------|
| E1 | `modules/editor/components/WidgetLibrary.jsx` | UT убран из drag; `LegacyStorageNotice` | **DONE** |
| E2 | `portal/constants/pageCanvasBlockTypes.js` | `getCreatablePageCanvasBlockTypes()` | **DONE** |
| E3 | `portal/components/PageCanvasContextMenu.jsx` | Creatable types only | **DONE** |
| E4 | `portal/PortalPageView.jsx` | `handleAddBlockToSection`, `handleContextMenuSelect` → toast | **DONE** |
| E5 | `modules/editor/hooks/useWidgetDragAndDrop.js` | `onError` + registry | **DONE** |
| E6 | `modules/sections/components/ContentSection.jsx` | Block legacy drop в non-free / free | **DONE** |
| E7 | `modules/navigation/hooks/useMenuEditor.js` | Throw на `universal_table` flow | **DONE** |
| E8 | `modules/navigation/components/CreateMenuItemModal.jsx` | Option removed | **DONE** |
| E9 | `api/blocksApi.js` | `assertLegacyStorageBlockCreationAllowed` | **DONE** |

**Registry:** `frontend/src/shared/legacy/legacyStorageRegistry.ts`  
**Notice:** `frontend/src/shared/legacy/components/LegacyStorageNotice.jsx`  
**Copy:** `frontend/src/shared/legacy/legacyStorageNoticeMessages.ts`

---

## 6. Backend guard — PR #2b (implemented)

**Статус:** **DONE** — реализовано в `backend/app/modules/blocks/legacy_guard.py`, проверка в `service.create_block`.

### Поведение

| Условие | Ответ |
|---------|--------|
| `POST /blocks` с `type` ∈ legacy storage aliases | **422** |
| Error `detail.code` | `legacy_storage_creation_forbidden` |
| Error `detail.message` | `Creating new Universal Table storage blocks is disabled. Create Object Type in Studio and publish it to Office.` |

**Запрещённые block types (create only):**

- `universal_table`
- `table`
- `tableBlock`
- `table_block`

### API bypass закрыт

Прямой вызов `POST /blocks` (Postman, scripts) больше не создаёт новый legacy storage block. Frontend guard (PR #2) + backend guard (PR #2b) = defense in depth.

### Намеренно не блокируется

| Endpoint / операция | Причина |
|---------------------|---------|
| `PUT /blocks/{id}` (`update_block`) | Existing blocks, settings, `table_id` patch |
| `DELETE /blocks/{id}` | Layout lifecycle |
| `POST /blocks/move` | Перемещение existing blocks |
| `POST /universal-tables` | Lazy-init storage для **existing** block без `table_id` |
| `GET /universal-tables/by-block/{id}` | Read path |
| Row CRUD (`universal_table_rows`) | Existing legacy data |
| Runtime Entity / Object Views APIs | Target path |

Формулировка ошибки **не** запрещает Table View — только создание нового **legacy storage block**.

### Тесты

| Файл | Покрытие |
|------|----------|
| `backend/app/modules/blocks/test_legacy_guard.py` | Aliases, `create_block` 422/allow |

Запуск: `cd backend && python -m pytest app/modules/blocks/test_legacy_guard.py -q`

### Manual API checklist (2b)

```http
POST /blocks/
Content-Type: application/json

{"section_id": 1, "type": "universal_table", "title": "T"}
→ 422, detail.code = legacy_storage_creation_forbidden

POST /blocks/  {"section_id": 1, "type": "text", ...}
→ 201/200 (успех, если section существует)

PUT /blocks/{existing_ut_block_id}  {"content": {"table_id": 123}}
→ успех (не 422)

POST /universal-tables  {"block_id": <existing_block_id>, "title": "..."}
→ не 422 legacy_storage_creation_forbidden
```

---

## 7. Manual QA checklist

### Existing (must pass)

- [ ] Открывается portal page с существующим UT block
- [ ] Строки отображаются
- [ ] Редактирование existing row работает
- [ ] Старые comments/notes на UT открываются
- [ ] Block без `table_id`: при открытии срабатывает lazy `createTableForBlock` (network `POST /universal-tables`)

### Creation blocked (must pass)

- [ ] Widget Library: нельзя drag-create UT / table widget
- [ ] Canvas context menu: нет пункта «Таблица» (UT)
- [ ] Drop UT widget на section → toast/ошибка с текстом notice
- [ ] Sidebar create menu: нет option «Универсальная таблица»
- [ ] Прямой вызов `createBlock('universal_table')` с FE → Error, нет `POST /blocks`
- [ ] `POST /blocks` type=`universal_table` (API) → 422 `legacy_storage_creation_forbidden`

### Target path (must pass)

- [ ] Studio: Object Type → Publish → Office route открывается
- [ ] Object table: create entity через runtime (не `createTableRow`)

### Regression

- [ ] Другие block types (text, image, …) создаются
- [ ] `npm run build` / `check:runtime-boundaries` green

---

## 8. Layer 5 — Legacy UT Storage Isolation (PR #5)

**Статус:** `DONE`

### Удалено (creation-only, недостижимо после Layer 2 guards)

| Артефакт | Действие |
|----------|----------|
| `portal/components/TableBlockAddModal.jsx` | Удалён |
| `createUniversalTableBlock` в `PortalPageView.jsx` | Удалён |
| `tableBlockAddState` + `handleTableBlockAddCreateNew` / `handleTableBlockAddExisting` | Удалены |

### Маркеры existing legacy storage

| Место | Компонент |
|-------|-----------|
| Page canvas (edit mode) | `LegacyStorageExistingBadge` в `BlockWrapper` |
| Block settings panel | `LegacyStorageExistingSupportNotice` в `UniversalTableBlockEditor` |
| Block type title (settings) | `blockRegistry.js` — суффикс `(legacy storage)` |

Copy: `frontend/src/shared/legacy/legacyStorageExistingMessages.ts`

### Placeholder boundary (Phase 2 Legacy Isolation work item)

**Статус:** **DONE** — см. [YASNOPRO_LEGACY_TABLE_PLACEHOLDER_ISOLATION.md](./YASNOPRO_LEGACY_TABLE_PLACEHOLDER_ISOLATION.md)

| Место | Поведение |
|-------|-----------|
| `blockRegistry.js` | `table` / `universal_table` → `LegacyStorageBlockPlaceholderView` |
| View mode | Auto lazy mount support runtime |
| Edit mode | Collapsed shell + «Предпросмотр legacy-таблицы» |
| Support runtime | `LegacyStorageSupportModeBoundary` → dynamic `UniversalTableView` |

### Existing runtime (без изменений)

`UniversalTableView`, `useTableBlock`, `createTableForBlock`, `tableApi` row CRUD, `universal_views`, legacy EntityCard, comments/notes/attachments adapters.

### Manual QA (Layer 5)

- [ ] Existing UT page opens; rows visible; row edit works
- [ ] Legacy comments/notes/attachments on UT work
- [ ] Edit mode: badge «Хранилище Universal Table · режим поддержки» на UT block
- [ ] Block settings: support notice panel
- [ ] New UT block creation blocked (UI + API 422)
- [ ] Object Table View + Runtime Entity communication unchanged

---

## 9. REMOVE_CANDIDATE (post Layer 5)

| Артефакт | Когда |
|----------|-------|
| `/universal-table` system route | Layer 6 / отдельный ADR (Q6) |
| `runtimeReadGateway` legacy providers | **REMOVED** (read, 2026-05-30) |
| `runtimeLegacyWriteAdapter` | **REMOVED** (2026-05-30) |
| `NotificationOverlayHost` → `EntityCardModal` | Phase 9.5 |

---

## 10. Версия

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-29 | Layer 2 implementation (PR #2) |
| 1.1 | 2026-05-29 | Backend guard PR #2b |
| 1.2 | 2026-05-29 | Layer 5 — removal creation UI, existing markers (PR #5) |
