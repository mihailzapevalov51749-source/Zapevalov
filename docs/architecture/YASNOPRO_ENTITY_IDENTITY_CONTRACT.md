# YASNOPRO Entity Identity Contract

## Статус

```text
ACTIVE
```

Нормативный контракт идентичности бизнес-экземпляров и legacy-привязок. Реализация helpers: `frontend/src/shared/entityIdentity/`.

Связанные документы:

- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md) — Layer 1
- [YASNOPRO_ENTITY_MODEL.md](./YASNOPRO_ENTITY_MODEL.md)
- [YASNOPRO_PLATFORM_CORE.md](./YASNOPRO_PLATFORM_CORE.md)
- [YASNOPRO_PHASE9_LEGACY_FREEZE.md](./YASNOPRO_PHASE9_LEGACY_FREEZE.md)

---

## 1. Purpose

### 1.1. Зачем нужен контракт

Платформа ЯсноПро находится в переходе от legacy storage (`universal_table_rows`) к целевому Entity Layer (`runtime_entities`). Без единого контракта идентичности:

- комментарии, заметки и уведомления привязываются к `universal_table:{id}` вместо бизнес-экземпляра;
- появляются скрытые зависимости между Table UI и legacy storage;
- невозможно безопасно вводить Relations, AI Context и сквозную навигацию по entity.

Контракт фиксирует **один canonical формат** для новых интеграций и **явные legacy форматы** только для чтения и совместимости.

### 1.2. Обязательная формулировка (Recovery Plan)

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

### 1.3. Что не является бизнес-сущностью

| Артефакт | Роль |
|----------|------|
| **Universal Table** (legacy stack) | Legacy **data storage path**, не Object Type |
| **`universal_table_rows`** | Legacy storage записей |
| **Table View** | **UI adapter** над Runtime Entity (или legacy read path для existing) |
| **Block `universal_table`** | Layout + ссылка на legacy storage, не Entity |

---

## 2. Canonical Identity

### 2.1. Формат

```text
runtime_entity:{uuid}
```

| Часть | Значение |
|-------|----------|
| Prefix | `runtime_entity` (фиксированный) |
| Separator | `:` (один раз, после prefix) |
| `{uuid}` | `RuntimeEntity.id` (строка UUID, без жёсткой валидации в PR #1) |

### 2.2. Примеры

```text
runtime_entity:550e8400-e29b-41d4-a716-446655440000
```

### 2.3. Где обязателен canonical format

Все **новые** сценарии, привязанные к **бизнес-экземпляру**:

- Comments (object-centric path)
- Notes
- Attachments metadata (если привязка к entity, не к `file:{id}`)
- Notifications (target entity)
- Relation endpoints (source/target entity)
- AI Context bindings (будущие фазы)
- Runtime navigation / deep links на карточку entity

Helpers: `formatRuntimeEntityRef`, `isRuntimeEntityRef`, `parseEntityRef` в `shared/entityIdentity/`.

---

## 3. Legacy Identity Formats

Legacy identity **не удаляется** из БД и API. Используется для **read** и **compatibility bridge**.

### 3.1. `universal_table:{tableId}`

| Поле | Описание |
|------|----------|
| Scope | Legacy table (storage container), часто связан с portal block |
| `{tableId}` | Идентификатор строки в `universal_tables.id` |
| Write в новом контуре | **Запрещён** |
| Read | **Разрешён** для existing comments, notifications, history |

### 3.2. `universal_table_row:{rowId}`

| Поле | Описание |
|------|----------|
| Scope | Конкретная строка в `universal_table_rows` |
| `{rowId}` | Идентификатор строки |
| Write в новом контуре | **Запрещён** (кроме legacy UT UI до migration) |
| Read | **Разрешён** при наличии в данных |

### 3.3. Другие существующие форматы (вне PR #1)

| Формат | Статус |
|--------|--------|
| `file:{fileId}` | Существующий контракт для файловых комментариев — не меняется в PR #1 |

### 3.4. Опциональный bridge (не canonical)

В JSON `universal_table_rows.values` или row ref может встречаться поле `runtime_entity_id` (UUID). Это **мост** для навигации и dual-read, **не** замена canonical string в API comments до отдельного ADR.

---

## 4. Rules

### 4.1. Write rules (новый код)

| Правило | Действие |
|---------|----------|
| R-W1 | Новые comments/notes/attachments в object-centric modules → только `runtime_entity:{uuid}` |
| R-W2 | Не создавать новые `universal_table:*` identity в `objectViews`, `objectEntities`, `designer` (data), Office object routes |
| R-W3 | Не использовать `universal_table_rows` как primary store для новых бизнес-записей |
| R-W4 | Создание Runtime Entity → `runtime_entities` API; отображение → Table View |

### 4.2. Read rules (совместимость)

| Правило | Действие |
|---------|----------|
| R-R1 | Legacy `universal_table:*` и `universal_table_row:*` **читаются** без удаления из БД |
| R-R2 | UI должен уметь распознать legacy ref (`isLegacyEntityRef`, `parseEntityRef`) |
| R-R3 | При наличии `runtime_entity_id` в row JSON — prefer resolve к canonical для **нового** UI |

### 4.3. Architecture rules

| Правило | Действие |
|---------|----------|
| R-A1 | Universal Table **не** именуется бизнес-сущностью или Object Type |
| R-A2 | `universal_table_rows` = legacy storage |
| R-A3 | Table View = UI adapter (View Engine / ObjectViewHost) |
| R-A4 | Runtime Entity = business source of truth |

### 4.4. Code review checklist

- [ ] Новый `entity_type` / entity ref — `runtime_entity:`?
- [ ] Нет новых импортов `tableApi` в object-centric modules?
- [ ] Нет термина «legacy entity» — только **legacy storage** / **legacy data source**

---

## 5. Implementation Reference

### 5.1. TypeScript module

```text
frontend/src/shared/entityIdentity/
  entityIdentity.constants.ts
  entityIdentity.types.ts
  entityIdentity.ts
  index.ts
```

### 5.2. Public API (PR #1)

| Function | Назначение |
|----------|------------|
| `formatRuntimeEntityRef(entityId)` | Собрать canonical ref |
| `parseEntityRef(value)` | Tolerant parse → `EntityRefParseResult` |
| `isRuntimeEntityRef(value)` | Canonical? |
| `isLegacyEntityRef(value)` | Legacy table or row prefix? |
| `isLegacyUniversalTableRef(value)` | Legacy table prefix only? |
| `getEntityRefKind(value)` | `runtime_entity` \| `universal_table` \| `universal_table_row` \| `unknown` |

### 5.3. Legacy storage registry (отдельный модуль)

```text
frontend/src/shared/legacy/legacyStorageRegistry.ts
```

Описывает **legacy data storage path**, не «legacy entity». См. [Recovery Plan §6 Layer 5](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md).

---

## 6. Migration Notes

### 6.1. В scope PR #1

- Документ контракта (настоящий файл).
- Pure helpers без side effects, без изменения runtime behavior.
- Registry metadata для legacy storage path.

### 6.2. Вне scope PR #1

| Задача | Фаза | Статус |
|--------|------|--------|
| Массовый UPDATE `comments.entity_type` в БД | Отдельная программа | PLANNED |
| ~~ETL `universal_table_rows` → `runtime_entities`~~ | ~~Post L1–L6~~ | **CANCELLED** — ADR-001 |
| Creation guards (UT block, menu) | Layer 2 | **DONE** |
| Backend validation `entity_type` whitelist | Layer 4 (optional) | OPTIONAL |
| Compatibility bridge / object path UI | Layer 4 | **DONE** |
| Documentation sync | Layer 6 | **DONE** |

### 6.3. Принцип миграции данных

> Superseded by ADR-001 Universal Table Retirement.

1. **Stop the bleeding** — не создавать новые legacy sources (Layer 2).
2. **Canonical writes** — новые коммуникации на `runtime_entity:{uuid}` (Layer 4).
3. ~~**Dual-read** — старые refs отображаются до ETL.~~ **Legacy read** — старые refs отображаются до Legacy Removal.
4. ~~**Optional ETL** — перенос rows и re-key comments при отдельном ADR.~~ **Legacy Removal** — UT удаляется; данные rows не мигрируются.

Старые записи `universal_table:*` **не удаляются** в рамках dual-SoT recovery без явного ADR на Legacy Removal.

---

## 7. Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-29 | Initial contract (PR #1 — Architecture Contract Only) |

---

*При расхождении с кодом helpers приоритет у настоящего документа; изменения контракта — через architecture review.*
