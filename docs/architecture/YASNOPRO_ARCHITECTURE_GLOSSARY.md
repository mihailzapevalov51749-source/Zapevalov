# YASNOPRO Architecture Glossary

## Назначение документа

Документ фиксирует:
- единое значение архитектурных терминов;
- ownership терминов;
- допустимое использование терминов;
- запрещённые неоднозначные формулировки.

Главная цель:
исключить архитектурный drift из-за разного понимания одних и тех же сущностей.

---

# Главный принцип

Один термин = одно значение.

Запрещено:
- использовать один термин для разных сущностей;
- использовать сокращённые неоднозначные названия;
- использовать runtime и designer термины как взаимозаменяемые.

---

# ObjectType

## Определение

ObjectType — определение типа бизнес-объекта платформы.

ObjectType создаётся в Designer.

---

## Примеры

- Project
- Task
- Contractor
- Document
- Risk

---

## ObjectType содержит

- field definitions
- relation definitions
- permissions
- allowed view types
- workflow bindings
- AI bindings

---

## Важно

ObjectType НЕ является:
- таблицей;
- Entity;
- Runtime View.

---

# Entity

## Определение

Entity — экземпляр бизнес-объекта.

---

## Примеры

- Проект “ЖК Север”
- Задача “Согласование сметы”
- Подрядчик “ООО СтройМонтаж”

---

## Entity содержит

- values
- references
- metadata
- lifecycle state

---

## Важно

Entity НЕ хранит:
- layout
- view state
- runtime personalization

---

# Field Definition

## Определение

Field Definition — описание поля ObjectType.

---

## Примеры

- status
- deadline
- budget
- contractor

---

## Важно

Field Definition НЕ хранит:
- runtime filters
- runtime visibility
- layout settings

---

# Relation Definition

## Определение

Relation Definition — описание связи между ObjectType.

---

## Примеры

- Project has Contractor
- Task depends on Task
- Project contains Document

---

# Relation Instance

## Определение

Relation Instance — конкретная связь между Entity.

---

## Пример

```text
Project A
→ has_contractor
→ Contractor B
```

---

# ViewType

## Определение

ViewType — тип визуального движка отображения данных.

---

## Примеры

- table
- board
- tree
- gantt
- calendar
- chart
- timeline

---

## Важно

ViewType НЕ является:
- View Template
- Runtime Representation
- Runtime Session

---

# View Engine

## Определение

View Engine — движок отображения Entity.

---

## View Engine отвечает за

- rendering
- sorting
- filtering
- grouping
- inline editing
- virtualization

---

## Важно

View Engine НЕ является:
- источником истины;
- storage layer;
- business layer.

---

# Universal Table

## Определение

Universal Table — реализация Table View Engine.

---

## Важно

Universal Table:
- НЕ является Entity Layer;
- НЕ является source of truth;
- НЕ хранит бизнес-логику.

---

# ViewTemplate

## Определение

ViewTemplate — официальное designer-level описание отображения ObjectType.

Создаётся аналитиком.

---

## Примеры

- Таблица проектов
- Канбан проектов
- Гант проектов

---

## ViewTemplate содержит

- view_type
- visible fields
- default sorting
- default filters
- grouping rules
- permissions
- runtime restrictions

---

## Важно

ViewTemplate НЕ является:
- Runtime Representation
- user personalization
- runtime session

---

# RuntimeRepresentation

## Определение

RuntimeRepresentation — пользовательская или командная настройка ViewTemplate.

Создаётся Runtime users.

---

## Примеры

- Мои проекты
- Просроченные проекты
- Проекты отдела

---

## RuntimeRepresentation содержит

- saved filters
- saved sorting
- hidden fields
- grouping
- user preferences

---

## Важно

RuntimeRepresentation:
- не изменяет platform schema;
- не изменяет ViewTemplate;
- не изменяет ObjectType.

---

# Запрещено

Запрещено использовать:

```text
representation
```

без уточнения:

- RuntimeRepresentation
- Representation Engine
- Representation State

---

# ViewSession

## Определение

ViewSession — временное runtime-состояние View Engine.

---

## ViewSession содержит

- unsaved filters
- temporary sorting
- temporary selection
- temporary resize
- dirty state

---

## Важно

ViewSession:
- временный;
- не является persisted configuration;
- не является RuntimeRepresentation.

---

# Runtime Workspace

## Определение

Runtime Workspace — рабочее пространство пользователя или команды.

---

## Workspace содержит

- tabs
- dashboard
- widgets
- layouts
- representations

---

# Workspace Scope

Workspace может иметь scope:

- personal
- team
- department
- company

---

# DashboardTemplate

## Определение

Designer-level шаблон dashboard.

Создаётся аналитиком.

---

# DashboardInstance

## Определение

Runtime dashboard пользователя или команды.

Создаётся Runtime users.

---

# LayoutTemplate

## Определение

Designer-level layout configuration.

---

## LayoutTemplate содержит

- block structure
- default positioning
- composition rules

---

# RuntimeLayoutDelta

## Определение

Пользовательские изменения layout относительно LayoutTemplate.

---

## Примеры

- resize blocks
- move widgets
- collapse panels

---

## Важно

RuntimeLayoutDelta:
- не изменяет LayoutTemplate;
- не изменяет business logic.

---

# Tabs

## Определение

Tabs — элементы навигации Runtime или Designer интерфейса.

---

## Примеры

- Таблица
- Канбан
- Календарь

---

## Важно

Tabs НЕ являются:
- RuntimeRepresentation;
- Workspace;
- Dashboard.

---

# ViewTypeTab

## Определение

Tab, переключающий ViewType.

---

## Пример

```text
Table | Board | Calendar
```

---

# RepresentationTab

## Определение

Tab, связанный с RuntimeRepresentation.

---

## Пример

```text
Все проекты | Мои проекты | Просроченные
```

---

# Runtime Personalization

## Определение

Runtime Personalization — пользовательская настройка Runtime-среды.

---

## Включает

- RuntimeRepresentation
- RuntimeWorkspace
- RuntimeLayoutDelta
- DashboardInstance
- saved filters
- personal tabs

---

# Designer Configuration

## Определение

Designer Configuration — platform-level настройка модели системы.

---

## Включает

- ObjectType
- Field Definitions
- Relation Definitions
- ViewTemplate
- LayoutTemplate
- Workflow
- Permissions

---

# Главный принцип

Runtime Personalization != Designer Configuration

---

# Layout Engine

## Определение

Layout Engine — движок пространственного размещения элементов интерфейса.

---

## Layout Engine отвечает за

- positioning
- resize
- drag/drop
- spatial composition

---

## Важно

Layout Engine НЕ хранит:
- business logic;
- entity state;
- relation logic.

---

# Event Engine

## Определение

Event Engine — движок событий платформы.

---

## Event Engine отвечает за

- history
- timeline
- audit trail
- notifications foundation
- automation foundation

---

## Важно

Event Engine является:
- canonical history source.

---

# Entity History

## Определение

Entity History — projection/cached view событий Entity.

---

## Важно

Canonical source history:
- Event Engine.

---

# Domain Event

## Определение

Business-level событие платформы.

---

## Примеры

- project_created
- task_completed
- relation_added

---

# UI Command

## Определение

UI-level команда интерфейса.

---

## Примеры

- open_modal
- switch_tab
- resize_panel

---

## Важно

UI Command != Domain Event

---

# AI Context Engine

## Определение

AI Context Engine — semantic/context layer платформы.

---

## AI Context Engine отвечает за

- semantic understanding
- organizational memory
- AI reasoning
- context graph
- AI recommendations

---

## Важно

AI Context Engine:
- не является source of truth;
- использует projections других engines.

---

# Scope

## Определение

Scope — область видимости runtime-сущности.

---

## Scope Types

- personal
- team
- department
- company
- global

---

# Tenant

## Определение

Tenant — изолированный контур компании внутри платформы.

---

## Важно

Tenant boundary обязательна для:
- storage;
- permissions;
- runtime personalization;
- AI context.

---

# Portal

## Определение

Portal — runtime entry point компании.

---

# Page

## Определение

Page — runtime или designer страница платформы.

---

# Section

## Определение

Section — структурный контейнер внутри Page.

---

# Block

## Определение

Block — визуальный runtime/designer элемент интерфейса.

---

# Главный принцип

Block НЕ является:
- business entity;
- source of truth;
- relation owner.

---

# Главные архитектурные правила

- Universal Table = View Engine
- Entity Layer = source of truth
- ViewType != ViewTemplate
- ViewTemplate != RuntimeRepresentation
- RuntimeRepresentation != ViewSession
- Runtime != Designer
- Runtime Personalization != Designer Configuration
- Layout Engine != Entity Layer
- UI Command != Domain Event
- Event Engine owns history
- Relation Engine owns graph logic
- AI Context Engine owns semantic understanding

---

# Запрещённые архитектурные смешения

Запрещено смешивать:

- Runtime и Designer
- View и Entity
- ViewTemplate и RuntimeRepresentation
- RuntimeRepresentation и ViewSession
- Layout и business logic
- Entity и Event storage
- UI commands и domain events
- Runtime personalization и platform schema

---

# Главная цель

Сформировать:
- единый архитектурный язык;
- единое понимание сущностей;
- стабильные platform boundaries;
- предсказуемый ownership state;
- устойчивую AI-native архитектуру.