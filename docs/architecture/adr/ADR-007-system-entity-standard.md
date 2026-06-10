# ADR-007. System Entity Standard

## Статус

Accepted

## Дата

2026-06-10

## Slug

`adr-007-system-entity-standard`

## Контекст

За последние этапы развития ЯсноПро платформа накопила набор **системных сущностей** — записей и конфигураций, без которых не работают платформенные механизмы (Plan View, Quick Create, Workspace Home, навигация Designer/Runtime).

До унификации каждая такая сущность реализовывалась локально: собственные эвристики поиска, ad-hoc создание «если не нашли», зависимость от `title` / display name, отсутствие reconcile и audit.

### Выявленные проблемы

| Риск | Последствие |
|------|-------------|
| Дубли singleton-записей | Непредсказуемое поведение UI и API |
| Гонки при параллельном ensure | Несколько «канонических» записей в одном scope |
| Поиск по title / magic strings | Ломается при локализации и переименовании |
| Отсутствие reconcile | Дубли остаются в БД навсегда |
| Отсутствие recovery | Битые FK, циклы, orphan-ссылки |
| Отсутствие audit | Невозможен централизованный контроль состояния |

### Примеры инцидентов

1. **Plan Root Anchor — дубли и циклы.** Несколько системных anchor-записей на одну иерархию; anchor-to-anchor relations образовывали циклы в Plan View. Поиск опирался на legacy-маркер `__plan_tree_root__` в revision value.
2. **Plan View — циклы.** Связи между дублирующимися anchor приводили к некорректному порядку корневых узлов.
3. **Default Quick Form — отсутствие runtime ensure.** View создавался только миграцией; object types с `quick_create` оставались без `default_quick_form` view до ручного вмешательства.
4. **Navigation System Items — отсутствие защиты.** `system_key` не был уникален на уровне БД; возможны дубли designer system pages и workspace placements при параллельном publish.

Поэтапно были унифицированы:

- Plan Root Anchor
- Default Quick Form View
- Workspace Home Tab / Home Page / Root Section
- Navigation System Items / Workspace Navigation Placements

Во всех случаях повторялись одни и те же архитектурные требования. Настоящий ADR фиксирует их как обязательный стандарт.

---

## Решение

### Определение: System Entity

**System Entity** — сущность платформы, существование которой необходимо для работы **платформенного механизма**, а не для хранения пользовательских данных.

Критерии:

- без неё ломается или деградирует platform capability (view, navigation, workspace shell, runtime engine);
- жизненный цикл управляется платформой (ensure / reconcile / recovery), а не пользовательским CRUD;
- идентифицируется **структурным ключом**, а не отображаемым именем.

#### Являются System Entity

| Сущность | Класс |
|----------|-------|
| Plan Root Anchor | Runtime System Record |
| Default Quick Form View | Designer System Configuration |
| Workspace Home Tab | Designer System Configuration |
| Workspace Home Page | Designer System Configuration |
| Workspace Root Section | Designer System Configuration |
| Navigation System Item | Navigation System Entity |
| Workspace Navigation Placement | Navigation System Entity |

#### Не являются System Entity

| Сущность | Причина |
|----------|---------|
| Задача, Проект, Клиент | Пользовательские runtime-записи |
| Пользовательская запись object type | Бизнес-данные tenant |
| Комментарий пользователя | User content |
| Произвольный бизнес-объект | Не platform infrastructure |

---

## Классы System Entity

### 1. Runtime System Records

Системные записи в runtime-слое (`runtime_entities`, relation instances).

**Назначение:** инфраструктурные якоря и служебные entity для engines (Plan Tree, будущие Kanban/Workflow roots).

**Пример:** Plan Root Anchor.

### 2. Designer System Configuration

Конфигурация в designer/metadata-слое (views, workspaces, pages, sections).

**Назначение:** обязательные артефакты Studio/Office, создаваемые и восстанавливаемые платформой при bootstrap, publish и lazy ensure.

**Примеры:** Default Quick Form View, Workspace Home Tab/Page/Section.

### 3. Navigation System Entities

Записи `navigation_items` с `system_key`, placements в меню Designer и Runtime.

**Назначение:** стабильные пункты навигации и привязки workspace к menu scope без зависимости от title.

**Примеры:** `designer.objects`, `designer.workspace.{id}.{scope}`.

### 4. Code Builtins

Сущности, не хранящиеся как singleton-запись в БД, но являющиеся системными по контракту кода (registries, builtin action types/categories).

**Назначение:** фиксированный каталог возможностей платформы, регистрируемый при старте или по запросу.

**Пример:** builtin action categories (`ensure_builtin_action_categories_registered`).

> **Правило:** Code Builtins подчиняются тем же принципам structural key и idempotent ensure, но могут не иметь DB reconcile, если не materialized как запись.

---

## Обязательные требования

Каждая **новая** System Entity с persistence в БД обязана реализовать полный набор механизмов ниже.

### 1. Structural Key

**Источник истины** для идентификации сущности. Хранится в выделенном поле или нормативной константе scope.

| Сущность | Structural Key |
|----------|----------------|
| Plan Root Anchor | `plan_root_relation_key` |
| Default Quick Form View | `key = default_quick_form` |
| Workspace Home Tab | `slug = home` + `is_system = true` |
| Workspace Home Page | `designer_workspaces.home_page_id` (1:1 FK) |
| Workspace Root Section | `sort_order = 0` на home page |
| Navigation System Item | `system_key` |
| Workspace Navigation Placement | `system_key = designer.workspace.{workspace_id}.{menu_scope}` |

### 2. Unique Scope

Явное определение области уникальности. Должно быть зафиксировано в коде **и** по возможности enforced на уровне БД (partial unique index).

Примеры scope:

```text
tenant + object_type_key + plan_root_relation_key
tenant + object_type_id + view_key
workspace_id + slug=home + is_system
portal_id + system_key
```

### 3. Advisory Lock

Защита от гонок при ensure/reconcile в рамках scope:

```sql
SELECT pg_advisory_xact_lock(:lock_key)
```

`lock_key` — детерминированный hash от нормализованного scope (см. `*_lock_key()` в registry-модулях).

### 4. Ensure

Идемпотентная функция `ensure_*()`:

1. acquire lock;
2. reconcile существующих;
3. return canonical **или** create + flush;
4. при `IntegrityError` — повторный reconcile (lost race).

Ensure **не** должен зависеть от title и не должен быть единственной точкой создания без reconcile.

### 5. Reconcile

Устранение дублей в scope:

- **oldest wins** — каноническая запись с минимальным `created_at` / `id`;
- остальные — soft delete (`deleted_at`) или deactivation (`is_active = false`), с `logger.warning`;
- при наличии soft-deleted revivable — revival вместо create.

### 6. Recovery

Самовосстановление битой конфигурации без ручного SQL:

- repair metadata (flags, keys, types);
- repair links (FK, target_id, parent_id);
- repair parent relations (удаление orphan/cyclic edges);
- clear broken pointers (например, `home_page_id` → `NULL`).

Recovery вызывается из ensure-path или dedicated repair, не из ad-hoc UI.

### 7. Audit

Функция `audit_*()` — SQL-агрегация по scope с подсчётом активных записей и списком id. Используется в скриптах, тестах и operational checks.

Критерий здоровья: `active_count = 1` (или `0` до первого ensure) для singleton scope.

### 8. Visibility Policy

Каждая System Entity обязана иметь явную политику видимости:

| Политика | Описание | Примеры |
|----------|----------|---------|
| **Hidden Runtime** | Не показывается пользователю; только engine | Plan Root Anchor |
| **Studio Visible** | Видна в Designer/Studio, не в user data | Default Quick Form, designer system nav |
| **User Visible Config** | Видна конечному пользователю как часть shell | Workspace Home Tab, nav placements |
| **Code Only** | Нет DB-записи; только registry | Builtin action types |

---

## Запрещённые практики

### Запрещено как источник истины

```text
title
display name
localized label
magic strings в произвольных полях
служебные названия («Главная», «Быстрая форма») для поиска singleton
```

Title допустим только как **display metadata**, синхронизируемый из константы при repair, но не для lookup.

### Запрещённые паттерны реализации

```text
поиск singleton по title;
логика «если не нашли — создадим» без lock и reconcile;
ad-hoc singleton implementation без registry-модуля;
скрытые зависимости между сущностями без structural key;
создание system entity только в миграции без runtime ensure.
```

### Legacy: `__plan_tree_root__`

Маркер `__plan_tree_root__` (см. `PLAN_TREE_ROOT_ANCHOR_MARKER`) допустим **только** как:

```text
legacy migration marker
источник для backfill plan_root_relation_key
```

Он **не может** быть structural key и **не может** использоваться в runtime lookup после миграции на `plan_root_relation_key`.

---

## Эталонная реализация: Plan Root Anchor

**Референс:** `backend/app/modules/platform/runtime/plan_tree/anchor_registry.py`

| Требование | Реализация |
|------------|------------|
| Structural Key | колонка `runtime_entities.plan_root_relation_key` |
| Unique Scope | `tenant_id + object_type_key + plan_root_relation_key` |
| DB enforcement | partial unique index `uq_runtime_entities_active_plan_root_anchor` (миграция `20260610_0028`) |
| Advisory Lock | `acquire_plan_root_anchor_lock()` |
| Ensure | `ensure_plan_tree_root_order()` в `root_anchor.py` |
| Reconcile | `reconcile_duplicate_plan_root_anchors()` — oldest wins, soft delete |
| Recovery | `_ensure_anchor_metadata()`; `deactivate_anchor_to_anchor_relations()` — устранение циклов |
| Audit | `audit_plan_root_anchors()` |
| Visibility | Hidden Runtime (`is_system = true`, не user-facing) |

Любая новая System Entity с DB persistence проектируется по этому шаблону: **constants → registry (lock/reconcile/audit) → service ensure**.

---

## Будущие системные сущности

Любая новая System Entity **обязана** соответствовать настоящему ADR до merge.

В том числе (не исчерпывающий список):

```text
Kanban board/column anchors
Workflow state machine roots
Automation trigger bindings
Runtime Engine bootstrap records
Designer Engine default artifacts
Platform Seed artifacts (см. ADR-006)
```

Checklist для code review новой System Entity:

```text
[ ] structural key задокументирован в constants
[ ] unique scope определён
[ ] partial unique index (если singleton в БД)
[ ] advisory lock на scope
[ ] ensure_*() идемпотентен
[ ] reconcile_*() с oldest wins
[ ] recovery path для broken metadata/links
[ ] audit_*() SQL
[ ] visibility policy указана
[ ] тесты: ensure idempotency, reconcile duplicates, race IntegrityError
```

---

## Current Compliance Matrix

Оценка **текущего** состояния семи унифицированных сущностей на 2026-06-10.  
**Соответствует** — реализовано и используется в production path.  
**Частично** — реализовано, но есть известный gap.  
**Не соответствует** — не реализовано.

| Требование | Plan Root Anchor | Default Quick Form | Workspace Home Tab | Workspace Home Page | Workspace Root Section | Navigation System Item | Workspace Nav Placement |
|------------|:----------------:|:------------------:|:------------------:|:-------------------:|:----------------------:|:----------------------:|:-----------------------:|
| Structural Key | Соответствует | Соответствует | Соответствует | Соответствует | Частично | Соответствует | Соответствует |
| Unique Scope (логический) | Соответствует | Соответствует | Соответствует | Соответствует | Частично | Соответствует | Соответствует |
| Unique Scope (DB index) | Соответствует | Соответствует | Частично | Соответствует | Не соответствует | Соответствует | Соответствует |
| Advisory Lock | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует |
| Ensure | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует |
| Reconcile | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует |
| Recovery | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует |
| Audit | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует |
| Visibility Policy | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует | Соответствует |

### Примечания к матрице

**Plan Root Anchor** — полное соответствие; эталон ADR.

**Default Quick Form View** — registry `quick_form_view_registry.py`; unique index `uq_designer_view_definitions_object_type_key_active`; bootstrap в `object_types/service.py`.

**Workspace Home Tab** — registry `workspace_home/registry.py`; reconcile по `slug=home` + `is_system`. **Gap:** нет partial unique index `(workspace_id)` для system home tab; защита через advisory lock + reconcile + `IntegrityError` retry.

**Workspace Home Page** — идентичность через `designer_workspaces.home_page_id` (1:1); recovery через `resolve_workspace_home_page()` при битом FK.

**Workspace Root Section** — structural key = `sort_order=0`, не выделенная колонка. **Gaps:** нет dedicated `system_key`/`is_system` на section; нет DB unique index на `(page_id, sort_order)` для root; reconcile скрывает дубли через `is_visible=false`, не soft delete.

**Navigation System Item** — registry `navigation/system_registry/`; unique index `uq_navigation_items_portal_system_key_active` (миграция `20260610_0029`). **Legacy debt:** в БД могут оставаться старые ключи `designer.relations` / `designer.views`, не входящие в `DESIGNER_SYSTEM_NAV_ITEMS` ensure-каталог.

**Workspace Navigation Placement** — `ensure_workspace_menu_placement()`; recovery orphan через `deactivate_orphan_workspace_placements()`; тот же unique index по `system_key`.

### Рекомендуемые follow-up (вне scope ADR)

1. Partial unique index для Workspace Home Tab: `(workspace_id) WHERE slug='home' AND is_system AND deleted_at IS NULL`.
2. Dedicated structural marker для Workspace Root Section (например, `is_system` / `system_key` на `sections`) + partial unique index.
3. Cleanup legacy navigation keys `designer.relations`, `designer.views` после подтверждённого audit.

---

## Последствия

### Положительные

- Единый архитектурный стандарт для всех system entities.
- Снижение дублей, циклов и битых ссылок.
- Предсказуемость ensure-path при bootstrap, publish и lazy load.
- Централизуемый audit одним SQL на сущность.
- Упрощение сопровождения: один шаблон registry + service.

### Отрицательные

- Увеличение объёма работы при введении новой System Entity (lock, reconcile, audit, тесты).
- Необходимость приводить legacy-сущности к стандарту (миграции backfill, cleanup).
- Частичные сущности (Workspace Root Section) требуют доработки для полного DB enforcement.

### Нейтральные

- ADR не меняет код и не запускает миграции; фиксирует норму и текущее состояние compliance.
- Реализация follow-up — отдельные work items с собственным Dashboard gate.

---

## Связанные документы

| Документ | Связь |
|----------|-------|
| [ADR-006-platform-seed-v1.md](./ADR-006-platform-seed-v1.md) | Platform Seed — источник обязательных designer artifacts |
| `backend/app/modules/platform/runtime/plan_tree/anchor_registry.py` | Эталон registry |
| `backend/app/modules/platform/designer/view_definitions/quick_form_view_registry.py` | Quick Form registry |
| `backend/app/modules/platform/designer/workspaces/workspace_home/registry.py` | Workspace Home registry |
| `backend/app/modules/navigation/system_registry/registry.py` | Navigation registry |

---

## Ревизии

| Дата | Изменение |
|------|-----------|
| 2026-06-10 | Принятие ADR; compliance matrix для 7 сущностей |
