# YASNOPRO Architecture Direction

## Назначение документа

Документ фиксирует:

- официальное архитектурное направление платформы;
- текущую стратегию развития;
- relationship между legacy runtime и новым Platform Core;
- canonical migration authority;
- правила перехода к новой архитектуре.

Главная цель:

устранить противоречия между:

- stabilization strategy;
- migration strategy;
- reset strategy;
- roadmap;
- фактическим направлением платформы.

---

# Главный принцип

```text
ЯсноПро переходит
от legacy runtime system
к AI-native Object-centric Business Platform.
```

---

# Текущий статус платформы

ЯсноПро находится в переходной архитектурной фазе.

---

## Платформа одновременно содержит

### Legacy Runtime

- legacy Universal Table;
- legacy runtime state;
- legacy controllers;
- legacy synchronization;
- table-centric logic;
- runtime instability.

---

### New Platform Core

- Object-centric architecture;
- Process Engine;
- Runtime / Designer separation;
- Runtime Personalization;
- Portal Composition;
- View Ownership Model;
- Scope/Tenant Model;
- Event Bus architecture;
- AI-native platform contracts.

---

# Главный архитектурный вывод

```text
Платформа больше НЕ развивается
как legacy table system.
```

---

# Официальное направление платформы

ЯсноПро официально развивается как:

```text
AI-native Object-centric Business Platform
```

---

# Главная стратегия

## Platform-first parallel development

---

## Что это означает

Разработка ведётся параллельно по двум направлениям:

---

### 1. Legacy Runtime Support

Цель:

- поддерживать работоспособность текущего runtime;
- не допускать критической деградации;
- локально исправлять instability;
- удерживать platform continuity.

---

### 2. New Platform Core Development

Цель:

- строить новый platform architecture;
- создавать новый Runtime Foundation;
- создавать Designer Foundation;
- создавать Process Engine;
- создавать executable object-centric platform.

---

# Главный принцип перехода

```text
Legacy runtime НЕ является целевой архитектурой.
```

---

# Legacy Runtime Strategy

Legacy runtime:

- поддерживается;
- локально стабилизируется;
- используется как transition layer;
- НЕ рассматривается как долгосрочный architectural core.

---

# Разрешённые изменения legacy runtime

Допускаются:

- bug fixes;
- state stabilization;
- controller decomposition;
- local refactoring;
- synchronization fixes;
- UX fixes;
- runtime continuity fixes.

---

# Запрещено

Запрещено:

- строить новые platform capabilities вокруг legacy architecture;
- усиливать table-centric architecture;
- усиливать global runtime state;
- усиливать hidden synchronization;
- превращать Universal Table в Platform Core.

---

# Universal Table Status

## Официальный статус

```text
Universal Table = transitional View Engine layer
```

---

## Universal Table НЕ является

- source of truth;
- Entity Layer;
- workflow owner;
- process owner;
- runtime core.

---

## Целевое состояние

Universal Table становится:

```text
Table View Engine
```

наравне с:

- Board View Engine;
- Tree View Engine;
- Gantt View Engine;
- Timeline View Engine;
- Calendar View Engine.

---

# Architecture Stabilization

## Новый статус stabilization

Architecture Stabilization рассматривается как:

```text
bounded transition phase
```

---

## Stabilization НЕ является главной целью платформы

Главная цель:

```text
создание нового Platform Core
```

---

# Что считается завершением stabilization

Stabilization считается достаточной, когда:

- legacy runtime не деградирует критически;
- ownership определён;
- hidden synchronization контролируется;
- boundaries зафиксированы;
- platform semantic model стабилизирована.

---

# Stabilization НЕ требует

- идеального legacy runtime;
- полного переписывания старого runtime;
- полной очистки legacy codebase.

---

# Architecture Reset Strategy

## Официальный статус

Architecture Reset Strategy принимается как:

```text
canonical architectural direction
```

---

# Главный принцип reset strategy

```text
Новая архитектура строится рядом,
а не поверх legacy runtime.
```

---

# Новый Platform Core

## Platform Core включает

- Entity Layer;
- Relation Engine;
- Process Engine;
- Workflow Engine;
- Event Engine;
- AI Context Engine;
- Runtime Personalization;
- Portal Composition;
- Layout Engine;
- View Engine;
- Scope/Tenant Architecture;
- Executable BPMN Architecture.

---

# Canonical Migration Authority

## Главный governing document

```text
YASNOPRO_ARCHITECTURE_DIRECTION.md
```

---

## Этот документ является

официальным источником архитектурного направления платформы.

---

# При конфликте документов

Приоритет:

| Priority | Document |
|---|---|
| P0 | ARCHITECTURE_DIRECTION |
| P1 | PLATFORM_CORE |
| P2 | GLOSSARY |
| P3 | ENGINE MODELS |
| P4 | ROADMAP |
| P5 | MIGRATION MAP |
| P6 | LEGACY STATUS FILES |

---

# Roadmap Synchronization Principle

ROADMAP и MIGRATION_MAP должны:

- отражать новую platform direction;
- учитывать parallel development;
- учитывать transitional runtime;
- учитывать Process Engine architecture;
- учитывать Runtime Personalization architecture.

---

# Главный roadmap принцип

```text
Platform Core development
имеет приоритет над legacy perfection.
```

---

# Runtime Foundation Status

## Официальный статус

Runtime Foundation считается:

```text
partially architecturally formed
```

---

## Уже сформированы contracts

- Runtime / Designer separation;
- View Ownership;
- Portal Composition;
- Scope / Tenant;
- Process Engine;
- Workflow boundaries;
- Event boundaries;
- Runtime Personalization;
- Layout ownership.

---

# Но Runtime Engine ещё НЕ реализован полностью

---

# Designer Foundation Status

Designer Foundation считается:

```text
architecturally active
```

---

# Designer является ключевой частью новой платформы

Потому что:

```text
ЯсноПро = model-driven platform
```

---

# Executable BPMN Direction

## Официальное направление

BPMN в ЯсноПро развивается как:

```text
Executable Object-Centric BPMN Platform
```

---

# BPMN НЕ является

- static documentation;
- isolated diagrams;
- visual-only process map.

---

# BPMN является

- executable process graph;
- process orchestration layer;
- operational company model.

---

# Главный BPMN принцип

```text
BPMN shape = executable process element
```

---

# Runtime Personalization Direction

Runtime users получают:

- RuntimeWorkspace;
- RuntimeRepresentation;
- Dashboard personalization;
- composable runtime environment.

---

# Но Runtime НЕ владеет

- platform schema;
- Process Definition;
- ObjectType;
- ViewTemplate.

---

# AI-native Direction

AI рассматривается как:

```text
platform-native layer
```

---

# AI использует

- Entity graph;
- Relation graph;
- Event history;
- Process graph;
- semantic context;
- runtime context.

---

# AI НЕ является

- source of truth;
- workflow owner;
- process owner.

---

# Главный архитектурный принцип

```text
Entity Layer хранит бизнес-истину.

Process Engine orchestrates execution.

View Engine отображает бизнес-истину.

Runtime users создают рабочую среду.

Designer users моделируют платформу.
```

---

# Development Governance

## Главное правило

```text
Любое изменение должно проверяться:
усиливает ли оно новый Platform Core
или снова усиливает legacy architecture?
```

---

# Разрешено

Разрешено:

- incremental migration;
- adapter layers;
- transition compatibility;
- parallel implementation;
- bounded legacy support.

---

# Запрещено

Запрещено:

- возвращаться к table-centric architecture;
- усиливать global runtime state;
- смешивать Runtime и Designer;
- смешивать Process и UI;
- смешивать View и Entity ownership;
- строить новые core capabilities внутри legacy runtime.

---

# Архитектурная стадия платформы

## Официальная стадия

```text
Architecture Stabilization → completed enough for transition

Platform Runtime Foundation → active formation

Platform Core Formation → active
```

---

# Главный вывод

ЯсноПро больше не является:

```text
legacy universal table platform
```

---

# ЯсноПро развивается как

```text
AI-native Object-centric Business Platform
с executable process architecture
и composable runtime environment.
```

---

# Финальная формула

```text
Legacy runtime поддерживается,
но не определяет будущее платформы.

Будущее платформы определяется
новым Platform Core.
```