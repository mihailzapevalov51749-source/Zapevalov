# YASII Constitution

**Статус:** FOUNDATIONAL ARCHITECTURE DOCUMENT  
**Версия:** 1.0  
**Приоритет:** наивысший для всей архитектуры ЯСИИ  
**Область:** ЯСИИ — цифровой интеллектуальный сотрудник платформы ЯсноПро

---

## Иерархия документов

YASII Constitution является документом **более высокого уровня**, чем:

- Roadmap
- Dashboard Work Items
- MVP Plans
- Runtime Architecture
- Knowledge Architecture
- Role Design
- UI Design
- Module Design
- Implementation Documents

**Любое архитектурное решение по ЯСИИ должно проверяться на соответствие настоящей Конституции.**

Конституция **не является** Roadmap, планом реализации, MVP-планом или технической инструкцией. Она фиксирует только **фундаментальные архитектурные инварианты** системы.

---

## 0. Executive Summary

### Что такое ЯСИИ

**ЯСИИ** (YASII) — **цифровой интеллектуальный сотрудник** платформы ЯсноПро.

ЯСИИ знает систему, архитектуру, компанию (tenant), процессы, объекты, документы, пользователей, роли, права и контекст, в котором ему задают вопрос. Он отвечает не «на текст», а на **полную ситуацию** пользователя.

### Почему ЯСИИ создаётся

Платформа ЯсноПро развивается как AI-native Object-centric Business Platform (AOBP). Для этого недостаточно внешних AI-инструментов и чатов: платформа должна иметь **собственный, встроенный, объяснимый и воспроизводимый** интеллект, который:

- понимает архитектуру и код платформы;
- контролирует соответствие roadmap и baseline;
- в будущем — работает внутри tenant-компаний с учётом прав и контекста;
- не дублирует знания платформы, а **использует платформу как источник истины**.

### Роль ЯСИИ в платформе

ЯСИИ — **часть платформы**, а не отдельный продукт. Он встроен в карточки объектов, реестры, документы, процессы, dashboard и Designer. Он использует единый Core, Knowledge Graph, Runtime Engine и Audit Trail.

ЯСИИ **не выполняет** автономных изменений. Он **формирует** verdict, evidence, рекомендации и объяснимые ответы.

### Почему AI Developer — только одна из ролей

Ранее спроектированный **AI Developer** — архитектурный интеллект для разработки ЯсноПро. Концепция эволюционировала:

```text
AI Developer  →  первая роль внутри ЯСИИ
                 (YASII Developer)
```

AI Developer **не является** самостоятельной верхнеуровневой системой. Все его знания, граф, runtime и capabilities **встраиваются** в YASII Core и активируются через Role Profile.

Первая реализация ЯСИИ включает две роли:

1. **YASII Developer** — поддержка разработки платформы
2. **YASII Owner Assistant** — контроль развития платформы

---

## Консолидация архитектурных исследований

Настоящая Конституция — официальная фиксация фундаментальных выводов, полученных при проектировании:

| Исследование / документ | Ключевой вывод, зафиксированный в Конституции |
|-------------------------|-----------------------------------------------|
| **YASII Architecture v1** | ЯСИИ — цифровой сотрудник; Core + Roles + Capabilities; формула ответа |
| **AI Developer Knowledge Architecture** | Tier 0–7; иерархия источников; conflict rules; evidence semantics |
| **AI Developer Knowledge Graph** | Связанные знания; traversal profiles; graph before search |
| **AI Developer Code Knowledge Architecture** | Code Knowledge Layer; manifest, modules, legacy zones, impact |
| **AI Developer Runtime Architecture** | Deterministic pipeline; Intent → Knowledge → Graph → Evidence → Rules → Verdict → Answer |
| **Owner Control Layer** | Owner Assistant role; reality check; paper-done; owner verdicts |
| **Strategy Layer** | Strategy Capability; ranked actions; ENABLES/BLOCKS graph |

**Запрещено** вводить принципы, противоречащие этим решениям.

---

# Принципы

## Принцип 1. ЯСИИ — цифровой интеллектуальный сотрудник

ЯСИИ **не является**:

- чатом;
- поиском по документам;
- AI-виджетом;
- отдельным сервисом;
- генератором ответов.

ЯСИИ **является** цифровым интеллектуальным сотрудником платформы ЯсноПро.

Он действует как коллега: знает контекст работы, зону ответственности, права доступа и применимые знания. Его ценность — в **точности, объяснимости и соответствии платформе**, а не в объёме сгенерированного текста.

---

## Принцип 2. AI Developer — роль, а не система

AI Developer является **первой ролью** внутри ЯСИИ (YASII Developer).

**Запрещено** рассматривать AI Developer как:

- отдельный продукт;
- отдельный AI Core;
- самостоятельный модуль вне YASII Core;
- верхнеуровневую архитектурную сущность.

Все артеfacts AI Developer (Knowledge, Graph, Runtime, Review) — **capabilities и конфигурации** внутри ЯСИИ.

---

## Принцип 3. Один Core

Существует **единый YASII Core**. Все роли используют один и тот же Core:

```text
YASII Core
├── Identity Layer
├── Context Layer
├── Permission Layer
├── Memory Layer
├── Knowledge Layer
├── Knowledge Graph
├── Code Knowledge Layer
├── Runtime Engine
├── Answer Builder
└── Audit Trail
```

**Запрещено** создавать отдельные независимые AI Core для разных ролей, tenant-ов или feature.

Новая роль = **Role Profile + Capabilities**, а не новый движок.

---

## Принцип 4. Context First

Ответ ЯСИИ строится по формуле:

```text
Answer = f(
    User,
    Tenant,
    Role,
    Permissions,
    Context,
    Object,
    Process,
    Knowledge,
    Question
)
```

**Question не является главным входом.**

Обязательные предусловия формирования ответа:

1. **Identity** — кто спрашивает
2. **Context** — где находится пользователь
3. **Permissions** — что ему разрешено видеть

Без Identity + Context + Permissions ответ **не строится** (fail-closed).

Один и тот же текст вопроса («Что сейчас не так?») даёт **разные ответы** для владельца платформы, руководителя проекта и инженера — потому что меняются User, Role, Permissions и Context.

---

## Принцип 5. Permission First

**Permission Boundary** применяется **до** получения данных.

Фильтрация выполняется на каждом этапе pipeline:

```text
Identity → Permission Boundary → Knowledge → Graph → Evidence → Answer
```

**Запрещено:**

- получать данные без проверки доступа;
- загружать полный dataset и фильтровать ответ **после** получения данных (cosmetic redaction);
- обходить Permission Layer ради «полноты ответа».

При частичном доступе ЯСИИ явно сообщает об ограничении и отвечает **только по доступной области**.

---

## Принцип 6. Tenant Awareness

Знания ЯСИИ разделены на три уровня:

| Уровень | Содержание | Scope |
|---------|------------|-------|
| **Platform Knowledge** | Архитектура, roadmap, code, migration, system health | Вся платформа ЯсноПро |
| **Tenant Knowledge** | Процессы, объекты, документы, пользователи, проекты, риски | Конкретная компания |
| **Session Context** | Открытая страница, объект, фильтры, workflow step | Момент запроса |

Каждый tenant обладает **собственной областью знаний**.

Effective Knowledge Scope:

```text
(Platform Knowledge ∩ Role allowed domains)
∪ (Tenant Knowledge ∩ tenant_id ∩ permissions)
∩ Context anchors
```

**Запрещено** хранить tenant knowledge вне общей модели знаний ЯСИИ.

---

## Принцип 7. Platform Native AI

ЯСИИ является **частью платформы**, а не надстройкой над ней.

ЯСИИ обязан понимать:

- объектную модель (Entity Layer, Object Types);
- процессы (Workflow / Process Engine);
- документы;
- маршруты и navigation;
- роли и права;
- tenant и scope;
- историю изменений (Event Engine, Audit).

**Платформа является источником истины для ЯСИИ.** ЯСИИ не создаёт параллельную модель реальности.

---

## Принцип 8. Knowledge Before Intelligence

Качество ЯСИИ определяется **качеством знаний**, а не «умностью» механизма ответа.

**Запрещено** компенсировать отсутствие знаний генерацией или догадками.

Последовательность обработки:

```text
Knowledge
    ↓
Graph
    ↓
Evidence
    ↓
Reasoning
    ↓
Answer
```

Reasoning без Knowledge Graph и Evidence — **архитектурное нарушение**.

---

## Принцип 9. Deterministic First

Если задача может быть решена через:

- правила (ADR, Baseline, Migration Map, Lifecycle);
- граф (dependencies, regulations, impact);
- факты (analyzer, tests, manifest);
- evidence (live scan, dashboard state);

— ЯСИИ **обязан** использовать их.

Генеративные механизмы (LLM, probabilistic inference) являются **вторичными** и **не заменяют** rule engine, graph traversal и evidence resolver.

MVP и baseline ЯСИИ — **fully deterministic**.

---

## Принцип 10. Evidence Over Opinion

При конфликте между заявлением и фактом:

```text
Evidence > Declaration
```

Analyzer, тесты и фактическое состояние кода/системы имеют приоритет над:

- declared status в документации;
- dashboard status без подтверждения evidence;
- «paper-done» work items.

Falsely_done — архитектурно значимое состояние, которое ЯСИИ обязан выявлять и фиксировать.

---

## Принцип 11. Reality Over Documentation

Приоритет источников истины (от высшего к низшему):

```text
1. Analyzer Evidence
2. Runtime State
3. Dashboard State (if fresh)
4. Declared Status
5. Documentation
```

Документация **не может** переопределять фактическое состояние системы.

Tier 0–1 (ADR, Direction, Baseline) остаются **нормативными** для «что должно быть», но **не доказывают** «что реально сделано». Для факта выполнения — Evidence (Принцип 10).

---

## Принцип 12. Fail Closed

При недостатке данных ЯСИИ **не делает предположений**.

Допустимые исходы:

| Verdict / Status | Когда |
|------------------|-------|
| **UNKNOWN** | Недостаточно evidence для классификации |
| **INSUFFICIENT EVIDENCE** | Частичные данные, нельзя утверждать |
| **ACCESS DENIED** | Permission boundary не позволяет ответить |

**Запрещено** повышать confidence или смягчать verdict из-за отсутствия данных.

---

## Принцип 13. Embedded Intelligence

ЯСИИ работает **внутри платформы**, а не как отдельное окно.

Основные точки входа:

- карточка объекта;
- реестр;
- документ;
- процесс;
- dashboard (Owner Dashboard, Platform Development);
- Designer.

Host supplies **HostContext**. **ACE** produces **ContextSnapshot** and **PermissionBoundary**. **YASII Runtime Entry** derives **EffectiveScope** (= PermissionBoundary ∩ Current Context) before Knowledge, Graph and Evidence access.

**Отдельный универсальный чат не является основной формой взаимодействия.**

Standalone chat как primary entry point — **запрещённая архитектурная практика** (см. раздел «Запрещённые решения»).

---

## Принцип 14. Explainability

Каждый ответ ЯСИИ **обязан** содержать:

| Section | Содержание |
|---------|------------|
| **Verdict** | Классификация (ALLOWED, ON TRACK, DO NEXT, …) |
| **Evidence** | Факты с указанием силы (strong / partial / weak) |
| **Sources** | Citations: документы, rule ids, graph paths |
| **Risks** | Предупреждения, blockers, debt |
| **Recommendations** | Детерминированные следующие шаги |

Ответ без Verdict и Sources считается **невалидным**.

BLOCKED / ALLOWED normative answers без Tier 0–1 citation — **невалидны**.

---

## Принцип 15. Auditability

Каждый ответ ЯСИИ **воспроизводим**.

Audit Trail сохраняет:

- пользователя (`user_id`);
- tenant (`tenant_id`);
- контекст (`ContextSnapshot` из ACE handoff);
- роль (`yasii_role_id`);
- источники знаний (tiers, documents, graph trace);
- применённые правила (rule ids, results);
- evidence bundle (hash / snapshot ref);
- итоговый verdict;
- redaction log (что скрыто из-за permissions);
- timestamp pipeline stages.

Без Audit Trail система **не соответствует** определению ЯСИИ.

---

## Принцип 16. Memory Is Strategic Asset

**Memory Layer** — часть интеллектуального капитала платформы, а не побочный лог.

ЯСИИ сохраняет и использует:

- архитектурные решения (ADR, waivers, deviations);
- историю платформы (phases, work items, readiness);
- историю tenant (future: processes, objects, decisions);
- историю процессов (workflow events);
- историю взаимодействия (questions, answers, verdicts, audit).

Memory **не дублирует** Knowledge Layer — она хранит **временную и эпизодическую** информацию (что было спрошено, решено, отклонено), связанную с graph nodes.

**Запрещено** создавать роли со **своей изолированной памятью** вне Memory Layer Core.

---

## Принцип 17. Role Driven Behavior

**Role Layer** определяет поведение ЯСИИ:

| Параметр | Определяется ролью |
|----------|-------------------|
| Knowledge domains | Platform / Tenant / Code / … |
| Tier selection | какие Tier 0–7 загружать |
| Rule packs | architecture, migration, legacy, evidence, … |
| Answer templates | Developer Answer, Owner Report, … |
| Capabilities | review, report, strategy, reality check |
| Restrictions | permission ceiling, forbidden actions |
| Verdict vocabulary | ALLOWED/BLOCKED vs ON TRACK/OFF TRACK |

Один Core — множество Role Profiles. Роль **конфигурирует**, а не **дублирует** Core.

---

## Принцип 18. Capability Reuse

Новые роли **не создают** новые движки.

Любая роль собирается из:

```text
Core
+
Role Profile
+
Capabilities
```

Capabilities переиспользуются между ролями:

| Capability | Roles |
|------------|-------|
| Architecture Review | Developer, Architect |
| Owner Report | Owner Assistant |
| Strategy Recommendation | Owner Assistant, Architect |
| Reality Check | Owner Assistant |
| Improvement Analysis | Developer, Owner Assistant |

**Запрещено** дублировать capabilities между ролями под разными именами без обоснования ADR.

---

## Принцип 19. Knowledge Graph Is Mandatory

Все знания ЯСИИ должны быть **связаны через Knowledge Graph**.

Node types (platform): Document, Rule, Phase, WorkItem, Module, Deviation, DebtItem, Evidence, …  
Edge types: DEFINES, REGULATES, CONTAINS, VERIFIED_BY, CONTRADICTS, ENABLES, BLOCKS, DEPENDS_ON, …

**Запрещено** строить ответы на основании разрозненных документов **без** графа зависимостей.

Retrieval без graph trace — допустим только как **первичный anchor** для входа в Graph Resolver.

---

## Принцип 20. Graph Before Search

При наличии графовых связей ЯСИИ **обязан** использовать граф.

Поиск (keyword, index lookup) — **вспомогательный** механизм для:

- нахождения entry anchor (document, rule, work item);
- fallback при отсутствии graph path (с verdict UNKNOWN).

Traversal profile определяется Role + Intent, не произвольным search ranking.

---

## Принцип 21. No Autonomous Actions

ЯСИИ **не выполняет** изменения самостоятельно:

- не меняет код;
- не обновляет roadmap / dashboard;
- не создаёт / не удаляет объекты tenant;
- не публикует Designer;
- не применяет waivers.

Любое действие в платформе требует **явного подтверждения пользователя** через стандартные UI/platform flows.

ЯСИИ формирует **рекомендации и next actions**, а не side effects.

---

## Принцип 22. Evolution Through Roles

Развитие ЯСИИ происходит через:

- **новые роли** (Analyst, Auditor, Project Manager, Navigator, …);
- **новые capabilities** (reuse в Core);
- **новые knowledge domains** (Tenant Knowledge, Process Knowledge, …).

**Запрещено** создавать отдельные AI-системы внутри платформы (второй chat, второй core, role-specific engine).

Эволюция = расширение Role Catalog + Knowledge Domains, а не fork архитектуры.

---

# Запрещённые архитектурные решения

Следующие решения **запрещены** без ADR с явным waiver от архитектурного owner:

| # | Запрещено | Нарушает |
|---|-----------|----------|
| 1 | Создавать отдельный AI Core | Принцип 3 (One Core) |
| 2 | Создавать роли со своей изолированной памятью | Принципы 3, 16 |
| 3 | Обходить Permission Layer | Принцип 5 |
| 4 | Обходить Context Layer | Принцип 4 |
| 5 | Обходить Identity Layer | Принцип 4 |
| 6 | Строить ответы без Knowledge Graph | Принципы 19, 20 |
| 7 | Standalone AI Chat как основной сценарий | Принцип 13 |
| 8 | Дублировать capabilities между ролями | Принцип 18 |
| 9 | Хранить tenant knowledge вне общей модели знаний | Принцип 6 |
| 10 | Рассматривать AI Developer как отдельный продукт | Принцип 2 |
| 11 | Компенсировать отсутствие знаний LLM-генерацией в MVP | Принципы 8, 9 |
| 12 | Фильтровать permissions post-hoc в Answer Builder | Принцип 5 |
| 13 | Утверждать DONE без evidence | Принципы 10, 11 |
| 14 | Автономные write-actions от ЯСИИ | Принцип 21 |

---

# Архитектурные инварианты MVP

MVP ЯСИИ **обязан** включать полный Core и две роли. Удаление любого элемента делает MVP **несоответствующим** Конституции.

## Обязательный состав Core

| Component | MVP scope |
|-----------|-----------|
| **Identity Layer** | user, tenant, roles, permissions (platform-level) |
| **Context Layer** | mode, module, page, object, route, source_area |
| **Permission Layer** | tenant + role + object-level (basic) |
| **Memory Layer** | audit-linked history; Q&A persistence |
| **Knowledge Layer** | Platform Knowledge Tier 0–6 |
| **Knowledge Graph** | Platform graph; traversal profiles |
| **Code Knowledge Layer** | manifest, modules, legacy zones |
| **Runtime Engine** | full pipeline (Intent → Verdict) |
| **Answer Builder** | templates + validation |
| **Audit Trail** | full request trace |

## Обязательные роли MVP

| Role | Capabilities |
|------|--------------|
| **YASII Developer** | Dev Query, Architecture Review |
| **YASII Owner Assistant** | Owner Query, Owner Report, Reality Check |

## Явно вне MVP (не нарушает Конституцию при отложении)

- Tenant business roles (Analyst, PM, …)
- Field-level permission reasoning
- Tenant Knowledge Graph
- Strategy Query (full ranking)
- LLM / generative layer
- Autonomous actions
- Scheduled reports

---

# Архитектурные критерии готовности ЯСИИ

ЯСИИ считается **существующим** только если выполнены **все** условия:

| # | Критерий | Проверка |
|---|----------|----------|
| 1 | Понимает пользователя | `AIIdentityContext` resolved на каждый request |
| 2 | Понимает tenant | `tenant_id` в scope всех операций |
| 3 | Понимает контекст | `ContextSnapshot` mandatory (ACE handoff) |
| 4 | Учитывает права | Permission Boundary до data access |
| 5 | Использует Knowledge Graph | graph trace в Audit Trail |
| 6 | Способен объяснить ответ | Verdict + Sources в каждом response |
| 7 | Способен показать evidence | Evidence section с strength |
| 8 | Воспроизводим через Audit Trail | replay по request_id |

**Если хотя бы одно условие не выполняется — система не соответствует определению ЯСИИ.**

---

# Последствия нарушения Конституции

## Классификация нарушений

| Класс | Описание | Пример |
|-------|----------|--------|
| **CRITICAL** | Ломает фундамент; блокирует реализацию | Отдельный AI Core; bypass Permission Layer |
| **MAJOR** | Нарушает инвариант; требует ADR + remediation plan | Standalone chat as primary; post-hoc redaction |
| **MINOR** | Отклонение в деталях; fix в рамках sprint | Incomplete citation format |
| **PROCESS** | Нарушение процесса, не архитектуры | MVP plan без Constitution check |

## Архитектурный долг

Нарушение **MAJOR** без timely remediation → запись в Architecture Debt registry с:

- ссылкой на нарушенный принцип;
- owner;
- remediation target;
- блокировка dependent work items до closure (для CRITICAL/MAJOR).

## Когда требуется ADR

ADR **обязателен** при:

- любом CRITICAL violation (только как waiver с expiration);
- добавлении generative layer (Принцип 9);
- новой роли с permission ceiling выше Owner Assistant;
- изменении формулы ответа (Принцип 4);
- fork Core components.

## Блокировка реализации

Следующие нарушения **блокируют merge / release** YASII-related work:

- CRITICAL violations (1, 3, 4, 5, 10, 11, 12, 14 из таблицы запретов);
- MVP без обязательного Core component;
- Response без Audit Trail;
- Normative verdict без Tier 0–1 citation.

---

# Связь с другими документами

```text
YASII_CONSTITUTION.md          ← КОРНЕВОЙ (настоящий документ)
        │
        ├── YASII Architecture v1
        │       └── Core, Roles, Knowledge Domains, MVP scope
        │
        ├── Knowledge Architecture
        │       └── Tier 0–7, conflict rules, evidence semantics
        │
        ├── Knowledge Graph
        │       └── Nodes, edges, traversal profiles
        │
        ├── Code Knowledge Architecture
        │       └── Repo domains, impact, legacy, manifest
        │
        ├── Runtime Architecture
        │       └── Pipeline stages, Verdict Engine, Answer Builder
        │
        ├── Owner Control Layer
        │       └── Owner Assistant capabilities, reality check
        │
        └── Strategy Layer
                └── Strategy Capability, ranking, ENABLES/BLOCKS
```

### Иерархия применения

1. **YASII Constitution** — инварианты и запреты
2. **YASII Architecture v1** — целевая структура Core + Roles
3. **Domain ADDs** (Knowledge, Graph, Code, Runtime, Owner, Strategy) — детализация компонентов
4. **Roadmap / Work Items / MVP Plans** — планирование в рамках Конституции
5. **Implementation docs** — код и модули

При конфликте между документами **приоритет у Конституции**. Domain ADDs уточняют, но не отменяют принципы.

### Связь с платформенной архитектурой

ЯСИИ опирается на platform core:

- **Entity Model** → Object Knowledge
- **Relation Engine** → graph semantics
- **Event Engine** → history, audit
- **AI Context Model** → semantic layer платформы (ЯСИИ — operationalization для архитектурного и owner intelligence)
- **Scope / Tenant Model** → Tenant Awareness
- **Development Lifecycle** → Phase 5 sync, evidence rules

---

# Архитектурный девиз

```text
Знание без контекста — шум.

Контекст без прав — утечка.

Права без роли — неверный ответ.

Роль без Core — дублирование.
```

---

# Приложение A. Проверочный чеклист (Constitution Compliance)

Перед утверждением любого архитектурного решения по ЯСИИ:

- [ ] Использует единый YASII Core?
- [ ] Identity + Context + Permissions — обязательные входы?
- [ ] Permission Boundary до data access?
- [ ] Knowledge Graph traversal, не только search?
- [ ] Evidence > Declaration?
- [ ] Fail-closed при недостатке данных?
- [ ] Verdict + Sources + Evidence в ответе?
- [ ] Audit Trail?
- [ ] Embedded entry point, не standalone chat?
- [ ] Нет autonomous actions?
- [ ] AI Developer не выделен как отдельная система?
- [ ] Нет дублирования capabilities / Core?

---

# Приложение B. Глоссарий

| Термин | Определение |
|--------|-------------|
| **ЯСИИ (YASII)** | Цифровой интеллектуальный сотрудник платформы |
| **YASII Core** | Единая инфраструктура всех ролей |
| **Role Profile** | Конфигурация поведения роли поверх Core |
| **Capability** | Переиспользуемая операция (Review, Report, …) |
| **Platform Knowledge** | Global знания о платформе (Tier 0–7) |
| **Tenant Knowledge** | Знания конкретной компании |
| **Session Context** | Snapshot UI/process в момент запроса |
| **Permission Boundary** | Resolved set видимых данных для request |
| **Memory Layer** | Стратегическая память: решения, история, interactions |
| **Paper-done** | Declared DONE без evidence confirmation |

---

**Document owner:** Platform Architecture  
**Review cycle:** при каждом major YASII milestone  
**Next documents:** YASII Architecture v1 (detailed ADD), Knowledge Architecture ADD, Runtime ADD
