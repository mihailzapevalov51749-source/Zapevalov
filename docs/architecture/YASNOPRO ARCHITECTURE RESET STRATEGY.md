# YASNOPRO ARCHITECTURE RESET STRATEGY

## 1. Назначение документа

Документ фиксирует стратегическое решение по переходу ЯсноПро от legacy table-centric архитектуры к целевой AOBP-архитектуре через controlled architecture reset.

AOBP = AI-native Object-centric Business Platform.

## 2. Главное решение

Текущая legacy-структура не стабилизируется как целевое состояние.

Если существующий слой построен неправильно, он не чинится бесконечно, а заменяется целевым архитектурным слоем.

## 3. Причина решения

Попытки стабилизировать текущую структуру приводят к:

- росту complexity;
- новым regressions;
- закреплению неправильного source of truth;
- усилению table-centric architecture;
- сохранению hidden synchronization;
- увеличению giant controllers.

Если стабилизация усиливает хаос, она прекращается.

## 4. Принцип Target Architecture First

Платформа развивается от целевой архитектуры, а не от legacy-кода.

Приоритет:

1. Target Architecture
2. Clean Source of Truth
3. Layer Separation
4. Deterministic State
5. Runtime Stability
6. Legacy Data Preservation

## 5. Data Reset Principle

Существующие пользовательские данные важны, но не критичны.

Если сохранение старых данных:

- усложняет миграцию;
- требует legacy-совместимости;
- сохраняет неправильный source of truth;
- мешает Entity Layer;
- создаёт высокий regression risk;

то данные могут быть:

- удалены;
- сброшены;
- пересозданы;
- не перенесены в новую архитектуру.

## 6. Что больше не делаем

Запрещено:

- бесконечно стабилизировать legacy table-centric слой;
- чинить split-brain state вокруг неправильного source of truth;
- расширять Universal Table как ядро платформы;
- добавлять новые window.__ globals;
- добавлять новые хаотичные CustomEvent chains;
- сохранять несколько competing Representation mechanisms;
- усиливать giant controllers;
- строить новые features поверх неправильного core.

## 7. Новый порядок перехода

Переход выполняется не от UI к данным, а от platform core к UI.

Новый порядок:

1. Designer / Entity Core Foundation
2. Table View Engine
3. Representation / View Session
4. Relation Engine
5. Event Engine
6. Runtime / Designer Split
7. Layout Engine
8. AI Context Engine
9. AI Agents

## 7.1. Legacy Runtime Freeze Strategy

Текущий runtime временно сохраняется как legacy runtime layer.

Legacy runtime НЕ является целевой архитектурой платформы.

Главная задача legacy runtime:

- поддерживать текущую работоспособность;
- обеспечивать минимальный runtime continuity;
- служить временным bridge до нового platform core.

### Что запрещено

Запрещено:

- расширять legacy runtime как platform core;
- строить новые фундаментальные features поверх legacy runtime;
- усиливать table-centric architecture;
- добавлять новые architecture dependencies на legacy state.

### Что разрешено

Разрешено:

- локальные fixes;
- минимальные runtime patches;
- regression fixes;
- temporary compatibility fixes.

### Главная стратегия

Новая архитектура строится НЕ через переписывание legacy runtime.

Новая архитектура строится рядом через новый Designer/Core Layer.

После готовности нового core legacy runtime постепенно заменяется.

## 8. PHASE 1 — DESIGNER / ENTITY CORE FOUNDATION

## Цель

Создать новый platform core через отдельный Designer Layer без переписывания legacy runtime.

## Первый новый контур платформы

Первым создаётся новый Designer Layer.

Designer Layer становится местом создания:

- ObjectType;
- FieldDefinition;
- Relations;
- Views;
- Layout;
- AI configuration.

## Важно

Designer Layer создаётся независимо от legacy Universal Table runtime.

Новый core не должен зависеть от старой table-centric архитектуры.

## Что создаём

- ObjectType
- FieldDefinition
- Entity
- EntityValue
- Entity Service
- Entity API
- Designer Shell

## Что должно измениться

Universal Table больше не должна быть источником истины.

Table rows не должны быть platform entities.

Table schema не должна быть object schema.

## Definition of Done

- ObjectType существует независимо от таблицы;
- Entity существует независимо от View;
- FieldDefinition существует независимо от UI;
- Designer Layer работает независимо от legacy runtime;
- Entity API может использоваться разными View;
- Table может отображать Entity, но не владеть ими.

## 9. PHASE 2 — TABLE VIEW ENGINE

## Цель

Превратить Universal Table в Table View Engine.

## Table View Engine отвечает за

- отображение Entity в табличном виде;
- колонки;
- сортировку;
- фильтры;
- inline editing;
- selection;
- scroll;
- virtualization.

## Table View Engine НЕ отвечает за

- хранение Entity;
- определение ObjectType;
- relation storage;
- workflow logic;
- AI logic;
- platform state.

## Definition of Done

- таблица получает данные из Entity API;
- таблица не создаёт business objects напрямую;
- table row является только UI-проекцией Entity;
- таблица может быть заменена другим View без потери данных.

## 10. PHASE 3 — REPRESENTATION / VIEW SESSION

## Цель

Разделить saved configuration и temporary runtime state.

## Representation отвечает за

- saved filters;
- saved sorting;
- saved hidden columns;
- saved column order;
- saved column widths;
- saved grouping.

## View Session отвечает за

- temporary filters;
- temporary sorting;
- temporary column changes;
- dirty state;
- unsaved changes.

## Definition of Done

- Representation и View Session не смешаны;
- save/discard deterministic;
- dirty state имеет одного owner;
- нет hidden synchronization;
- нет competing representation stores.

## 11. PHASE 4 — RELATION ENGINE

## Цель

Создать semantic graph платформы.

## Что создаём

- Relation Definition
- Relation Instance
- Relation Service
- Relation API
- Graph Traversal
- Dependency Analysis
- Impact Analysis

## Definition of Done

- Entity связаны через semantic relations;
- lookup не заменяет relation;
- AI может использовать relation graph;
- зависимости становятся частью platform core.

## 12. PHASE 5 — EVENT ENGINE

## Цель

Создать timeline architecture платформы.

## Что создаём

- Event Store
- Event Bus
- Timeline Engine
- Audit Trail
- Event Subscribers

## Definition of Done

- изменения Entity фиксируются как Events;
- изменения Relation фиксируются как Events;
- notifications строятся на Events;
- AI получает Event Timeline;
- Event не хранит State.

## 13. PHASE 6 — RUNTIME / DESIGNER SPLIT

## Цель

Полностью разделить рабочую среду сотрудников и среду моделирования платформы.

## Runtime отвечает за

- работу с Entity;
- выполнение задач;
- документы;
- комментарии;
- dashboards;
- AI assistance.

## Designer отвечает за

- ObjectType;
- Fields;
- Relations;
- Views;
- Layout;
- Permissions;
- AI behavior.

## Definition of Done

- Runtime users не видят schema tools;
- Designer имеет отдельный контур;
- permissions разделены;
- Runtime state и Designer state не смешиваются.

## 14. PHASE 7 — LAYOUT ENGINE

## Цель

Сделать Canvas полноценным Layout Engine.

## Layout Engine отвечает за

- blocks;
- positioning;
- resize;
- drag/drop;
- composition.

## Layout Engine НЕ отвечает за

- Entity data;
- business logic;
- workflow state;
- View Session.

## Definition of Done

- Layout не владеет бизнес-данными;
- Block является контейнером;
- resize и composition deterministic.

## 15. PHASE 8 — AI CONTEXT ENGINE

## Цель

Сделать платформу AI-native.

## AI Context Engine использует

- Entity Graph;
- Relation Graph;
- Event Timeline;
- Documents;
- Comments;
- Permissions;
- Runtime Context;
- Business Structure.

## Definition of Done

- AI понимает объекты;
- AI понимает связи;
- AI понимает историю;
- AI понимает контекст пользователя;
- AI reasoning объясним.

## 16. PHASE 9 — AI AGENTS

## Цель

Создать специализированных AI-агентов.

## Примеры

- Project AI
- Risk AI
- Workflow AI
- Analyst AI
- Executive AI
- Document AI

## Definition of Done

- AI Agents используют AI Context Engine;
- AI Agents не работают как отдельные чаты без platform context;
- AI Agents действуют через permissions и platform events.

## 17. Legacy Runtime Principle

Legacy runtime может временно существовать только как переходный слой.

Legacy runtime нельзя расширять как целевую архитектуру.

Если legacy runtime мешает переходу, он должен быть:

- изолирован;
- заменён;
- удалён;
- сброшен.

## 18. Architecture Reset Rule

Если слой:

- построен вокруг неправильного source of truth;
- создаёт hidden synchronization;
- требует постоянных patches;
- ломается при каждом изменении;
- мешает целевой архитектуре;

то он не стабилизируется бесконечно.

Он подлежит controlled reset.

## 19. Controlled Reset не означает хаос

Controlled Reset НЕ означает:

- переписать всё сразу;
- удалить всё без плана;
- ломать runtime без проверки;
- делать massive AI-refactor.

Controlled Reset означает:

- заменить неправильный слой правильным минимальным слоем;
- сохранить только то, что не мешает target architecture;
- двигаться по одному слою за раз;
- проверять regression после каждого шага.

## 20. Первый reset layer

Первый слой reset:

Designer / Entity Core Foundation.

## Почему именно Designer / Entity Core

Потому что без правильного source of truth:

- View Session стабилизируется вокруг неправильной модели;
- Representation продолжит зависеть от table rows;
- Relation Engine некуда подключать;
- Event Engine не будет знать, что является объектом;
- AI Context не сможет построить graph.

Кроме этого:

- Runtime уже существует;
- legacy runtime можно временно сохранить;
- новый core можно строить независимо;
- Designer Layer позволяет внедрять правильную архитектуру без разрушения текущего runtime.

## 21. Что делать с Universal Table

Universal Table временно остаётся как legacy Table View.

Legacy Universal Table рассматривается как runtime compatibility layer.

Новая platform architecture не строится вокруг Universal Table.

Дальше Universal Table должна быть переведена в режим:

Table View Engine over Entity Layer.

## 22. Что делать с текущими данными

Текущие данные можно сохранить только если это не усложняет переход.

Если миграция данных требует большого количества compatibility logic, данные сбрасываются.

## 23. Что делать с текущими представлениями

Текущие representations можно сохранить только если они совместимы с новой View Engine architecture.

Если они создают split-brain state, их можно удалить.

## 24. Что делать с текущим state

Текущий state считается legacy.

Новый state должен строиться по правилу:

One scope = one owner.

## 25. Что делать с текущими CustomEvent

CustomEvent могут временно использоваться только как legacy bridge.

Они не должны считаться целевой platform event architecture.

## 26. Что делать с window.__ globals

window.__ globals считаются legacy anti-pattern.

Новые механизмы не должны зависеть от window.__ globals.

## 27. Что делать с giant controllers

Giant controllers не переписываются хаотично.

Они постепенно теряют ответственность, когда новые целевые слои забирают ownership.

## 28. Migration Success Criteria

Переход считается успешным, если:

- Entity Layer стал source of truth;
- Table стал View Engine;
- Representation отделена от View Session;
- Relation Engine подключён к Entity;
- Event Engine фиксирует изменения;
- Runtime и Designer разделены;
- AI Context строится на Entity Graph, Relation Graph и Event Timeline;
- legacy state удалён или изолирован.

## 29. Stop Criteria

Работа должна останавливаться и пересматриваться, если:

- новый слой повторяет legacy ошибки;
- появляется новый duplicated state;
- новый View становится source of truth;
- новый controller начинает управлять несколькими слоями;
- появляются новые hidden synchronization;
- появляется новый uncontrolled global state.

## 30. Strategic Transition Principle

ЯсноПро переходит к новой архитектуре не через полное переписывание текущего runtime, а через постепенное построение нового platform core рядом с legacy runtime.

Legacy runtime постепенно теряет ownership по мере готовности новых platform layers.

Главный путь перехода:

Legacy Runtime
→ Designer Core
→ Entity Layer
→ New View Engine
→ Relation Engine
→ Event Engine
→ AI Context Platform

## 31. Финальная формула

ЯсноПро больше не развивается через стабилизацию неправильной table-centric архитектуры.

ЯсноПро развивается через controlled architecture reset:

Legacy Runtime
→ Designer Core
→ Entity Layer
→ Table View Engine
→ Representation / View Session
→ Relation Engine
→ Event Engine
→ Runtime / Designer Split
→ Layout Engine
→ AI Context Engine
→ AI Agents

Цель:

AI-native Object-centric Business Platform.