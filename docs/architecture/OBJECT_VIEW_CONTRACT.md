# Object View Contract — контракт представлений объектов ЯсноПро

**Статус:** Stage 1 IMPLEMENTED (контракт и validation; runtime без изменений)  
**Версия:** 1.0  
**Дата:** 2026-06-07  
**Связанные документы:** [OBJECT_VIEW_ARCHITECTURE.md](./OBJECT_VIEW_ARCHITECTURE.md)

---

## Назначение

`ObjectViewContract` — единый контракт настроек вкладки объекта для всех view types. Хранится в `settings_json.objectView` (camelCase, `schemaVersion: 1`).

Контракт отвечает на три вопроса:

| Слой | Вопрос |
|------|--------|
| **Projection** | Какие поля объекта участвуют? |
| **Query** | Какие записи показывать? |
| **View Settings** | Как отображать выбранные поля? |

**Role Mapping** (новый слой Stage 1) связывает роли представления с ключами из Projection.

---

## Projection

Источник данных — поля Object Type. Projection **не создаёт** полей.

```json
{
  "fieldKeys": ["title", "description", "status"],
  "fieldOrder": ["title", "description", "status"],
  "titleFieldKey": "title"
}
```

| Ключ | Описание |
|------|----------|
| `fieldKeys` | Поля, участвующие в представлении |
| `fieldOrder` | Порядок полей (может отличаться от fieldKeys) |
| `titleFieldKey` | Поле-заголовок записи (опционально) |

---

## Query

Определяет выборку записей: фильтры, сортировка, пагинация.

```json
{
  "filters": {
    "conditions": [],
    "savedFilters": [],
    "quickFilters": [],
    "defaultQuickFilterId": null
  },
  "sort": {
    "rules": [{ "field": "title", "order": "asc" }]
  },
  "pagination": {
    "defaultPageSize": 20
  }
}
```

---

## Role Mapping

**Назначение:** какую роль выполняет поле в конкретном представлении. Каждое значение roleMapping **должно** ссылаться на ключ из `projection.fieldKeys`.

```json
{
  "nodeTitle": "title",
  "nodeStatus": "status",
  "nodeDescription": "description"
}
```

### Примеры по view types

**Plan**

```json
{
  "nodeTitle": "title",
  "nodeStatus": "status",
  "nodeDescription": "description"
}
```

**Calendar** (целевой)

```json
{
  "eventTitle": "title",
  "startDate": "start_date",
  "endDate": "due_date"
}
```

**Kanban** (целевой)

```json
{
  "cardTitle": "title",
  "columnField": "status"
}
```

### Studio UI (Stage 3)

Универсальный компонент `ObjectRoleMappingPanel` принимает `roleDefinitions` из `objectViewRoleDefinitions.js`.

| view_type | UI сегодня | Роли |
|-----------|------------|------|
| `plan` | ✅ Включён | nodeTitle, nodeStatus, nodeDescription, nextSteps |
| `table`, `form`, `list` | — | — |
| `card`, `board`, `calendar` | Заготовки в definitions | Будущие этапы |

Сохранение: `syncViewSettingsRoleMapping` → `objectView.roleMapping`. Validation: `validateRoleMappingAgainstProjection`.

### Plan role resolution (Stage 5D.2 — roleMapping only)

Функция `resolvePlanRoleMapping(contract)` — **единый источник ролей** в Plan runtime:

Читает только `objectView.roleMapping`. Источники: `roleMapping` | `missing`. Legacy `presentation.plan.*FieldKey` **не читается** runtime.

- `ObjectPlanView` / `buildPlanTree` / `PlanDetailPanel` читают `planRoleMapping.*`
- Deprecated alias: `resolvePlanRoleMappingDualRead` → `resolvePlanRoleMapping`
- Диагностика: `logPlanDebug('PLAN_ROLE_MAPPING_SOURCE', …)` — только `roleMapping` / `missing`

### Entity Title Resolution (Stage 5E)

Единый сервис отображаемого названия записи:

```text
resolveEntityDisplayTitle({ entity, objectType, projection, catalog, objectTypeKey })
  → Projection.titleFieldKey
  → Object Type Title Field (resolveObjectTypeTitleFieldKey / is_title)
  → [id]
```

Низкоуровневое чтение значения поля: `resolveEntityTitle(values, titleFieldKey)`.

**Запрещено в object platform runtime:** `title || name`, `entity.title`, `resolvePlanEntityTitle` (F7 удалён).

---

## Plan Legacy Deprecation (Stage 5A)

### Что считается legacy

| Ключ | Замена |
|------|--------|
| `presentation.plan.titleFieldKey` | `roleMapping.nodeTitle` |
| `presentation.plan.statusFieldKey` | `roleMapping.nodeStatus` |
| `presentation.plan.descriptionFieldKey` | `roleMapping.nodeDescription` |
| `presentation.plan.nextStepsFieldKey` | `roleMapping.nextSteps` |

Все помечены `@deprecated — Will be removed after migration cutoff`. **Не удалены** из контракта и Studio.

### Новая модель

- **Projection** — какие поля доступны представлению
- **Role Mapping** — какие поля играют роли `nodeTitle`, `nodeStatus`, `nodeDescription`, `nextSteps`
- **Presentation.plan** — только поведение (иерархия, progress map, blocks), без дублирования ролей

### Publish diagnostic: `usesLegacyPlanFields`

При publish Plan snapshot получает:

```json
{
  "presentation": {
    "plan": {
      "usesLegacyPlanFields": false
    }
  }
}
```

| Условие | Значение |
|---------|----------|
| Все обязательные роли (`nodeTitle`, `nodeStatus`, `nodeDescription`) в `roleMapping` | `false` |
| Пустой `roleMapping` или частичный (mixed) | `true` |
| Legacy `*FieldKey` без соответствующего `roleMapping` | `true` |

**Runtime не читает этот флаг.** Runtime использует `resolvePlanRoleMapping` (roleMapping only).

### Порядок удаления (этапы 5B–6)

1. **5B** — удалить `*FieldKey` из publish snapshot; убрать `LEGACY FALLBACK` из runtime
2. **6** — унификация остальных view types

---

## Presentation

View-specific настройки поведения и layout. Активен только блок `presentation.<viewType>`.

```json
{
  "table": { "hiddenFieldKeys": [], "columnOrder": [], "columnWidths": {}, "density": "compact" },
  "card": null,
  "plan": { "hierarchyRelationKey": "subtask", "statusProgressMap": {} },
  "board": null,
  "calendar": null,
  "tree": null,
  "diagram": null
}
```

### Legacy Plan keys (deprecated, сохранены)

| Legacy key | Role mapping (целевой) | Статус |
|------------|------------------------|--------|
| `presentation.plan.titleFieldKey` | `roleMapping.nodeTitle` | Deprecated, dual-read |
| `presentation.plan.statusFieldKey` | `roleMapping.nodeStatus` | Deprecated, dual-read |
| `presentation.plan.descriptionFieldKey` | `roleMapping.nodeDescription` | Deprecated, dual-read |
| `presentation.plan.nextStepsFieldKey` | `blocks.checklist` | Мёртвая, не удалена |

---

## Validation Rules

Проверки при publish (`validate_object_view_for_publish`):

| Код | Правило |
|-----|---------|
| `object_view_unknown_projection_field` | Каждый ключ в `projection.fieldKeys` существует в Object Type |
| `object_view_role_mapping_field_not_in_projection` | Каждое значение `roleMapping.*` ∈ `projection.fieldKeys` |
| `object_view_role_mapping_unknown_field` | Значение roleMapping существует в Object Type |
| `object_view_key_mismatch` | `objectView.key` = `view.key` |
| `object_view_type_mismatch` | `objectView.viewType` = `view.view_type` |

При publish normalization (`normalize_settings_json_for_publish`):

- `roleMapping` санитизируется: записи вне `projection.fieldKeys` удаляются (не блокируют publish legacy-вкладок)

---

## Migration Strategy

| Этап | Содержание | Статус |
|------|------------|--------|
| 0 | Документация, матрица | ✅ DONE |
| 1 | Контракт + roleMapping + validation + dual-read adapter | ✅ DONE |
| 2 | Projection UI для всех view types | ✅ DONE |
| 3 | Role Mapping UI (ObjectRoleMappingPanel) | ✅ DONE |
| 4 | Runtime dual-read | ✅ DONE |
| 5A | Plan Legacy Deprecation | ✅ DONE |
| 5B | Очистка legacy из publish snapshot | ✅ DONE |
| 5C.1 | Runtime Fallback Audit | ✅ DONE |
| 5C.2 | Fallback Removal (runtime) | ✅ DONE |
| 5D.1 | Legacy Dual-Read Usage Audit | ✅ DONE |
| 5D.2 | Legacy Dual-Read Removal | ✅ DONE |
| 5E | Entity Title Resolution | ✅ DONE |
| 5F | UI Cleanup Plan Settings | ✅ DONE |
| 6 | Финальная унификация | PLANNED |

---

## Backward Compatibility

1. **Legacy Plan keys** (`titleFieldKey`, `statusFieldKey`, `descriptionFieldKey`) **не удалены**.
2. **Пустой roleMapping** `{}` — валиден; runtime продолжает читать legacy keys.
3. **Legacy projection mirror** (`settings_json.projection` snake_case) пересобирается при publish.
4. **Старые вкладки** публикуются без изменений, если roleMapping пуст.
5. **Новые вкладки** получают scaffold с `roleMapping: {}`.

### Scaffold (новая вкладка)

```json
{
  "objectView": {
    "schemaVersion": 1,
    "key": "example",
    "viewType": "plan",
    "projection": { "fieldKeys": [], "fieldOrder": [], "titleFieldKey": null },
    "query": { "filters": { "conditions": [], "savedFilters": [], "quickFilters": [] }, "sort": { "rules": [] }, "pagination": { "defaultPageSize": 20 } },
    "roleMapping": {},
    "presentation": { "plan": {} }
  }
}
```

---

## Ссылки на код

| Concern | Path |
|---------|------|
| Contract (frontend) | `frontend/src/modules/objectViews/services/objectViewContract.js` |
| Role Mapping | `frontend/src/modules/objectViews/services/objectViewRoleMapping.js` |
| Plan dual-read | `frontend/src/modules/objectViews/plan/resolvePlanRoleMapping.js` |
| Normalizers | `frontend/src/modules/objectViews/services/normalizeObjectViewDefinition.js` |
| Publish guards | `backend/app/modules/platform/designer/publish/object_view_contract.py` |
| Publish validation | `validate_object_view_for_publish()` |
| Studio Plan scaffold | `frontend/src/modules/designer/utils/syncPlanViewSettings.js` |

---

*Stage 1 — контракт расширен roleMapping; runtime поведение не изменено.*
