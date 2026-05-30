# YASNOPRO Phase 9.5 — Notification Routing Hardening

## Статус

```text
DONE — PR #8 (2026-05-29)
```

Связанные документы:

- [YASNOPRO_PLATFORM_BASELINE_v1.md](./YASNOPRO_PLATFORM_BASELINE_v1.md)
- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md)
- [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md)
- [YASNOPRO_COMMUNICATION_IDENTITY_MIGRATION_PLAN.md](./YASNOPRO_COMMUNICATION_IDENTITY_MIGRATION_PLAN.md)

---

## 1. Purpose

Укрепить маршрутизацию уведомлений после Layers 1–6:

- **`runtime_entity`** → Office object route + **Object Entity Card**
- **Legacy `universal_table:*`** → **EntityCardModal** (без изменений storage)
- **`file`** → **FileViewerModal**

Без data migration и без удаления legacy paths.

---

## 2. Target routing model

```text
Notification click
  ├─ runtime_entity (+ published_runtime_ref)
  │     → orchestrateNotificationNavigation
  │     → navigate /portal/{id}/object-types/{key}
  │     → pending target (runtime_entity_card)
  │     → useObjectEntityNotificationTarget
  │     → openCard (list row OR GET /runtime/entities/.../id)
  │     → ObjectEntityCardModal + initialContext (tab, highlight_id, comment_id)
  │
  ├─ universal_table:{tableId} / table_row + row_id
  │     → NotificationOverlayHost
  │     → legacy EntityCardModal
  │
  └─ file / library_file / uploaded_file
        → NotificationOverlayHost
        → FileViewerModal
```

### Обязательная формулировка

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

---

## 3. Runtime entity route

### Условия

| Поле | Значение |
|------|----------|
| `entity_type` | `runtime_entity` |
| `entity_id` | UUID |
| `context.published_runtime_ref` | `{ object_type_key, runtime_entity_id, runtime_route?, ... }` |

### Frontend flow

| Компонент | Роль |
|-----------|------|
| `NotificationBell` | Передаёт `context`, `tab`, `published_runtime_ref` |
| `notificationNavigationOrchestrator` | `navigate` + `emitPendingTargetWithRetry` |
| `notificationTargetRouting` | `resolveRuntimeRouteFromPublishedRef`, guards |
| `useObjectEntityNotificationTarget` | Подписка на pending target на object page |
| `useObjectEntityCard.openCard` | Fetch entity by id если нет в `listItems` |
| `getRuntimeEntity` | `GET /runtime/entities/tenants/{tenant}/{key}/{id}` |

### initialContext

| Поле | Назначение |
|------|------------|
| `tab` | `comments` \| `notes` \| `attachments` (из `source` / context) |
| `highlight_id` | Подсветка mention / comment |
| `comment_id` | Комментарии |
| `parent_comment_id` | Ответы |

---

## 4. Legacy universal_table route

### Условия

- `entity_type` = `universal_table:{tableId}` и `entity_id` / `row_id` = row id
- или `table_id` + `row_id` в context
- **не** `runtime_entity`

### Flow

`NotificationOverlayHost` → `EntityCardModal` (row может подгрузиться внутри legacy card).

`NotificationOverlayHost` **игнорирует** runtime_entity / `published_runtime_ref` targets.

---

## 5. File route

| Source | UI |
|--------|-----|
| `library_file` | FileViewerModal + document API |
| `uploaded_file` | FileViewerModal + file URL |
| `entity_type=file` | FileViewerModal |

Без изменений в PR #8.

---

## 6. Backend enrichment

| Модуль | Поведение |
|--------|-----------|
| `comments/service.py` | `resolve_published_runtime_ref_for_comment_entity` для `runtime_entity` |
| `notes/service.py` | То же при mention notifications, если FE не передал ref |

---

## 7. Known gaps

| Gap | Mitigation |
|-----|------------|
| Notification без `published_runtime_ref` и без object page | Orchestrator эмитит pending target; card откроется только на object route |
| `runtime_entity` без `object_type_key` | `openCard` не может вызвать GET entity — задокументировано; нужен enriched context |
| Пользователь на legacy portal page | Навигация на object route при наличии `runtime_route` |
| Старые notifications в БД без ref | Legacy fallback только для UT/file types |

---

## 8. QA checklist

### Runtime entity (must pass)

- [ ] Comment mention на `runtime_entity` → Object Entity Card, tab comments
- [ ] Note mention → Object Entity Card, tab notes
- [ ] Attachment-related → tab attachments (если source `card_attachment_file`)
- [ ] Entity **не** в текущей странице таблицы → card открывается (GET by id)
- [ ] `runtime_entity` **не** открывает legacy EntityCardModal

### Legacy (must pass)

- [ ] `universal_table:{id}` + row → legacy EntityCardModal
- [ ] Existing UT page не сломана

### File (must pass)

- [ ] Library / uploaded file → FileViewerModal

### Regression

- [ ] Object Table View row click → card
- [ ] `npm run build` / `check:runtime-boundaries`

---

## 9. Code map

| Path | Назначение |
|------|------------|
| `frontend/src/modules/notifications/navigation/notificationTargetRouting.js` | Routing guards + route resolve |
| `frontend/src/modules/notifications/navigation/notificationNavigationOrchestrator.js` | Navigate + pending |
| `frontend/src/modules/notifications/components/NotificationOverlayHost.jsx` | Legacy + file only |
| `frontend/src/modules/objectEntities/hooks/useObjectEntityNotificationTarget.js` | Object card open |
| `frontend/src/modules/objectEntities/hooks/useObjectEntityCard.js` | Fetch-by-id |
| `frontend/src/modules/runtimeWriteGateway/api/runtimeEntitiesApi.js` | `getRuntimeEntity` |

---

## 10. Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-29 | Phase 9.5 PR #8 |
