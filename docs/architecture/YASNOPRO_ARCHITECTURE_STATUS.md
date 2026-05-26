# YASNOPRO ARCHITECTURE STATUS

## 1. Назначение документа

Документ фиксирует текущее состояние архитектуры ЯсноПро относительно целевой AOBP-модели.

AOBP = AI-native Object-centric Business Platform.

## Цель документа

- измерять архитектурный прогресс;
- фиксировать текущее состояние платформы;
- выявлять деградацию архитектуры;
- контролировать migration phases;
- синхронизировать архитектурные решения.

## Простыми словами

Документ отвечает на вопрос:

«Насколько ЯсноПро уже приблизился к целевой архитектуре?»

---

# 2. Общий уровень зрелости платформы

| Уровень | Описание |
|---|---|
| Level 0 | Table-centric MVP |
| Level 1 | Hybrid Architecture |
| Level 2 | Partial Platform Core |
| Level 3 | Object-centric Platform |
| Level 4 | AI-native Platform |
| Level 5 | Full AOBP |

## Текущий уровень

Level 1 — Hybrid Architecture

## Причины

- Universal Table частично является Entity Layer;
- platform boundaries смешаны;
- Runtime и Designer не разделены;
- Event Engine отсутствует;
- Relation Engine отсутствует;
- hidden synchronization присутствует.

---

# 3. Migration Phase Status

| Phase | Статус |
|---|---|
| PHASE 1 — Stabilization | IN PROGRESS |
| PHASE 2 — View Session Stabilization | NOT STARTED |
| PHASE 3 — View Engine Extraction | NOT STARTED |
| PHASE 4 — Entity Layer | NOT STARTED |
| PHASE 5 — Relation Engine | NOT STARTED |
| PHASE 6 — Event Engine | NOT STARTED |
| PHASE 7 — Runtime/Designer Split | NOT STARTED |
| PHASE 8 — Layout Engine | PARTIAL |
| PHASE 9 — AI Context Engine | CONCEPT ONLY |
| PHASE 10 — AI Agents | NOT STARTED |

---

# 4. Platform Core Status

## ObjectType

Статус:
NOT IMPLEMENTED

Проблемы:
- table schema = pseudo object model;
- нет независимого ObjectType registry.

Целевое состояние:
- независимый ObjectType Layer.

---

## Entity Layer

Статус:
PARTIAL / MIXED WITH TABLE

Проблемы:
- rows используются как entities;
- Entity ownership отсутствует;
- table является source of truth.

Целевое состояние:
- независимый Entity Layer.

---

## Field System

Статус:
PARTIAL

Проблемы:
- fields tightly coupled with table;
- reusable fields отсутствуют.

Целевое состояние:
- reusable field definitions.

---

## Relation Engine

Статус:
NOT IMPLEMENTED

Проблемы:
- relations отсутствуют как semantic graph;
- lookup используется как pseudo relation.

Целевое состояние:
- semantic relation graph.

---

## Event Engine

Статус:
NOT IMPLEMENTED

Проблемы:
- platform timeline отсутствует;
- используются хаотичные CustomEvent.

Целевое состояние:
- Event Store;
- Event Bus;
- Timeline Engine.

---

# 5. View Engine Status

## Universal Table

Статус:
PARTIAL VIEW ENGINE

Проблемы:
- смешение View и Entity;
- business logic inside table;
- representation ownership нестабилен.

Целевое состояние:
- pure Table View Engine.

---

## Representation Architecture

Статус:
PARTIAL

Проблемы:
- split-brain state;
- dirty state distributed;
- representation и session смешаны.

Целевое состояние:
- deterministic representation model.

---

## View Session

Статус:
UNSTABLE

Проблемы:
- multiple owners;
- hidden synchronization;
- global state fragments.

Целевое состояние:
- scoped session ownership.

---

# 6. State Architecture Status

## Общий статус

UNSTABLE

## Основные проблемы

- duplicated state;
- hidden synchronization;
- window.__ globals;
- uncontrolled CustomEvent chains;
- giant controllers.

## Целевое состояние

- one scope = one owner;
- explicit state flow;
- deterministic save/discard.

---

# 7. Runtime / Designer Status

## Runtime

Статус:
PARTIAL

Проблемы:
- runtime содержит designer behavior.

---

## Designer

Статус:
NOT IMPLEMENTED

Проблемы:
- отсутствует отдельный Designer Layer.

---

# 8. Layout Engine Status

## Canvas

Статус:
PARTIAL LAYOUT ENGINE

Проблемы:
- layout смешан с runtime behavior;
- resize partially unstable.

Целевое состояние:
- independent Layout Engine.

---

# 9. AI Architecture Status

## AI Context Engine

Статус:
CONCEPT ONLY

Проблемы:
- AI не использует platform graph;
- нет semantic context.

---

## AI Agents

Статус:
NOT IMPLEMENTED

---

# 10. Architecture Debt Status

## Критические проблемы

- Universal Table как pseudo Entity Layer;
- split-brain state;
- hidden synchronization;
- giant controllers;
- mixed responsibilities.

---

# 11. Regression Risk Status

| Зона | Риск |
|---|---|
| Universal Table | HIGH |
| Representation Save | HIGH |
| View Session | HIGH |
| Canvas Resize | MEDIUM |
| Entity Card | MEDIUM |
| Comments | LOW |
| Notifications | MEDIUM |

---

# 12. Architecture Health Indicators

| Индикатор | Статус |
|---|---|
| Source of Truth определён | PARTIAL |
| Ownership определён | PARTIAL |
| Runtime deterministic | NO |
| Hidden sync отсутствует | NO |
| Layers separated | PARTIAL |
| AI-ready architecture | NO |

---

# 13. Главные текущие приоритеты

1. Stabilization
2. View Session stabilization
3. Representation cleanup
4. Entity abstraction
5. View Engine extraction

---

# 14. Что запрещено до завершения Stabilization

Запрещено:

- massive refactor;
- новые сложные modules;
- AI auto-refactor;
- сложный workflow;
- deep UI redesign;
- platform rewrite.

---

# 15. Definition of Current Success

Текущий успех платформы определяется НЕ количеством feature.

А:

- снижением хаоса;
- стабилизацией state;
- разделением ownership;
- уменьшением regressions;
- приближением к целевой AOBP-архитектуре.

---

# 16. Финальная цель

ЯсноПро должно перейти:

от:
- table-centric runtime;
- feature-first architecture;

к:
- AI-native;
- object-centric;
- graph-driven;
- platform-first architecture.