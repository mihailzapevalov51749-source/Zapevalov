# YASNOPRO TECHNICAL ARCHITECTURE

## 1. Назначение документа

Документ описывает техническую архитектуру платформы ЯсноПро.

### Цель документа

- перевести платформенные модели в техническую систему;
- определить backend, frontend, storage и API слои;
- зафиксировать границы модулей;
- снизить хаос разработки;
- создать основу для реализации AOBP.

AOBP = AI-native Object-centric Business Platform.

### Простыми словами

Документ отвечает на вопрос:

«Как технически должна быть устроена платформа ЯсноПро?»

## 2. Главная техническая идея

ЯсноПро должно развиваться как platform architecture, а не как набор feature.

Это означает:

- есть platform core;
- есть универсальные engines;
- есть runtime modules;
- есть designer modules;
- есть AI context layer;
- feature строятся поверх platform core.

## 3. Главные технические слои

Платформа состоит из следующих слоёв:

1. Backend Platform Core
2. Frontend Platform Core
3. Storage Layer
4. API Layer
5. State Layer
6. View Engine
7. Layout Engine
8. Relation Engine
9. Event Engine
10. AI Context Engine
11. Runtime Shell
12. Designer Shell

## 4. Backend Architecture

Backend отвечает за:

- хранение данных;
- бизнес-логику платформы;
- API;
- permissions;
- events;
- AI context.

## 5. Backend Services

| Service | Русское понимание | Назначение |
|---|---|---|
| ObjectType Service | сервис типов объектов | управление ObjectType |
| Entity Service | сервис объектов | хранение и изменение Entity |
| Field Service | сервис полей | управление Field definitions |
| Relation Service | сервис связей | управление Relation Definition и Relation Instance |
| Event Service | сервис событий | хранение событий и timeline |
| View Service | сервис представлений | управление View и Representation |
| Permission Service | сервис прав | доступы и роли |
| File Service | сервис файлов | документы и вложения |
| Comment Service | сервис комментариев | коммуникации вокруг объектов |
| Notification Service | сервис уведомлений | реакции на события |
| AI Context Service | сервис AI-контекста | подготовка контекста для AI |

## 6. Backend Module Rule

Каждый backend module должен иметь:

- models;
- schemas;
- router;
- service;
- permissions;
- tests.

## 7. Backend запрещено

Запрещено:

- хранить business logic в router;
- смешивать Entity и View;
- делать table source of truth;
- обращаться к данным другого tenant без tenant boundary;
- создавать events вручную в разных местах без Event Service.

## 8. Frontend Architecture

Frontend отвечает за:

- отображение данных;
- пользовательские действия;
- runtime experience;
- designer experience;
- view rendering;
- layout interaction;
- AI interaction.

## 9. Frontend основные слои

| Layer | Русское понимание | Назначение |
|---|---|---|
| Runtime Shell | рабочая оболочка | работа сотрудников |
| Designer Shell | оболочка моделирования | настройка платформы |
| View Engine | движок отображения | таблица, дерево, канбан |
| Layout Engine | движок размещения | canvas, resize, drag/drop |
| Session Engine | состояние сессии | runtime state и dirty state |
| Entity Runtime | карточки объектов | работа с Entity |
| Communication Layer | коммуникации | comments, mentions, discussions |
| AI Layer | AI-интерфейс | AI prompts, actions, recommendations |

## 10. Frontend Folder Strategy

Целевая структура frontend:

frontend/src/

- app/
- core/
- platform/
- runtime/
- designer/
- engines/
- modules/
- shared/
- ui/

## 11. Назначение frontend папок

| Папка | Назначение |
|---|---|
| app | входные точки приложения |
| core | базовые системные механизмы |
| platform | platform primitives |
| runtime | рабочая среда пользователей |
| designer | среда моделирования |
| engines | view/layout/session engines |
| modules | подключаемые модули |
| shared | общие утилиты |
| ui | базовые UI-компоненты |

## 12. Storage Architecture

Storage Layer отвечает за хранение:

- ObjectType;
- Entity;
- Field;
- Relation;
- Event;
- View;
- Representation;
- Files;
- Comments;
- AI context.

## 13. Основные хранилища

| Storage | Назначение |
|---|---|
| PostgreSQL | основная transactional database |
| JSONB | гибкие metadata и values |
| File Storage | документы и вложения |
| Event Store | журнал событий |
| Vector Store | AI memory и semantic search |
| Cache | быстрые runtime данные |

## 14. Database Core Tables

Целевые platform tables:

- tenants
- users
- object_types
- field_definitions
- entities
- entity_values
- relation_definitions
- relation_instances
- events
- views
- representations
- blocks
- layouts
- files
- comments
- notifications
- permissions

## 15. Tenant Architecture

Tenant — отдельная компания или организация в платформе.

### По-человечески

Tenant означает:

«Данные одной компании отделены от данных другой компании.»

## 16. Tenant Rule

Все platform objects должны иметь tenant boundary.

Запрещено создавать platform data без tenant context, кроме глобальных system templates.

## 17. API Architecture

API должен быть:

- явным;
- стабильным;
- predictable;
- tenant-aware;
- permission-aware.

## 18. Основные API группы

| API | Назначение |
|---|---|
| /object-types | типы объектов |
| /fields | поля |
| /entities | объекты |
| /relations | связи |
| /events | события |
| /views | представления |
| /representations | настройки View |
| /layouts | layout |
| /comments | комментарии |
| /files | файлы |
| /notifications | уведомления |
| /ai/context | AI context |

## 19. State Architecture

Frontend state делится на:

- runtime state;
- session state;
- saved state;
- view state;
- layout state;
- entity state.

## 20. State Ownership Rule

Каждый state должен иметь одного владельца.

| State | Owner |
|---|---|
| Entity values | Entity Store |
| View session | View Session Engine |
| Representation | Representation Engine |
| Layout | Layout Engine |
| Comments | Communication Module |
| Notifications | Notification Module |

## 21. Запрещённые state-подходы

Запрещено:

- global window.__* runtime state;
- hidden CustomEvent chains;
- duplicated state;
- state ownership в UI-компонентах;
- feedback loops.

## 22. View Engine Architecture

View Engine отвечает за:

- отображение Entity;
- Table View;
- Tree View;
- Kanban View;
- Calendar View;
- Gantt View;
- Composite View.

## 23. View Engine Rule

View Engine не хранит business data.

View Engine использует Entity Layer и Representation Layer.

## 24. Layout Engine Architecture

Layout Engine отвечает за:

- blocks;
- resize;
- drag/drop;
- positioning;
- canvas;
- composition.

## 25. Layout Engine Rule

Layout Engine не должен владеть Entity Data.

Layout Engine хранит только spatial configuration.

## 26. Relation Engine Architecture

Relation Engine отвечает за:

- relation definitions;
- relation instances;
- graph traversal;
- dependency analysis;
- impact analysis.

## 27. Event Engine Architecture

Event Engine отвечает за:

- event store;
- event bus;
- timeline;
- audit trail;
- subscribers.

## 28. AI Context Architecture

AI Context Engine собирает context из:

- Entity Graph;
- Relation Graph;
- Event Timeline;
- Documents;
- Comments;
- Permissions;
- Runtime Context.

## 29. Module System

Module — подключаемая часть платформы.

### Примеры

- Comments Module;
- Files Module;
- Table View Module;
- Calendar View Module;
- AI Widget Module.

## 30. Module Rule

Module должен подключаться через явный контракт.

Модуль не должен напрямую ломать platform core.

## 31. Plugin Architecture

Plugin — расширение платформы.

В будущем plugins могут добавлять:

- новые View Type;
- новые Field Type;
- новые AI Agent;
- новые workflow actions;
- новые widgets.

## 32. Permission Architecture

Permissions должны работать на уровнях:

- tenant;
- object type;
- entity;
- field;
- relation;
- view;
- action.

## 33. Runtime Infrastructure

Runtime infrastructure включает:

- routing;
- session;
- permissions;
- notifications;
- realtime;
- file access;
- AI access.

## 34. Designer Infrastructure

Designer infrastructure включает:

- object designer;
- field designer;
- relation designer;
- view designer;
- layout designer;
- AI behavior designer.

## 35. Realtime Architecture

Realtime нужен для:

- comments;
- notifications;
- collaboration;
- live updates;
- workflow state.

Realtime должен строиться на Event Engine.

## 36. Migration Architecture

Любое изменение DB должно идти через migrations.

Запрещено полагаться только на create_all.

## 37. Development Rules

Главные правила разработки:

1 bug = 1 patch = 1 commit.

### Запрещено

- giant controllers;
- массовые refactor;
- смешение layers;
- hidden state;
- implicit UX changes;
- AI auto-refactor без контроля.

## 38. Code Ownership Rule

Каждый файл должен иметь ясную ответственность.

Если файл делает слишком много — он должен быть разделён.

## 39. Testing Strategy

Минимальные проверки:

- unit tests для services;
- integration tests для API;
- regression checklist для UI;
- e2e tests для ключевых сценариев.

## 40. Regression Checklist Areas

### Проверять

#### TABLE

- hidden columns;
- reorder columns;
- filters;
- sorting;
- representation save.

#### CANVAS

- drag/drop;
- resize;
- layout persistence.

#### ENTITY

- open card;
- edit fields;
- comments;
- attachments.

#### AI

- context access;
- permissions;
- explainability.

## 41. Technical Definition of Done

Изменение считается завершённым, если:

- ownership понятен;
- state flow понятен;
- нет hidden side effects;
- regression checklist пройден;
- код не нарушает layer boundaries.

## 42. Главная техническая формула

Backend хранит и управляет platform truth.

Frontend отображает и управляет runtime interaction.

State Engine управляет временным состоянием.

Event Engine фиксирует происходящее.

AI Context Engine превращает данные в понимание.

## 43. Финальная цель технической архитектуры

Сделать ЯсноПро технически понятной, модульной, расширяемой и устойчивой платформой, на которую можно безопасно добавлять:

- новые View;
- новые modules;
- AI agents;
- workflow;
- industry templates;
- customer solutions.