# YASNOPRO ARCHITECTURE DEBT

## 1. Назначение документа

Документ фиксирует архитектурный долг платформы ЯсноПро.

## Цель документа

- сделать архитектурные проблемы видимыми;
- предотвратить нормализацию деградации;
- фиксировать platform anti-patterns;
- управлять migration risk;
- контролировать архитектурную чистоту платформы.

## Простыми словами

Документ отвечает на вопрос:

«Какие архитектурные проблемы сейчас мешают ЯсноПро стать полноценной AOBP-платформой?»

---

# 2. Главный принцип

Architecture Debt — это не bug.

Architecture Debt — это:

- неправильный ownership;
- смешение слоёв;
- hidden synchronization;
- неправильный source of truth;
- временные решения;
- platform anti-patterns.

---

# 3. Статусы Debt

| Статус | Значение |
|---|---|
| ACTIVE | проблема существует |
| PARTIAL | проблема частично исправлена |
| RESOLVED | проблема устранена |
| ACCEPTED | проблема временно принята сознательно |
| BLOCKED | исправление заблокировано зависимостями |

---

# 4. Уровни риска

| Риск | Значение |
|---|---|
| CRITICAL | ломает platform architecture |
| HIGH | создаёт regressions |
| MEDIUM | усложняет migration |
| LOW | локальная проблема |

---

# 5. AD-001

## Название

Universal Table как pseudo Entity Layer

## Риск

CRITICAL

## Статус

ACTIVE

## Проблема

Universal Table одновременно выполняет роли:

- View;
- Entity storage;
- schema layer;
- runtime logic;
- representation logic;
- workflow-like behavior.

## Нарушенные принципы

- View != Entity
- Table is not source of truth
- One responsibility per layer

## Последствия

- невозможность выделить Entity Layer;
- giant controllers;
- regressions;
- mixed ownership;
- platform instability.

## Целевое решение

- выделение Entity Layer;
- превращение Universal Table в pure View Engine.

## Migration Phase

PHASE 3 / PHASE 4

---

# 6. AD-002

## Название

Split-brain State Architecture

## Риск

CRITICAL

## Статус

ACTIVE

## Проблема

State одновременно хранится:

- в React state;
- в localStorage;
- в representation;
- в window.__ globals;
- в session state;
- в CustomEvent flows.

## Нарушенные принципы

- One scope = one owner
- Explicit state flow
- Deterministic state architecture

## Последствия

- random regressions;
- unstable save/discard;
- hidden synchronization;
- unpredictable behavior.

## Целевое решение

- единый session owner;
- explicit state ownership;
- deterministic state flow.

## Migration Phase

PHASE 1 / PHASE 2

---

# 7. AD-003

## Название

Hidden Synchronization через CustomEvent

## Риск

HIGH

## Статус

ACTIVE

## Проблема

State синхронизируется через:

- window events;
- hidden listeners;
- implicit side effects.

## Нарушенные принципы

- explicit architecture;
- observable state flow;
- deterministic behavior.

## Последствия

- трудно отследить side effects;
- сложно дебажить regressions;
- platform behavior становится хаотичным.

## Целевое решение

- platform event architecture;
- scoped event bus;
- explicit subscriptions.

## Migration Phase

PHASE 1 / PHASE 6

---

# 8. AD-004

## Название

Giant Controllers

## Риск

HIGH

## Статус

ACTIVE

## Проблема

Controllers управляют:

- View;
- Entity;
- Session;
- Layout;
- Runtime behavior;
- API orchestration.

## Примеры

- useUniversalTableController
- PortalPageView
- useUniversalTableEvents

## Нарушенные принципы

- separation of concerns;
- ownership isolation;
- platform boundaries.

## Последствия

- высокая regression density;
- сложность рефакторинга;
- невозможность безопасной migration.

## Целевое решение

- layer ownership;
- engine separation;
- smaller orchestrators.

## Migration Phase

PHASE 1 / PHASE 3

---

# 9. AD-005

## Название

Runtime и Designer смешаны

## Риск

HIGH

## Статус

ACTIVE

## Проблема

Runtime содержит:

- schema behavior;
- representation configuration;
- layout editing;
- platform configuration logic.

## Нарушенные принципы

- Runtime != Designer

## Последствия

- перегруженный runtime UI;
- рост complexity;
- смешение permissions.

## Целевое решение

- Runtime Shell;
- Designer Shell;
- separate permissions.

## Migration Phase

PHASE 7

---

# 10. AD-006

## Название

Representation и View Session смешаны

## Риск

HIGH

## Статус

ACTIVE

## Проблема

Saved representation и runtime session state смешиваются.

## Последствия

- unstable dirty state;
- broken save/discard;
- unpredictable reload behavior.

## Целевое решение

- separate Representation Layer;
- separate Session Layer.

## Migration Phase

PHASE 2

---

# 11. AD-007

## Название

Layout смешан с Runtime Logic

## Риск

MEDIUM

## Статус

ACTIVE

## Проблема

Canvas и blocks частично управляют runtime behavior.

## Последствия

- unstable resize behavior;
- mixed responsibilities;
- embedded regressions.

## Целевое решение

- independent Layout Engine.

## Migration Phase

PHASE 8

---

# 12. AD-008

## Название

AI не использует Platform Context

## Риск

MEDIUM

## Статус

ACTIVE

## Проблема

AI пока работает вне:

- Entity Graph;
- Relation Graph;
- Event Timeline.

## Последствия

- AI не понимает компанию;
- AI работает как обычный чат.

## Целевое решение

- AI Context Engine.

## Migration Phase

PHASE 9

---

# 13. AD-009

## Название

Отсутствие Event Engine

## Риск

HIGH

## Статус

ACTIVE

## Проблема

Платформа не имеет:

- timeline;
- event store;
- event bus;
- audit trail.

## Последствия

- AI не понимает историю;
- automation нестабильна;
- hidden side effects.

## Целевое решение

- полноценный Event Engine.

## Migration Phase

PHASE 6

---

# 14. AD-010

## Название

Lookup используется как pseudo relation

## Риск

MEDIUM

## Статус

ACTIVE

## Проблема

Lookup partially заменяет semantic relations.

## Последствия

- AI не видит настоящий graph;
- platform graph отсутствует.

## Целевое решение

- Relation Engine.

## Migration Phase

PHASE 5

---

# 15. Legacy Compatibility Principle

Legacy compatibility не должна блокировать переход к целевой архитектуре.

Если legacy state:

- мешает migration;
- удерживает hidden synchronization;
- сохраняет неправильный source of truth;
- мешает Entity Layer;
- мешает platform separation;

то legacy допускается удалить.

## Приоритет

1. архитектура;
2. стабильность;
3. deterministic behavior;
4. platform consistency;
5. legacy compatibility.

---

# 16. Definition of Debt Resolution

Debt считается устранённым, если:

- ownership определён;
- hidden behavior отсутствует;
- platform boundary соблюдён;
- regression risk снижен;
- architecture deterministic.

---

# 17. Главный принцип контроля долга

Новый feature запрещено строить через:

- hidden synchronization;
- duplicated state;
- giant controllers;
- mixed ownership;
- platform boundary violations.

Иначе создаётся новый Architecture Debt.

---

# 18. Финальная цель

Architecture Debt Registry должен стать:

- системой контроля деградации;
- системой архитектурного governance;
- инструментом migration management;
- инструментом platform stabilization.