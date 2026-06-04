# ADR. Поле «Связи» как представление над relation instances

## Статус

Accepted

## Дата

2026-06-04

## Контекст

В платформе ЯсноПро уже реализован **relation engine**:

- метаданные связей: `designer_relation_definitions`;
- экземпляры связей: `runtime_relation_instances`;
- публикация в `catalog.relations[]`;
- runtime API: list / create / delete relation instances;
- вкладка карточки **«Связанные записи»** с picker, созданием и удалением связей.

Проведён аудит готовности к типу поля **«Связи»**. Вывод: инфраструктура графа связей готова, но **полноценного field type** для связи в структуре объекта (карточка, таблица, форма создания) пока нет.

**Lookup** (в т.ч. legacy Universal Table) не подходит как основа: это подстановка значения в ячейку/поле, а не объектная связь в графе `runtime_relation_instances`.

Пользователю нужна **полноценная связь между объектами**:

- переход в связанную запись;
- обратная видимость при `bidirectional`;
- управляемое добавление и удаление;
- пригодность для прав, фильтров, бизнес-правил и BPMN в будущем.

Блок **«Связанные записи»** уже работает через relation instances и покрывает сценарий «все связи сущности». Отдельно требуется поле **«Связи»** — одна конкретная связь по `relation_key` в layout карточки и колонках таблицы.

## Проблема

Риск неправильной реализации: трактовать поле «Связи» как **lookup**, текст, copied title или значение в `runtime_entity_values.value_json`.

Это создаёт **два источника истины**:

1. Значение поля (строка, UUID, label).
2. Relation instance в `runtime_relation_instances`.

Последствия:

- расхождение данных при редактировании из разных UI;
- некорректная или отсутствующая обратная связь;
- непредсказуемое поведение при удалении entity или поля;
- невозможность единых прав на «факт связи»;
- сложная синхронизация и миграции;
- невозможность строить полноценный **граф объектов** для аналитики и автоматизации.

## Решение

**Поле «Связи» — UI-представление (view/control) над `runtime_relation_instances`**, привязанное к опубликованной **relation definition** через `relation_key`. Поле **не является** хранилищем связи.

Формула:

```text
relation definition
  → relation field (field_type = relation)
    → relation instance (runtime_relation_instances)
```

| Слой | Назначение |
|------|------------|
| **Relation definition** | Тип связи: source/target object type, `relation_type`, direction, `reverse_name`, flags, `settings_json` |
| **Relation field** | Показ и редактирование **одной** связи по `relation_key` в карточке/таблице/форме |
| **Relation instance** | Единственный факт связи между `source_entity_id` и `target_entity_id` |

### Источник истины

Единственный источник истины для **факта связи** между экземплярами объектов:

```text
runtime_relation_instances
```

### Relation field (конфигурация)

Поле в object type:

```text
field_type = relation
settings_json.relation_key
settings_json.role = source | target
settings_json.cardinality = one | many   // UI-ограничение, согласованное с relation_type
settings_json.display = { title_field_key, view_key?, filters? }
```

Поле **не хранит** связь как строку, **не копирует** title связанного объекта в `value_json`, **не создаёт** второй источник истины.

### Пример

Object Type: **Задача**.  
Field: **Проект**.  
Field type: **Связь**.

```json
{
  "field_type": "relation",
  "relation_key": "task_project",
  "role": "source",
  "cardinality": "one",
  "display": {
    "title_field_key": "name"
  }
}
```

Runtime:

```text
Задача #12
  → runtime_relation_instance (relation_key = task_project)
  → Проект #3
```

В UI отображается, например, **«Проект А»** — это **display layer** (resolve title по entity id). Фактическая связь остаётся в `runtime_relation_instances`.

## Что запрещено

Явные запреты для реализации и code review:

- хранить связь как **текст** или display title в `value_json` как SoT;
- хранить **title** связанного объекта как значение поля;
- использовать **lookup** (UT или platform) как **storage** связи между runtime entities;
- хранить **UUID** связанного объекта в `value_json` как **основной** источник истины;
- создавать **параллельную** таблицу связей для того же факта;
- **дублировать** relation instance в поле (двойная запись без синхронизации);
- делать поле «Связи» **только renderer** без create/delete instance API;
- синхронизировать «вручную» поле и instances без единого write-path через relation API.

Допустимо в `value_json`: отсутствие значения для relation field или служебный кэш **только** если он явно объявлен производным (не SoT) и инвалидируется при изменении instances — **не рекомендуется для MVP**.

## Отображение (display layer)

В **таблице** и **карточке** допустимо показывать:

- title связанного объекта (resolve через runtime entity / projection);
- несколько связанных объектов (chips, список);
- количество связей («3 записи»);
- ссылки для открытия карточки peer entity.

Отображаемый текст **не является** хранилищем связи.

## Редактирование

Операции поля маппятся на relation instances API:

| Действие пользователя | Runtime |
|----------------------|---------|
| Выбор связанного объекта | `POST` create relation instance |
| Удаление значения поля | `DELETE` relation instance |
| Замена значения | delete old instance → create new |
| Несколько связей | add / remove отдельные instances |

Направление `source_entity_id` / `target_entity_id` определяется из **role** поля и текущей entity.

## Кардинальность

На уровне **relation definition** (`RelationType`):

```text
one_to_one
one_to_many
many_to_many
```

На уровне **relation field** (UI):

```text
cardinality = one | many
```

Ограничения для create/delete instances должны браться из **опубликованной** relation definition и существующих runtime validators (в т.ч. `one_to_one` constraints). Field-level `cardinality` не должно ослаблять definition.

## Обратная связь

При `bidirectional = true` в relation definition:

- связанный объект видит обратную сторону через **тот же** relation engine (incoming/outgoing instances);
- **не требуется** дублирование данных в полях обоих типов;
- отдельное relation field на target type опционально (UX), но факт связи один — instance.

Пример:

```text
Задача → Проект   (field «Проект», role source)
Проект → Задачи   (вкладка «Связанные записи» или поле с role target / reverse_name)
```

Автоматическое создание **обратного** instance при `bidirectional` **не** предполагается, если не будет отдельного ADR — достаточно симметричного чтения графа.

## Блок «Связанные записи» vs поле «Связи»

| UI | Задача |
|----|--------|
| **Связанные записи** (inner tab `relations`) | Все связи экземпляра; группировка по `relation_key`; общий picker |
| **Поле «Связи»** | Одна связь по заданному `relation_key` в fields grid / колонке таблицы |

Один relation engine, разные UI-задачи. Вкладка не заменяет поле; поле не дублирует всю вкладку.

## Publish contract

В **published catalog** должны согласованно присутствовать:

**Field** (внутри `object_types[].fields[]`):

```json
{
  "key": "project",
  "field_type": "relation",
  "settings_json": {
    "relation_key": "task_project",
    "role": "source",
    "cardinality": "one",
    "display": {
      "title_field_key": "name"
    }
  }
}
```

**Relation definition** (в `catalog.relations[]`):

```json
{
  "key": "task_project",
  "source_object_type_key": "task",
  "target_object_type_key": "project",
  "relation_type": "one_to_many",
  "bidirectional": true,
  "reverse_name": "Задачи"
}
```

Publish validators должны проверять: `relation_key` существует, field object type соответствует source/target с учётом `role`, `relation_type` согласован с field `cardinality`.

## Runtime

Runtime для relation field:

1. Читает field definition из catalog.
2. Разрешает `relation_key` → `get_published_relation_metadata`.
3. Загружает instances для текущей entity (filtered by `relation_key`, direction по `role`).
4. Resolve title peer entities (batch где возможно).
5. Применяет **будущие** права доступа на peer.
6. Отдаёт UI DTO: ids, titles, links, counts — **без** подмены SoT.

Relation field **не** обязан входить в `EntityRead.values` как скаляр; чтение/запись — через relation instances API (или тонкий orchestration layer в entity save, делегирующий в instances).

## Права доступа (принцип)

Будущий контур Permissions:

- связанный объект показывается только при праве **read** на target object type / entity;
- создание связи — при праве **link** / **update** на source и **read** на target;
- при отсутствии доступа: факт связи может существовать в graph, UI показывает placeholder (**«Недоступная запись»**), без раскрытия полей peer.

MVP может работать в рамках tenant isolation; enterprise сценарии блокируются до Permissions.

## Удаление

| Событие | Поведение |
|---------|-----------|
| Удаление relation field из схемы | relation definition **не** удаляется автоматически; instances **не** удаляются автоматически — нужна политика миграции/очистки |
| Удаление relation definition | instances требуют отдельной политики (архивация / soft delete / запрет) |
| Удаление entity | instances удаляются или деактивируются по runtime rules (FK CASCADE на physical delete; soft delete — явная политика в сервисе) |
| `cascade_delete` в definition | Целевое поведение — отдельная реализация; не смешивать с удалением поля |

## Фильтрация и сортировка (направление)

Relation field в перспективе поддерживает:

- фильтр по связанному объекту;
- фильтр по наличию / отсутствию связи;
- сортировку по title связанного объекта;
- группировку по связанному объекту.

**MVP:** read/edit в карточке и базовое отображение в таблице **без** filter/sort в object view query.

## Альтернативы

### Альтернатива 1: Relation как lookup

**Отклонена.** Lookup — подстановка значения, не объектная связь в графе; нет единого relation_key, cardinality, обратных связей на уровне platform.

### Альтернатива 2: UUID в `value_json` как SoT

**Отклонена** как основной источник. Дублирует `runtime_relation_instances`, ломает вкладку «Связанные записи» и аналитику по графу. Допустим только производный кэш (не для MVP).

### Альтернатива 3: Только вкладка «Связанные записи»

**Отклонена.** Не покрывает UX «Проект» как поле в структуре карточки и колонки таблицы.

## Последствия

### Плюсы

- один источник истины для факта связи;
- полноценный граф объектов;
- согласованность с «Связанными записями» и Studio Relations;
- обратные связи без дублирования в values;
- готовность к BPMN, правилам, автоматизации, аналитике по связям.

### Минусы

- сложнее, чем lookup или текстовое поле;
- дополнительные запросы для display (N+1 / batch resolve);
- сложнее table filtering и sorting;
- обязательна интеграция с Permissions;
- нужен relation-aware FieldEditor и column renderer.

### Риски

- расхождение Studio field config и relation definition при publish;
- неполная runtime cardinality для `one_to_many` / `many_to_many`;
- попытка «быстрого MVP» через value_json — нарушение ADR;
- путаница терминов: Studio «Связи», вкладка «Связанные записи», поле «Связи».

## Следующий этап

```text
Подготовка реализации типа поля «Связи»
```

Фазы (вне scope ADR): `FieldType.RELATION` → publish validation → runtime read/write orchestration → Studio field UI → Office card/table/create.

## Связанные документы

- [ADR-001 Universal Table Retirement](./adr/ADR-001-universal-table-retirement.md)
- Dashboard manifest: contour **Relations**, ADR-002 (Runtime / Designer Boundary) в `platformDevelopmentManifest.js`
- Relation engine: `backend/app/modules/platform/designer/relation_definitions/`, `backend/app/modules/platform/runtime/relation_instances/`
- Frontend: `frontend/src/modules/objectEntities/hooks/useObjectEntityRelations.js`, `ObjectEntityRelatedEntities.jsx`
