# YASNOPRO Portal Composition Model

## Назначение документа

Документ определяет:
- composable structure платформы;
- архитектуру Portal/Page/Section/Block;
- boundaries Layout Engine;
- правила композиции Runtime и Designer интерфейсов.

Главная цель:
создать:
- composable platform architecture;
- modular UI architecture;
- runtime workspace model;
- безопасную layout composition систему.

---

# Главный принцип

Portal UI — это composable structure.

Интерфейс платформы строится как:

```text
Portal
 └── Page
      └── Section
           └── Block
```

---

# Главный архитектурный принцип

UI composition НЕ является:
- business model;
- Entity Layer;
- source of truth.

UI composition отвечает только за:
- визуальную структуру;
- spatial layout;
- runtime composition;
- rendering hierarchy.

---

# Portal

## Определение

Portal — runtime entry point компании внутри платформы.

---

## Portal содержит

- pages
- navigation
- workspace entry points
- runtime routes
- designer routes
- global shell
- runtime modules

---

## Примеры

- Corporate Portal
- PMO Portal
- HR Portal
- Executive Portal

---

## Portal НЕ содержит

- business entities
- canonical data
- workflow logic

---

## Owner

```text
Platform Runtime Layer
```

---

# Page

## Определение

Page — composable runtime/designer страница платформы.

---

## Page содержит

- sections
- page layout
- runtime composition
- page metadata

---

## Примеры

- Projects Page
- Dashboard Page
- Contractor Workspace
- Designer Object Editor

---

## Page НЕ содержит

- business truth
- relation ownership
- canonical entity state

---

## Owner

```text
Portal Composition Layer
```

---

# Section

## Определение

Section — структурный контейнер внутри Page.

---

## Назначение

Section используется для:
- logical grouping;
- responsive layout composition;
- visual separation;
- runtime structure.

---

## Section содержит

- blocks
- nested sections
- layout configuration

---

## Примеры

- Left Sidebar Section
- Dashboard Section
- Analytics Section
- Runtime Workspace Section

---

## Section НЕ содержит

- business logic
- entity ownership
- relation logic

---

## Owner

```text
Layout Engine
```

---

# Block

## Определение

Block — минимальная composable visual unit платформы.

---

## Block отвечает за

- rendering;
- runtime interaction;
- UI composition;
- visualization.

---

## Примеры

- Universal Table Block
- Chart Block
- AI Insights Block
- Timeline Block
- Calendar Block
- Markdown Block

---

## Block может использовать

- View Engine
- Entity projections
- Runtime personalization
- AI projections

---

## Block НЕ владеет

- Entity Layer
- canonical state
- relation graph
- business rules

---

## Owner

```text
Block Runtime Engine
```

---

# Block Types

## Основные типы блоков

| Block Type | Назначение |
|---|---|
| table | tabular visualization |
| board | kanban visualization |
| chart | analytics |
| markdown | rich content |
| timeline | event timeline |
| calendar | scheduling |
| ai_insights | AI recommendations |
| relation_graph | graph visualization |
| dashboard_widget | runtime widget |

---

# Block Instance

## Определение

Block Instance — конкретный экземпляр блока внутри Section/Page.

---

## Block Instance содержит

- block_type
- runtime configuration
- layout metadata
- bindings
- runtime state references

---

# Block Template

## Определение

Designer-level шаблон блока.

---

## Пример

```text
Project Risks Widget
```

---

# Block Runtime State

## Определение

Временное runtime-состояние блока.

---

## Примеры

- opened panel
- resize state
- local selection
- temporary filters

---

## Важно

Block Runtime State:
- не является persisted personalization;
- не является Entity state.

---

# Page Layout

## Определение

Page Layout — spatial structure страницы.

---

## Page Layout содержит

- sections
- grid structure
- responsive configuration
- layout rules

---

# Runtime Composition

## Определение

Runtime Composition — runtime-композиция workspace пользователя.

---

## Runtime Composition включает

- widgets
- blocks
- tabs
- dashboards
- representations
- runtime layouts

---

# Главный принцип Runtime Composition

Пользователь может:
- перестраивать runtime;
- собирать workspace;
- изменять composition.

Но:
- не может ломать platform core;
- не может изменять schema;
- не может изменять Entity Layer.

---

# Workspace

## Определение

Workspace — runtime composition environment пользователя или команды.

---

## Workspace содержит

- pages
- tabs
- dashboards
- runtime representations
- layouts
- widgets

---

# Workspace Scope

Workspace может иметь scope:

- personal
- team
- department
- company

---

# Dashboard

## Определение

Dashboard — композиция runtime widgets.

---

## Dashboard содержит

- widgets
- analytics
- charts
- AI blocks
- representations

---

# Widget

## Определение

Widget — lightweight runtime block.

---

## Примеры

- KPI Widget
- AI Summary Widget
- Risk Counter Widget
- Deadline Widget

---

# Layout Engine

## Определение

Layout Engine — движок spatial composition платформы.

---

## Layout Engine отвечает за

- resize
- drag/drop
- positioning
- responsive layout
- composition structure

---

## Layout Engine НЕ отвечает за

- business logic
- entity ownership
- workflow logic
- relation graph

---

# Главный принцип

Layout Engine != Entity Layer

---

# Runtime Layout Delta

## Определение

Пользовательские изменения layout относительно LayoutTemplate.

---

## Примеры

- resize widgets
- move blocks
- collapse sections
- hide panels

---

## Важно

Runtime Layout Delta:
- хранится отдельно;
- не изменяет Designer Layout;
- не изменяет platform schema.

---

# Designer Composition

## Определение

Designer Composition — designer-level описание структуры интерфейса.

---

## Designer Composition определяет

- allowed block types
- allowed sections
- allowed widgets
- default layouts
- runtime restrictions

---

# Runtime Personalization

## Определение

Runtime personalization — пользовательская настройка composition среды.

---

## Включает

- personal layout
- personal widgets
- dashboard personalization
- workspace composition
- runtime tabs

---

# Главный принцип

Runtime Personalization != Designer Composition

---

# Portal Navigation

## Navigation Layer содержит

- routes
- menu structure
- page hierarchy
- workspace entry points

---

# Navigation НЕ содержит

- entity data
- business state
- runtime session data

---

# Runtime Tabs

## Определение

Tabs внутри Runtime Workspace.

---

## Примеры

- Работа
- Планирование
- Контроль
- Аналитика

---

# Runtime Tabs могут содержать

- pages
- layouts
- widgets
- representations

---

# Designer Tabs

## Определение

Tabs внутри Designer интерфейса.

---

## Примеры

- Общие
- Поля
- Связи
- Представления
- Layout

---

# Runtime Page

## Определение

Runtime-oriented page для работы сотрудников.

---

## Примеры

- Project Workspace
- My Tasks
- Contractor Dashboard

---

# Designer Page

## Определение

Designer-oriented page для моделирования платформы.

---

## Примеры

- ObjectType Editor
- Relation Editor
- Layout Designer

---

# Block Bindings

## Определение

Связь Block с:
- Entity projections
- ViewTemplate
- RuntimeRepresentation
- AI projections

---

# Block НЕ должен иметь

Прямую ownership-связь с:
- Entity Layer
- Relation Engine
- canonical history

---

# Event Integration

Blocks могут:
- подписываться на projections;
- получать UI events;
- получать runtime updates.

---

# Но Block НЕ является Event Owner

Canonical history:
- Event Engine.

---

# AI Composition

AI blocks:
- являются runtime widgets;
- используют AI Context Engine;
- не являются source of truth.

---

# Responsive Principle

Portal Composition должна поддерживать:
- desktop
- tablet
- adaptive layout
- collapsible sections

---

# Главный composable принцип

Любой Portal должен собираться:
- из pages;
- из sections;
- из blocks;
- без жёсткой привязки к конкретной business logic.

---

# Запрещённые архитектурные смешения

Запрещено смешивать:

- Portal и Entity Layer
- Layout и business logic
- Block state и canonical state
- Runtime personalization и Designer composition
- Widget state и Entity ownership
- Page composition и workflow state

---

# Development Rules

Перед созданием нового UI элемента обязательно определить:

1. Это Portal / Page / Section / Block?
2. Кто owner состояния?
3. Это Runtime или Designer?
4. Это composition state или business state?
5. Это layout или canonical data?
6. Это personalization или schema?

---

# Главная цель

Сформировать:
- composable platform UI;
- modular architecture;
- безопасную runtime composition модель;
- независимый Layout Engine;
- масштабируемую workspace architecture;
- стабильные boundaries между UI и business layers.