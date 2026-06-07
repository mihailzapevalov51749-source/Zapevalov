# Object View Architecture — единая модель настроек представлений ЯсноПро

**Статус:** APPROVED BASELINE (утверждённая целевая архитектура, без изменений runtime)  
**Версия:** 1.1  
**Дата:** 2026-06-07  
**Связанные документы:** [YASNOPRO_VIEW_ENGINE_MODEL.md](./YASNOPRO_VIEW_ENGINE_MODEL.md), [YASNOPRO_OBJECT_ENTITY_CARD_UX_BASELINE.md](./YASNOPRO_OBJECT_ENTITY_CARD_UX_BASELINE.md)

---

## Архитектурное решение (утверждено)

### Объект — источник данных

```text
Object Type
 ├ Fields
 ├ Relations
 └ Runtime Entities
```

Все данные принадлежат объекту. Представления **не создают** полей, **не хранят** данные, **не создают** сущности.

### Вкладка объекта — единая структура

```text
Object Tab
 ├ Projection      ← какие поля объекта используются
 ├ Query           ← какие экземпляры показывать
 └ View Settings   ← как отображать выбранные поля
```

### Главный принцип

```text
Projection выбирает поля.
Query выбирает записи.
View Settings определяет, как отображать выбранные поля.
```

| Слой | Вопрос | Примеры |
|------|--------|---------|
| **Projection** | Какие поля объекта участвуют? | Название, Описание, Статус, Ответственный, Срок |
| **Query** | Какие записи показывать? | Фильтры, сортировка, пагинация, quick filters |
| **View Settings** | Как использовать поля? | Роли, layout, иерархия, колонки канбана, оси календаря |

**Запрещено:** собственные поля представления; данные внутри view; `title`/`status`/`name`/`description` как SoT; fallback как основная логика; дублирование Projection отдельными списками полей; разные архитектурные модели для разных типов.

---

## 1. Матрица представлений

| Представление | Projection | Query | View Settings | Отклонения | Риски |
|---------------|------------|-------|---------------|------------|-------|
| **Table** | ✅ Реализован (`objectView.projection`, Studio UI) | ✅ Реализован (`objectView.query`, Office filters/sort) | ✅ `presentation.table` (columns, hidden, widths) | Legacy `settings_json.projection`; иерархия дерева — из каталога, не из settings | Рассинхрон legacy/camelCase projection |
| **Plan** | ⚠️ В контракте (auto-merge), **не в Studio UI**, runtime не читает `fieldKeys` | ⚠️ Общий query есть, **фильтры в UI Plan не используются** | ⚠️ `presentation.plan` с параллельными `*FieldKey` | `titleFieldKey`/`statusFieldKey`/`descriptionFieldKey` дублируют Projection; fallbacks `"status"`, `"title"` | Сломанные Plan-вкладки при удалении fallback |
| **Card** | ⚠️ Слабая связь; поля в `sections[].fieldKeys` | ❌ Нет (карточка — запись, не список) | ✅ `presentation.card` (sections, tabs, layout) | Вкладка `card` не в runtime; layout без обязательного projection; `findDescriptionField` | Дубли field list vs projection |
| **Kanban** (`board`) | ❌ Нет | ❌ Нет | ❌ Нет `presentation.board` | Только enum + метка UI; не реализован | Создание вкладки board в Studio → нерабочий runtime |
| **Calendar** | ❌ Нет | ❌ Нет | ❌ Нет `presentation.calendar` | Только enum; не реализован | — |
| **Tree** | ⚠️ Только внутри Table projection | ⚠️ Только Table query | ❌ Нет `presentation.tree`; tree-mode в table — hardcoded relation | Вкладка `tree` не реализована; иерархия из `hierarchyRelationProfile` | Две модели дерева (Table vs Plan) |
| **Diagram** (`graph`/`chart`) | ❌ Нет | ❌ Нет | ❌ Нет | Нет в `ViewType` enum; только label в `getObjectViewAdapterLabel` | — |

**Runtime сегодня:** только `table` и `plan` в `ObjectViewHost.jsx`. Остальные → placeholder.

---

## 2. Детальный аудит по представлениям

### 2.1. Table

**Соответствует архитектуре**

- Projection: Studio `ViewPropertiesPanel`, runtime `projectionToColumns.js`
- Query: `objectView.query` (filters, sort, pagination), Office representations
- View Settings: `presentation.table` (hiddenFieldKeys, columnOrder, columnWidths, density)

**Не соответствует**

- Дублирование legacy `settings_json.projection` ↔ `objectView.projection`
- Режим дерева в таблице: `useObjectTableHierarchyRows` — relation из каталога, не из View Settings вкладки
- Card layout редактируется из table view (смешение Table Settings и Card Settings)

**Legacy**

- `settings_json.projection` (snake_case) — compatibility snapshot при publish
- `settings_json.columns` (office user views) — merge в `presentation.table`

**Переход**

- Сохранить модель; добавить опциональный `presentation.table.hierarchyRelationKey` для tree-mode
- Убедиться, что card layout ссылается на projection того же view

---

### 2.2. Plan

**Соответствует архитектуре**

- Query в контракте (общий с object view)
- View Settings для поведения: `hierarchyRelationKey`, `issuesRelationKey`, `statusProgressMap`
- Данные — только `runtime_entities` + relation instances

**Не соответствует**

- Projection скрыт в Studio (`PlanViewSettingsPanel` вместо Projection)
- Параллельные поля: `titleFieldKey`, `statusFieldKey`, `descriptionFieldKey`, `nextStepsFieldKey`
- Runtime не использует `projection.fieldKeys`
- `nextStepsFieldKey` в настройках, UI — `ObjectEntityChecklist` (platform block)

**Legacy**

- `presentation.plan.titleFieldKey` / `statusFieldKey` / `descriptionFieldKey` — **заменить на roleMapping**
- `nextStepsFieldKey` — мёртвая настройка
- `progressMode` — сохраняется, не применяется в `computePlanNodeReadiness`
- При save: `syncViewSettingsFromDraftProjection` пишет projection «втихую»

**Переход**

- Studio: Projection + Plan Settings (иерархия, role mapping, проблемы, blocks)
- Runtime: roleMapping с dual-read legacy keys
- Удалить fallbacks `"status"`, `"title"`, `"name"` после миграции каталогов

**Целевая модель Plan**

```text
Plan
 ├ Projection        ← поля объекта (название, статус, описание, …)
 ├ Query             ← фильтры/сортировка списка для дерева
 └ Plan Settings
      ├ hierarchyRelationKey
      ├ issuesRelationKey
      ├ roleMapping { nodeTitle, nodeStatus, nodeDescription, … }
      ├ statusProgressMap
      └ blocks { checklist, bottomTabs, detailPanel }
```

---

### 2.3. Card

**Соответствует архитектуре**

- View Settings: `presentation.card` (sections, tabs, hiddenFieldKeys, order)
- Поля — из object type (не создаются view)

**Не соответствует**

- Вкладка `view_type=card` не рендерится в `ObjectViewHost`
- Projection не обязателен; `sections[].fieldKeys` может расходиться с projection
- Query отсутствует (для вкладки-card целевой query = фильтр одной записи / контекст открытия)
- Hero meta (статус, исполнитель, срок) — автопоиск полей, не role mapping

**Legacy**

- `findDescriptionField` в `runtimeEntityCardAdapter.js`
- Фиксированные inner tabs: `checklist`, `notes`, `relations`
- `CANONICAL_SECTION_ORDER` — hardcoded layout

**Переход**

- `sections[].fieldKeys` ⊆ `projection.fieldKeys`
- Card Settings: только layout/sections/tabs/blocks
- Role mapping для hero meta (status, owner, due_date) из projection

**Целевая модель Card**

```text
Card
 ├ Projection
 ├ Query            ← контекст записи (entityId) или пустой для modal
 └ Card Settings
      ├ sections[]
      ├ tabs[]
      ├ hiddenFieldKeys
      └ roleMapping { heroTitle, heroStatus, heroOwner, heroDueDate }
```

---

### 2.4. Kanban (`board`)

**Соответствует:** ничего (не реализован).

**Целевая модель**

```text
Kanban
 ├ Projection
 ├ Query
 └ Kanban Settings
      ├ columnFieldKey      ← роль: поле колонок (статус)
      ├ cardTitleFieldKey   ← из projection.titleFieldKey или role
      ├ cardColorFieldKey
      ├ groupByFieldKey
      └ swimlanes
```

**Переход:** scaffold `presentation.board` в контракте; Studio gate до реализации runtime.

---

### 2.5. Calendar

**Соответствует:** enum `ViewType.CALENDAR` только.

**Целевая модель**

```text
Calendar
 ├ Projection
 ├ Query
 └ Calendar Settings
      ├ startDateFieldKey
      ├ endDateFieldKey
      ├ eventTitleFieldKey
      └ colorFieldKey
```

**Переход:** контракт + Studio после Plan/Card унификации.

---

### 2.6. Tree

**Соответствует:** tree-режим внутри Table (projection + query table).

**Не соответствует:** отдельная вкладка `tree` отсутствует; иерархия hardcoded в `useObjectTableHierarchyRows`.

**Целевая модель**

```text
Tree
 ├ Projection
 ├ Query
 └ Tree Settings
      ├ hierarchyRelationKey
      ├ nodeTitleFieldKey     ← role → projection key
      └ displayOptions
```

**Переход:** вынести hierarchy из table profile в `presentation.tree` или shared `hierarchyRelationKey`.

---

### 2.7. Diagram (`graph` / `chart`)

**Соответствует:** ничего.

**Целевая модель**

```text
Diagram
 ├ Projection
 ├ Query
 └ Diagram Settings
      ├ diagramType
      ├ axisFieldKeys
      ├ groupByFieldKey
      └ labelFieldKey
```

**Переход:** добавить `ViewType` при реализации; следовать единому шаблону контракта.

---

## 3. Текущие отклонения (сводка)

| ID | Отклонение | Затронутые view | Severity |
|----|------------|-----------------|----------|
| D1 | Параллельные `*FieldKey` вместо role mapping | Plan | P0 |
| D2 | Plan runtime игнорирует projection.fieldKeys | Plan | P0 |
| D3 | Card sections.fieldKeys без projection | Card | P1 |
| D4 | nextStepsFieldKey ≠ UI (checklist) | Plan | P1 |
| D5 | Query Plan не используется в UI | Plan | P2 |
| D6 | Table/Plan hierarchy из каталога, не settings | Table, Tree | P2 |
| D7 | Нереализованные types в Studio | Kanban, Calendar, Card tab | P2 |
| D8 | Hardcoded bottom tabs Plan | Plan | P2 |

---

## 4. Legacy-настройки

| Настройка | Где | Статус | Действие при миграции |
|-----------|-----|--------|----------------------|
| `settings_json.projection` (snake_case) | Все views | Legacy mirror | Оставить derived до ADR |
| `presentation.plan.titleFieldKey` | Plan | Дубль projection | → `roleMapping.nodeTitle`, deprecated |
| `presentation.plan.statusFieldKey` | Plan | Дубль projection | → `roleMapping.nodeStatus`, deprecated |
| `presentation.plan.descriptionFieldKey` | Plan | Дубль projection | → `roleMapping.nodeDescription`, deprecated |
| `presentation.plan.nextStepsFieldKey` | Plan | Мёртвая | Удалить или → `blocks.checklist` |
| `presentation.plan.progressMode` | Plan | Не используется | Подключить или удалить |
| `settings_json.columns` | Office user views | Legacy merge | Сохранить merge в presentation.table |

---

## 5. Хардкод и fallback

| Механизм | Файл | Запрещено в целевой модели |
|----------|------|---------------------------|
| `statusFieldKey \|\| "status"` | `planFieldUtils.js` | Да — только role mapping |
| `getPlanEntityFieldValue(entity, "status")` | `buildPlanTree.js` | Да |
| fallback `title`, `name` | `planEntityUtils.js` | Да |
| `is_title \|\| "title"` (issues) | `ObjectPlanView.jsx` | Да |
| regex status categories | `planStatusUtils.js` | Допустимо как view logic, не как field source |
| `DEFAULT_PLAN_STATUS_PROGRESS_MAP` | `planViewContract.js` | Defaults OK; UI настройка обязательна для кастомных статусов |
| `resolvePrimaryHierarchySubtaskRelationKey` | `useObjectTableHierarchyRows.js` | → Tree/Table Settings |
| `PLAN_BOTTOM_TABS` | `PlanBottomPanel.jsx` | → `blocks.bottomTabs` |
| `findDescriptionField` | `runtimeEntityCardAdapter.js` | → role mapping |
| Inner tabs checklist/notes/relations | `objectEntityCardSectionsLayout.js` | → Card Settings blocks |

---

## 6. Целевая модель (единый контракт)

### 6.1. Структура `objectView` (все view types)

```json
{
  "schemaVersion": 1,
  "key": "example",
  "viewType": "plan",
  "projection": {
    "fieldKeys": ["name", "description", "status", "owner", "due_date", "priority"],
    "fieldOrder": ["name", "description", "status", "owner", "due_date", "priority"],
    "titleFieldKey": "name"
  },
  "query": {
    "filters": { "conditions": [], "savedFilters": [], "quickFilters": [] },
    "sort": { "rules": [] },
    "pagination": { "defaultPageSize": 20 }
  },
  "presentation": {
    "table": null,
    "plan": { "...": "Plan Settings" },
    "card": null,
    "board": null,
    "calendar": null,
    "tree": null,
    "diagram": null
  }
}
```

Активен только блок `presentation.<viewType>`.

### 6.2. Role Mapping (общий паттерн)

Роли ссылаются **только** на ключи из `projection.fieldKeys` или `titleFieldKey`:

```json
"roleMapping": {
  "nodeTitle": "name",
  "nodeStatus": "status",
  "nodeDescription": "description"
}
```

Publish validation: `roleMapping.* ∈ projection.fieldKeys`.

### 6.3. View Settings по типам (целевые блоки)

| view_type | Блок | Содержание (только поведение/layout) |
|-----------|------|--------------------------------------|
| `table` | `presentation.table` | hidden, order, widths, density, optional hierarchy |
| `plan` | `presentation.plan` | hierarchy, issues relation, roleMapping, readiness map, blocks |
| `card` | `presentation.card` | sections, tabs, layout, roleMapping для hero |
| `board` | `presentation.board` | columnField, cardTitle, cardColor, swimlanes |
| `calendar` | `presentation.calendar` | start, end, title, color roles |
| `tree` | `presentation.tree` | hierarchy relation, node display |
| `graph` | `presentation.diagram` | diagram type, axes, grouping, labels |

### 6.4. Studio UX (целевой)

```text
Свойства вкладки
 ├ Общие
 ├ Projection        ← всегда, для всех view types
 ├ Query             ← фильтры, сортировка, пагинация
 └ <ViewType> Settings
```

---

## 7. Roadmap миграции

**Ограничение текущего этапа:** этапы 0 завершён; этапы 1–6 — только план, без изменений кода.

| Этап | Название | Содержание | Статус |
|------|----------|------------|--------|
| **0** | Документация | Аудит, матрица, утверждённая архитектура, dashboard | ✅ **DONE** |
| **1** | Контракт представлений | `roleMapping` schema, publish guards, dual-read adapter, OBJECT_VIEW_CONTRACT.md | ✅ **DONE** |
| **2** | Projection для всех view types | Studio UI: ObjectProjectionPanel на каждой вкладке; sync при save/publish | ✅ **DONE** |
| **3** | Role Mapping | ObjectRoleMappingPanel; Plan role pickers; Studio save/publish | ✅ **DONE** |
| **4** | Runtime dual-read | `resolvePlanRoleMappingDualRead` в Plan runtime; roleMapping → legacy | ✅ **DONE** |
| **5A** | Plan Legacy Deprecation | `@deprecated` на *FieldKey; `usesLegacyPlanFields` в publish; debug без window globals | ✅ **DONE** |
| **5B** | Удаление legacy | Удалить *FieldKey из publish; убрать LEGACY FALLBACK из runtime | 🔜 **NEXT** |
| **6** | Финальная унификация | Kanban/Calendar/Tree/Diagram runtime; единый ObjectViewHost; gate Studio | PLANNED |

**Оценка:** этапы 1–4 ≈ 3–4 недели; 5–6 ≈ 1–2 месяца.

---

## 8. Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Поломка опубликованных Plan-вкладок | Высокая | Office пустое дерево/статусы | Dual-read + migration infer roleMapping |
| Администраторы путают Projection и Plan field keys | Средняя | Неверная конфигурация | Единый Studio UX; валидация publish |
| Card layout ≠ projection | Средняя | Скрытые/лишние поля | `fieldKeys ⊆ projection` guard |
| Две модели иерархии (Table tree vs Plan) | Средняя | Разное поведение | Общий `hierarchyRelationKey` в settings |
| Создание нерабочих вкладок в Studio | Высокая | Пустой Office | Gate view types до runtime |
| Удаление legacy projection mirror | Низкая | Старые API | Отдельный ADR, не в этапе 5 |

---

## 9. Обновления Dashboard

Программа: `platformDevelopmentManifest.objectViewArchitectureProgram`  
Owner Dashboard: `platform-core` → `pc-object-view-architecture`

| Показатель | Значение |
|------------|----------|
| **Текущий статус** | Plan View Settings: planLayout (вкладки, секции Инфо, поля) синхронизирован Studio ↔ Runtime |
| **Readiness программы** | 99% |
| **Следующий этап** | **Этап 6 — Финальная унификация** |
| **Метрики** | `planLayoutSettings`, `planTreeVisualPolish`, `planUiReferenceLayout` |
| **Риски** | legacy universalTable; portal shell header labels |

---

## Legacy Usage Audit (Stage 5A.1)

**Дата аудита:** 2026-06-07 · **Catalog version:** 67 · **Скрипт:** `backend/scripts/audit_plan_legacy_usage.py` (read-only)

### Сводная статистика

| Показатель | Значение |
|------------|----------|
| Всего Plan | **1** |
| Через Role Mapping | **0** |
| Через Legacy | **1** |
| Mixed | **0** |
| Legacy Only | **1** |
| Fallback Only | **0** |
| Дубли roleMapping + legacy | **0** |

### Реестр опубликованных Plan

| ID | Workspace | Object | Tab | usesLegacyPlanFields | Role Mapping | Legacy | Risk |
|----|-----------|--------|-----|----------------------|--------------|--------|------|
| `463d34a1-…` | Разработка | Направления | Архитектура | `true` | `{}` | `titleFieldKey: nazvanie`, `descriptionFieldKey: opisanie` | **high** |

### Риски

| Уровень | Количество | Критерий |
|---------|------------|----------|
| Высокий | 1 | `roleMapping` пуст, `usesLegacyPlanFields = true` |
| Средний | 0 | Частичный `roleMapping` + legacy |
| Низкий | 0 | `usesLegacyPlanFields = false` |
| Fallback | 0 | `roleMapping` и legacy пусты |

### Readiness удаления legacy

| Legacy % | Readiness |
|----------|-----------|
| 100% (1/1) | **25%** |

Правило: 0% legacy → 100%; &lt;10% → 75%; &lt;50% → 50%; ≥50% → 25%.

### Рекомендация по этапу 5B

**Нет, требуется Migration Assistant.**

Все опубликованные Plan (1/1) зависят от legacy `*FieldKey`; `roleMapping` не заполнен. Запуск 5B без миграции сломает вкладку «Архитектура» (Направления → Разработка).

**Действия перед 5B:**

1. Заполнить Role Mapping для `arhitektura` (nodeTitle ← `nazvanie`, nodeDescription ← `opisanie`, nodeStatus при наличии поля).
2. Переопубликовать каталог.
3. Повторить аудит — целевой `usesLegacyPlanFields: false`, `removalReadinessPercent: 100`.

---

## Runtime Fallback Audit (Stage 5C.1)

**Дата:** 2026-06-08 · **Catalog:** v69 · **Read-only** — runtime не изменён.

### Реестр fallback-механизмов Plan

| ID | Fallback | Файл | Назначение | Категория |
|----|----------|------|------------|-----------|
| F1 | `FALLBACK_TITLE_KEYS` (`title`, `name`) | `resolvePlanRoleMapping.js` | Ключ поля nodeTitle при пустых roleMapping и legacy | **B** |
| F2 | `FALLBACK_STATUS_KEY` (`status`) | `resolvePlanRoleMapping.js` | Ключ поля nodeStatus | **B** |
| F3 | `FALLBACK_DESCRIPTION_KEY` (`description`) | `resolvePlanRoleMapping.js` | Ключ поля nodeDescription | **B** |
| F4 | `source: "fallback"` в `resolvePlanRoleField` | `resolvePlanRoleMapping.js` | Третий уровень dual-read | **B** |
| F5 | `title`/`name` chain в entity | `planEntityUtils.js` | Заголовок узла при `roleSource === "fallback"` | **B** |
| F6 | `getPlanEntityFieldValue(entity, "status")` | `buildPlanTree.js` | Статус при `statusRoleSource === "fallback"` | **B** |
| F7 | `resolvePlanEntityTitle` (всегда `roleSource: fallback`) | `planEntityUtils.js` | **Issues panel** — заголовок связанной записи | **D*** |
| F8 | `buildPlanTree` без `planRoleMapping` | `buildPlanTree.js` | Внутренний dual-read при отсутствии mapping | **B** |

\* F7 — не Plan Role Mapping; отдельный контур «Проблемы». Удаление в 5C.2 требует отдельного решения.

### Использование по контурам

| Fallback | Published Runtime (Архитектура v69) | Studio Preview | Draft (Office) | Unit Tests |
|----------|-------------------------------------|----------------|----------------|------------|
| F1–F6 Role Mapping chain | **Нет** (sources = roleMapping) | **Нет** (mock tree) | N/A (Office = published) | **Да** (scenario 3) |
| F7 Issues title | **Да** (если включены проблемы) | N/A | N/A | Нет |
| F8 buildPlanTree internal | **Нет** (planRoleMapping передаётся) | **Нет** | N/A | **Да** (legacy path, не fallback) |

### Ответы на ключевые вопросы

| Вопрос | Ответ |
|--------|-------|
| Может ли **Published Plan** попасть в fallback? | **Нет** для `arhitektura` v69 — roleMapping заполнен, legacy keys удалены из snapshot |
| Может ли **Studio Preview** попасть в fallback? | **Нет** — `buildPlanPreviewMock()`, не `buildPlanTree` |
| Может ли **новый Plan** попасть в fallback? | **Нет** при заполненном roleMapping + publish |
| Может ли **Draft без Role Mapping** попасть в fallback? | **Нет в Office** — runtime читает published catalog; fallback только при пустом contract |

### Role Mapping Coverage

Все пути Plan runtime Office используют `planRoleMapping` из `ObjectPlanView`:

```text
ObjectPlanView → resolvePlanRoleMappingDualRead → planRoleMapping
  ├ usePlanHierarchy → buildPlanTree(planRoleMapping)
  ├ PlanDetailPanel(descriptionFieldKey: nodeDescription)
  ├ useObjectEntityCard(titleFieldKey: nodeTitle)
  └ resolvePlanStatusField(nodeStatus)
```

**Обход roleMapping:** только F7 (`mapIssueRelation` → `resolvePlanEntityTitle`), не дерево плана.

### Dashboard summary

| Показатель | Значение |
|------------|----------|
| Всего fallback (role mapping chain) | **6** (F1–F6) |
| Используются в Published Plan tree | **0** |
| Используются в тестах | **1+** (scenario 3, buildPlanTree legacy) |
| Можно удалить в 5C.2 (после тестов) | **F1–F6** |
| Нельзя удалять без отдельного ADR | **F7** (issues) |

### Рекомендация по этапу 5C.2

**Да, используются только тесты** (для F1–F6 role mapping chain).

Published Runtime дерева Plan **не зависит** от fallback при catalog v69. Dual-read legacy path сохранить для гипотетических `usesLegacyPlanFields: true` вкладок.

---

## Fallback Removal (Stage 5C.2)

**Дата:** 2026-06-07 · **Catalog:** v69 · **Статус:** ✅ DONE

### Удалено (F1–F6)

| ID | Что удалено | Файл |
|----|-------------|------|
| F1 | `FALLBACK_TITLE_KEYS` | `resolvePlanRoleMapping.js` |
| F2 | `FALLBACK_STATUS_KEY` | `resolvePlanRoleMapping.js` |
| F3 | `FALLBACK_DESCRIPTION_KEY` | `resolvePlanRoleMapping.js` |
| F4 | `source: "fallback"` в `resolvePlanRoleField` | `resolvePlanRoleMapping.js` |
| F5 | `title`/`name` chain при `roleSource === "fallback"` в дереве | `planEntityUtils.js` (`resolvePlanEntityTitleFromRole`) |
| F6 | `getPlanEntityFieldValue(entity, "status")` при пустом statusFieldKey | `buildPlanTree.js` |

### Сохранено

| ID | Механизм | Причина |
|----|----------|---------|
| F7 | `resolvePlanEntityTitle` | Issues panel — отдельный контур |
| F8 | `buildPlanTree` internal dual-read | Safety path при отсутствии `planRoleMapping` |
| — | dual-read legacy tier | `roleMapping → legacy` для старых Plan |

### Runtime source после 5C.2

```text
resolvePlanRoleMappingDualRead: roleMapping → legacy (без fallback)
buildPlanTree / resolvePlanEntityTitleFromRole: roleMapping | legacy
Issues panel: resolvePlanEntityTitle (F7, title/name chain)
```

| Показатель | Значение |
|------------|----------|
| Plan Tree Fallback Count | **0** |
| Plan Tree Runtime Source | **roleMapping + legacy** |
| Оставшиеся fallback | **F7, F8** |

---

## Legacy Dual-Read Usage Audit (Stage 5D.1)

**Дата:** 2026-06-07 · **Catalog:** v69 · **Read-only** — runtime не изменён.

### Published Runtime

| Вопрос | Ответ |
|--------|-------|
| Plan с `usesLegacyPlanFields = true`? | **Нет** (0/1) |
| Legacy keys в published snapshot? | **Нет** (`legacyKeysInSnapshot = 0`) |
| Plan без roleMapping? | **Нет** |

Единственный Plan «Архитектура» (`arhitektura`): `roleMapping` заполнен, `sources = roleMapping` в Office runtime.

### Runtime code references (legacy tier)

| Файл | Назначение |
|------|------------|
| `resolvePlanRoleMapping.js` | Dual-read: `roleMapping → legacy` |
| `ObjectPlanView.jsx` | `resolvePlanRoleMappingDualRead(resolvedContract)` |
| `buildPlanTree.js` | F8: internal dual-read при отсутствии `planRoleMapping` |
| `planViewContract.js` | Schema/normalization legacy keys (Studio) |
| `resolvePlanUsesLegacyPlanFields.js` | Publish diagnostic |

### Studio Preview

`usePlanHierarchy` в `previewMode` → **`buildPlanPreviewMock()`** — mock-дерево, **не** `buildPlanTree`, **не** legacy tier для дерева.

### Draft

Draft `arhitektura` содержит `titleFieldKey: nazvanie`, `descriptionFieldKey: opisanie`, но **roleMapping заполнен**.

**Office runtime читает published catalog**, не draft → legacy tier **не активируется**.

### Tests

| Файл | Тип | Действие в 5D.2 |
|------|-----|-----------------|
| `resolvePlanRoleMapping.test.js` scenarios 2, 4, per-field | Legacy-tier regression | Обновить или удалить |
| `buildPlanTree.test.js` (без `planRoleMapping`) | F8 legacy path | Передать `planRoleMapping` |
| `resolvePlanUsesLegacyPlanFields.test.js` | Publish diagnostic | Сохранить |
| `generatePlanRoleMappingFromLegacy.test.js` | Studio migration | Сохранить |

### Таблица использования legacy tier

| Область | Использует legacy tier | Можно удалить | Комментарий |
|--------|-------------------------|---------------|-------------|
| Published Runtime | **Нет** | **Да** | roleMapping-only v69 |
| Studio Preview | **Нет** | **Да** | mock tree |
| Draft | **Да** (keys) | **Да** (из runtime) | Studio only; Office ≠ draft |
| Tests | **Да** | **Да** (после обновления) | 2 test files |
| Dev scripts | **Да** | **Да** (из runtime) | migration assistant |

### Категория и рекомендация

**Категория B** — legacy tier используется только тестами (+ F8 safety path в коде).

**Рекомендация 5D.2:** **Да, runtime не использует legacy tier**; можно запускать removal после обновления тестов.

Скрипт: `backend/scripts/audit_plan_legacy_dual_read_usage.py`

---

## Legacy Dual-Read Removal (Stage 5D.2)

**Дата:** 2026-06-07 · **Catalog:** v69 · **Статус:** ✅ DONE

### Удалено из Plan tree runtime

| Что | Было | Стало |
|-----|------|-------|
| Resolver | `roleMapping → legacy` | `roleMapping only` |
| Source values | `roleMapping`, `legacy` | `roleMapping`, `missing` |
| `buildPlanTree` F8 | internal dual-read с `planPresentation.*FieldKey` | `EMPTY_PLAN_ROLE_MAPPING` |

### Сохранено (вне tree runtime)

- Studio draft `*FieldKey`
- `PlanViewSettingsPanel` Legacy UI
- `generatePlanRoleMappingFromLegacy` (Migration Assistant)
- `audit_plan_legacy_usage.py`, `audit_plan_legacy_dual_read_usage.py`
- `usesLegacyPlanFields` publish diagnostic
- `resolvePlanEntityTitle` (F7, Issues Panel)

### Runtime source после 5D.2

```text
resolvePlanRoleMapping(contract) → roleMapping only
ObjectPlanView → planRoleMapping → buildPlanTree(planRoleMapping)
PLAN_ROLE_MAPPING_SOURCE: roleMapping | missing
```

| Показатель | Значение |
|------------|----------|
| Legacy Dual-Read Tier | **removed** |
| Plan Runtime Source | **roleMapping only** |
| Runtime Legacy References | **0** |

---

## Entity Title Resolution (Stage 5E)

**Дата:** 2026-06-07 · **Статус:** ✅ DONE

### Аудит title/name (object platform runtime)

| Область | Было | Стало |
|---------|------|-------|
| Plan Issues Panel (F7) | `resolvePlanEntityTitle` + `title\|\|name` | `resolveEntityDisplayTitle` |
| Related Entities | локальный `is_title` + id fallback | `resolveEntityDisplayTitle` |
| Lookup / Relation selectors | `resolveEntityTitle` + id | `resolvePeerEntityLabel` |
| Entity Card model | `resolveEntityTitle` + objectTypeKey | `resolveEntityDisplayTitle` |

### Resolver

| Функция | Назначение |
|---------|------------|
| `resolveEntityTitleFieldKey` | Projection.titleFieldKey → object type title field |
| `resolveEntityDisplayTitle` | Title field value → `[id]` |
| `resolvePeerEntityLabel` | Shortcut для catalog + entity |

### Удалено

- **F7** `resolvePlanEntityTitle()` — полностью удалён из `planEntityUtils.js`
- Hardcoded `"title"` fallback в Issues Panel (`fields.find(is_title)?.key \|\| "title"`)

### Показатели

| Показатель | Значение |
|------------|----------|
| Runtime Title Fallbacks (object platform) | **0** |
| Components Migrated | **9** |
| Resolution chain | Projection → Title Field → `[id]` |

### Вне scope 5E

- `modules/universalTable` — legacy table module
- `shared/shell/header` — portal navigation labels
- Backend platform search API — server-side titles

---

## UI Cleanup Plan Settings (Stage 5F)

**Дата:** 2026-06-07 · **Статус:** ✅ DONE

### Удалено из Studio UI

| Элемент | Файл |
|---------|------|
| Поле названия (`titleFieldKey`) | `PlanViewSettingsPanel.jsx` |
| Поле статуса (`statusFieldKey`) | `PlanViewSettingsPanel.jsx` |
| Поле описания (`descriptionFieldKey`) | `PlanViewSettingsPanel.jsx` |
| Следующие шаги (`nextStepsFieldKey`) | `PlanViewSettingsPanel.jsx` |
| Legacy-маркеры и подсказки dual-read | `ViewPropertiesPanel.jsx`, `ObjectRoleMappingPanel.jsx` |

### Сохранено (не в UI)

- Draft: `titleFieldKey`, `statusFieldKey`, `descriptionFieldKey`, `nextStepsFieldKey`
- `generatePlanRoleMappingFromLegacy` + кнопка «Заполнить Role Mapping из сохранённых настроек» (только при пустом `roleMapping` и наличии legacy draft keys)
- Publish diagnostic `usesLegacyPlanFields`

### Настройки Плана (осталось)

- `hierarchyRelationKey` — иерархия
- `issuesRelationKey` — связь с проблемами

### Projection Title Field — рекомендация

**Оставить.** `Projection.titleFieldKey` — слой отображения сущности объекта (таблица, lookup, Issues, карточка через `resolveEntityDisplayTitle`). `roleMapping.nodeTitle` — роль Plan-представления для дерева узлов. Могут указывать на одно поле, но отвечают на разные вопросы.

### Показатели

| Показатель | Значение |
|------------|----------|
| Legacy Controls Visible | **0** |
| Migration Controls Visible | **0** (при заполненном roleMapping) |
| Plan Settings Simplified | **true** |

---

## 10. Рекомендации перед началом реализации

1. **Не начинать этап 4 (runtime)** до завершения этапов 1–3 (контракт + Studio projection + role mapping UI).
2. **Этап 1 первым PR:** `roleMapping` в `planViewContract.js` + `sanitize_presentation_plan` + publish validation без удаления legacy keys.
3. **Закрыть Studio gate:** скрыть или пометить `form`, `list`, `card`, `board`, `calendar`, `tree` до появления runtime adapter.
4. **Зафиксировать ADR** на отказ от field fallbacks с датой cutoff для каталогов.
5. **Тесты контракта:** матрица view type × обязательные ключи projection/query/presentation.
6. **Не трогать** `settings_json.projection` snake_case mirror до отдельного решения.
7. **Plan «Шаги»:** явно разделить `blocks.checklist` (platform) и опциональное текстовое поле через role mapping — не смешивать с `nextStepsFieldKey`.

---

## 11. Ссылки на код

| Concern | Path |
|---------|------|
| ObjectViewContract | `frontend/src/modules/objectViews/services/objectViewContract.js` |
| Plan contract | `frontend/src/modules/objectViews/plan/planViewContract.js` |
| Publish | `backend/app/modules/platform/designer/publish/object_view_contract.py` |
| Table Studio | `frontend/src/modules/designer/components/views/ViewPropertiesPanel.jsx` |
| Plan Studio | `frontend/src/modules/designer/components/views/PlanViewSettingsPanel.jsx` |
| Runtime host | `frontend/src/modules/objectViews/ObjectViewHost.jsx` |
| Card layout | `frontend/src/modules/objectEntities/services/objectEntityCardSectionsLayout.js` |
| View types | `backend/app/modules/platform/shared/enums.py` |

---

*Версия 1.1 — утверждённая целевая архитектура. Изменения runtime, Studio и publish — только по этапам 1–6 roadmap.*
