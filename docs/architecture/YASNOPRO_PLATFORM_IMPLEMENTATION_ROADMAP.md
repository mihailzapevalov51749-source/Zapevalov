# YASNOPRO PLATFORM IMPLEMENTATION ROADMAP

> **Снимок Dual-SoT (2026-05-29):** Layers 1–6 **DONE**. **ADR-001 (2026-05-30):** UT migration **cancelled**; Legacy Removal **active**. Статус: [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md), [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md).  
> Формулировка: *Table is UI · `universal_table_rows` is legacy storage · Runtime Entity is SoT.*

## 1. Назначение документа

Документ описывает стратегию трансформации текущего ЯсноПро в полноценную AOBP-платформу.

AOBP = AI-native Object-centric Business Platform.

### Цель документа

- определить этапы развития платформы;
- зафиксировать текущие проблемы;
- определить путь перехода к целевой архитектуре;
- минимизировать хаос и regressions;
- обеспечить контролируемое развитие платформы.

### Простыми словами

Документ отвечает на вопрос:

«Как превратить текущий ЯсноПро в полноценную AI-native платформу без разрушения уже работающей системы?»

## 2. Текущее состояние платформы

Сейчас ЯсноПро находится в переходной стадии.

Платформа уже содержит:

- runtime систему;
- canvas;
- universal table;
- comments;
- notifications;
- entity card;
- file viewer;
- embedded blocks;
- representations;
- layout engine элементы.

Но архитектура ещё не разделена полностью.

## 3. Главные проблемы текущего состояния

### 3.1. Смешение слоёв

Сейчас смешаны:

- View и Data;
- Runtime и Designer;
- Block и Entity;
- State и Representation;
- UI и business logic.

### 3.2. Hidden dependencies

Есть:

- implicit behavior;
- hidden synchronization;
- duplicated state;
- global runtime flags;
- giant controllers.

### 3.3. Feature-first development

Долгое время разработка шла через добавление feature:

- без platform core;
- без formal architecture;
- без разделения ownership.

### 3.4. Массовые AI refactor

Слишком широкие refactor через AI привели к:

- regressions;
- потере контроля complexity;
- поломке implicit UX behavior.

## 4. Главное архитектурное осознание

Universal Table НЕ должна быть ядром платформы.

Она должна стать:

Table View Engine.

Источник истины платформы:

- Entity Layer;
- Relation Layer;
- Event Layer.

## 5. Целевое состояние платформы

ЯсноПро должно стать:

AI-native Object-centric Business Platform.

Платформой, в которой:

- компания моделируется через объекты;
- данные связаны relation graph;
- AI понимает контекст;
- Runtime и Designer разделены;
- View Engine отделён от Entity Layer;
- платформа масштабируется без hardcoded architecture.

## 6. Главная стратегия перехода

Главный принцип:

Не переписывать всё сразу.

Трансформация должна быть:

- поэтапной;
- обратимо безопасной;
- контролируемой;
- совместимой с текущим runtime.

## 7. Главный принцип разработки

1 bug  
1 patch  
1 commit

### Запрещено

- массовые refactor;
- переписывание больших слоёв;
- неконтролируемые AI changes;
- смешение platform/core и feature logic.

## 8. Новая роль AI в разработке

Cursor используется только для:

- аудита;
- поиска файлов;
- анализа зависимостей;
- build/lint;
- локальных patch.

### Cursor НЕ должен

- переписывать архитектуру целиком;
- самостоятельно менять platform semantics;
- менять implicit UX behavior.

## 9. ЭТАП 1 — STABILIZATION

### Цель

Остановить рост хаоса.

### Что делаем

- прекращаем массовые refactor;
- фиксируем platform rules;
- создаём regression discipline;
- стабилизируем working runtime.

### Что НЕ делаем

- новые сложные features;
- новые AI agents;
- глубокие переписывания.

### Результат

Платформа перестаёт ломаться при каждой правке.

## 10. ЭТАП 2 — VIEW ENGINE EXTRACTION

### Цель

Превратить Universal Table в Table View Engine.

### Что делаем

Разделяем:

- View;
- Representation;
- Session State;
- Entity Data.

### Что должно появиться

- Table View Engine;
- Representation Engine;
- View Session Layer.

### Что должно исчезнуть

- table как source of truth;
- hidden synchronization;
- global dirty state.

### Результат

Universal Table становится полноценным View Layer.

## 11. ЭТАП 3 — ENTITY LAYER

### Цель

Создать настоящий Object-centric foundation.

### Что делаем

Вводим:

- ObjectType;
- Entity;
- Field;
- Entity Service.

### Что должно появиться

- universal entity model;
- reusable fields;
- entity storage;
- entity API.

### Результат

Платформа начинает работать с объектами, а не с таблицами.

## 12. ЭТАП 4 — RELATION ENGINE

### Цель

Создать relation graph платформы.

### Что делаем

Вводим:

- Relation Definition;
- Relation Instance;
- Graph traversal;
- Dependency Engine.

### Что появляется

- связи между объектами;
- impact analysis;
- semantic graph.

### Результат

Платформа начинает понимать структуру компании.

## 13. ЭТАП 5 — EVENT ENGINE

### Цель

Создать timeline и историю платформы.

### Что делаем

Вводим:

- Event Store;
- Event Bus;
- Timeline Engine;
- Audit Trail.

### Что появляется

- история изменений;
- automation foundation;
- notifications foundation;
- AI reasoning foundation.

### Результат

Платформа начинает понимать динамику компании.

## 14. ЭТАП 6 — RUNTIME / DESIGNER SPLIT

### Цель

Разделить:

- работу сотрудников;
- моделирование платформы.

### Что делаем

Создаём:

- Runtime Shell;
- Designer Shell;
- Designer Permissions;
- Runtime Permissions.

### Что появляется

#### Runtime

- простой рабочий интерфейс.

#### Designer

- среда цифрового моделирования компании.

### Результат

Платформа становится масштабируемой и управляемой.

## 15. ЭТАП 7 — AI CONTEXT ENGINE

### Цель

Сделать платформу AI-native.

### Что делаем

Объединяем:

- Entity Graph;
- Relation Graph;
- Event Timeline;
- Semantic Layer;
- Organizational Memory.

### Что появляется

AI начинает понимать:

- процессы;
- зависимости;
- риски;
- причины;
- контекст.

### Результат

AI становится частью платформы, а не отдельным чатом.

## 16. ЭТАП 8 — AI AGENTS

### Цель

Создать специализированных AI-агентов.

### Примеры

- Project AI;
- Risk AI;
- Workflow AI;
- Analyst AI;
- Executive AI;
- Document AI.

### Результат

Появляется интеллектуальная цифровая среда компании.

## 17. Что делать с Universal Table

Universal Table должна стать:

Table View Engine.

### Universal Table должна отвечать только за

- отображение данных;
- колонки;
- filters;
- sorting;
- virtualization;
- inline editing;
- scroll;
- selection.

### Universal Table НЕ должна отвечать за

- business entities;
- relation storage;
- workflow logic;
- platform state;
- AI logic.

## 18. Что делать с Canvas

Canvas должен стать:

Layout Engine.

### Canvas отвечает за

- positioning;
- resize;
- composition;
- layout structure.

Canvas НЕ должен владеть business data.

## 19. Что делать с Entity Card

Entity Card должна стать:

Entity Runtime View.

### Entity Card отвечает за

- отображение объекта;
- comments;
- attachments;
- tabs;
- entity interactions.

Entity Card НЕ является storage.

## 20. Что делать с Comments

Comments должны стать:

Communication Module.

Comments должны работать как platform module.

Comments могут быть связаны:

- с Entity;
- с Document;
- с Workflow;
- с Task;
- с AI discussion.

## 21. Что делать с Notifications

Notifications должны стать:

Event Subscribers.

Notifications должны строиться на Event Engine.

НЕ напрямую через UI state.

## 22. Что делать с OnlyOffice

OnlyOffice должен стать:

Document Runtime Layer.

### Document Runtime должен понимать

- Entity relations;
- approvals;
- comments;
- versions;
- workflow state.

## 23. Что делать с backend

Backend должен разделиться на:

- ObjectType Service;
- Entity Service;
- Relation Service;
- Event Service;
- View Service;
- Permission Service;
- AI Context Service.

## 24. Что делать с frontend

Frontend должен разделиться на:

- Runtime Shell;
- Designer Shell;
- View Engine;
- Session Engine;
- Layout Engine;
- Entity Runtime;
- Communication Runtime.

## 25. Migration Strategy

### Главный принцип

Не ломать working runtime.

### Migration должна быть

- incremental;
- reversible;
- compatible;
- testable.

### Запрещено

- переписывать платформу за один этап;
- ломать runtime ради архитектуры;
- внедрять новый слой без regression testing.

## 26. Regression Discipline

После каждого patch проверяется regression checklist.

### TABLE

- hide/show columns;
- reorder columns;
- sorting;
- filters;
- representation save;
- F5;
- embedded table.

### CANVAS

- resize;
- drag/drop;
- layout restore.

### ENTITY

- entity card;
- comments;
- attachments;
- tabs.

## 27. Definition of Done

Слой считается завершённым, если:

- ownership определён;
- source of truth определён;
- state flow понятен;
- regressions контролируются;
- runtime стабилен;
- layer не смешивает ответственность.

## 28. Главный архитектурный принцип платформы

ЯсноПро должно развиваться:

не как набор feature,

а как:

AI-native Object-centric Business Platform.

## 29. Главный переход проекта

Раньше:

«умная таблица».

Теперь:

цифровая модель компании, понятная:

- людям;
- процессам;
- AI.

## 30. Финальная формула

Стабилизация → Platform Core → Entity Layer → Relation Graph → Event Timeline → Runtime/Designer → AI Context → AI Agents

Это путь трансформации ЯсноПро в полноценную AOBP-платформу.

## Legacy Removal Program

> **Supersedes «Migration Data Strategy» как операционный план.** См. [ADR-001](./adr/ADR-001-universal-table-retirement.md).

**Цель:** полностью отвязать Object Platform от Universal Table **без миграции данных**.

Данные Universal Table считаются **неценными** и **disposable**.

**Приоритеты:**

1. Object Platform Independence
2. Legacy Isolation
3. Legacy Removal
4. Runtime Entity as single SoT

---

## Milestone: Object Platform Independence

### Цель

Object Platform не импортирует и не использует Universal Table.

### Проверки

```bash
rg "universalTable" frontend/src/modules/objectEntities
rg "UniversalTableView" frontend/src
rg "universal_table" frontend/src
```

### Acceptance Criteria

- Object Type → Publish → Office → Object Card работает без UT imports
- Runtime Entity read/write не имеет fallback в UT
- Runtime Read Gateway — **query only** (**DONE** 2026-05-30, см. [RUNTIME_READ_GATEWAY_CLEANUP.md](./YASNOPRO_RUNTIME_READ_GATEWAY_CLEANUP.md))
- Notifications ведут только на runtime_entity/files (legacy UT path removed)
- Новые страницы не создают UT blocks

---

## Milestone: Legacy Isolation

### Цель

Universal Table остаётся только как изолированный legacy island; новые portal-сценарии не создают legacy storage blocks.

### Work items

| Work item | Статус |
|-----------|--------|
| Запретить создание новых UT blocks | **COMPLETED** (Layer 2 / 2b) |
| Убрать `table` / `universal_table` из новых сценариев | **COMPLETED** (2026-05-30, [LEGACY_BLOCK_TYPES_ISOLATION.md](./YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md)) |
| Заменить старые table blocks на placeholder | **COMPLETED** (2026-05-30, [LEGACY_TABLE_PLACEHOLDER_ISOLATION.md](./YASNOPRO_LEGACY_TABLE_PLACEHOLDER_ISOLATION.md)) |
| Убрать UT bridges из navigation/sidebar | **PENDING** |
| Отделить `PortalPageView` от `UniversalTableView` | **PENDING** |

### Проверки (block types isolation — COMPLETED)

- Widget Library — нет legacy block types в drag list
- Canvas context menu — только creatable non-legacy types
- `POST /blocks` с `type=universal_table` / `table` → 422 `legacy_storage_creation_forbidden`
- Existing UT blocks рендерятся через placeholder boundary → lazy `UniversalTableView` ([LEGACY_TABLE_PLACEHOLDER_ISOLATION.md](./YASNOPRO_LEGACY_TABLE_PLACEHOLDER_ISOLATION.md))

---

## Migration Data Strategy (historical)

> Superseded by ADR-001. Universal Table data is **not migrated**.

Существующие пользовательские данные важны, но не критичны.

Если сохранение старых данных:
- усложняет архитектуру;
- создаёт высокий migration complexity;
- требует временных костылей;
- мешает переходу к целевой AOBP-архитектуре;
- создаёт риск regressions;

то допускается:
- удаление данных;
- reset runtime data;
- пересоздание storage;
- отказ от legacy compatibility.

Приоритеты платформы:

1. правильная архитектура;
2. стабильный runtime;
3. чистый source of truth;
4. platform consistency;
5. данные — только если их сохранение не ломает архитектуру.

ЯсноПро развивается как platform-first system, а не legacy-first system.