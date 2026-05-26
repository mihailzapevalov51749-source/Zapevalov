# YASNOPRO Process Engine Model

## Назначение документа

Документ определяет:

- архитектуру Process Engine;
- executable process model;
- связь BPMN, Workflow, Entity и Relation;
- ownership process execution;
- boundaries Process Engine;
- runtime execution architecture.

Главная цель:

создать:

- executable object-centric process platform;
- unified process architecture;
- process-driven runtime;
- AI-native process execution environment.

---

# Главный принцип

```text
Process в ЯсноПро — это исполняемая объектно-центричная модель компании.
```

---

# BPMN в ЯсноПро

BPMN в ЯсноПро — не просто diagram layer.

BPMN является:

```text
visual executable process model
```

---

# Главный принцип BPMN

```text
BPMN shape != картинка

BPMN shape = executable process element
```

---

# Process Engine

## Определение

Process Engine — платформенный слой исполнения процессов.

---

## Process Engine объединяет

- BPMN Model
- Workflow Engine
- Rule Engine
- Relation Engine
- Event Engine
- Role Model
- Runtime Execution
- Automation
- Entity Layer

---

# Главная идея

Process Engine превращает:

- объекты;
- связи;
- workflow;
- роли;
- события;
- правила;

в единую исполняемую process architecture.

---

# Главный принцип

```text
Process Engine = execution orchestration layer
```

---

# Process Definition

## Определение

Process Definition — designer-level описание исполняемого процесса.

---

## Process Definition содержит

- BPMN graph;
- process elements;
- transitions;
- rules;
- role bindings;
- object bindings;
- event bindings;
- workflow bindings;
- automation bindings.

---

## Process Definition создаётся

- аналитиком;
- process architect;
- Designer User.

---

# Process Definition НЕ содержит

- runtime session state;
- temporary UI state;
- RuntimeRepresentation;
- ViewSession.

---

# Process Instance

## Определение

Process Instance — runtime execution процесса.

---

## Пример

```text
Process Definition:
"Согласование договора"

Process Instance:
Agreement Approval #145
```

---

# Process Instance содержит

- current execution state;
- active elements;
- runtime context;
- execution history;
- related entities;
- assignments;
- active workflows.

---

# BPMN Model

## BPMN Model в ЯсноПро

BPMN является:

```text
visual process projection
+
executable process graph
```

---

# BPMN НЕ является

- просто документацией;
- просто картинкой;
- isolated diagram.

---

# BPMN строится из

- ObjectType;
- Relation Definition;
- Workflow Definition;
- Rule Definition;
- Role Definition;
- Event bindings.

---

# Главный принцип

```text
Process Model создаётся из platform entities,
а не привязывается к ним после рисования.
```

---

# BPMN Elements

## BPMN элементы являются process elements

Каждый BPMN элемент:

- executable;
- typed;
- platform-aware;
- entity-aware.

---

# BPMN Pool

## Назначение

Pool представляет Process Definition.

---

## Pool содержит

- process context;
- execution graph;
- participants;
- process rules.

---

# BPMN Lane

## Назначение

Lane представляет:

- OrgUnit;
- Role;
- Executor Group.

---

## Lane bindings

Lane связывается с:

- Org Structure;
- Role Model;
- Permissions Engine.

---

# BPMN Task

## Назначение

Task представляет executable action.

---

## Task содержит

- Action Definition;
- Object Binding;
- Role Binding;
- Workflow Binding;
- Rule Binding;
- Event Triggers.

---

# Пример

```text
Task:
"Проверить договор"
```

---

## Внутри Task

```text
ObjectType = Contract
Role = Lawyer
Action = review
Workflow = approval_workflow
```

---

# BPMN Gateway

## Назначение

Gateway представляет process decision logic.

---

## Gateway использует

- Rule Engine;
- Conditions;
- Expressions;
- Runtime Context.

---

# Пример

```text
IF contract.amount > 1M
→ Director approval
ELSE
→ Department approval
```

---

# BPMN Sequence Flow

## Назначение

Sequence Flow представляет workflow transition.

---

## Sequence Flow содержит

- transition rules;
- execution conditions;
- activation logic.

---

# BPMN Data Flow

## Назначение

Data Flow представляет relation/data dependency.

---

## Data Flow использует

- Relation Definition;
- Entity dependencies;
- object graph.

---

# BPMN Event

## Назначение

Event представляет process trigger.

---

## Event может быть

- start;
- intermediate;
- end;
- timer;
- message;
- signal;
- conditional.

---

# BPMN Event использует

- Event Engine;
- Runtime Triggers;
- Automation Layer.

---

# BPMN Document

## Назначение

Document является ObjectType projection.

---

## Пример

```text
Document
→ ObjectType: Contract
```

---

# BPMN Message Flow

## Назначение

Message Flow представляет:

- communication;
- notification;
- integration;
- cross-role interaction.

---

# BPMN Element Types

## Главный принцип

Каждый BPMN element type является platform primitive.

---

# Task Element Type

## Содержит

- allowed ObjectType;
- allowed actions;
- role bindings;
- workflow bindings;
- event triggers;
- runtime behavior.

---

# Gateway Element Type

## Содержит

- rule expressions;
- branch logic;
- evaluation strategy.

---

# Lane Element Type

## Содержит

- role bindings;
- assignment rules;
- org bindings.

---

# Process Graph

## Определение

Process Graph — executable graph процесса.

---

## Process Graph объединяет

- BPMN structure;
- object graph;
- workflow graph;
- event graph;
- relation graph.

---

# Главный принцип

```text
Process Graph = operational company model
```

---

# Workflow Integration

Workflow Engine является execution core процесса.

---

# Workflow отвечает за

- state machine;
- transitions;
- approvals;
- assignments;
- actions.

---

# Process Engine orchestrates Workflow

---

# Relation Integration

Relation Engine предоставляет:

- object dependencies;
- data flow;
- graph traversal;
- impact analysis.

---

# Event Integration

Event Engine предоставляет:

- canonical history;
- process timeline;
- audit trail;
- process analytics.

---

# Rule Engine

## Назначение

Rule Engine отвечает за:

- conditions;
- branching;
- runtime decisions;
- validations;
- execution logic.

---

# Rule Engine используется в

- Gateway;
- transitions;
- assignments;
- automation.

---

# Role Model Integration

Role Model отвечает за:

- assignments;
- исполнителей;
- оргструктуру;
- runtime access.

---

# Runtime Execution

## Runtime Execution отвечает за

- process execution;
- active states;
- runtime orchestration;
- transition execution;
- action processing.

---

# Runtime Process State

## Runtime Process State содержит

- active task;
- current stage;
- pending approvals;
- execution progress;
- runtime assignments.

---

# Runtime НЕ должен хранить

- Process Definition;
- designer graph;
- process schema.

---

# Process UI

## Process UI отвечает за

- process visualization;
- BPMN rendering;
- execution visualization;
- status display;
- process interaction.

---

# Process UI НЕ является owner процесса

Owner:
- Process Engine.

---

# Process History

## Canonical history

Хранится в:

```text
Event Engine
```

---

# Process Timeline

Process timeline строится через:

- event projections;
- execution history;
- workflow events.

---

# Process AI

## AI может

- анализировать bottlenecks;
- анализировать loops;
- выявлять delays;
- предлагать оптимизацию;
- строить process insights;
- выявлять weak flows.

---

# AI НЕ должен

- silently mutate process;
- bypass Workflow Engine;
- bypass permissions;
- менять execution напрямую.

---

# Runtime Personalization

Runtime users могут:

- фильтровать process data;
- сохранять RuntimeRepresentation;
- персонализировать workspace;
- создавать dashboards.

---

# Но Runtime НЕ может менять

- Process Definition;
- BPMN graph;
- workflow rules;
- execution logic.

---

# Designer Responsibilities

Designer Users:

- создают Process Definition;
- создают BPMN graph;
- проектируют execution logic;
- задают rules;
- задают bindings;
- проектируют runtime behavior.

---

# Главный принцип Runtime/Designer

```text
Designer создаёт Process Definition.

Runtime исполняет Process Instance.
```

---

# Process Ownership Matrix

| Resource | Owner |
|---|---|
| Process Definition | Designer Layer |
| BPMN Graph | Process Engine |
| Workflow Execution | Workflow Engine |
| Relation Graph | Relation Engine |
| Process History | Event Engine |
| Runtime Process State | Runtime Engine |
| Process UI | View Engine |
| Process Layout | Layout Engine |

---

# Process Boundaries

---

## Process Engine отвечает за

- orchestration;
- process execution;
- process graph;
- runtime coordination.

---

## Workflow Engine отвечает за

- state machine;
- transitions;
- approvals;
- actions.

---

## Relation Engine отвечает за

- object graph;
- dependencies;
- relations.

---

## Event Engine отвечает за

- canonical history;
- audit trail;
- event timeline.

---

## View Engine отвечает за

- rendering;
- visualization;
- runtime interaction UI.

---

## Layout Engine отвечает за

- placement;
- resize;
- composition.

---

# Запрещённые архитектурные смешения

Запрещено:

- хранить process logic внутри table controller;
- хранить workflow inside UI;
- хранить process state inside RuntimeRepresentation;
- смешивать BPMN graph и UI layout;
- хранить execution logic inside View Engine;
- смешивать Process Definition и Runtime Process State.

---

# Процесс как operational model

Главная цель ЯсноПро:

```text
Process = operational digital model компании
```

---

# Отличие от классического BPMN

| Классический BPMN | ЯсноПро |
|---|---|
| diagram-first | runtime-first |
| documentation | execution |
| static | live |
| isolated | entity-connected |
| manual | semantic |
| process map | operational graph |

---

# Главный принцип платформы

```text
Process в ЯсноПро —
не картинка процесса,
а исполняемая цифровая модель работы компании.
```

---

# Development Rules

Перед созданием process functionality определить:

1. Это Process Definition или Process Instance?
2. Где owner execution?
3. Где canonical history?
4. Это BPMN projection или runtime execution?
5. Это workflow logic или process orchestration?
6. Не начинает ли UI владеть процессом?
7. Не начинает ли RuntimeRepresentation хранить process state?

---

# Главная цель

Построить:

- executable object-centric process platform;
- AI-native process execution architecture;
- unified operational company model;
- scalable enterprise process engine;
- explainable runtime execution environment.