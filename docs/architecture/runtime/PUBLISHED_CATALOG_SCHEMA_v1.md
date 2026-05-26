# Published Catalog Schema v1

**Status:** normative contract for Slice 1  
**Schema version:** `1`  
**Authority:** matches `snapshot_builder.SCHEMA_VERSION` and publish MVP output

---

## 1. Назначение контракта

Published Catalog — **иммутабельный снимок** designer metadata для одного tenant после успешного publish. Это единственный источник метаданных для Runtime (Entity Engine, Query Layer, View Engine). Контракт фиксирует форму JSON в `designer_metadata_snapshots.payload_json`, отдаваемого Runtime Catalog API.

---

## 2. Кто пишет / кто читает

| Роль | Действие |
|------|----------|
| **Designer Publish** (`publish/snapshot_builder.py`) | Собирает payload из draft tables, валидирует, пишет snapshot + publish record |
| **Runtime Catalog** (`runtime/catalog/`) | Read-only: последний snapshot по `tenant_id` |
| **Runtime Entity Engine** (Slice 2+) | Читает catalog in-memory / cache; не обращается к draft |
| **Frontend Designer** | Только Designer API (draft), не snapshot напрямую в Slice 1 |
| **Frontend Runtime** | Runtime Catalog API или кэш каталога |

---

## 3. Runtime не читает draft designer tables

Запрещено для Runtime-кода:

- `designer_object_types`, `designer_field_definitions`, `designer_relation_definitions`, `designer_view_definitions` (draft)
- любые «живые» JOIN к designer tables для бизнес-логики

Допустимо только чтение **`designer_metadata_snapshots`** (и при необходимости `designer_publish_records` для audit), через `runtime/catalog/repository.py`.

---

## 4. Корневой объект payload

```json
{
  "schema_version": 1,
  "catalog_version": 3,
  "tenant_id": 42,
  "published_at": "2025-05-25T12:00:00+00:00",
  "object_types": [ ... ],
  "relations": [ ... ]
}
```

Поле `payload_hash` **не входит** в JSON payload; хранится в колонке `designer_metadata_snapshots.payload_hash` (SHA-256 от canonical JSON).

---

## 5. Обязательные и nullable поля (корень)

| Поле | Тип | Обязательно | Nullable в JSON |
|------|-----|-------------|-----------------|
| `schema_version` | int | да | нет |
| `catalog_version` | int | да | нет |
| `tenant_id` | int | да | нет |
| `published_at` | string (ISO 8601 UTC) | да | нет |
| `object_types` | array | да | пустой массив допустим только если publish validator это запретит |
| `relations` | array | да | может быть `[]` |

---

## 6. `object_types[]`

Вложенная структура: fields и views **внутри** object type (не отдельный top-level массив).

### Object type (обязательные)

| Поле | Тип | Примечание |
|------|-----|------------|
| `id` | string (UUID) | |
| `key` | string | уникален в tenant |
| `name` | string | |
| `sort_order` | int | |
| `status` | string | |
| `is_system` | bool | |
| `is_default_entity` | bool | |
| `fields` | array | |
| `views` | array | |

### Object type (nullable)

| Поле | Тип |
|------|-----|
| `description` | string \| null |
| `icon` | string \| null |
| `color` | string \| null |
| `settings_json` | object (default `{}`) |
| `governance_json` | object (default `{}`) |

### `fields[]` (внутри object type)

| Поле | Обязательно |
|------|-------------|
| `id`, `key`, `name`, `field_type`, `sort_order` | да |
| `is_required`, `is_unique`, `is_system` | да |
| `description` | nullable |
| `default_value_json` | nullable |
| `settings_json`, `validation_json`, `visibility_json` | object, default `{}` |

### `views[]` (внутри object type)

| Поле | Обязательно |
|------|-------------|
| `id`, `key`, `name`, `view_type`, `sort_order` | да |
| `is_default`, `is_system`, `is_active` | да |
| `description` | nullable |
| `settings_json`, `layout_json`, `filters_json`, `visibility_json` | object, default `{}` |

---

## 7. `relations[]` (top-level)

| Поле | Обязательно |
|------|-------------|
| `id`, `key`, `name` | да |
| `source_object_type_id`, `target_object_type_id` | string UUID |
| `source_object_type_key`, `target_object_type_key` | да (денормализация для runtime) |
| `relation_type`, `sort_order` | да |
| `is_required`, `is_system`, `is_active`, `bidirectional`, `cascade_delete` | да |
| `description`, `reverse_name` | nullable |
| `settings_json`, `validation_json` | object, default `{}` |

Relations с несуществующими object type keys **опускаются** при сборке snapshot (не попадают в payload).

---

## 8. Сортировка (детерминизм)

Для стабильного `payload_hash`:

1. `object_types`: по `(sort_order, key)`
2. `fields` внутри OT: по `(sort_order, key)`
3. `views` внутри OT: по `(sort_order, key)`
4. `relations`: по `(sort_order, key)`

Canonical serialization: `json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`.

---

## 9. `payload_hash`

- Алгоритм: **SHA-256** hex digest
- Вход: canonical JSON **без** поля hash
- Хранение: `designer_metadata_snapshots.payload_hash`
- Runtime Catalog `/catalog/version` возвращает hash для cache invalidation

---

## 10. Версии и совместимость

| Версия | Значение |
|--------|----------|
| `schema_version` | Формат payload (контракт полей). Сейчас `1`. |
| `catalog_version` | Монотонный счётчик publish per tenant |

**Правила:**

- Runtime **обязан** отклонять (или явно не поддерживать) неизвестный `schema_version` > supported.
- Minor additions (новые optional keys в objects) — допустимы в patch schema_version при backward-compatible чтении.
- Breaking changes (переименование keys, смена nesting) — **новый** `schema_version`, миграция snapshot не автоматическая.
- `catalog_version` только растёт при успешном publish.

---

## 11. Правила изменения схемы

1. Изменения контракта — через ADR + обновление этого документа.
2. Код publish и runtime catalog читают `SCHEMA_VERSION` / проверку версии синхронно.
3. Не менять смысл существующих полей без bump `schema_version`.
4. Не добавлять в snapshot данные из legacy `universal_tables` / `universal_views`.

---

## 12. Запрещено хранить в snapshot

Следующее **не должно** попадать в `payload_json`:

| Категория | Примеры |
|-----------|---------|
| Runtime session state | tokens, session ids |
| User personalization | column order, theme, saved filters per user |
| UI selection state | selected rows, active cell |
| Viewport state | scroll position, pagination cursor |
| Draft lineage | `draft_revision`, soft-delete flags draft-only |
| Entity data | фактические значения записей, relation instances |
| Deleted draft-only rows | поля/типы с `deleted_at` в draft, не прошедшие publish rules |

Snapshot содержит **только published metadata definitions**, не operational data.

---

## 13. Связанные артефакты

- `backend/app/modules/platform/designer/publish/snapshot_builder.py`
- `docs/architecture/runtime/YASNOPRO_RUNTIME_FOUNDATION_PLAN.md`
- Migrations: `20250525_0005` (`designer_metadata_snapshots`)
