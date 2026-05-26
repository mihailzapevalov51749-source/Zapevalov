# YASNOPRO Workflow Model

## Назначение документа

Документ определяет:

- архитектурную модель workflow;
- boundaries Workflow Engine;
- ownership workflow state;
- разделение workflow и process;
- взаимодействие workflow с Runtime, Entity, Event и AI.

Главная цель:

создать:
- масштабируемую workflow architecture;
- event-driven execution model;
- безопасный workflow runtime;
- независимый Workflow Engine.

---

# Главный принцип

```text
Workflow != Process
```

---

# Process

## Определение

Process — бизнес-модель работы компании.

---

## Process описывает

- роли;
- этапы;
- взаимодействия;
- бизнес-логику;
- организационную модель.

---

## Примеры

- Процесс согласования договора
- Процесс закупки
- Процесс управления проектом
- Процесс найма сотрудника

---

# Workflow

## Определение

Workflow — executable runtime state machine.

---

## Workflow отвечает за

- переходы состояний;
- runtime execution;
- actions;
- assignments;
- approvals;
- automation triggers;
- lifecycle control.

---

# Главный принцип

```text
Workflow = execution layer
```

---

# Workflow НЕ является

- бизнес-процессом целиком;
- Entity Layer;
- View Layer;
- RuntimeRepresentation;
- UI logic.

---

# Workflow Engine

## Назначение

Workflow Engine отвечает за:

- workflow execution;
- state transitions;
- workflow runtime;
- action orchestration;
- workflow lifecycle.

---

# Workflow Engine Owner

```text
Workflow Engine
```

---

# Workflow Definition

## Определение

Workflow Definition — designer-level описание workflow.

---

## Workflow Definition содержит

- states;
- transitions;
- actions;
- rules;
- triggers;
- permissions;
- conditions;
- automation bindings.

---

## Workflow Definition создаётся

- аналитиком;
- архитектором процессов;
- Designer User.

---

# Workflow Definition НЕ содержит

- temporary runtime state;
- UI layout;
- RuntimeRepresentation;
- ViewSession;
- runtime personalization.

---

# Workflow Instance

## Определение

Workflow Instance — runtime execution конкретного workflow.

---

## Пример

```text
Workflow Definition:
"Approval Workflow"

Workflow Instance:
Approval #145
```

---

# Workflow Instance содержит

- current state;
- execution history;
- assignments;
- runtime context;
- pending actions.

---

# Workflow State

## Workflow State отвечает за

- текущий state;
- execution status;
- transition status;
- approval state;
- action availability.

---

# Workflow State НЕ отвечает за

- UI layout;
- runtime personalization;
- ViewSession;
- RuntimeWorkspace.

---

# Workflow States

## Примеры

- Draft
- In Progress
- Waiting Approval
- Approved
- Rejected
- Completed
- Cancelled

---

# State Transition

## Определение

State Transition — переход Workflow Instance между состояниями.

---

## Пример

```text
Draft
→ Submit
→ Waiting Approval
```

---

# Transition содержит

- source state;
- target state;
- conditions;
- allowed actors;
- actions;
- automation triggers.

---

# Workflow Actions

## Примеры

- approve
- reject
- assign
- start
- complete
- escalate
- reopen

---

# Workflow Trigger

## Определение

Событие, запускающее workflow action.

---

## Примеры

- Entity created
- Status changed
- File uploaded
- Approval received
- Deadline expired

---

# Workflow Runtime

## Workflow Runtime отвечает за

- execution;
- action orchestration;
- assignment resolution;
- runtime validation;
- transition control.

---

# Workflow Runtime НЕ отвечает за

- rendering;
- layout;
- visualization;
- RuntimeRepresentation;
- dashboard composition.

---

# Workflow и Entity

Workflow может быть связан с Entity.

---

## Пример

```text
Project
→ Approval Workflow
```

---

# Главный принцип

```text
Workflow НЕ владеет Entity.
```

---

# Entity Layer остаётся source of truth

Workflow:
- использует Entity;
- изменяет Entity через commands;
- НЕ хранит canonical business truth.

---

# Workflow и Event Engine

Workflow Engine обязан использовать Event Engine.

---

## Workflow Events

Примеры:

- workflow_started
- workflow_completed
- transition_executed
- approval_requested
- approval_completed

---

# Главный принцип

```text
Workflow history = Event Engine
```

---

# Workflow НЕ хранит canonical history

Canonical history:
- Event Engine.

---

# Workflow Projection

Workflow UI должен использовать projections.

---

## Примеры projections

- approval timeline;
- current workflow status;
- pending approvals;
- workflow analytics.

---

# Workflow и View Engine

Workflow НЕ должен жить внутри View Engine.

---

# View Engine отвечает только за

- отображение workflow;
- action rendering;
- status visualization;
- approval UI.

---

# Workflow НЕ должен храниться

- внутри table controller;
- внутри RuntimeRepresentation;
- внутри ViewSession;
- внутри layout state.

---

# Workflow UI

## Workflow UI может содержать

- status badge;
- action buttons;
- approval panels;
- workflow timeline;
- execution history.

---

# Workflow UI НЕ является owner workflow

Owner:
- Workflow Engine.

---

# Workflow и RuntimeRepresentation

RuntimeRepresentation может:

- отображать workflow data;
- фильтровать workflow state;
- группировать workflow state.

---

# Но RuntimeRepresentation НЕ владеет workflow

---

# Workflow и Layout

Layout Engine может:

- размещать workflow widgets;
- показывать workflow blocks.

---

# Layout НЕ управляет workflow execution

---

# Workflow и Automation

Automation Layer может:

- запускать workflow;
- выполнять actions;
- отправлять notifications.

---

# Но Automation НЕ является Workflow Engine

---

# Workflow и Permissions

Workflow обязан учитывать:

- role permissions;
- ownership;
- scope;
- tenant;
- workflow permissions.

---

# Workflow и Tenant

Workflow обязан быть tenant-scoped.

---

# Workflow Instance должен содержать

- tenant_id;
- workflow_definition_id;
- entity_id;
- current_state;
- execution_context.

---

# Workflow и Scope

Workflow visibility должна учитывать:

- personal scope;
- team scope;
- department scope;
- company scope.

---

# Workflow и AI

AI может:

- анализировать workflow;
- выявлять bottlenecks;
- предлагать оптимизации;
- анализировать delays;
- рекомендовать actions.

---

# AI НЕ должен

- silently mutate workflow;
- bypass permissions;
- bypass Workflow Engine;
- менять workflow state напрямую.

---

# Workflow и Runtime

Runtime users:

- запускают workflow;
- выполняют actions;
- получают approvals;
- работают с workflow UI.

---

# Runtime users НЕ должны

- менять Workflow Definition;
- менять state machine;
- менять transition rules.

---

# Workflow и Designer

Designer Users:

- создают Workflow Definition;
- проектируют states;
- создают transitions;
- задают actions;
- задают rules;
- настраивают automation bindings.

---

# Главный принцип Runtime/Designer

```text
Designer создаёт Workflow Definition.

Runtime исполняет Workflow Instance.
```

---

# Workflow Persistence

Persisted:

- Workflow Definition
- Workflow Instance
- Workflow Events
- Transition History

---

# Non-persisted

- temporary action dialogs;
- temporary UI state;
- temporary selection;
- runtime hover state.

---

# Workflow Ownership Matrix

| Resource | Owner |
|---|---|
| Workflow Definition | Designer Layer |
| Workflow Instance | Workflow Engine |
| Workflow State | Workflow Engine |
| Workflow History | Event Engine |
| Workflow UI | View Engine |
| Workflow Layout | Layout Engine |
| Workflow Personalization | Runtime Personalization Layer |

---

# Workflow Boundaries

---

## Workflow Engine отвечает за

- execution;
- transitions;
- assignments;
- runtime validation;
- workflow lifecycle.

---

## View Engine отвечает за

- rendering;
- workflow visualization;
- runtime interaction UI.

---

## Event Engine отвечает за

- canonical history;
- audit trail;
- workflow timeline.

---

## Layout Engine отвечает за

- placement;
- resize;
- composition.

---

# Запрещённые архитектурные смешения

Запрещено смешивать:

- workflow и View Engine;
- workflow и RuntimeRepresentation;
- workflow и layout;
- workflow и Entity ownership;
- workflow и UI controller state;
- workflow и table state;
- workflow и ViewSession.

---

# Workflow Composition

Workflow может использоваться внутри:

- RuntimeWorkspace;
- Dashboard;
- Entity Card;
- Timeline;
- Composite Runtime.

---

# Но workflow НЕ должен становиться UI-driven logic

---

# Workflow Lifecycle

```text
Workflow Definition
→ Workflow Instance
→ Runtime Execution
→ Domain Events
→ Projection
→ UI Rendering
```

---

# Development Rules

Перед созданием workflow functionality определить:

1. Это Workflow Definition или Workflow Instance?
2. Кто owner состояния?
3. Где хранится canonical history?
4. Это Runtime или Designer?
5. Это workflow state или UI state?
6. Это execution logic или visualization?
7. Не начинает ли workflow жить внутри View Engine?

---

# Главная цель

Построить:

- независимый Workflow Engine;
- event-driven workflow architecture;
- безопасную execution model;
- explainable workflow runtime;
- AI-compatible workflow layer;
- масштабируемую enterprise workflow platform.