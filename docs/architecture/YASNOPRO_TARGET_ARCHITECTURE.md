# YASNOPRO TARGET ARCHITECTURE

## 1. Назначение документа

Документ описывает целевую архитектуру платформы ЯсноПро.

## Цель документа

- зафиксировать конечную архитектурную модель платформы;
- определить platform boundaries;
- определить ownership слоёв;
- определить platform engines;
- создать единый architectural blueprint.

## Простыми словами

Документ отвечает на вопрос:

«Как должна быть устроена финальная версия ЯсноПро?»

---

# 2. Главная идея платформы

ЯсноПро — это:

AI-native Object-centric Business Platform.

## Платформа должна:

- моделировать компанию через объекты;
- хранить semantic relations;
- понимать события;
- поддерживать AI-context;
- разделять Runtime и Designer;
- работать как graph-driven platform.

---

# 3. Главный архитектурный принцип

Платформа развивается:

НЕ как:
- набор feature;
- набор таблиц;
- набор страниц.

А как:
- platform core;
- набор engines;
- набор platform modules;
- цифровая модель компании.

---

# 4. Главные platform layers

Целевая архитектура состоит из:

1. Runtime Shell
2. Designer Shell
3. Entity Layer
4. Relation Engine
5. Event Engine
6. View Engine
7. Representation Engine
8. Session Engine
9. Layout Engine
10. Permission Engine
11. Communication Engine
12. AI Context Engine
13. AI Agent Layer

---

# 5. Runtime Shell

## Назначение

Рабочая среда сотрудников.

## Runtime отвечает за

- выполнение работы;
- работу с Entity;
- workflow usage;
- navigation;
- dashboards;
- comments;
- documents;
- AI assistance.

## Runtime НЕ отвечает за

- schema;
- object modeling;
- relation configuration;
- platform configuration.

---

# 6. Designer Shell

## Назначение

Среда цифрового моделирования компании.

## Designer отвечает за

- ObjectType;
- Fields;
- Relations;
- Views;
- Layout;
- Permissions;
- AI behavior;
- workflow design.

## Designer НЕ отвечает за

- ежедневную работу сотрудников;
- runtime execution.

---

# 7. Entity Layer

## Назначение

Главный source of truth платформы.

## Entity Layer отвечает за

- ObjectType;
- Entity;
- Field values;
- metadata;
- entity lifecycle.

## Entity Layer НЕ зависит от

- Table;
- View;
- Block;
- Layout;
- UI.

---

# 8. ObjectType

## ObjectType отвечает за

- структуру объекта;
- field definitions;
- relation definitions;
- behavior metadata.

## Примеры

- Project
- Contract
- Risk
- Employee
- Document

---

# 9. Entity

## Entity отвечает за

- конкретный экземпляр объекта;
- значения полей;
- relations;
- history;
- events;
- attachments.

## Пример

ObjectType:
Project

Entity:
Project #145

---

# 10. Field System

## Field System отвечает за

- reusable field definitions;
- field metadata;
- field validation;
- field behavior.

## Field Type Examples

- text
- number
- date
- choice
- relation
- lookup
- file
- user

---

# 11. Relation Engine

## Назначение

Создание semantic graph платформы.

## Relation Engine отвечает за

- Relation Definitions;
- Relation Instances;
- dependency graph;
- impact analysis;
- graph traversal.

## Relation Engine создаёт

- Entity Graph;
- Organizational Graph;
- Dependency Graph.

---

# 12. Event Engine

## Назначение

Создание timeline architecture платформы.

## Event Engine отвечает за

- Event Store;
- Event Bus;
- Audit Trail;
- Timeline;
- Event Subscribers.

## Event Engine фиксирует

- изменения;
- действия пользователей;
- lifecycle events;
- workflow events;
- relation changes.

---

# 13. View Engine

## Назначение

Отображение Entity пользователям.

## View Engine отвечает за

- Table View;
- Tree View;
- Kanban View;
- Calendar View;
- Gantt View;
- Dashboard View;
- Composite View.

## View Engine НЕ хранит business data.

---

# 14. ## Representation Engine

### Назначение

Representation Engine отвечает за сохранённые настройки отображения данных внутри ViewTemplate.

---

### Representation Engine управляет

- RuntimeRepresentation;
- saved filters;
- saved sorting;
- saved grouping;
- hidden fields;
- column order;
- pinned fields;
- field visibility preferences;
- user/team view preferences.

---

### Representation Engine НЕ управляет

- LayoutTemplate;
- RuntimeLayoutDelta;
- Workspace;
- Dashboard composition;
- block positions;
- block resize;
- page layout;
- canvas composition.

---

### Главный принцип

```text
Representation Engine != Layout Engine
```

---

### RuntimeRepresentation

RuntimeRepresentation — это сохранённая пользовательская или командная настройка ViewTemplate.

Она отвечает за:

- какие данные показать;
- в каком порядке;
- с какими фильтрами;
- с какой сортировкой;
- какие поля скрыть или показать.

---

### RuntimeRepresentation НЕ отвечает за

- где находится блок на странице;
- какого размера блок;
- какие widgets размещены рядом;
- как собран workspace;
- как устроен dashboard.

---

### Layout ownership

Все spatial / composition настройки принадлежат:

- Layout Engine;
- RuntimeWorkspace;
- RuntimeLayoutDelta;
- DashboardInstance.

---

### Запрещено

Запрещено хранить в RuntimeRepresentation:

- block x/y position;
- width/height блока;
- dashboard widget layout;
- canvas layout;
- page composition;
- workspace structure.

---

### Правильная граница

```text
RuntimeRepresentation = как отфильтровать и показать данные внутри ViewTemplate.

RuntimeLayoutDelta = где и как визуально разместить блоки в рабочем пространстве.
```

# 15. Session Engine

## Назначение

Управление runtime state.

## Session Engine отвечает за

- View Session;
- dirty state;
- temporary changes;
- runtime interaction state.

## Session Engine НЕ хранит permanent data.

---

# 16. Layout Engine

## Назначение

Управление пространством интерфейса.

## Layout Engine отвечает за

- blocks;
- positioning;
- resize;
- drag/drop;
- compositions;
- adaptive layouts.

## Layout Engine НЕ владеет business data.

---

# 17. Permission Engine

## Назначение

Управление доступом.

## Permission levels

- tenant;
- object type;
- entity;
- field;
- relation;
- action;
- view.

---

# 18. Communication Engine

## Назначение

Коммуникации внутри платформы.

## Communication Engine отвечает за

- comments;
- mentions;
- reactions;
- discussions;
- notifications;
- collaboration.

---

# 19. AI Context Engine

## Назначение

Создание semantic context для AI.

## AI Context Engine использует

- Entity Graph;
- Relation Graph;
- Event Timeline;
- Documents;
- Comments;
- Permissions;
- Runtime Context.

## AI должен понимать

- структуру компании;
- зависимости;
- процессы;
- риски;
- историю изменений;
- контекст пользователя.

---

# 20. AI Agent Layer

## Назначение

Специализированные AI-агенты.

## Примеры

- Project AI;
- Risk AI;
- Executive AI;
- Analyst AI;
- Workflow AI;
- Document AI.

## AI Agents используют

- AI Context Engine;
- Event Engine;
- Relation Graph;
- Entity Layer.

---

# 21. View Architecture

## Главный принцип

View != Entity

## View показывает данные.

## Entity хранит данные.

## Representation хранит настройки отображения.

## Session хранит временное состояние.

---

# 22. Runtime State Architecture

## Главный принцип

One scope = one owner.

## Запрещено

- duplicated state;
- hidden synchronization;
- window.__ globals;
- uncontrolled CustomEvent chains;
- hidden dirty state.

---

# 23. Event Architecture

## Главный принцип

Event сообщает:
«Что произошло.»

Event НЕ хранит state.

## Event Flow

User Action
→ Explicit Event
→ State Owner
→ State Update
→ Render

---

# 24. Layout Architecture

## Главный принцип

Layout отвечает только за пространство.

Layout НЕ должен:

- хранить Entity;
- управлять business logic;
- владеть workflow state.

---

# 25. Backend Architecture

Backend состоит из:

- ObjectType Service;
- Entity Service;
- Relation Service;
- Event Service;
- View Service;
- Permission Service;
- AI Context Service;
- Communication Service.

---

# 26. Frontend Architecture

Frontend состоит из:

- Runtime Shell;
- Designer Shell;
- View Engine;
- Session Engine;
- Layout Engine;
- Entity Runtime;
- Communication Runtime;
- AI Runtime.

---

# 27. Storage Architecture

Основные storage layers:

- PostgreSQL;
- Event Store;
- File Storage;
- Vector Store;
- Cache Layer.

---

# 28. Tenant Architecture

## Главный принцип

Каждая компания изолирована.

## Tenant boundary обязателен для

- Entity;
- Relations;
- Events;
- Files;
- Comments;
- AI Context.

---

# 29. Platform Module System

## Module — подключаемая часть платформы.

### Примеры

- Comments Module;
- File Module;
- Calendar Module;
- AI Widget Module.

## Modules подключаются через explicit contracts.

---

# 30. Platform Anti-Patterns

## Запрещено

- Table как source of truth;
- giant controllers;
- hidden synchronization;
- mixed ownership;
- Runtime/Designer mixing;
- View inside Entity logic;
- business logic inside UI;
- Layout ownership of business data.

---

# 31. Definition of Architectural Success

Платформа считается архитектурно зрелой, если:

- слои разделены;
- ownership определён;
- Entity Layer независим;
- Event Engine существует;
- Relation Engine существует;
- AI Context Engine использует platform graph;
- Runtime deterministic;
- hidden synchronization отсутствует.

---

# 32. Финальная архитектурная формула

Entity Layer
→ Relation Graph
→ Event Timeline
→ AI Context
→ AI Agents

View Engine отображает платформу.

Layout Engine организует пространство.

Runtime выполняет работу.

Designer моделирует компанию.

Вместе они образуют:

AI-native Object-centric Business Platform.