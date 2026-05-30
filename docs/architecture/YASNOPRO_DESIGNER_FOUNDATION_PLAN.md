# YASNOPRO Designer Foundation Plan

## Назначение документа

Документ определяет:

- стратегию реализации Designer Foundation;
- implementation scope;
- безопасные границы реализации;
- Slice 1 architecture;
- первые implementation priorities;
- relationship между Designer и Runtime.

Главная цель:

начать реализацию стороны аналитика:

```text
без разрушения Runtime
и без возврата к legacy architecture
```

---

# Главный принцип

```text
Designer Foundation строится как новый platform layer,
а не как расширение legacy runtime.
```

---

# Текущая стратегия платформы

## Основной фокус

```text
Designer Foundation
```

---

## Runtime стратегия

Runtime:

- поддерживается;
- локально стабилизируется;
- постепенно переводится к целевой архитектуре;
- НЕ переписывается полностью сейчас.

---

# Главный принцип перехода

```text
Новая архитектура строится parallel
с legacy runtime.
```

---

# Designer Foundation

## Designer Foundation

Designer Foundation — базовый layer моделирования платформы.

---

## Designer Foundation отвечает за

- создание platform metadata;
- моделирование ObjectType;
- моделирование Relations;
- моделирование Views;
- моделирование Processes;
- моделирование Workflow;
- publish flow;
- runtime model publication.

---

# Designer Foundation НЕ отвечает за

- runtime execution;
- runtime personalization;
- workflow runtime;
- process runtime;
- View Engine rendering;
- legacy runtime stabilization.

---

# Главный принцип Designer

```text
Designer создаёт platform definitions.

Runtime исполняет published models.
```

---

# Slice Strategy

## Главная стратегия

```text
Incremental Platform Slices
```

---

# Slice 1

## Название

```text
Designer Core Metadata Slice
```

---

# Slice 1 Goal

Создать минимальное platform-safe ядро Designer.

---

# Slice 1 Scope

В Slice 1 входят:

| Layer | Status |
|---|---|
| Designer Shell | INCLUDED |
| ObjectType Designer | INCLUDED |
| Field Designer | INCLUDED |
| Relation Designer | INCLUDED |
| Metadata Storage | INCLUDED |
| Publish Flow MVP | INCLUDED |
| Runtime Consumption MVP | INCLUDED |
| Tenant-aware metadata | INCLUDED |

---

# Slice 1 НЕ включает

| Layer | Status |
|---|---|
| BPMN Runtime | EXCLUDED |
| Process Runtime | EXCLUDED |
| Workflow Runtime | EXCLUDED |
| Permissions Designer | EXCLUDED |
| AI Context Designer | EXCLUDED |
| Runtime Workspace | EXCLUDED |
| Runtime Personalization UI | EXCLUDED |
| Full Layout Designer | EXCLUDED |
| Executable BPMN | EXCLUDED |
| Automation Engine | EXCLUDED |

---

# Главный Slice 1 принцип

```text
Сначала metadata core.
Потом execution.
```

---

# Designer Shell

## Назначение

Designer Shell — базовый container Designer.

---

# Designer Shell содержит

- navigation;
- Designer Workspace;
- Designer routing;
- Designer context;
- Designer session;
- metadata loading.

---

# Designer Shell НЕ зависит от

- Universal Table controllers;
- PortalPageView;
- legacy runtime composition.

---

# Главный принцип

```text
Designer Shell = отдельный platform layer
```

---

# ObjectType Designer

## Назначение

ObjectType Designer отвечает за:

- создание ObjectType;
- редактирование ObjectType;
- metadata configuration;
- publish state;
- ObjectType lifecycle.

---

# ObjectType Designer содержит

- name;
- key;
- description;
- icon;
- metadata settings;
- publish status;
- ownership metadata.

---

# ObjectType Designer НЕ содержит

- runtime personalization;
- runtime projections;
- runtime session state.

---

# Field Designer

## Назначение

Field Designer отвечает за:

- создание Field Definition;
- настройку field metadata;
- field validation;
- field behavior;
- field configuration.

---

# Field Types Slice 1

## INCLUDE

- text
- long_text
- number
- boolean
- date
- datetime
- choice
- multi_choice
- user
- relation

---

## EXCLUDE

- formulas
- AI fields
- automation fields
- computed projections

---

# Relation Designer

## Назначение

Relation Designer отвечает за:

- создание Relation Definition;
- настройку object relations;
- relation metadata;
- relation behavior.

---

# Relation Types Slice 1

## INCLUDE

- one-to-one
- one-to-many
- many-to-many

---

## EXCLUDE

- semantic graph relations
- AI semantic relations
- process runtime relations

---

# Metadata Storage

## Главный принцип

```text
Designer metadata хранится отдельно
от legacy runtime structures.
```

---

# Slice 1 Metadata Entities

Создаются новые backend entities:

- ObjectType
- FieldDefinition
- RelationDefinition
- PublishRecord

---

# Главный принцип

```text
НЕ хранить новый Designer metadata layer
в legacy Universal Table structures.
```

---

# Publish Flow MVP

## Назначение

Publish Flow разделяет:

- Designer;
- Runtime.

---

# Главный принцип

```text
Runtime использует
только published models.
```

---

# Publish Flow

```text
Designer Draft
→ Validation
→ Publish
→ Runtime Available
```

---

# Runtime НЕ должен

- читать draft metadata;
- изменять definitions;
- менять schema напрямую.

---

# Runtime Consumption MVP

## Назначение

Runtime должен уметь:

- загружать published models;
- читать ObjectType;
- читать FieldDefinition;
- читать RelationDefinition.

---

# Runtime Consumption НЕ включает

- runtime execution engine;
- process execution;
- workflow runtime.

---

# Designer Persistence Principles

## Главный принцип

```text
Designer metadata = canonical definitions
```

---

# Runtime НЕ является owner definitions

---

# Slice 1 Backend Strategy

## Главный принцип

```text
Новые backend modules.
НЕ расширение legacy controllers.
```

---

# Разрешено

Создавать:

- новые FastAPI modules;
- новые metadata entities;
- новые repositories;
- новые services;
- новые Designer APIs.

---

# Запрещено

- расширять legacy Universal Table schema;
- смешивать metadata с runtime table rows;
- строить Designer поверх legacy controllers.

---

# Slice 1 Frontend Strategy

## Главный принцип

```text
Designer UI строится отдельно от Runtime UI.
```

---

# Разрешено

Создавать:

- Designer pages;
- Designer routes;
- Designer components;
- Designer stores;
- Designer services.

---

# Запрещено

- строить Designer внутри legacy runtime pages;
- расширять UniversalTableView под Designer;
- смешивать RuntimeWorkspace и DesignerWorkspace.

---

# Slice 1 Ownership Model

| Resource | Owner |
|---|---|
| ObjectType | Designer Layer |
| FieldDefinition | Designer Layer |
| RelationDefinition | Designer Layer |
| PublishRecord | Publish Layer |
| RuntimeRepresentation | Runtime Personalization |
| RuntimeWorkspace | Runtime Layer |
| ViewSession | Runtime Session |

---

# Designer Workspace

## Slice 1

Designer Workspace реализуется минимально.

---

# INCLUDE

- object navigation;
- metadata editing;
- Designer context;
- Designer routing.

---

# EXCLUDE

- composable designer workspace;
- visual workspace composition;
- multi-window designer runtime.

---

# Designer Navigation

## Slice 1 Navigation

INCLUDE:

- Objects
- Relations
- Views
- Processes
- Settings

---

## Но

Processes:
```text
placeholder only
```

---

# BPMN Strategy

## Slice 1

BPMN implementation НЕ начинается.

---

# Разрешено

- placeholder contracts;
- process metadata;
- future process hooks.

---

# Запрещено

- BPMN runtime;
- executable process engine implementation;
- workflow execution UI.

---

# Workflow Strategy

## Slice 1

Workflow implementation НЕ начинается.

---

# Разрешено

- Workflow Definition placeholders;
- metadata contracts.

---

# EXCLUDE

- execution;
- runtime orchestration;
- approval runtime.

---

# Permissions Strategy

## Slice 1

Permissions Designer НЕ реализуется полностью.

---

# Разрешено

- ownership placeholders;
- tenant boundaries;
- basic publish permissions.

---

# AI Context Strategy

## Slice 1

AI Context Designer НЕ реализуется.

---

# Разрешено

- metadata hooks;
- future contracts;
- AI-ready definitions.

---

# Runtime Boundaries

## Runtime сейчас нельзя трогать глобально

---

# Разрешено

- local stabilization;
- bug fixes;
- ownership cleanup;
- transition compatibility.

---

# Запрещено

- runtime rewrite;
- giant refactor;
- new runtime core inside legacy architecture;
- expanding legacy global state.

---

# Universal Table Status

> Superseded by ADR-001 Universal Table Retirement.

## Официальный статус

```text
LEGACY — RETIREMENT ACTIVE
(frozen → isolated → removed)
```

~~Transitional View Engine Layer~~ — больше не часть целевой архитектуры.

---

# Universal Table НЕ должен использоваться как

- metadata storage;
- Process Engine;
- workflow owner;
- Designer backend layer.

---

# Slice 1 Technical Priorities

## Priority 1

Designer Shell

---

## Priority 2

ObjectType backend model

---

## Priority 3

FieldDefinition backend model

---

## Priority 4

RelationDefinition backend model

---

## Priority 5

Designer APIs

---

## Priority 6

Publish Flow MVP

---

## Priority 7

Runtime metadata consumption

---

# Slice 1 Safe Implementation Order

```text
1. Backend metadata entities
2. Backend services
3. Backend APIs
4. Designer Shell
5. ObjectType UI
6. Field Designer UI
7. Relation Designer UI
8. Publish Flow MVP
9. Runtime metadata loading
```

---

# Slice 1 Success Criteria

Slice 1 считается успешным если:

- аналитик может создать ObjectType;
- аналитик может создать Fields;
- аналитик может создать Relations;
- metadata сохраняется отдельно от legacy runtime;
- publish flow работает;
- Runtime может читать published metadata;
- legacy runtime не сломан.

---

# Slice 1 НЕ требует

- полного runtime rewrite;
- BPMN runtime;
- workflow execution;
- full runtime composition;
- executable process runtime.

---

# Главный implementation принцип

```text
Foundation first.
Execution later.
```

---

# Development Rules

Перед реализацией каждого Designer feature определить:

1. Это Designer или Runtime?
2. Это metadata или runtime state?
3. Кто owner?
4. Это draft или published model?
5. Не начинает ли legacy runtime владеть metadata?
6. Не начинает ли Designer зависеть от Universal Table?
7. Не смешивается ли Designer с Runtime Personalization?

---

# Главная цель Slice 1

Построить:

- platform-safe Designer Core;
- metadata-driven architecture;
- publishable platform definitions;
- независимый Designer layer;
- foundation для дальнейшей platform implementation.