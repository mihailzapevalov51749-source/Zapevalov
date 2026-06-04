# ADR. Каноническая спецификация `task_subtask` (подзадачи через Relation Engine)

## Статус

**Proposed** (спецификация зафиксирована; реализация — отдельные этапы Dashboard)

## Дата

2026-06-04

## Контекст

Платформа ЯсноПро завершила этап **Self-relation support**: Relation Engine поддерживает связи **Задача → Задача** через `runtime_relation_instances` без отдельного движка и без хранения связей в `runtime_entity_values`.

Следующие этапы программы «Тип поля Связи»:

- Доменные ограничения `task_subtask`
- Parent Section через Relation Engine
- Подзадачи через Relation Engine
- Tree View, фильтрация, аналитика

До реализации необходима **единая каноническая спецификация** подзадач, согласованная с уже принятыми ADR:

- [ADR_OBJECT_RELATION_FIELD_AS_RELATION_INSTANCE_VIEW.md](./ADR_OBJECT_RELATION_FIELD_AS_RELATION_INSTANCE_VIEW.md)
- [YASNOPRO_RELATION_ENGINE_MODEL.md](./YASNOPRO_RELATION_ENGINE_MODEL.md)
- [YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md](./YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md)

**Parent Record** (`universal_table_rows.parent_row_id`, UT subtasks UI) **не является** источником истины. Допускается только переиспользование **визуальной оболочки** (секции карточки, паттерны списка) поверх Relation Engine.

## Проблема

Self-relation технически работает, но продуктово не определено:

- кто **родитель**, кто **подзадача**;
- какой **relation key** каноничен;
- какая **cardinality** на уровне definition;
- какие **ограничения** обязательны (один родитель, запрет циклов и т.д.);
- как это отображается в **карточке**, **таблице**, **«Связанных записях»**;
- какие **пользовательские сценарии** create/link/delete должны выполнять Relation Engine.

Без спецификации невозможно согласованно реализовать Parent Section и Subtasks Section.

## Решение (кратко)

Ввести одну опубликованную relation definition с ключом **`task_subtask`** для ObjectType **Задача** (self-relation):

```text
Parent Task  ──task_subtask──►  Child Task (подзадача)
     source                         target
```

Факты связей хранятся **только** в `runtime_relation_instances`.  
UI (поля «Связи», секции Parent/Subtasks, вкладка «Связанные записи», Tree View) — **представления** над тем же engine.

---

## 1. Канонический Relation Key

| Параметр | Значение |
|----------|----------|
| **Канонический key** | `task_subtask` |
| **Имя (name)** | `Подзадача` |
| **Обратное имя (reverse_name)** | `Родительская задача` |
| **Область** | Только ObjectType с ключом `task` (или эквивалентным опубликованным ключом типа «Задача» в tenant catalog) |

### Обоснование ключа

- Соответствует принятому шаблону `{source}_{target}` (`task_project`, `task_related`).
- Однозначно указывает на домен «задача — подзадача».
- Один key на весь tenant catalog — без вариантов `subtask_of`, `task_parent` и т.д.

### Отклонённые альтернативы

| Key | Причина отклонения |
|-----|-------------------|
| `subtask` | Не указывает object type; конфликтует при появлении подзадач у других типов |
| `task_parent` | Инвертирует семантику source/target относительно выбранной модели |
| `depends_on` | Смешивает иерархию WBS с зависимостями планирования (отдельный домен) |

---

## 2. Source и Target (роли)

### Каноническая ориентация

| Роль в продукте | Сторона в Relation Engine | Описание |
|-----------------|---------------------------|----------|
| **Parent Task** (родительская задача) | **source** (`source_entity_id`) | Узел, к которому «принадлежат» подзадачи |
| **Child Task** (подзадача) | **target** (`target_entity_id`) | Дочерняя запись в иерархии WBS |

### Направление instance

```text
runtime_relation_instance:
  relation_key = task_subtask
  source_entity_id = <parent_task_id>
  target_entity_id = <child_task_id>
```

### Relation field (будущая конфигурация на ObjectType «Задача»)

Два согласованных поля типа `relation` (один `relation_key`, разные role):

| Field key (рекомендуемый) | `role` | `cardinality` | Назначение UI |
|---------------------------|--------|---------------|---------------|
| `parent_task` | `target` | `one` | Parent Section — текущая задача как **target**, peer = **source** |
| `subtasks` | `source` | `many` | Subtasks Section — текущая задача как **source**, peers = **targets** |

Поле **не обязательно** создавать оба сразу; спецификация допускает только `subtasks` + чтение parent через incoming, но для симметричного UX карточки рекомендуются оба.

### Почему не «child → parent» как source

Инверсия (source = child, target = parent) возможна технически, но:

- ломает прямое соответствие `RelationType.ONE_TO_MANY` («один родитель — много детей»);
- усложняет Tree View (корни = entities без incoming по `task_subtask`);
- противоречит уже описанному в PR-C5 направлению parent chain (incoming к child).

---

## 3. Cardinality

### На уровне relation definition

| `relation_type` | **Выбор: `one_to_many`** |
|-----------------|--------------------------|

**Семантика:** один **source** (родитель) может иметь **много** **target** (подзадач) через отдельные instances.

```text
Задача A (source)
 ├─ Задача B (target)
 ├─ Задача C (target)
 └─ Задача D (target)
```

### Сопоставление с вариантами

| Тип | Пригодность | Комментарий |
|-----|-------------|-------------|
| `one_to_many` | **Да (канон)** | Родитель = source; несколько подзадач = targets |
| `one_to_one` | Нет | Не допускает несколько подзадач у одного родителя |
| `many_to_many` | Нет | Допускает несколько родителей без доп. правил; противоречит WBS по умолчанию |

### На уровне relation field (UI)

| Поле | `cardinality` |
|------|---------------|
| `parent_task` | `one` |
| `subtasks` | `many` |

### Ограничение «у подзадачи один родитель»

**Не обеспечивается** автоматически типом `one_to_many`: runtime проверяет `one_to_one` constraints только для `relation_type = one_to_one`.

**Требование продукта:** у каждой подзадачи **не более одного** активного parent по `task_subtask`.

| Статус | Этап |
|--------|------|
| Зафиксировано в спецификации | **Да** |
| Реализация в engine | **Да** — `task_subtask_constraints.py` |

При create instance для `task_subtask` отклоняется создание, если у `target_entity_id` уже есть активный instance с другим `source_entity_id`.

### `bidirectional`

| Параметр | Значение |
|----------|----------|
| `bidirectional` | `true` |
| `reverse_name` | `Родительская задача` |

Обратная видимость — через **чтение** incoming/outgoing в Relation Engine (вкладка «Связанные записи», Parent Section). **Второй** instance для обратной стороны **не создаётся**.

---

## 4. Ограничения домена

| Ограничение | Требуется продуктом | Статус в Relation Engine (2026-06-04) | Этап реализации |
|-------------|---------------------|--------------------------------------|-----------------|
| **Дублирование связи** `(parent, child)` | Да | **Да** — `find_duplicate_active` → 409 | Готово |
| **Один родитель на подзадачу** | Да | **Да** для `task_subtask` | Реализовано |
| **Самоссылка** `A → A` | Нет (запретить для `task_subtask`) | **Да** для `task_subtask` only | Реализовано |
| **Цикл** `A → B → C → A` | Да (для WBS) | **Да** для `task_subtask` | Реализовано (BFS по графу) |
| **Несколько родителей** | Нет | **Да** для `task_subtask` | Реализовано |
| **Удаление родителя** | Подзадачи **сохраняются** | Cascade не включать | `cascade_delete = false` |
| **Удаление подзадачи** | Instance удаляется; родитель не удаляется | Soft delete instance | Готово (runtime API) |
| **Cross-type subtask** | Нет | Type keys в instance | Publish + validators |

### `cascade_delete`

| Значение | `false` |
|----------|---------|
| Обоснование | Удаление родительской задачи не должно каскадно удалять записи подзадач из `runtime_entities` |

---

## 5. Модель хранения

### Источник истины

```text
runtime_relation_instances
```

### Relation definition (Designer → Publish → catalog)

Минимальный канонический контракт:

```json
{
  "key": "task_subtask",
  "name": "Подзадача",
  "reverse_name": "Родительская задача",
  "source_object_type_key": "task",
  "target_object_type_key": "task",
  "relation_type": "one_to_many",
  "bidirectional": true,
  "cascade_delete": false,
  "is_active": true,
  "settings_json": {
    "semantic_profile": "task_subtask",
    "parent_entity_side": "source",
    "child_entity_side": "target"
  }
}
```

### Дополнительные таблицы

**Не требуются.**

### Дополнительные поля в `runtime_relation_instances`

**Не требуются** для MVP подзадач.

Существующих полей достаточно:

- `relation_key`, `relation_id`, `catalog_version`
- `source_entity_id`, `target_entity_id`
- `source_object_type_key`, `target_object_type_key`
- `status`, `deleted_at`, audit

### Relation attributes (вес, порядок, тип связи)

| Потребность | Решение |
|-------------|---------|
| Порядок подзадач в UI | **Не в instance** на этапе MVP; опционально `sort_order` в `settings_json` field/view позже |
| % выполнения rollup | Аналитика / отдельный этап; не в instance |

### Запрещено

- `runtime_entity_values` как SoT связи parent/child
- `universal_table_rows.parent_row_id` как SoT для Object Platform
- Параллельная таблица `task_hierarchy` / `self_relations`

---

## 6. Модель UI

Все UI-слои — **над Relation Engine**; отображаемые title — **display layer** (Title Field опубликанного object type).

### 6.1. Карточка задачи

| Секция | Источник данных | Поведение |
|--------|-----------------|-----------|
| **Parent Section** (hero / strip) | Incoming или field `parent_task` (`role=target`) | Одна ссылка «Родительская задача: {Title}»; клик → карточка parent |
| **Subtasks Section** | Outgoing `task_subtask` или field `subtasks` (`role=source`) | Список подзадач; Title Field; клик → карточка child |
| **Вкладка «Связанные записи»** | `listRuntimeEntityRelations` | Группа «Подзадача» (outgoing) и «Родительская задача» (incoming) |

Визуальная оболочка: переиспользовать паттерны UT (`entityCardSubtasksStyles`, список related rows) **без** чтения `parent_row_id`.

### 6.2. Таблица задач

| Колонка (рекомендация) | Тип | Содержимое |
|------------------------|-----|------------|
| `parent_task` | relation field | Title родителя или «—» |
| `subtasks` / `subtask_count` | relation field или derived | «N подзадач» или список (cardinality many) |

Title — **только** из Title Field peer entity (как в `RelationTableCellRenderer`).

### 6.3. «Связанные записи»

- Тот же `relation_key` `task_subtask`;
- Не отдельный механизм;
- Create/delete instance через общий relations API / relation field API.

---

## 7. Пользовательские сценарии

### 7.1. Создание подзадачи (новая запись)

1. Пользователь открывает **Parent Task** `A`.
2. В Subtasks Section нажимает «Добавить подзадачу».
3. Платформа создаёт **новую** `runtime_entity` типа `task` (стандартный create entity).
4. Платформа создаёт **relation instance**:

```text
POST .../relations/task_subtask
{
  "source_entity_id": "<A>",
  "target_entity_id": "<new_child>"
}
```

5. UI обновляет список subtasks (relation field state / relations list).

**В `runtime_entity_values` связь не записывается.**

### 7.2. Назначение существующей задачи подзадачей

1. Пользователь открывает Parent Task `A`.
2. Выбирает существующую задачу `B` (picker, тот же object type).
3. Create instance `A → B` как выше.
4. Если у `B` уже есть parent по `task_subtask` — **отклонить** (после этапа доменных ограничений).

### 7.3. Смена родителя

1. Удалить старый instance `(old_parent, child)` — soft delete.
2. Создать новый `(new_parent, child)`.
3. Relation field `parent_task` cardinality `one` на стороне child отражает одну активную связь.

(Атомарность — в будущем transactional API; спецификация допускает два шага.)

### 7.4. Удаление связи (отвязать подзадачу)

1. Пользователь удаляет связь из Subtasks Section или поля `parent_task`.
2. `DELETE` relation instance (soft delete).
3. **Задачи `A` и `B` остаются** в `runtime_entities`.
4. `B` становится задачей без родителя по `task_subtask`.

### 7.5. Удаление задачи

| Удаляемая сущность | Поведение |
|--------------------|-----------|
| **Child** | Instance `(parent, child)` soft-deleted вместе с entity (FK CASCADE на entity) |
| **Parent** | Child tasks **остаются**; instances с source = parent удаляются/инвалидируются по FK; дети без parent (orphan WBS) — продуктово допустимо до политики cleanup |

---

## 8. ADR: принятое решение и альтернативы

### Принято

- Канонический ключ **`task_subtask`**
- **source = Parent**, **target = Child**
- **`one_to_many`** + field cardinality parent `one` / subtasks `many`
- SoT = **`runtime_relation_instances`**
- UI через relation fields + секции + «Связанные записи»

### Отклонено

| Альтернатива | Причина |
|--------------|---------|
| UT `parent_row_id` | Legacy dual-SoT; запрещено архитектурой платформы |
| Отдельный hierarchy engine | Дублирование Relation Engine |
| `many_to_many` | Неоднозначный WBS без жёстких правил |
| Хранение parent id в `value_json` | Нарушение ADR Object Relation Field |
| Два relation key (parent + child) | Избыточность; один key + direction достаточно |

### Влияние на roadmap

| Этап | Зависимость от спецификации |
|------|----------------------------|
| Доменные ограничения task_subtask | Реализует таблицу ограничений §4 |
| Parent Section через relation engine | `parent_task`, incoming `task_subtask` |
| Подзадачи через relation engine | `subtasks`, outgoing `task_subtask` |
| Tree View | Обход outgoing `task_subtask`, корни = без parent incoming |
| Фильтрация / аналитика | `relation_key = task_subtask` |

---

## 9. Publish checklist (для реализации, не в рамках этого ADR)

- [ ] `designer_relation_definitions`: запись `task_subtask` для типа Задача
- [ ] Publish без ошибок (self-relation разрешён)
- [ ] `catalog.relations[]` содержит `task_subtask`
- [ ] Опционально: fields `parent_task`, `subtasks` в object type
- [ ] Object views: projection / layout

---

## 10. Проанализированные артефакты

| Область | Файлы |
|---------|--------|
| Relation instances | `backend/app/modules/platform/runtime/relation_instances/models.py`, `service.py`, `repository.py`, `validators.py` |
| Relation field | `backend/app/modules/platform/shared/relation_field_contract.py`, `runtime/relation_field/service.py` |
| Designer | `backend/app/modules/platform/designer/relation_definitions/schemas.py`, `publish/validators.py` |
| Документация | `docs/architecture/ADR_OBJECT_RELATION_FIELD_AS_RELATION_INSTANCE_VIEW.md`, `YASNOPRO_RELATION_ENGINE_MODEL.md`, `YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md`, `RELATION_ENGINE_FOUNDATION_AUDIT.md` |
| Object Card | `frontend/src/modules/objectEntities/services/mapRelationInstancesToGroups.js`, `YASNOPRO_OBJECT_ENTITY_CARD_UX_BASELINE.md` |
| Legacy (не SoT) | `universal_table_rows.parent_row_id`, `EntityCardParent.jsx` |

---

## Связанные документы

- [ADR_OBJECT_RELATION_FIELD_AS_RELATION_INSTANCE_VIEW.md](./ADR_OBJECT_RELATION_FIELD_AS_RELATION_INSTANCE_VIEW.md)
- [YASNOPRO_RELATION_ENGINE_MODEL.md](./YASNOPRO_RELATION_ENGINE_MODEL.md)
- [YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md](./YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md)
