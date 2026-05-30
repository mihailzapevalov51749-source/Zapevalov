# YASNOPRO Table View — Runtime Entity Verification

## Статус

```text
VERIFIED — Layer 3 (PR #3)
```

Документ фиксирует результат аудита object-centric Table View (PR #3). **Код object-centric контура не менялся** — нарушений не обнаружено.

Связанные документы:

- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md) — Layer 3
- [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md)
- [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md)
- [YASNOPRO_PHASE9_LEGACY_FREEZE.md](./YASNOPRO_PHASE9_LEGACY_FREEZE.md)

---

## 1. Purpose

Подтвердить, что **Table View** в object-centric контуре (Office / Studio data / preview):

- читает данные через **Runtime Query API** (`runtimeReadGateway` → `queryReadProvider`);
- создаёт и обновляет бизнес-данные через **Runtime Entity API** (`runtimeWriteGateway`);
- **не** использует `tableApi`, `universal_table_rows`, `modules/universalTable/**`.

Legacy **UniversalTableView** (portal blocks) остаётся отдельным контуром.

### Принцип

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

---

## 2. Audit scope

| Область | Путь |
|---------|------|
| Object Views | `frontend/src/modules/objectViews/**` |
| View Engine UI | `frontend/src/shared/viewEngine/**` |
| Read gateway | `frontend/src/modules/runtimeReadGateway/**` |
| Write gateway | `frontend/src/modules/runtimeWriteGateway/**` |
| Office route | `frontend/src/portal/pages/PortalObjectDataPage.jsx` |
| Designer data | `frontend/src/modules/designer/pages/ObjectTypeDataPage.jsx` |
| Studio preview | `frontend/src/modules/designer/components/tabs/RuntimePreviewTab.jsx` |

**Дата аудита:** 2026-05-29 (после PR #1, #2, #2b).

---

## 3. Read path — VERIFIED

### Цепочка

```text
ObjectViewHost
  → useObjectViewQuery
    → runtimeReadGateway.getProjection / getObjectList
      → queryReadProvider
        → designer/api/runtimeQueryApi
          → POST/GET /runtime/... (platform query + catalog)
```

### Детали

| Компонент | Поведение |
|-----------|-----------|
| `useObjectViewQuery.js` | Catalog: `getPublishedCatalog(tenantId)`; rows: `runtimeReadGateway.getObjectList` |
| `queryReadProvider.js` | `queryRuntimeEntities`, `getViewProjectionMetadata` — без `tableApi` |
| `mapObjectViewQueryToRuntimeParams.js` | Параметры query из object view contract |
| `mapEntityToRow.js` | Маппинг **runtime entity** → row model для ViewEngine |

### Legacy fallback

> **Superseded (2026-05-30):** legacy fallback **удалён**. См. [YASNOPRO_RUNTIME_READ_GATEWAY_CLEANUP.md](./YASNOPRO_RUNTIME_READ_GATEWAY_CLEANUP.md).

| Уровень | Значение |
|---------|----------|
| `runtimeReadGateway` | **query only** — `queryReadProvider` |
| Legacy providers | **REMOVED** — `legacyTableReadProvider`, `legacyViewReadProvider` отсутствуют |
| `legacyFallback` prop | **REMOVED** из `useObjectViewQuery` и call sites |
| `getLegacyTable` / `getLegacyTableLookupSources` | **REMOVED** из gateway |

При ошибке query ошибка пробрасывается пользователю — **без** fallback на Universal Table.

### Прямые legacy read API

~~`runtimeReadGateway.getLegacyTable` / `getLegacyTableLookupSources`~~ — **удалены** из gateway.

---

## 4. Create path — VERIFIED

### Цепочка

```text
ObjectTableView
  → useObjectViewCreateEntity
    → runtimeWriteGateway.createEntity
      → runtimeWriteGateway/api/runtimeEntitiesApi.js
        → POST /runtime/entities/tenants/{tenantId}/{objectTypeKey}
```

| Файл | Роль |
|------|------|
| `useObjectViewCreateEntity.js` | Диалог создания; payload через `buildCreateEntityPayload` |
| `ObjectCreateEntityDialog.jsx` | UI |
| `getCreatableFields.js` | Поля из **published catalog**, не UT columns |

**Не используется:** `createTableRow`, `createTableForBlock`, `POST /universal-tables`.

`createEntityEnabled` отключён в `mode="studio-preview"` (только просмотр в preview).

---

## 5. Update path — VERIFIED (Entity Card)

### Цепочка

```text
ObjectTableView (row click)
  → useObjectEntityCard (modules/objectEntities)
    → useObjectEntityUpdate
      → runtimeWriteGateway.updateEntity
        → PATCH /runtime/entities/...
```

| Файл | Роль |
|------|------|
| `useObjectEntityCard.js` | Открытие карточки по `entity.id` из list |
| `useObjectEntityUpdate.js` | `buildEntityUpdatePayload` + `updateEntity` |

**Не используется:** `updateTableRow`, inline UT cell editors.

### Known gap (не нарушение Layer 3)

**Inline edit в ячейках таблицы** в object-centric Table View **не реализован**. Редактирование — через **Object Entity Card** (modal). Это не откат к `tableApi`; при добавлении inline edit в будущем обязателен `runtimeWriteGateway.updateEntity` (см. freeze rules).

---

## 6. Import / boundary audit

### `objectViews/**`

| Проверка | Результат |
|----------|-----------|
| `tableApi` | **Нет** |
| `universalTable` imports | **Нет** |
| `createTableRow` / `updateTableRow` | **Нет** |
| `createTableForBlock` / `getTableByBlock` | **Нет** |

### `shared/viewEngine/**`

| Проверка | Результат |
|----------|-----------|
| `universalTable` imports | **Нет** (только комментарий в `viewEngineReferenceTokens.js`) |
| `tableApi` | **Нет** |

### `runtimeWriteGateway/**`

| Проверка | Результат |
|----------|-----------|
| `tableApi` | **Нет** |
| Только `runtimeEntitiesApi.js` | **Да** |

### `runtimeReadGateway/**`

| Проверка | Результат |
|----------|-----------|
| Legacy providers | **REMOVED** (2026-05-30) |
| Object path | **query only** — `queryReadProvider` |
| Fallback branches | **Нет** |

### `npm run check:runtime-boundaries`

Проверяет прямой импорт `tableApi` / `universalViewsApi` вне allowlist. **objectViews** не в списке нарушений.

---

## 7. Production entry points

| Entry | Read path | `mode` | Create entity |
|-------|-----------|--------|---------------|
| `PortalObjectDataPage` | query only | `data` | Да |
| `ObjectTypeDataPage` (Studio data tab) | query only | `data` | Да |
| `RuntimePreviewTab` | query only | `studio-preview` | Нет |
| `ObjectTypeDataTableView` (deprecated wrapper) | query only | — | Зависит от caller |

Legacy fallback props **удалены** (2026-05-30).

---

## 8. What remains legacy (intentionally separate)

| Контур | Storage | UI |
|--------|---------|-----|
| Portal UT block | `universal_table_rows` | `UniversalTableView` |
| Object-centric Table View | `runtime_entities` | `ObjectViewHost` + `viewEngine` |

Создание новых UT storage blocks заблокировано (PR #2, #2b). Существующие UT pages **не затронуты** Layer 3.

---

## 9. Layer 3 completion criteria

| Критерий | Статус |
|----------|--------|
| Table View reads via Runtime Query | **PASS** |
| Create via `runtimeWriteGateway` | **PASS** |
| Update via `runtimeWriteGateway` (entity card) | **PASS** |
| No `tableApi` in `objectViews` | **PASS** |
| No `universalTable` imports in `objectViews` | **PASS** |
| `legacyFallback` off on object routes | **PASS** |
| Legacy UT render unchanged | **PASS** (out of scope) |

**Вывод:** Layer 3 **можно считать завершённым** для текущей реализации Table View. Кодовые правки PR #3 **не требуются**.

---

## 10. Follow-up (не Layer 3)

| Задача | Фаза | Статус |
|--------|------|--------|
| Comments/notes/attachments on `runtime_entity` | Layer 4 | **DONE** |
| Legacy UT storage isolation | Layer 5 | **DONE** |
| Inline cell edit → `updateEntity` | Future | PLANNED |
| `ObjectTypeDataTableView` cleanup | Future | PLANNED |
| ~~ETL legacy rows → entities~~ | ~~Data migration program~~ | **CANCELLED** — ADR-001 Legacy Removal |

---

## 11. Verification commands

```bash
# Frontend
cd frontend
npm run build
npm run check:runtime-boundaries

# Grep audits (ожидается 0 matches в objectViews)
rg "tableApi|universalTable|createTableRow|updateTableRow" src/modules/objectViews
rg "legacyFallback=\{true\}" src
```

---

*Версия 1.0 — audit-only PR #3.*
