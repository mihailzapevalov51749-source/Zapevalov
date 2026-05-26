# YASNOPRO View Ownership Model

## Назначение документа

Документ определяет:
- ownership view state;
- ownership runtime state;
- ownership personalization state;
- boundaries между слоями View Engine;
- правила хранения view-related данных.

Главная цель:
исключить:
- split-brain state;
- hidden synchronization;
- смешение Runtime и Designer;
- смешение ViewTemplate и RuntimeRepresentation.

---

# Главный принцип

Каждое состояние платформы должно иметь:
- одного owner;
- один lifecycle;
- один persistence layer;
- один scope.

---

# Главная проблема

Одна и та же информация не должна одновременно храниться:
- в ViewTemplate;
- в RuntimeRepresentation;
- в ViewSession;
- в Entity;
- в Layout.

---

# Архитектурный принцип

## Designer Layer

Designer Layer задаёт:
- официальную модель отображения;
- ограничения;
- default configuration.

---

## Runtime Layer

Runtime Layer отвечает за:
- временное состояние;
- personalization;
- composition;
- runtime interaction.

---

# Основные сущности View Layer

| Сущность | Назначение |
|---|---|
| ViewType | тип view engine |
| ViewTemplate | designer-level view |
| RuntimeRepresentation | сохранённая runtime personalization |
| ViewSession | временное runtime state |
| RuntimeWorkspace | runtime composition |
| RuntimeLayoutDelta | runtime layout changes |

---

# ViewType

## Назначение

Определяет:
- какой engine используется;
- как отображаются данные.

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

## Owner

```text
Platform Core
```

---

## Persistence

```text
platform-level
```

---

## Scope

```text
global
```

---

# ViewTemplate

## Назначение

Designer-level описание официального представления ObjectType.

---

## Создаётся

- аналитиком;
- администратором;
- platform designer.

---

## ViewTemplate содержит

- view_type
- default fields
- default sorting
- default grouping
- default filters
- runtime restrictions
- permissions
- allowed actions

---

## ViewTemplate НЕ содержит

- temporary runtime state
- unsaved filters
- personal layout
- user resize state
- temporary selections
- user-specific hidden columns

---

## Owner

```text
Designer Layer
```

---

## Persistence

```text
published configuration
```

---

## Scope

```text
company/global
```

---

# RuntimeRepresentation

## Назначение

Сохранённая пользовательская или командная personalization-настройка ViewTemplate.

---

## Примеры

- Мои проекты
- Просроченные проекты
- Проекты отдела
- Риски PMO

---

## RuntimeRepresentation содержит

- saved filters
- saved sorting
- hidden columns
- grouping
- pinned fields
- user preferences
- representation metadata

---

## RuntimeRepresentation НЕ содержит

- temporary dirty state
- runtime drag state
- temporary selection
- temporary resize state

---

## Owner

```text
Runtime Personalization Layer
```

---

## Persistence

```text
persisted runtime personalization
```

---

## Scope

- personal
- team
- department

---

# ViewSession

## Назначение

Временное runtime-состояние View Engine.

---

## ViewSession существует

Только:
- во время runtime interaction;
- во время текущей пользовательской сессии.

---

## ViewSession содержит

- temporary filters
- temporary sorting
- current selection
- resize state
- drag state
- open groups
- temporary UI state
- dirty state

---

## ViewSession НЕ содержит

- persisted personalization
- schema configuration
- platform configuration

---

## Owner

```text
Runtime Engine
```

---

## Persistence

```text
temporary/session
```

---

## Scope

```text
current user session
```

---

# RuntimeWorkspace

## Назначение

Композиция runtime-среды пользователя или команды.

---

## RuntimeWorkspace содержит

- tabs
- widgets
- dashboard instances
- representations
- runtime layout
- AI blocks

---

## Owner

```text
Runtime Personalization Layer
```

---

## Persistence

```text
persisted runtime workspace
```

---

## Scope

- personal
- team
- department

---

# RuntimeLayoutDelta

## Назначение

Пользовательские изменения layout относительно LayoutTemplate.

---

## RuntimeLayoutDelta содержит

- block resize
- widget positions
- collapsed state
- opened panels
- runtime composition changes

---

## RuntimeLayoutDelta НЕ содержит

- business logic
- entity data
- workflow logic
- schema configuration

---

## Owner

```text
Layout Engine
```

---

## Persistence

```text
runtime personalization
```

---

## Scope

- personal
- team

---

# DashboardTemplate

## Назначение

Designer-level dashboard configuration.

---

## Owner

```text
Designer Layer
```

---

## DashboardInstance

## Назначение

Runtime dashboard пользователя или команды.

---

## Owner

```text
Runtime Personalization Layer
```

---

# Ownership Matrix

| State | Owner | Persistence | Scope |
|---|---|---|---|
| ViewType | Platform Core | platform | global |
| ViewTemplate | Designer Layer | persisted | company |
| RuntimeRepresentation | Runtime Personalization | persisted | personal/team |
| ViewSession | Runtime Engine | temporary | session |
| RuntimeWorkspace | Runtime Personalization | persisted | personal/team |
| RuntimeLayoutDelta | Layout Engine | persisted | personal/team |
| DashboardTemplate | Designer Layer | persisted | company |
| DashboardInstance | Runtime Personalization | persisted | personal/team |

---

# Главный принцип ownership

Каждое состояние:
- хранится в одном месте;
- имеет одного owner;
- изменяется только своим owner layer.

---

# Запрещено

Запрещено:
- хранить ViewSession внутри RuntimeRepresentation;
- хранить RuntimeRepresentation внутри ViewTemplate;
- хранить Runtime state внутри Entity;
- хранить personalization внутри schema;
- хранить layout state внутри business objects.

---

# Split-Brain State

## Определение

Split-brain state возникает, когда:
- одно и то же состояние существует в нескольких слоях;
- ownership размыт;
- synchronization происходит неявно.

---

## Примеры запрещённого split-brain state

---

### Плохо

```text
filters:
- в table controller
- в representation
- в global state
- в local component state
```

---

### Правильно

```text
filters:
- owner = ViewSession
или
- owner = RuntimeRepresentation
```

---

# Hidden Synchronization

## Определение

Hidden synchronization — скрытая синхронизация между слоями платформы.

---

## Запрещено

- global window state
- hidden mutation
- implicit synchronization
- uncontrolled event mutation
- direct cross-layer state writes

---

# Runtime Persistence Rules

---

## Persist immediately

Можно сохранять сразу:

- RuntimeRepresentation
- RuntimeWorkspace
- RuntimeLayoutDelta

---

## Session only

Нельзя сохранять автоматически:

- dirty state
- drag state
- temporary filters
- temporary sorting
- temporary resize

---

# ViewTemplate Publish Rules

Designer changes:
- создаются как draft;
- публикуются отдельно;
- не должны мгновенно ломать Runtime.

---

# Runtime Isolation

Runtime personalization:
- не изменяет schema;
- не изменяет platform configuration;
- не изменяет ObjectType;
- не изменяет ViewTemplate.

---

# Runtime Migration Principle

Если ViewTemplate изменился:
- RuntimeRepresentation должен мигрироваться безопасно;
- invalid fields должны помечаться;
- runtime personalization не должна silently ломаться.

---

# Runtime Compatibility

View Engine обязан:
- gracefully handle missing fields;
- gracefully handle removed columns;
- gracefully handle outdated personalization.

---

# Layout Ownership

Layout Engine владеет:
- spatial structure;
- resize;
- composition.

---

# Layout Engine НЕ владеет

- entity data;
- relation data;
- business logic;
- workflow state.

---

# Entity Ownership

Entity Layer владеет:
- business truth;
- entity fields;
- relation values;
- lifecycle state.

---

# View Engine НЕ владеет

- canonical data;
- business truth;
- relation ownership.

---

# Event Ownership

Event Engine владеет:
- canonical history;
- event timeline;
- audit trail.

---

# View Layer может иметь

Только:
- projections;
- cached history;
- UI history views.

---

# Development Rules

Перед изменением View Layer обязательно определить:

1. Кто owner состояния?
2. Это temporary state или persisted state?
3. Это Runtime или Designer?
4. Это personalization или schema?
5. Это ViewSession или RuntimeRepresentation?
6. Это layout state или business state?

---

# Запрещённые архитектурные смешения

Запрещено смешивать:

- ViewTemplate и RuntimeRepresentation
- RuntimeRepresentation и ViewSession
- Runtime state и Entity state
- Layout state и business logic
- Runtime personalization и platform schema
- Designer configuration и Runtime session

---

# Главная цель

Сформировать:
- предсказуемый ownership;
- стабильный state lifecycle;
- безопасный runtime;
- архитектурно чистый View Layer;
- отсутствие hidden synchronization;
- отсутствие split-brain state.