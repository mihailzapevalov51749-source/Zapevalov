# YASNOPRO PLATFORM CORE

## 1. Назначение документа

Документ фиксирует фундаментальную платформенную модель ЯсноПро.

---

## Цель

- перестать развивать систему интуитивно;
- отделить Platform Core от Feature Layer;
- зафиксировать единые архитектурные правила;
- обеспечить масштабируемость платформы;
- создать фундамент для AI-native Object-centric Business Platform (AOBP).

Документ является фундаментальной архитектурной спецификацией платформы.

---

# 2. Что такое ЯсноПро

ЯсноПро — это:

```text
AI-native Object-centric Business Platform
```

---

## AOBP

### AI-native Object-centric Business Platform

По-русски:

AI-ориентированная объектно-центричная бизнес-платформа.

---

## ЯсноПро — это

Цифровая операционная система компании, в которой:

- бизнес моделируется через объекты;
- данные связаны между собой;
- AI понимает структуру компании;
- сотрудники работают в единой среде;
- аналитики моделируют цифровую систему бизнеса;
- Runtime users создают рабочую среду внутри заданных правил.

---

## ЯсноПро НЕ является

- набором экранов;
- набором таблиц;
- CRM;
- task manager;
- low-code конструктором форм.

Все эти функции являются только частными проявлениями платформы.

---

# 3. Главные архитектурные принципы

---

## 3.1. Object-centric architecture

Платформа строится вокруг объектов бизнеса.

---

### Примеры объектов

- Проект
- Договор
- Подрядчик
- Риск
- Документ
- Сотрудник
- Задача
- Актив
- Процесс

---

### Источник истины

- ObjectType
- Entity
- Relation

---

### НЕ

- таблица;
- страница;
- UI;
- модуль.

---

## 3.2. AI-native architecture

AI встроен в фундамент платформы.

---

### AI понимает

- структуру компании;
- объекты;
- связи;
- события;
- процессы;
- роли;
- документы;
- историю изменений.

AI работает не только с текстом.

---

### AI использует

- entity graph;
- relation graph;
- metadata;
- events;
- history;
- semantic context.

---

## 3.3. Meta-driven platform

Поведение платформы определяется:

- metadata;
- schema;
- relation definitions;
- ViewTemplate;
- LayoutTemplate;
- event rules;
- runtime restrictions.

---

### Платформа НЕ должна зависеть от

- hardcoded сущностей;
- hardcoded таблиц;
- hardcoded workflow;
- hardcoded runtime screens.

---

## 3.4. View-driven UI

Таблица НЕ является источником данных.

---

### Table View — это

- representation layer;
- способ отображения;
- View Engine;
- UI layer.

---

### Одни и те же данные могут отображаться

- таблицей;
- деревом;
- kanban;
- gantt;
- календарём;
- карточкой;
- timeline;
- composite workspace.

---

## 3.5. Runtime / Designer separation

Платформа состоит из двух больших слоёв.

---

### Runtime

Среда работы сотрудников.

---

#### В Runtime

- работа с Entity;
- выполнение задач;
- работа с документами;
- аналитика;
- комментарии;
- workflow;
- AI;
- RuntimeRepresentation;
- RuntimeWorkspace;
- DashboardInstance;
- Runtime personalization.

---

### Designer

Среда моделирования платформы.

---

#### В Designer

- создание ObjectType;
- настройка Field Definition;
- настройка Relation Definition;
- создание ViewTemplate;
- создание LayoutTemplate;
- настройка AI behavior;
- моделирование структуры компании;
- настройка platform rules;
- настройка permissions.

---

### Главный принцип

```text
Designer создаёт правила и ограничения.

Runtime users создают рабочую среду внутри этих правил.
```

---

# 4. Platform Primitives

---

## 4.1. ObjectType

### Определение

ObjectType — тип бизнес-объекта.

---

### Примеры

- Project
- Contract
- Risk
- Employee
- Document

---

### ObjectType описывает

- структуру объекта;
- набор полей;
- связи;
- поведение;
- доступные ViewType;
- runtime restrictions.

---

### ObjectType НЕ содержит

- UI layout;
- конкретные данные;
- runtime state;
- personalization state.

---

### Пример

#### ObjectType

```text
Project
```

---

#### Fields

- Name
- Status
- Budget
- Responsible
- StartDate
- EndDate

---

#### Relations

- Contractor
- Risks
- Documents

---

## 4.2. Entity

### Определение

Entity — экземпляр ObjectType.

---

### Например

```text
ObjectType: Project
Entity: Project #145
```

---

### Entity содержит

- field values;
- relations;
- lifecycle state;
- metadata;
- attachments;
- comments.

---

### Entity НЕ содержит

- runtime layout;
- ViewSession;
- RuntimeRepresentation;
- UI composition state.

---

### Главный принцип

Entity НЕ зависит от:

- конкретной таблицы;
- конкретной страницы;
- конкретного UI;
- конкретного View Engine.

---

## 4.3. Field Definition

### Определение

Field Definition — metadata описание поля ObjectType.

---

### Field Definition определяет

- тип данных;
- правила хранения;
- validation;
- отображение;
- behavior.

---

### Типы полей

#### Базовые типы

- text
- long_text
- number
- boolean
- date
- datetime
- choice
- multi_choice
- user
- users
- relation
- relations
- file
- files
- lookup

---

### Главный принцип

Field Definition должен быть reusable.

---

### Например

- Status
- Responsible
- Priority

должны переиспользоваться между ObjectType.

---

## 4.4. Relation Definition

### Определение

Relation Definition — описание связи между ObjectType.

---

### Relation создаёт graph платформы

---

### Примеры

- Project → Contractor
- Contract → Documents
- Employee → Tasks
- Risk → Project

---

### Значение Relation

Relation позволяет:

- строить context graph;
- анализировать зависимости;
- строить AI reasoning;
- формировать impact analysis.

---

## 4.5. ViewType

### Определение

ViewType — тип визуального движка отображения данных.

---

### Примеры

- Table
- Tree
- Kanban
- Gantt
- Calendar
- Card
- Timeline
- Chart

---

### Главный принцип

ViewType — это тип View Engine.

---

### ViewType НЕ является

- ViewTemplate;
- RuntimeRepresentation;
- RuntimeWorkspace.

---

## 4.6. ViewTemplate

### Определение

ViewTemplate — designer-level описание отображения ObjectType.

---

### ViewTemplate создаётся

- аналитиком;
- архитектором платформы;
- Designer User.

---

### ViewTemplate содержит

- ViewType;
- default fields;
- default sorting;
- default grouping;
- default filters;
- runtime restrictions;
- allowed actions;
- permissions.

---

### ViewTemplate НЕ содержит

- temporary runtime state;
- ViewSession;
- RuntimeLayoutDelta;
- personal filters;
- personal preferences.

---

## 4.7. RuntimeRepresentation

### Определение

RuntimeRepresentation — сохранённая пользовательская или командная personalization-настройка ViewTemplate.

---

### RuntimeRepresentation содержит

- saved filters;
- saved sorting;
- hidden fields;
- grouping;
- column order;
- pinned fields;
- user preferences.

---

### RuntimeRepresentation НЕ содержит

- layout;
- dashboard composition;
- block positions;
- runtime resize state;
- workspace structure.

---

### Главный принцип

```text
ViewTemplate != RuntimeRepresentation
```

---

## 4.8. Block

### Определение

Block — composable visual unit платформы.

---

### Block может отображать

- View Engine;
- Entity projection;
- AI widget;
- dashboard widget;
- markdown;
- analytics;
- navigation.

---

### Block НЕ является

- business entity;
- source of truth;
- relation owner.

---

## 4.9. Layout Engine

### Определение

Layout Engine — spatial composition engine платформы.

---

### Layout Engine отвечает за

- positioning;
- resize;
- composition;
- responsive behavior;
- runtime layout.

---

### Layout Engine НЕ отвечает за

- business logic;
- Entity ownership;
- workflow state;
- relation graph.

---

## 4.10. RuntimeWorkspace

### Определение

RuntimeWorkspace — composable runtime environment пользователя или команды.

---

### RuntimeWorkspace содержит

- pages;
- widgets;
- RuntimeRepresentation;
- DashboardInstance;
- runtime layouts;
- AI blocks.

---

### Scope RuntimeWorkspace

- personal;
- team;
- department;
- company.

---

# 5. Source of Truth

## Главный принцип

---

### Источник истины

- Entity Layer;
- ObjectType;
- Relation Layer;
- Event Engine.

---

### НЕ

- Table View;
- page state;
- block state;
- RuntimeRepresentation;
- ViewSession.

---

# 6. State Architecture

## Главный принцип

```text
Один state = один owner
```

---

## Запрещено

- duplicated state;
- hidden synchronization;
- uncontrolled globals;
- split-brain state;
- implicit ownership.

---

## State flow

```text
User Action
→ Explicit Command
→ Owner Layer
→ State Update
→ Projection
→ Render
```

---

## Запрещено

- хаотичные CustomEvent;
- window.__* globals;
- feedback loops;
- hidden state mutation;
- uncontrolled synchronization.

---

# 7. Universal Table Transition Contract

## Назначение

Universal Table рассматривается как legacy transition layer.

Это переходный слой от текущей реализации таблиц к целевой архитектуре Table View Engine.

---

## Главный принцип

```text
Universal Table != Entity Layer
Universal Table != Source of Truth
Universal Table = Table View Engine implementation
```

---

## Universal Table отвечает за

- tabular rendering;
- sorting;
- filtering;
- grouping;
- inline editing через Entity commands;
- selection;
- virtualization;
- table interaction.

---

## Universal Table НЕ отвечает за

- хранение бизнес-объектов;
- ObjectType ownership;
- Relation ownership;
- workflow ownership;
- AI Context ownership;
- canonical history.

---

## Inline Editing Contract

Правильный flow:

```text
User edits cell
→ Table View Engine creates Entity Command
→ Entity Layer validates Entity update
→ Event Engine records Domain Event
→ Projection updates View Engine
```

---

## Rows Transition Principle

Целевое состояние:

```text
row = rendered Entity projection
```

А НЕ:

```text
row = source of truth
```

---

## Columns Transition Principle

Целевое состояние:

```text
column = rendered Field Definition
```

А НЕ:

```text
column = independent schema source
```

---

## Migration Rule

Любое изменение Universal Table должно проверяться вопросом:

```text
Мы усиливаем View Engine
или снова превращаем table в Platform Core?
```

---

## Запрещено

- строить новые platform capabilities вокруг table state;
- хранить relation ownership внутри table row;
- хранить workflow state внутри table-specific structures;
- хранить AI context внутри table controller;
- смешивать RuntimeRepresentation и table controller state.

---

## Целевое состояние

Universal Table становится одним из View Engine платформы:

- Table View Engine;
- Board View Engine;
- Tree View Engine;
- Gantt View Engine;
- Calendar View Engine;
- Timeline View Engine.

---

# 8. Platform Core vs Feature Layer

---

## 8.1. Platform Core

Platform Core:

- ObjectType
- Entity Layer
- Field Definition
- Relation Engine
- Event Engine
- View Engine
- Layout Engine
- State Engine
- Runtime Engine
- Designer Engine
- AI Context Engine
- Permissions Engine
- Runtime Personalization Layer

---

## 8.2. Feature Layer

Feature Layer:

- Task management
- CRM
- Project management
- Document flow
- Risk management
- Dashboards
- Workflow templates
- Industry modules

---

### Главный принцип

Feature Layer НЕ должен изменять Platform Core.

---

# 9. Что нельзя хардкодить

Запрещено хардкодить:

- бизнес-сущности;
- workflow;
- роли;
- поля;
- relations;
- ViewTemplate;
- RuntimeRepresentation;
- runtime screens;
- UI behavior сущностей.

---

## Платформа должна быть

```text
meta-driven
```

---

# 10. Добавление новых сущностей

Новая сущность создаётся через:

1. Создание ObjectType
2. Добавление Field Definition
3. Настройку Relation Definition
4. Создание ViewTemplate
5. Создание LayoutTemplate
6. Настройку Permissions
7. Настройку AI context
8. Публикацию модели

---

# 11. AI Context Architecture

AI должен понимать:

- entity graph;
- relation graph;
- history;
- permissions;
- events;
- business structure;
- runtime context.

---

## AI context строится на

- metadata;
- relations;
- events;
- semantic layer;
- organizational graph.

---

# 12. Digital Company Model

## Главная цель платформы

Создание цифровой модели компании.

---

## Цифровая модель компании включает

- структуру;
- процессы;
- объекты;
- связи;
- документы;
- знания;
- историю;
- события;
- аналитику;
- runtime workspace.

---

# 13. Текущая стратегия разработки

## Главная стратегия

```text
Platform-first parallel development
```

---

## Параллельно развиваются

- Platform Core;
- Designer Layer;
- архитектурные contracts;
- Runtime foundations.

---

## Главный принцип

Feature development допускается только если:

- не нарушается ownership;
- не нарушаются boundaries;
- не создаётся hidden synchronization;
- не усиливается legacy architecture.

---

# 14. Правила разработки

## Главное правило

```text
1 bug
1 patch
1 commit
```

---

## Запрещено

- massive refactor;
- uncontrolled AI rewrite;
- hidden architectural mutation;
- смешение feature/platform logic;
- split-brain state.

---

## Cursor используется для

- архитектурного аудита;
- анализа зависимостей;
- проверки boundaries;
- build/lint;
- проверки ownership;
- проверки layer consistency.

---

## Кодовые изменения должны быть

- локальными;
- проверяемыми;
- обратимо безопасными;
- архитектурно объяснимыми.

---

# 15. Целевое состояние платформы

ЯсноПро должно стать:

```text
AI-native Object-centric Business Platform
```

---

## Платформой, в которой

- компания описывает себя через объекты;
- сотрудники работают в composable runtime environment;
- аналитики моделируют цифровую структуру компании;
- AI понимает структуру компании;
- данные связаны между собой;
- View Engine отображает бизнес-истину;
- Runtime users персонализируют рабочую среду;
- Platform Core остаётся стабильным и масштабируемым.

---

# 16. Финальная формула

```text
Entity Layer хранит бизнес-истину.

Designer создаёт структуру и правила.

Runtime users создают рабочую среду внутри этих правил.

View Engine отображает бизнес-истину.

AI понимает бизнес-контекст платформы.
```