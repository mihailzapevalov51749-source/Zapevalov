# YASII Master Map

**Статус:** MASTER OVERVIEW DOCUMENT  
**Версия:** 1.0  
**Время чтения:** 10–15 минут  
**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_SYSTEM_MAP.md](./YASII_SYSTEM_MAP.md)

---

## Как читать документы ЯСИИ

| Документ | Вопрос | Аудитория |
|----------|--------|-----------|
| **YASII_MASTER_MAP** (этот документ) | Что такое ЯСИИ и как устроен? | Все — точка входа |
| **YASII_CONSTITUTION** | По каким принципам существует? | Архитекторы, reviewers |
| **YASII_SYSTEM_MAP** | Из чего состоит, зависимости, MVP? | Roadmap, work items, реализация |

```text
MASTER MAP  →  понять систему за 15 минут
CONSTITUTION → проверить решение на соответствие
SYSTEM MAP   → спланировать реализацию
```

---

# Раздел 1. Что такое ЯСИИ

**ЯСИИ** (YASII) — **цифровой интеллектуальный сотрудник** платформы ЯсноПро.

ЯСИИ знает платформу, архитектуру, код, roadmap и (в будущем) конкретную компанию — процессы, объекты, документы, людей. Он отвечает не «на текст вопроса», а на **полную ситуацию** пользователя.

### ЯСИИ — это не

| Не является | Почему |
|-------------|--------|
| Чат | Ответ зависит от user + context + permissions, не от текста alone |
| Виджет | Встроен в host surfaces, не floating overlay |
| Отдельный сервис | Часть платформы, один Core для всех ролей |
| Генератор ответов | Deterministic: knowledge → graph → evidence → rules → verdict |

### ЯСИИ — это

Цифровой коллега, встроенный в карточки, реестры, dashboard, Designer и процессы. Работает на основании:

- **пользователя** — кто спрашивает;
- **роли** — Developer, Owner Assistant, …;
- **контекста** — где находится в UI;
- **прав** — что разрешено видеть;
- **знаний** — tier-иерархия + graph + evidence.

**AI Developer** — не отдельная система, а **первая роль** внутри ЯСИИ (YASII Developer).

---

# Раздел 2. Формула ЯСИИ

Главный принцип формирования ответа:

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

**Question — последний вход, не главный.**

| Элемент | Что это | Пример |
|---------|---------|--------|
| **User** | Кто задаёт вопрос | user_id, profile, org unit |
| **Tenant** | В какой компании / Studio | tenant_id, scope |
| **Role** | Какая роль ЯСИИ активна | Developer, Owner Assistant |
| **Permissions** | Что пользователь может видеть | object/module/action ACL |
| **Context** | Где пользователь в UI | dashboard, designer, object card |
| **Object** | На чём фокус | work_item, risk, project_id |
| **Process** | В каком workflow | approval step, phase gate |
| **Knowledge** | Какие домены и tiers | Platform Tier 0–6, Code Knowledge |
| **Question** | Текст или intent | «Можно ли так?», «Что не так?» |

**Пример:** «Что сейчас не так?»

- **Владелец платформы** → readiness, deviations, paper-done по всей платформе  
- **Руководитель проекта** [future] → только его проекты  
- **Инженер** [future] → объекты в зоне ответственности  

Один текст — разные ответы, потому что меняются User, Role, Permissions, Context.

---

# Раздел 3. Общая архитектура

```text
YASII
│
├── ACE Layer           ← HostContext → ContextSnapshot, PermissionBoundary
├── Core                ← Runtime Entry (EffectiveScope), Memory, Knowledge infra, Runtime, Answer, Audit
├── Knowledge           ← домены знаний, tier model
├── Graph               ← связанная модель всех знаний
├── Runtime             ← pipeline: request → response
├── Roles               ← профили поведения (Developer, Owner, …)
├── Capabilities        ← операции (Review, Report, Reality Check, …)
├── Integrations        ← точки встраивания в платформу
├── Reports             ← owner artefacts (Owner Report, Health Snapshot)
└── Strategy            ← ranked next steps, DO NEXT verdict
```

| Блок | Одной строкой |
|------|---------------|
| **ACE Layer** | Host → HostContext → Identity/Permission → ContextSnapshot + PermissionBoundary |
| **Core** | Memory, runtime, ответ, audit — общее для всех ролей (post-ACE handoff) |
| **Knowledge** | Platform, Code, Tenant, Process, … — что ЯСИИ знает |
| **Graph** | Document → Rule → Module → WorkItem → Evidence — как знания связаны |
| **Runtime** | Deterministic pipeline без LLM |
| **Roles** | Конфигурация Core: какие знания, правила, шаблоны |
| **Capabilities** | Переиспользуемые операции, собираемые ролями |
| **Integrations** | Object Card, Dashboard, Designer — откуда приходит context |
| **Reports** | Структурированные отчёты владельцу |
| **Strategy** | «Что делать дальше» — ranked actions по graph deps |

---

# Раздел 4. Core

## ACE Layer (upstream)

```text
Host Surface → HostContext → AI Context Engine
    → Identity Resolution → Permission Resolution
    → PermissionBoundary → ContextSnapshot
    → ACE handoff
```

| Компонент | Назначение |
|-----------|------------|
| **HostContext** | Host payload per Surface Profile |
| **Identity Resolution** | user, tenant, roles, permissions |
| **Permission Resolution** | role ceilings, object filters |
| **PermissionBoundary** | access boundary до data access |
| **ContextSnapshot** | UI/process snapshot (AIContextSnapshot = alias) |

## YASII Runtime Entry

```text
ACE handoff (ContextSnapshot + PermissionBoundary)
    ↓
EffectiveScope Derivation    ← PermissionBoundary ∩ Current Context
    ↓
YASII Core pipeline
```

| Компонент | Назначение |
|-----------|------------|
| **EffectiveScope** | operational read scope для Knowledge / Graph / Evidence |

## YASII Core (post-handoff)

```text
YASII Core
│
├── Memory Layer         → история решений и взаимодействий
├── Knowledge Layer      → выбор доменов и tiers
├── Knowledge Graph      ← связи между знаниями
├── Code Knowledge       ← repo, modules, legacy, impact
├── Runtime Engine       ← pipeline orchestration
├── Answer Builder       ← шаблоны ответа
└── Audit Trail          ← воспроизводимость
```

| Компонент | Назначение | Зачем нужен |
|-----------|------------|-------------|
| **Memory Layer** | Q&A, verdicts, waivers, architectural history | Интеллектуальный капитал платформы |
| **Knowledge Layer** | Select tiers 0–7 and domains by role | «Можно ли в UT?» → Tier 0 only |
| **Knowledge Graph** | Traverse linked nodes and edges | Graph before search |
| **Code Knowledge** | Manifest, analyzer, modules, legacy zones | Architecture Review, impact |
| **Runtime Engine** | Intent → Resolvers → Rules → Verdict | Deterministic execution |
| **Answer Builder** | Verdict + Evidence + Citations + Actions | Explainability |
| **Audit Trail** | Full trace per request_id | Reproducibility, compliance |

**Инвариант:** один Core для всех ролей. Новая роль = Role Profile, не новый движок. Identity/Context/Permission формируются в ACE, не в YASII Core.

---

# Раздел 5. Runtime

## Pipeline

```text
Request + ACE handoff
    ↓
Validate Handoff    ← ContextSnapshot, PermissionBoundary
    ↓
EffectiveScope      ← YASII Runtime Entry derivation
    ↓
Role + Intent       ← профиль роли, тип запроса
    ↓
Knowledge           ← tiers, domains, documents (within EffectiveScope)
    ↓
Graph               ← subgraph traversal, citations
    ↓
Evidence            ← analyzer, dashboard, tests — merge
    ↓
Rules               ← ADR, baseline, migration, legacy, evidence
    ↓
Verdict             ← ALLOWED/BLOCKED или ON TRACK/OFF TRACK
    ↓
Answer              ← structured response
    ↓
Audit + Response
```

| Этап | Что делает |
|------|------------|
| **ACE Handoff** | HostContext → ContextSnapshot + PermissionBoundary |
| **Runtime Entry** | EffectiveScope = PermissionBoundary ∩ Current Context |
| **Knowledge** | Какие tier-ы загрузить (0–7, role-specific, scoped) |
| **Graph** | Обход Rule → Module → WorkItem → Evidence |
| **Evidence** | Analyzer > Dashboard > Declared status |
| **Rules** | Проверка architecture, migration, legacy rules |
| **Verdict** | Классификация с confidence (fail-closed) |
| **Answer** | Verdict + Summary + Evidence + Citations + Next Actions |

**Приоритет evidence:**

```text
Analyzer Evidence  >  Runtime State  >  Dashboard  >  Declared Status  >  Documentation
```

---

# Раздел 6. Роли

Роль **конфигурирует** Core: знания, правила, шаблоны, capabilities, ограничения.

## MVP

### YASII Developer

| | |
|---|---|
| **Назначение** | Поддержка разработки платформы ЯсноПро |
| **Ключевые вопросы** | «Можно ли так реализовать?» · «Какие файлы менять?» · «Какие риски?» · «Проверь изменение» |
| **Verdicts** | ALLOWED · WARNING · BLOCKED · UNKNOWN |

### YASII Owner Assistant

| | |
|---|---|
| **Назначение** | Контроль развития платформы для владельца |
| **Ключевые вопросы** | «Всё ли по плану?» · «Что реально сделано?» · «Что не по архитектуре?» · «Отчёт за период» |
| **Verdicts** | ON TRACK · MOSTLY ON TRACK · AT RISK · OFF TRACK · UNKNOWN |

## Будущее

| Role | Назначение | Ключевые вопросы |
|------|------------|------------------|
| **YASII Architect** | ADR, trade-offs, паттерны | «Согласовано с baseline?» · «Какой паттерн?» |
| **YASII Analyst** | Аналитика объектов tenant | «Тренды?» · «Аномалии?» |
| **YASII Auditor** | Соответствие регламентам | «Нарушения?» · «Audit trail?» |
| **YASII Methodologist** | Методология, шаблоны процессов | «Как оформить?» · «Best practice?» |
| **YASII Project Manager** | Проекты, сроки, блокеры | «Статус проекта?» · «Что блокирует?» |
| **YASII Navigator** | Навигация по системе | «Где найти?» · «Что дальше?» |
| **YASII Support Assistant** | Помощь пользователям tenant | «Как сделать X?» |

---

# Раздел 7. Capability Library

```text
Role  →  selects Capabilities  →  produces Result
```

| Capability | Result | MVP roles |
|------------|--------|-----------|
| **Architecture Review** | Findings + pass/fail | Developer |
| **Reality Check** | confirmed / falsely_done list | Owner Assistant |
| **Owner Report** | AIOwnerReport + Health Snapshot | Owner Assistant |
| **Dependency Analysis** | DEPENDS_ON tree + blockers | Developer |
| **Impact Analysis** | Blast radius: files, modules, rules | Developer |
| **Knowledge Search** | Anchor nodes → graph entry | All |
| **Graph Traversal** | Subgraph + ranked citations | All |
| **Risk Analysis** | Debt, deviations, blockers summary | Owner Assistant |
| **Improvement Suggestions** | Ranked improvements | Developer, Owner |
| **Strategy Recommendation** | Ranked next actions + DO NEXT | Owner [hints in MVP] |

**Принцип:** Capability живёт в Core Runtime. Роль **выбирает** capabilities, не создаёт новые движки.

```text
YASII Developer
    → Architecture Review + Impact Analysis
    → Result: AIReview + ALLOWED/BLOCKED

YASII Owner Assistant
    → Reality Check + Owner Report
    → Result: AIOwnerReport + ON TRACK/AT RISK
```

---

# Раздел 8. Knowledge Domains

| Domain | Источник | Назначение | MVP |
|--------|----------|------------|:---:|
| **Platform Knowledge** | ADR, Direction, Baseline, Status, Dashboard | Нормативы и declared progress | ● |
| **Code Knowledge** | Repo manifest, analyzer, module scan | Фактическое состояние кода | ● |
| **Tenant Knowledge** | Runtime entities, org, tenant config | Знание компании-клиента | ✗ |
| **Process Knowledge** | Workflow definitions, instances | Бизнес-процессы | ✗ |
| **Object Knowledge** | Object Types, entity graph | Бизнес-объекты | ✗ |
| **Document Knowledge** | Platform docs + tenant files | Регламенты, шаблоны | partial |
| **Historical Knowledge** | Tier 7, retired ADRs | «Почему так не делаем» | partial |
| **Risk Knowledge** | AD-*, deviations, debt registry | Риски и уязвимости | ● |
| **Strategy Knowledge** | Migration Map, ENABLES/BLOCKS | Приоритет следующих шагов | hints |

**Tier model (Platform Knowledge):**

```text
Tier 0  ADR, Direction          ← normative arbiter
Tier 1  Baseline, Lifecycle
Tier 2  Migration Map, Phases
Tier 3  Architecture Status
Tier 4  Platform Dashboard
Tier 5  Analyzer, Tests         ← evidence (Code Knowledge)
Tier 6  Architecture Debt
Tier 7  Historical
```

---

# Раздел 9. Integrations

ЯСИИ **встроен** в host surfaces. Контекст передаётся **автоматически**.

| Surface | Контекст | Что может ЯСИИ | MVP |
|---------|----------|----------------|:---:|
| **Object Card** | object_type, object_id, mode | Анализ объекта, связи, риски [future] | ✗ |
| **Registry** | filters, selected_records | Insights по выборке [future] | ✗ |
| **Document** | document id, tier | Compliance, citations | ○ |
| **Dashboard** | source_area, phase scope | Progress, report, reality check | ● |
| **Designer** | object_type schema, module | Normative checks, impact | ○ |
| **Process** | process_id, workflow_step | Blockers шага [future] | ✗ |
| **Task** | work_item context | Review scope, deps | ○ |
| **Comment** | thread object ref | Contextual help [future] | ✗ |
| **Notification** | event, object ref | Explain alert [future] | ✗ |

**MVP entry points:** Platform Development Dashboard (Developer) · Owner Dashboard (Owner Assistant).

**Запрещено:** standalone universal chat как primary entry point.

---

# Раздел 10. MVP

## Включено

```text
Core
├── Identity, Context, Permission, Memory
├── Knowledge Layer + Knowledge Graph (platform)
├── Code Knowledge Layer
├── Runtime Engine (full pipeline)
├── Answer Builder + Audit Trail

Knowledge
├── Platform Knowledge (Tier 0–6)
└── Code Knowledge

Roles
├── YASII Developer
└── YASII Owner Assistant

Capabilities
├── Architecture Review
├── Reality Check
├── Owner Report
└── Dev Query (via Developer role)
```

## Не включено

| Исключено | Причина |
|-----------|---------|
| Автономные действия | Constitution: No Autonomous Actions |
| Бизнес-роли tenant | Нет Tenant Knowledge Graph |
| Сложный tenant graph | Phase 9+ |
| Полноценная Strategy | Hints in report only; full ranking post-MVP |
| LLM | Deterministic First |
| Field-level permissions | Post-MVP |
| Standalone chat | Embedded Intelligence |

## MVP success (кратко)

- Normative question → verdict + ADR citation  
- Review with violation → fail + rule id  
- Owner reality check → confirmed vs falsely_done  
- Owner Report → verdict + paper-done section  
- Every response: Verdict + Citations + Audit ref  

---

# Раздел 11. Этапы развития

Логика развития (детали → [YASII_SYSTEM_MAP.md](./YASII_SYSTEM_MAP.md) §11):

```text
Phase 1 — Core
    Identity · Context · Permission · Audit skeleton

Phase 2 — Knowledge
    Platform Knowledge index · Tier 0–3 · tier rules

Phase 3 — Graph
    Knowledge Graph · Code Knowledge · Analyzer link · Evidence

Phase 4 — Developer
    Runtime full pipeline · Developer Role · Architecture Review
    Integration: Platform Development Dashboard

Phase 5 — Owner
    Owner Assistant Role · Reality Check · Owner Report
    Integration: Owner Dashboard

Phase 6 — Embedded Intelligence
    Host Contract hardening · context auto-capture · MVP validation

Phase 7 — Strategy
    Full Strategy Capability · YASII Architect · Improvement standalone

Phase 8+ — Tenant YASII
    Tenant Knowledge · business roles · Object Card · Registry integrations
```

```text
Core → Knowledge → Graph → Developer → Owner → Embedded → Strategy → Tenant
```

---

# Раздел 12. Архитектурные инварианты

Кратко из [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md):

| Принцип | Суть |
|---------|------|
| **One Core** | Один Core для всех ролей; новая роль ≠ новый движок |
| **Context First** | Identity + Context + Permissions — обязательны; Question — последний вход |
| **Permission First** | Boundary **до** data access; post-hoc redaction запрещён |
| **Evidence Over Opinion** | Analyzer/tests > declared DONE |
| **Reality Over Documentation** | Факт > paper status |
| **Graph Mandatory** | Ответ через Knowledge Graph, не разрозненные docs |
| **Embedded Intelligence** | Host surfaces, не standalone chat |
| **No Autonomous Actions** | Recommendations only; writes — только через user confirmation |
| **Deterministic First** | Rules + graph + evidence; LLM — вторичен, ADR required |
| **Fail Closed** | UNKNOWN / INSUFFICIENT EVIDENCE при нехватке данных |

**Девиз:**

```text
Знание без контекста — шум.
Контекст без прав — утечка.
Права без роли — неверный ответ.
Роль без Core — дублирование.
```

---

# Раздел 13. Визуальная карта системы

## Единая ASCII-схема ЯСИИ

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                         ПЛАТФОРМА ЯСНОПРО                                     ║
║  Entity · Relation · Event · View · Process · Permission · Tenant · Auth      ║
╚═══════════════════════════════════════╤══════════════════════════════════════╝
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │         HOST SURFACES (Integrations)                           │
        │  Object Card │ Registry │ Document │ Dashboard │ Designer      │
        │  Process │ Task │ Comment │ Notification                       │
        │         │ HostContext + session → ACE                        │
        └─────────┼─────────────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI CONTEXT ENGINE (ACE)                                │
│  Identity Resolution → Permission Resolution → PermissionBoundary            │
│       → ContextSnapshot                                                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ handoff: ContextSnapshot + PermissionBoundary
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YASII CORE                                      │
│  Runtime Entry: EffectiveScope (= PB ∩ Current Context)                        │
│  ┌──────────────┐   ┌──────────────────────────────────────────┐            │
│  │   MEMORY     │   │              ROLE LAYER                   │            │
│  │  history     │   │  Developer │ Owner Asst │ Architect │ …  │            │
│  └──────▲───────┘   └──────────────────┬───────────────────────┘            │
│         │                              │ configures                         │
│  ┌──────┴───────────────────────────────┴───────────────────────────────┐   │
│  │                         KNOWLEDGE                                     │   │
│  │  Platform │ Code │ Tenant* │ Process* │ Object* │ Risk │ Strategy     │   │
│  │  Tier 0────────────7    * = future                                    │   │
│  └───────────────────────────────┬───────────────────────────────────────┘   │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      KNOWLEDGE GRAPH                                   │  │
│  │  Document─Rule─Module─WorkItem─Evidence─Deviation─Debt─Improvement    │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      RUNTIME ENGINE                                    │  │
│  │  Intent → Knowledge → Graph → Evidence → Rules → Verdict              │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  ▼                                           │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐  │
│  │ ANSWER BUILDER  │──►│   AUDIT TRAIL   │──►│        MEMORY           │  │
│  │ Verdict+Evidence│   │  reproducible   │   │   strategic asset       │  │
│  └────────┬────────┘   └─────────────────┘   └─────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPABILITIES → RESULT                                │
│                                                                              │
│  Architecture Review ──► AIReview (ALLOWED/BLOCKED)         [Developer]     │
│  Reality Check       ──► confirmed vs falsely_done          [Owner]         │
│  Owner Report        ──► AIOwnerReport + HealthSnapshot     [Owner]         │
│  Impact Analysis     ──► blast radius + citations           [Developer]     │
│  Strategy Rec.       ──► ranked actions + DO NEXT           [Owner/Arch]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YASII RESPONSE                                       │
│                                                                              │
│   Verdict │ Summary │ Evidence │ Citations │ Risks │ Recommendations │ Actions│
│                                                                              │
│   governed by: YASII_CONSTITUTION.md                                         │
└─────────────────────────────────────────────────────────────────────────────┘

         MVP boundary: ─────────────────────────────────────────
         Core (full) + Platform/Code Knowledge + Dev + Owner + 3 capabilities
         Integrations: Platform Dev Dashboard + Owner Dashboard
         ─────────────────────────────────────────────────────────
```

---

## Быстрая навигация по документам

| Нужно | Документ |
|-------|----------|
| Понять систему за 15 мин | **YASII_MASTER_MAP** (этот) |
| Проверить решение | [YASII_CONSTITUTION](./YASII_CONSTITUTION.md) |
| Спланировать реализацию | [YASII_SYSTEM_MAP](./YASII_SYSTEM_MAP.md) |
| Roadmap work items | YASII_IMPLEMENTATION_ROADMAP (planned) |
| Tier/evidence rules | Knowledge Architecture (design) |
| Pipeline stages | Runtime Architecture (design) |

---

**Document owner:** Platform Architecture  
**Audience:** архитекторы · разработчики · аналитики · владелец платформы  
**Compliance:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md)
