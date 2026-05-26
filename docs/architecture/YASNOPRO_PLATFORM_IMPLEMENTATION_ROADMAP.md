# YASNOPRO PLATFORM IMPLEMENTATION ROADMAP

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

## Migration Data Strategy

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