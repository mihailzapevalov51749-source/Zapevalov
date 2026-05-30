# YASNOPRO Communication Identity Migration Plan

## Статус

```text
ACTIVE — Layer 4 COMPLETE (PR #4c Attachments)
```

Связанные документы:

- [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md)
- [YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md](./YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md)
- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md)

---

## 1. Purpose

Мигрировать **identity** коммуникаций (comments, notes, attachments metadata, notifications) в object-centric контуре на **Runtime Entity**, без массовой миграции БД и без поломки legacy Universal Table.

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

---

## 2. Current legacy identity

| Артефакт | `entity_type` (backend) | `entity_id` (backend) |
|----------|-------------------------|------------------------|
| UT Entity Card comments | `universal_table:{tableId}` | `rowId` (строка) |
| UT Entity Card notes | `table_row` | `rowId` |
| File comments | `file` | `fileId` |
| Notifications (legacy) | копия из comment/note context | `row_id` / `entity_id` |

Frontend (legacy card): `EntityCardComments.jsx` формирует `universal_table:${table.id}`.

---

## 3. Target runtime identity

### 3.1. Frontend canonical ref (navigation / helpers)

```text
runtime_entity:{uuid}
```

Helpers: `frontend/src/shared/entityIdentity/` — `formatRuntimeEntityRef`, `parseEntityRef`.

### 3.2. Backend storage (comments / notes API)

| Поле | Значение |
|------|----------|
| `entity_type` | `runtime_entity` |
| `entity_id` | `{uuid}` строка |

Helpers: `resolveRuntimeEntityCommunicationIdentity()` в `communicationIdentity.ts`.

**Важно:** в API **не** передаётся `runtime_entity:{uuid}` как `entity_type` — только plain `runtime_entity` + uuid в `entity_id`. Это совместимо с существующей схемой `Comment.entity_type` / `Note.entity_type` (`String(80)`).

### 3.3. Соответствие

| Слой | Формат |
|------|--------|
| Canonical ref (FE) | `runtime_entity:{uuid}` |
| Comment/Note write (API) | `entity_type=runtime_entity`, `entity_id=uuid` |
| Legacy read/write (UT card comments) | `entity_type=universal_table:{tableId}`, `entity_id=rowId` |
| Legacy read/write (UT card notes) | `entity_type=table_row`, `entity_id=rowId` |
| Legacy UT attachments | file columns in `universal_table_rows.values`; owner `table_row` |

### 3.4. Legacy Communication Identity Matrix

| Контур | UI | Owner `entity_type` | Owner `entity_id` | Storage | File comments |
|--------|-----|---------------------|-------------------|---------|---------------|
| UT — comments | `EntityCardComments` | `universal_table:{tableId}` | `rowId` | comments API | — |
| UT — notes | `EntityCardNotes` | `table_row` | `rowId` | notes API | — |
| UT — attachments | `EntityCardAttachments` | `table_row` | `rowId` | row file columns | `file` + fileId |
| Object — comments | `ObjectEntityComments` | `runtime_entity` | `uuid` | comments API | — |
| Object — notes | `ObjectEntityNotes` | `runtime_entity` | `uuid` | notes API | — |
| Object — attachments | `ObjectEntityAttachments` | `runtime_entity` | `uuid` | `runtime_entities.values` (file fields) | `file` + fileId |

**PR #4c extract:** `shared/files/attachments/EntityAttachmentsPanel` — adapters supply owner identity only.

---

## 4. Dual-read strategy

| Сценарий | Поведение |
|----------|-----------|
| Старые comments `universal_table:*` | Читаются через legacy `EntityCardComments` без изменений |
| Новые comments object card | Пишутся/читаются только `runtime_entity` + uuid |
| Bridge UT row → runtime | **Не включён автоматически** (см. §8) |
| Массовая миграция БД | **Запрещена** в Layer 4 |

---

## 5. New writes policy

| Контур | Policy |
|--------|--------|
| Object Entity Card (`objectEntities`) | **Только** `runtime_entity` + uuid |
| Legacy UT Entity Card | **Только** `universal_table:{tableId}` + rowId (без изменений) |
| Object Table View | Не создаёт comments напрямую — через Entity Card |

---

## 6. Notification routing strategy

1. Backend `build_comment_notification_context`: для `entity_type=runtime_entity` добавляет `published_runtime_ref` (lookup `runtime_entities`, route `/portal/{tenant}/object-types/{key}`).
2. `notificationNavigationMapper`: target `runtime_entity_card` или `published_runtime_reference`.
3. `orchestrateNotificationNavigation`: при `published_runtime_ref.runtime_route` — `history.pushState` + pending target.
4. `useObjectEntityNotificationTarget` в `ObjectTableView`: открывает `ObjectEntityCardModal` с `initialContext` (tab comments, highlight).

Legacy `universal_table:*` → `NotificationOverlayHost` → `EntityCardModal` (без изменений).

---

## 7. Implementation scope

| Область | Статус |
|---------|--------|
| Migration plan (этот документ) | ✅ |
| `communicationIdentity.ts` helpers | ✅ |
| `shared/notes` editor extract (`EntityNotesEditor`) | ✅ PR #4b |
| Object Entity Card comments sidebar | ✅ PR #4 |
| Object Entity Card notes tab | ✅ PR #4b |
| Legacy `EntityCardNotes` UT adapter | ✅ PR #4b (unchanged `table_row` identity) |
| `shared/files/attachments` panel extract | ✅ PR #4c |
| Object Entity Card attachments tab | ✅ PR #4c |
| Legacy UT attachments adapter | ✅ unchanged `table_row` + row file columns |
| Notifications runtime_entity (comments) | ✅ PR #4 |
| Notifications runtime_entity (notes publish) | ✅ PR #4b — FE `published_runtime_ref` on publish |
| Dual-read bridge в object card | **Не включён** — документировано |

---

## 8. Dual-read bridge (optional, not enabled)

Если в `universal_table_rows.values` есть `runtime_entity_id`, теоретически можно merge-read legacy + runtime comments в одной карточке.

**Риски:** дубликаты, рассинхрон rowId vs uuid, неоднозначный порядок. **Решение Layer 4:** не включать автоматически; при необходимости — отдельный ADR.

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Notification без `published_runtime_ref` | Backend enrichment при `runtime_entity` |
| Designer route vs portal route | Pending target открывает card если пользователь уже на Object View |
| Смешение identity в одном UI | Object card только `runtime_entity`; UT card только legacy |

---

## 10. Manual QA checklist

### Comments (PR #4)

1. [ ] Старый UT row: comments открываются и создаются (`universal_table:*`).
2. [ ] Object entity card открывается из Table View.
3. [ ] Новый comment в object card: в Network `entity_type=runtime_entity`, `entity_id={uuid}`.
4. [ ] Notification mention/reply на runtime comment: переход на portal object route + открытие card с comments.
5. [ ] Notification на `universal_table:*`: legacy EntityCardModal.
6. [ ] Table View read/write Runtime Entity без регрессии.
7. [ ] Новые comments в object path **не** используют `universal_table:*`.

### Notes (PR #4b)

8. [ ] Старые UT notes (`table_row`): открываются, автосохранение и publish работают.
9. [ ] Object Entity Card → вкладка «Заметки»: редактор открывается.
10. [ ] Object notes в Network: `entity_type=runtime_entity`, `entity_id={uuid}`.
11. [ ] Object notes **не** используют `universal_table:*` или `table_row`.
12. [ ] Comments sidebar в object card работает параллельно с notes tab.
13. [ ] Note mention publish отправляет `published_runtime_ref` в payload.

### Attachments (PR #4c)

14. [ ] Старые UT attachments (file columns) работают.
15. [ ] Object Entity Card → вкладка «Вложения».
16. [ ] Upload: PATCH runtime entity `values[fileField]`; metadata `owner_entity_type=runtime_entity`.
17. [ ] Object path не использует `universal_table:*` / `table_row` для owner binding.
18. [ ] File viewer comments остаются `entity_type=file`.
19. [ ] Comments/Notes tabs не сломаны.

**Storage contract (attachments):** отдельного `entity_attachments` API нет. Вложения хранятся в **file-type catalog fields** внутри `runtime_entities.values` (как legacy row file columns). Owner identity: `runtime_entity` + uuid в panel context и metadata загруженного файла.

---

## 11. Next PR

- **Layer 5:** Legacy UT storage isolation — **DONE** (PR #5, `YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION` §8).
- **Layer 6:** Documentation alignment — **DONE** (PR #6, `YASNOPRO_ARCHITECTURE_STATUS.md`, README).
- Optional: dedicated `entity_attachments` API (отдельный ADR) — не требуется для Layer 4 closure.
