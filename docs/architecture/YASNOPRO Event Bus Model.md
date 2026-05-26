# YASNOPRO Event Bus Model

## Назначение документа

Документ определяет:
- архитектуру событий платформы;
- разделение UI events и domain events;
- ownership event flow;
- boundaries Event Engine;
- правила event-driven взаимодействия.

Главная цель:
исключить:
- hidden synchronization;
- uncontrolled event mutation;
- global event chaos;
- смешение UI coordination и business events.

---

# Главный принцип

События платформы разделяются по уровням ответственности.

Нельзя использовать:
- один event bus для всего;
- UI events как business events;
- business events как UI coordination.

---

# Архитектурная модель

Платформа использует несколько уровней event architecture:

| Layer | Назначение |
|---|---|
| Domain Event Bus | бизнес-события |
| UI Command Bus | UI coordination |
| Runtime Interaction Events | runtime interaction |
| AI Context Events | semantic updates |
| Integration Events | external integrations |

---

# Главный принцип

```text
UI Command != Domain Event
```

---

# Domain Event Bus

## Назначение

Domain Event Bus отвечает за:
- бизнес-события платформы;
- canonical history;
- audit trail;
- automation triggers;
- business lifecycle.

---

## Owner

```text
Event Engine
```

---

# Domain Event

## Определение

Business-level событие платформы.

---

## Примеры

- project_created
- task_completed
- contractor_assigned
- relation_added
- document_approved
- workflow_started

---

## Domain Event содержит

- event_id
- event_type
- entity_id
- entity_type
- actor
- timestamp
- payload
- metadata

---

## Domain Event НЕ содержит

- UI state
- resize state
- open modal state
- runtime selection
- temporary filters

---

# Главный принцип

Domain Event:
- immutable;
- append-only;
- canonical.

---

# Event Store

## Назначение

Event Store хранит:
- canonical event history;
- immutable business events.

---

# Event Store НЕ хранит

- UI events;
- temporary runtime interaction;
- local component state.

---

# Event Projection

## Определение

Projection — производное представление событий.

---

## Примеры

- activity timeline
- audit history
- analytics counters
- notification feed

---

## Важно

Projection:
- rebuildable;
- non-canonical.

---

# UI Command Bus

## Назначение

UI coordination между runtime components.

---

## Owner

```text
UI Runtime Layer
```

---

# UI Command

## Определение

UI-level interaction command.

---

## Примеры

- open_modal
- close_sidebar
- switch_tab
- resize_panel
- focus_row
- scroll_to_comment

---

# UI Command НЕ является

- business event;
- audit history;
- automation trigger.

---

# Главный принцип

UI Commands:
- ephemeral;
- local/runtime-oriented;
- non-canonical.

---

# Runtime Interaction Events

## Назначение

Runtime interaction synchronization внутри Runtime Layer.

---

## Примеры

- drag_started
- resize_changed
- hover_changed
- selection_changed

---

## Важно

Runtime Interaction Events:
- temporary;
- UI-scoped;
- non-persisted.

---

# AI Context Events

## Назначение

Semantic/context synchronization AI Context Engine.

---

## Примеры

- semantic_relation_detected
- ai_summary_updated
- context_graph_changed
- ai_recommendation_generated

---

## Owner

```text
AI Context Engine
```

---

# Важно

AI Context Events:
- НЕ являются canonical business truth;
- используют projections других engines.

---

# Integration Events

## Назначение

Интеграционные события внешних систем.

---

## Примеры

- webhook_received
- external_sync_completed
- email_received
- ERP_data_updated

---

# Event Ownership Matrix

| Event Type | Owner | Persistence | Canonical |
|---|---|---|---|
| Domain Event | Event Engine | persisted | yes |
| UI Command | UI Runtime Layer | temporary | no |
| Runtime Interaction | Runtime Runtime Layer | temporary | no |
| AI Context Event | AI Context Engine | optional | no |
| Integration Event | Integration Layer | optional | depends |

---

# Главный ownership принцип

Каждое событие:
- имеет owner;
- имеет lifecycle;
- имеет persistence policy;
- имеет scope.

---

# Event Lifecycle

## Domain Event Lifecycle

```text
Command
→ Domain Event
→ Event Store
→ Projection
→ Runtime/UI update
```

---

## UI Command Lifecycle

```text
User Action
→ UI Command
→ UI Response
→ destroy
```

---

# Event Scope

## Scope Types

- local
- runtime
- tenant
- platform
- integration

---

# Local Events

Используются:
- внутри component tree;
- внутри одного runtime composition.

---

# Runtime Events

Используются:
- внутри runtime workspace;
- внутри page/session.

---

# Platform Events

Используются:
- для business lifecycle;
- automation;
- audit trail.

---

# Event Engine

## Event Engine отвечает за

- canonical history
- event persistence
- audit trail
- business timeline
- automation foundation

---

## Event Engine НЕ отвечает за

- UI coordination
- resize synchronization
- modal state
- runtime layout state

---

# Automation

Automation должна подписываться:
- только на Domain Events.

---

# Запрещено

Запрещено:
- запускать automation от UI Commands;
- запускать workflow от resize events;
- запускать business logic от UI interaction events.

---

# Notifications

Notifications должны строиться:
- на основе Domain Events;
- через projection layer.

---

# Event Replay

Только Domain Events:
- replayable;
- rebuildable;
- canonical.

---

# UI Events НЕ replayable

Потому что:
- не являются business truth;
- временные;
- runtime-scoped.

---

# Hidden Synchronization

## Определение

Hidden synchronization — скрытое изменение состояния через неконтролируемые события.

---

# Запрещено

- hidden window events
- uncontrolled CustomEvent chains
- implicit state mutation
- global event chaos
- silent cross-layer mutation

---

# Event Boundaries

---

## Domain Events могут

- запускать automation;
- обновлять projections;
- запускать notifications;
- обновлять analytics.

---

## UI Commands могут

- обновлять UI;
- переключать tabs;
- открывать panels;
- менять local runtime state.

---

## UI Commands НЕ могут

- изменять canonical history;
- быть audit trail;
- изменять business truth.

---

# Runtime Synchronization

Runtime synchronization должна происходить:
- явно;
- scoped;
- controlled.

---

# Global Event State

## Запрещено

```text
window.__GLOBAL_STATE__
window.__DIRTY__
window.__TABLE_STATE__
```

---

# Вместо этого

Использовать:
- explicit ownership;
- scoped event channels;
- controlled runtime stores.

---

# Event Persistence Rules

---

## Persisted

Persisted:
- Domain Events
- canonical audit history

---

## Non-Persisted

Non-persisted:
- UI Commands
- resize events
- hover state
- temporary runtime interaction

---

# Event Naming Rules

---

## Domain Event naming

```text
entity_action
```

---

## Примеры

- project_created
- task_completed
- relation_added

---

# UI Command naming

```text
action_target
```

---

## Примеры

- open_modal
- switch_tab
- resize_panel

---

# Event Versioning

Domain Events должны поддерживать:
- schema evolution;
- backward compatibility;
- replay safety.

---

# AI Event Rules

AI events:
- advisory;
- non-canonical;
- explainable;
- traceable.

---

# AI НЕ должен

- silently mutate business truth;
- bypass Event Engine;
- bypass permissions.

---

# Event Security

Все persisted events должны иметь:

- actor
- timestamp
- tenant
- source
- correlation_id

---

# Correlation ID

## Назначение

Связь цепочки событий между:
- automation;
- workflows;
- integrations;
- AI recommendations.

---

# Development Rules

Перед созданием event определить:

1. Это Domain Event или UI Command?
2. Это canonical history?
3. Нужно ли persistence?
4. Кто owner event?
5. Это Runtime или Platform event?
6. Может ли это запускать automation?
7. Это business truth или UI interaction?

---

# Запрещённые архитектурные смешения

Запрещено смешивать:

- UI Commands и Domain Events
- runtime interaction и business history
- layout events и business lifecycle
- AI recommendations и canonical truth
- temporary UI state и persisted business state

---

# Главная цель

Построить:
- контролируемую event-driven architecture;
- стабильный audit trail;
- безопасную runtime synchronization модель;
- explainable AI event model;
- отсутствие hidden synchronization;
- отсутствие global event chaos.