# YASII System Map

**Статус:** SYSTEM ARCHITECTURE MAP  
**Версия:** 1.0  
**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md)  
**Назначение:** визуальная карта ЯСИИ — основа для Roadmap, Dashboard Work Items, Knowledge Graph, MVP Planning

---

## Иерархия документов

```text
YASII_CONSTITUTION.md     ← инварианты и принципы (наивысший приоритет)
        ↓
YASII_SYSTEM_MAP.md       ← настоящий документ (структура системы)
        ↓
Domain ADDs               ← Knowledge, Graph, Runtime, Owner, Strategy
        ↓
YASII_IMPLEMENTATION_ROADMAP.md
Dashboard Work Items / MVP Plans
```

**Конституция задаёт «что нельзя нарушать». System Map показывает «из чего состоит система».**

---

## 0. Executive Summary

**ЯСИИ** — цифровой интеллектуальный сотрудник платформы ЯсноПро.

System Map описывает **полную структуру** ЯСИИ как системы из:

- **Core** — единая инфраструктура (identity, context, permissions, memory, runtime, answer, audit);
- **Knowledge** — домены знаний и Knowledge Graph;
- **Runtime** — deterministic pipeline от Request до Response;
- **Roles** — профили поведения (Developer, Owner Assistant, …);
- **Capabilities** — переиспользуемые операции (Review, Report, Reality Check, …);
- **Integrations** — точки встраивания в host surfaces платформы.

MVP покрывает Core skeleton + Platform/Code Knowledge + 2 роли + 3 capabilities.

---

# Раздел 1. Общая карта ЯСИИ

## 1.1. Верхнеуровневая структура

```text
YASII
│
├── Core                    ← единая инфраструктура всех ролей
├── Knowledge               ← домены знаний + tier model
├── Runtime                 ← pipeline выполнения запросов
├── Roles                   ← профили поведения ЯСИИ
├── Capabilities            ← библиотека операций
├── Integrations            ← host surfaces платформы
├── Knowledge Domains       ← таксономия знаний (view на Knowledge)
├── Reports                 ← owner-facing artefacts
├── Strategy                ← ranked actions, next steps
└── Future Expansion        ← tenant roles, field-level, generative layer
```

## 1.2. Описание разделов

| Раздел | Назначение | Ключевые компоненты |
|--------|------------|---------------------|
| **Core** | Обязательная инфраструктура каждого запроса | Identity, Context, Permission, Memory, Runtime Engine, Answer Builder, Audit |
| **Knowledge** | Хранение и tier-иерархия знаний | Platform, Code, Tenant, Process, Object, … |
| **Runtime** | Deterministic execution pipeline | Resolvers → Rule Engine → Verdict → Answer |
| **Roles** | Конфигурация поведения поверх Core | Developer, Owner Assistant, Architect, … |
| **Capabilities** | Атомарные операции, собираемые ролями | Review, Report, Reality Check, Strategy |
| **Integrations** | Встраивание в UI/platform surfaces | Object Card, Registry, Dashboard, Designer, … |
| **Knowledge Domains** | Логическая группировка знаний для Role Profiles | 9 доменов (см. §3) |
| **Reports** | Структурированные owner artefacts | Owner Report, Health Snapshot, Deviation Summary |
| **Strategy** | Приоритизация следующих шагов | Ranked actions, unlock score, blockers |
| **Future Expansion** | Post-MVP evolution | Tenant KG, business roles, Navigator, Analyst |

## 1.3. Формула системы

```text
YASII = Core + Knowledge(Graph) + Runtime × Role Profile + Capabilities
        embedded in Platform Integrations
        constrained by Constitution
```

## 1.4. Общая диаграмма потока

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Platform Host Surfaces                       │
│   Object Card │ Registry │ Dashboard │ Designer │ Process       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HostContext + user session
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Context Engine (ACE)                       │
│  Identity Resolution → Permission Resolution                       │
│       → PermissionBoundary → ContextSnapshot                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ ACE handoff: ContextSnapshot + PermissionBoundary
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          YASII Core                              │
│  Runtime Entry → EffectiveScope (= PB ∩ Current Context)         │
│  Memory │ Knowledge │ Graph │ Runtime Engine                     │
│       ↓                                                          │
│  Knowledge → Graph → Evidence → Rules → Verdict → Answer         │
│       ↓                                                          │
│  Audit Trail                                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ configured by
              ┌──────────────┴──────────────┐
              ▼                             ▼
       ┌─────────────┐               ┌─────────────┐
       │ Role Profile│               │ Capabilities│
       │ Developer   │               │ Review      │
       │ Owner Asst. │               │ Report      │
       └─────────────┘               │ Reality Chk │
                                     └─────────────┘
                             │
                             ▼
                      YASII Response
              (Verdict + Evidence + Citations + Actions)
```

---

# Раздел 2. YASII Core

## 2.0. ACE Layer (platform infra, upstream)

> **Ownership:** [ADR_YASII_AI_CONTEXT_BOUNDARY.md](./ADR_YASII_AI_CONTEXT_BOUNDARY.md) · [YASII_HOST_INTEGRATION_CONTRACT.md](./YASII_HOST_INTEGRATION_CONTRACT.md) · [YASII_PERMISSION_MODEL.md](./YASII_PERMISSION_MODEL.md)

```text
Host Surface
    ↓
HostContext                    ← raw payload from host integration
    ↓
AI Context Engine (ACE)
    ↓
Identity Resolution            → AIIdentityContext
    ↓
Permission Resolution
    ↓
PermissionBoundary             ← ACE-owned, immutable handoff
    ↓
ContextSnapshot                ← ACE-owned (AIContextSnapshot = serialization alias)
    ↓
ACE handoff envelope           ← ContextSnapshot + PermissionBoundary only
```

| Компонент | Назначение | Выход |
|-----------|------------|-------|
| **HostContext** | Normalized host payload per Surface Profile | Validated host input |
| **Identity Resolution** | Resolve user, tenant, roles, groups | `AIIdentityContext` |
| **Permission Resolution** | Resolve role ceilings, object filters | Permission inputs |
| **PermissionBoundary Builder** | Build access boundary **до** data access | `PermissionBoundary` |
| **ContextSnapshot Builder** | Capture UI/process snapshot | `ContextSnapshot` |

YASII **не** формирует HostContext, ContextSnapshot или PermissionBoundary — только **потребляет** ACE handoff. **EffectiveScope** вычисляется **YASII Runtime Entry** после handoff ([Domain Model](./YASII_DOMAIN_MODEL.md) v1.3 · [Permission Model](./YASII_PERMISSION_MODEL.md) §13).

## 2.1. Состав Core

```text
YASII Core (post-ACE handoff)
│
├── Runtime Entry           → EffectiveScope (= PermissionBoundary ∩ Current Context)
│
├── Memory Layer            → Interaction + Decision history
├── Knowledge Layer         → Tier + Domain resolution
├── Knowledge Graph         → Linked nodes + edges
├── Code Knowledge Layer    → Repo, modules, legacy, impact
├── Runtime Engine          → Pipeline orchestration
├── Answer Builder          → Template assembly + validation
└── Audit Trail             → Full request trace
```

> **Примечание:** Identity, Context и Permission формируются в **ACE Layer** (§2.0). **EffectiveScope** — **YASII Runtime Entry** после ACE handoff. Knowledge Layer, Knowledge Graph и Code Knowledge Layer логически входят в блок **Knowledge** (§3), но физически являются частью Core infrastructure — все роли используют один экземпляр.

## 2.2. Детализация компонентов Core

### Identity / Context / Permission (ACE handoff)

| | |
|---|---|
| **Назначение** | Immutable inputs для YASII pipeline |
| **Formation owner** | **AI Context Engine** |
| **Handoff artifacts** | `AIIdentityContext`, `ContextSnapshot`, `PermissionBoundary` |
| **YASII responsibility** | Validate ACE envelope; derive **EffectiveScope** at Runtime Entry; fail-closed if missing or stale |
| **Блокирует** | Все Knowledge/Graph/Evidence operations без valid handoff |

### Memory Layer

| | |
|---|---|
| **Назначение** | Стратегическая память платформы и взаимодействий |
| **Ответственность** | Q&A history, verdicts, waivers, deviations, architectural decisions |
| **Выход** | Memory refs linked to graph nodes |
| **Зависимости** | Identity; Audit Trail; Knowledge Graph nodes |
| **Блокирует** | Continuity across sessions; waiver tracking |

### Knowledge Layer

| | |
|---|---|
| **Назначение** | Resolve applicable knowledge domains and tiers |
| **Ответственность** | Tier 0–7 selection; domain filtering by Role + Permission |
| **Выход** | `KnowledgeContext` (TierSet, DocumentSet) |
| **Зависимости** | Permission Layer; Role Profile; Context anchors |
| **Блокирует** | Graph Resolver; Rule Engine normative checks |

### Knowledge Graph

| | |
|---|---|
| **Назначение** | Связанная модель всех знаний |
| **Ответственность** | Node index; edge traversal; relevance scoring |
| **Выход** | Subgraph + path traces (citations) |
| **Зависимости** | Knowledge Layer; indexed documents + code + evidence |
| **Блокирует** | Graph Resolver; Strategy; Impact Analysis |

### Code Knowledge Layer

| | |
|---|---|
| **Назначение** | Структурное знание о кодовой базе |
| **Ответственность** | Manifest, modules, API surfaces, legacy zones, import rules, impact |
| **Выход** | CodeContext slice |
| **Зависимости** | Repository manifest; analyzer scan; platform module registry |
| **Блокирует** | Architecture Review; Impact Analysis; Developer queries |

### Runtime Engine

| | |
|---|---|
| **Назначение** | Orchestrate deterministic pipeline |
| **Ответственность** | Intent → Resolvers → Rules → Verdict |
| **Выход** | `VerdictPackage` + intermediate artefacts |
| **Зависимости** | All Core layers above; Role Profile |
| **Блокирует** | Any YASII response |

### Answer Builder

| | |
|---|---|
| **Назначение** | Assemble structured human-readable response |
| **Ответственность** | Templates; sections; citation validation; permission redaction |
| **Выход** | `YASIIResponse` |
| **Зависимости** | Verdict Engine; Graph traces; Role template profile |
| **Блокирует** | Valid response delivery |

### Audit Trail

| | |
|---|---|
| **Назначение** | Reproducibility and compliance |
| **Ответственность** | Persist identity, context, role, sources, rules, verdict, redactions |
| **Выход** | Audit record per request_id |
| **Зависимости** | All pipeline stages |
| **Блокирует** | Constitution compliance («YASII exists» criterion) |

---

# Раздел 3. Knowledge Layer

## 3.1. Домены знаний

```text
Knowledge Layer
│
├── Platform Knowledge       ← Tier 0–4: architecture, roadmap, status, dashboard
├── Code Knowledge           ← Tier 5: repo, modules, legacy, dependencies
├── Tenant Knowledge         ← [future] company-specific entities and org
├── Process Knowledge        ← [future] workflows, BPM, SLA
├── Object Knowledge         ← [future] runtime entities per tenant
├── Document Knowledge       ← platform docs + tenant documents
├── Historical Knowledge     ← Tier 7: retired approaches, ADR history
├── Risk Knowledge           ← architecture debt + tenant risks
└── Strategy Knowledge       ← phase deps, ENABLES/BLOCKS, priorities
```

## 3.2. Tier mapping (Platform Knowledge)

| Tier | Содержание | Домен |
|------|------------|-------|
| 0 | ADR, Architecture Direction | Platform Knowledge |
| 1 | Baseline, Development Lifecycle | Platform Knowledge |
| 2 | Migration Map, Phase docs, Legacy freeze | Platform + Strategy |
| 3 | Architecture Status | Platform Knowledge |
| 4 | Platform Dashboard (cached) | Platform Knowledge |
| 5 | Analyzer, Tests, Manifest | Code Knowledge |
| 6 | Architecture Debt, Improvements | Risk Knowledge |
| 7 | Historical, superseded | Historical Knowledge |

## 3.3. Детализация доменов

| Домен | Источник | Назначение | Основные пользователи (роли) |
|-------|----------|------------|------------------------------|
| **Platform Knowledge** | `docs/architecture/`, ADR, baseline, status, dashboard DB | Нормативы и declared progress платформы | Developer, Owner Assistant, Architect |
| **Code Knowledge** | Repo manifest, analyzer, backend/frontend scan | Фактическое состояние кода | Developer, Architect |
| **Tenant Knowledge** | Runtime entities, org structure, tenant config | Знание конкретной компании | Analyst, PM, Auditor, Support [future] |
| **Process Knowledge** | Workflow definitions, process instances | Понимание бизнес-процессов | Methodologist, PM, Auditor [future] |
| **Object Knowledge** | Object Types, relations, entity graph | Контекст бизнес-объектов | Analyst, Navigator, Support [future] |
| **Document Knowledge** | Platform docs + tenant file storage | Регламенты, шаблоны, attachments | All roles (scoped) |
| **Historical Knowledge** | Tier 7, archived ADRs, retired patterns | «Почему так не делаем» | Developer, Architect |
| **Risk Knowledge** | AD-*, deviations, debt registry, tenant risks | Риски и зоны уязвимости | Owner Assistant, Auditor, PM |
| **Strategy Knowledge** | Migration Map deps, ENABLES/BLOCKS graph | Приоритизация следующих шагов | Owner Assistant, Architect, PM |

## 3.4. Knowledge scope formula

```text
Effective Knowledge =
    (Platform Knowledge ∪ Code Knowledge)           [MVP]
  ∪ (Tenant ∪ Process ∪ Object Knowledge)           [future]
  ∩ PermissionBoundary
  ∩ Role.allowed_domains
  ∩ Context.anchors
```

---

# Раздел 4. Knowledge Graph

## 4.1. Основные node types

```text
Knowledge Graph Nodes
│
├── ArchitectureDocument      ← Tier 0–3 markdown docs
├── ADR                         ← accepted/rejected decisions
├── Rule                          ← normative check (from ADR, baseline, lifecycle)
├── Roadmap                       ← implementation roadmap doc
├── Phase                         ← migration phase (e.g. runtime-foundation)
├── WorkItem                      ← dashboard work item
├── Module                        ← backend/frontend module
├── File                          ← source file in repo
├── AnalyzerCheck                 ← stage_works check function
├── Evidence                      ← scan result, test result, marker
├── Deviation                     ← architecture deviation record
├── Debt                          ← architecture debt item (AD-*)
├── Improvement                   ← improvement suggestion
├── Capability                    ← YASII capability node [meta]
└── Role                          ← YASII role profile node [meta]
```

## 4.2. Основные edge types

| Edge | From → To | Semantics |
|------|-----------|-----------|
| **DEFINES** | ADR / Document → Rule | Документ порождает правило |
| **REGULATES** | Rule → Module / File | Правило регулирует код/модуль |
| **CONTAINS** | Phase → WorkItem | Фаза содержит work item |
| **DEPENDS_ON** | WorkItem → WorkItem | Зависимость выполнения |
| **ENABLES** | WorkItem → WorkItem | Разблокирует другие items |
| **BLOCKS** | Debt / Deviation → WorkItem | Блокирует progress |
| **IMPLEMENTED_BY** | WorkItem → Module / File | Реализация в коде |
| **VERIFIED_BY** | WorkItem → AnalyzerCheck | Проверка analyzer |
| **PRODUCES** | AnalyzerCheck → Evidence | Check даёт evidence |
| **CONTRADICTS** | Evidence ↔ DeclaredStatus | Paper-done conflict |
| **VIOLATES** | Module / File → Rule | Нарушение правила |
| **HAS_RISK** | Module → Debt | Технический/arch debt |
| **SUGGESTS** | Debt / Deviation → Improvement | Предложение улучшения |
| **AFFECTS** | File → Module | Impact blast radius |
| **IMPORTS** | Module → Module | Dependency (incl. forbidden) |
| **BELONGS_TO** | WorkItem → Phase | Phase membership |
| **CITES** | Answer → Document / Rule | Audit citation link |

## 4.3. Graph map (ключевые связи)

```text
ArchitectureDocument ──DEFINES──► Rule ──REGULATES──► Module ──IMPLEMENTED_BY──◄── WorkItem
                                        │                    │
                                        │                    ├── AFFECTS ──► File
                                        │                    └── IMPORTS ──► Module
                                        │
                                        └── VIOLATES ◄── File / Module

Phase ──CONTAINS──► WorkItem ──DEPENDS_ON──► WorkItem
                  │              │
                  │              └── ENABLES ──► WorkItem
                  │
                  └── VERIFIED_BY ──► AnalyzerCheck ──PRODUCES──► Evidence
                                                      │
                                                      └── CONTRADICTS ──► DeclaredStatus

Debt ──HAS_RISK──► Module          Deviation ──SUGGESTS──► Improvement
Debt ──BLOCKS──► WorkItem          Deviation ──VIOLATES──► Rule

ADR ──DEFINES──► Rule              Roadmap ──CONTAINS──► Phase
```

## 4.4. Traversal profiles (by intent)

| Profile | Entry anchor | Primary edges | Used by |
|---------|--------------|---------------|---------|
| `developer_normative` | Rule, Module | REGULATES, DEFINES | Developer Query |
| `developer_impact` | File, Module | AFFECTS, IMPORTS, REQUIRES_UPDATE | Review, Impact Analysis |
| `owner_reality` | Phase, WorkItem | VERIFIED_BY, PRODUCES, CONTRADICTS | Reality Check |
| `owner_compliance` | Phase, Rule | VIOLATES, REGULATES | Owner Query |
| `strategy_unlock` | WorkItem (open) | ENABLES, BLOCKS, DEPENDS_ON | Strategy Recommendation |
| `improvement` | Debt, Deviation | HAS_RISK, SUGGESTS | Improvement Suggestions |

## 4.5. Graph constraints

- Max depth per profile (4–6 hops)
- Cycle prevention on DEPENDS_ON / IMPORTS
- CONTRADICTS: collect pair, do not expand further
- Top-K nodes (default K=25) for citations
- Graph traversal **mandatory** before search ranking (Constitution §19–20)

---

# Раздел 5. Runtime Engine

## 5.1. Pipeline

```text
Request (YASIIRequest) + ACE handoff
    ↓
Validate ACE Handoff         ← ContextSnapshot, PermissionBoundary
    ↓
EffectiveScope Derivation    ← YASII Runtime Entry (PermissionBoundary ∩ Current Context)
    ↓
Role Selection               ← Role Profile load
    ↓
Intent Resolver              ← request type classification
    ↓
Knowledge Resolver           ← Tier + Domain selection (within EffectiveScope)
    ↓
Graph Resolver               ← Subgraph traversal
    ↓
Evidence Resolver            ← Merge analyzer, dashboard, tests
    ↓
Rule Engine                  ← Evaluate applicable rules
    ↓
Verdict Engine               ← Audience-specific verdict + confidence
    ↓
Answer Builder               ← Template assembly + validation
    ↓
Audit Trail Persist
    ↓
Response (YASIIResponse)
```

## 5.2. Этапы pipeline

| Stage | Назначение | Вход | Выход |
|-------|------------|------|-------|
| **ACE Handoff Validation** | Verify immutable ACE envelope | HostContext → ACE pipeline | `ContextSnapshot`, `PermissionBoundary` |
| **EffectiveScope Derivation** | Derive operational read scope | ContextSnapshot + PermissionBoundary | `EffectiveScope` |
| **Role Selection** | Pick YASII role + profile | Identity, Context, explicit role | `RoleProfile` |
| **Intent Resolver** | Classify request type | Question, API type, subject | `RequestProfile` |
| **Knowledge Resolver** | Select tiers and documents | Profile, subject, EffectiveScope | `KnowledgeContext` |
| **Graph Resolver** | Traverse relevant subgraph | Anchors, traversal profile | `GraphContext` |
| **Evidence Resolver** | Collect and merge evidence | Subgraph, scan flags | `EvidenceBundle` |
| **Rule Engine** | Evaluate rules | Evidence, subgraph, profile | `RuleResults[]` |
| **Verdict Engine** | Compute verdict | Rules, evidence, audience | `VerdictPackage` |
| **Answer Builder** | Build structured response | Verdict, citations, template | `YASIIResponse` |

## 5.3. Verdict vocabularies

| Audience | Verdicts |
|----------|----------|
| Developer | ALLOWED, WARNING, BLOCKED, UNKNOWN |
| Owner | ON TRACK, MOSTLY ON TRACK, AT RISK, OFF TRACK, UNKNOWN |
| Strategy | DO NEXT, DEFER, BLOCKED BY DEPENDENCY, NEEDS DECISION, LOW VALUE NOW |

## 5.4. Response sections (mandatory)

```text
Verdict → Summary → Evidence → Citations → Risks → Recommendations → Next Actions
```

## 5.5. Runtime state machine

```text
RECEIVED → RESOLVING_IDENTITY → RESOLVING_CONTEXT → BUILDING_PERMISSIONS
    → LOADING_ROLE → RESOLVING_INTENT → LOADING_KNOWLEDGE → TRAVERSING_GRAPH
    → EVALUATING_EVIDENCE → APPLYING_RULES → BUILDING_VERDICT → BUILDING_RESPONSE
    → COMPLETED | FAILED
```

---

# Раздел 6. Роли ЯСИИ

## 6.1. Role model

```text
Role = RoleProfile {
    knowledge_domains[],
    tier_rules,
    graph_profiles[],
    rule_categories[],
    capabilities[],
    answer_templates[],
    permission_ceiling,
    verdict_set,
    restrictions[]
}
```

## 6.2. MVP роли

### YASII Developer

| | |
|---|---|
| **Цель** | Поддержка разработки платформы ЯсноПро |
| **Знания** | Platform Knowledge (Tier 0–2, 6), Code Knowledge, Historical |
| **Capabilities** | Architecture Review, Dev Query, Impact Analysis, Dependency Analysis, Knowledge Search, Graph Traversal, Improvement Suggestions (hints) |
| **Ограничения** | Нет owner dashboard metrics; нет tenant business data; read-only; no autonomous writes |

### YASII Owner Assistant

| | |
|---|---|
| **Цель** | Контроль развития платформы для владельца |
| **Знания** | Platform Knowledge (Tier 0–6), Strategy Knowledge, Risk Knowledge, Dashboard, Analyzer |
| **Capabilities** | Owner Report, Reality Check, Risk Analysis, Strategy Recommendation (basic), Improvement Suggestions |
| **Ограничения** | Не даёт implementation how-to без dev escalation; read-only; owner-role permission ceiling |

## 6.3. Следующие роли

| Role | Цель | Знания | Capabilities | Ограничения |
|------|------|--------|--------------|-------------|
| **YASII Architect** | Архитектурные решения, ADR, trade-offs | Platform 0–2, Strategy, Historical | Architecture Review, Strategy Recommendation, Impact Analysis | No code mutation |
| **YASII Analyst** | Аналитика объектов tenant | Tenant, Object, Process | Knowledge Search, Graph Traversal, Risk Analysis | Tenant scope only |
| **YASII Auditor** | Соответствие регламентам | Process, Document, Risk | Reality Check, Risk Analysis, Graph Traversal | Strict read-only; audit citations |
| **YASII Methodologist** | Методология и шаблоны процессов | Process, Document | Knowledge Search, Improvement Suggestions | No operational data |
| **YASII Project Manager** | Проекты, сроки, блокеры | Tenant, Object, Process, Risk | Reality Check, Strategy Recommendation, Risk Analysis | User's projects only |
| **YASII Navigator** | Навигация по системе | Object, Context, routes | Knowledge Search, Graph Traversal | No deep analysis |
| **YASII Support Assistant** | Помощь пользователям tenant | Object, Document, Process | Knowledge Search, Graph Traversal | No platform architecture exposure |

## 6.4. Role × Capability matrix (full)

| Capability | Dev | Owner | Architect | Analyst | Auditor | Methodologist | PM | Navigator | Support |
|------------|:---:|:-----:|:---------:|:-------:|:-------:|:-------------:|:--:|:---------:|:-------:|
| Architecture Review | ● | | ● | | | | | | |
| Reality Check | | ● | | | ● | | ● | | |
| Owner Report | | ● | | | | | | | |
| Dependency Analysis | ● | | ● | | | | ● | | |
| Impact Analysis | ● | | ● | | | | | | |
| Knowledge Search | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Graph Traversal | ● | ● | ● | ● | ● | | ● | ● | ● |
| Risk Analysis | | ● | | ● | ● | | ● | | |
| Improvement Suggestions | ● | ● | ● | | | ● | ● | | |
| Strategy Recommendation | | ● | ● | | | | ● | | |

---

# Раздел 7. Capabilities

## 7.1. Библиотека capabilities

```text
YASII Capabilities
│
├── Architecture Review         ← normative + legacy + evidence rules on scope
├── Reality Check               ← declared vs analyzer-confirmed status
├── Owner Report                ← structured owner briefing + health snapshot
├── Dependency Analysis         ← WorkItem / Module DEPENDS_ON graph
├── Impact Analysis             ← File/Module blast radius via AFFECTS/IMPORTS
├── Knowledge Search            ← anchor lookup → entry to graph
├── Graph Traversal             ← profile-driven subgraph walk
├── Risk Analysis               ← debt, deviations, blockers aggregation
├── Improvement Suggestions     ← ranked improvements from debt/deviations
└── Strategy Recommendation     ← ranked next actions with unlock score
```

## 7.2. Capability definitions

| Capability | Input | Output | Core stages used |
|------------|-------|--------|------------------|
| **Architecture Review** | Scope (modules, files, change type) | AIReview: findings + pass/fail | Intent, Knowledge, Graph, Evidence, Rules, Verdict |
| **Reality Check** | Phase or WorkItem scope | Confirmed / partial / falsely_done list | Graph (owner_reality), Evidence, Verdict |
| **Owner Report** | Period, platform scope | AIOwnerReport + HealthSnapshot | Full Owner Pipeline (§Reports) |
| **Dependency Analysis** | WorkItem or Module anchor | Dependency tree + blockers | Graph (DEPENDS_ON, BLOCKS) |
| **Impact Analysis** | File or Module anchor | Affected modules, rules, docs | Graph (AFFECTS, IMPORTS, REGULATES) |
| **Knowledge Search** | Query text / slug | Anchor nodes for graph entry | Knowledge Layer index |
| **Graph Traversal** | Anchor + profile | Subgraph + ranked nodes | Graph Resolver |
| **Risk Analysis** | Scope (phase, module, tenant) | Risk register summary | Graph (HAS_RISK, VIOLATES), Debt nodes |
| **Improvement Suggestions** | Optional area filter | Ranked AIImprovementSuggestion[] | Graph (SUGGESTS), Improvement Layer |
| **Strategy Recommendation** | Current phase | Ranked actions + DO NEXT verdict | Graph (ENABLES, BLOCKS), Strategy Knowledge |

## 7.3. Capability reuse principle

```text
Capability ≠ Role
Capability ⊂ Core Runtime
Role = select Capabilities + configure Knowledge + apply Templates
```

Новая роль **не создаёт** новый Review engine — она **активирует** Architecture Review с другим permission ceiling и template.

---

# Раздел 8. Integrations

## 8.1. Host surfaces map

```text
Platform Host Surfaces
│
├── Object Card              ← runtime entity card
├── Registry                 ← table / list view
├── Dashboard                ← Owner Dashboard, Platform Development
├── Designer                 ← object type / view design
├── Document                 ← architecture doc, tenant file
├── Process                  ← workflow instance
├── Task                     ← work item / assignment
├── Comment                  ← communication thread
└── Notification             ← alert / routing context
```

## 8.2. Integration details

| Surface | Context passed | Role default | YASII use |
|---------|----------------|--------------|-----------|
| **Object Card** | object_type, object_id, mode, route | Context-dependent | «Что не так с объектом?», связи, риски [future tenant] |
| **Registry** | object_type, filters, selected_records | Analyst / PM [future] | Агрегация по выборке, bulk insights |
| **Dashboard** | source_area=dashboard, phase scope | Owner Assistant | Progress, deviations, reports, strategy |
| **Designer** | module=designer, object_type schema | Developer | Normative checks, schema impact, publish rules |
| **Document** | document id, doc tier | Developer / Architect | Citation, compliance, doc freshness |
| **Process** | process_id, workflow_step | Methodologist / PM [future] | Step blockers, SLA, next action |
| **Task** | work_item context | Developer / PM | Scope review, dependency check |
| **Comment** | thread object ref | Support [future] | Contextual help on discussed object |
| **Notification** | event type, object ref | Navigator / Support [future] | Explain notification, suggest action |

## 8.3. Host Integration Contract

```text
Host Surface obligations:
  1. Provide HostContext on every YASII-bound request (ACE normalizes to ContextSnapshot)
  2. Provide UI slot (panel / drawer / inline) — not standalone chat
  3. Refresh HostContext on navigation / selection change

ACE obligations:
  1. Produce ContextSnapshot and PermissionBoundary before YASII handoff
  2. Fail-closed on invalid HostContext or permission resolution errors

YASII obligations:
  1. Derive EffectiveScope at Runtime Entry (= PermissionBoundary ∩ Current Context)
  2. Never fetch data outside PermissionBoundary / EffectiveScope
  3. Never navigate on behalf of user
  4. Always return Verdict + Citations + Audit ref
```

## 8.4. MVP integration points

| Surface | MVP | Role |
|---------|:---:|------|
| Platform Development Dashboard | ● | Developer |
| Owner Dashboard | ● | Owner Assistant |
| Designer | ○ optional | Developer |
| Object Card / Registry | ✗ post-MVP | — |

---

# Раздел 9. MVP Scope

## 9.1. MVP boundary diagram

```text
┌─────────────────────────────────────────────────────────┐
│                      MVP YASII                           │
│                                                          │
│  Core                                                    │
│  ├── Identity Layer          ●                           │
│  ├── Context Layer           ●                           │
│  ├── Permission Layer        ● (tenant + role + object)  │
│  ├── Memory Layer            ● (basic + audit-linked)    │
│  ├── Knowledge Layer         ● (Platform Tier 0–6)       │
│  ├── Knowledge Graph         ● (platform graph)          │
│  ├── Code Knowledge Layer    ●                           │
│  ├── Runtime Engine          ● (full pipeline)           │
│  ├── Answer Builder          ●                           │
│  └── Audit Trail             ●                           │
│                                                          │
│  Knowledge                                               │
│  ├── Platform Knowledge      ●                           │
│  ├── Code Knowledge          ●                           │
│  └── Tenant Knowledge        ✗                           │
│                                                          │
│  Roles                                                   │
│  ├── YASII Developer         ●                           │
│  └── YASII Owner Assistant   ●                           │
│                                                          │
│  Capabilities                                            │
│  ├── Architecture Review     ●                           │
│  ├── Owner Report            ●                           │
│  ├── Reality Check           ●                           │
│  ├── Dev Query               ● (via Runtime)             │
│  └── Strategy (full rank)    ✗ (hints in report only)    │
│                                                          │
│  Integrations                                            │
│  ├── Platform Dev Dashboard  ●                           │
│  ├── Owner Dashboard         ●                           │
│  └── Other surfaces          ✗                           │
└─────────────────────────────────────────────────────────┘
```

## 9.2. MVP Core (explicit)

| Component | MVP scope |
|-----------|-----------|
| Identity Layer | user, tenant, platform roles, permissions |
| Context Layer | mode, module, page, object, route, source_area |
| Permission Layer | tenant + role + basic object-level |
| Runtime Skeleton | **full pipeline** (not partial) — Constitution requirement |
| Memory Layer | Q&A persistence, audit-linked history |
| Audit Trail | full trace per request |

## 9.3. MVP Knowledge

| Domain | Included |
|--------|:--------:|
| Platform Knowledge | Tier 0–6 |
| Code Knowledge | manifest, modules, analyzer, legacy zones |
| All other domains | ✗ |

## 9.4. MVP Roles & Capabilities

| | |
|---|---|
| **Roles** | YASII Developer, YASII Owner Assistant |
| **Capabilities** | Architecture Review, Owner Report, Reality Check (+ Dev Query via Developer role) |

## 9.5. MVP success signals (from Constitution)

1. Normative question → BLOCKED/ALLOWED + ADR citation  
2. Review with legacy violation → fail + rule id  
3. Owner reality check → confirmed vs falsely_done  
4. Owner Report → verdict + paper-done section  
5. 100% responses: Verdict + Citations  
6. Zero LLM in execution path  

---

# Раздел 10. Карта зависимостей

## 10.1. Dependency chain

```text
Platform Auth / Session
    ↓
Identity Layer
    ↓
Context Layer                    Host Integration Contract
    ↓                                    ↓
Permission Layer ◄───────────────────────┘
    ↓
Role Layer (Profile selection)
    ↓
┌───┴───────────────────────────────────┐
│           Knowledge Layer              │
│     ├── Platform Knowledge index       │
│     ├── Code Knowledge index           │
│     └── Tier selection rules           │
└───┬───────────────────────────────────┘
    ↓
Knowledge Graph (indexed nodes + edges)
    ↓
Runtime Engine
    ├── Intent Resolver
    ├── Graph Resolver
    ├── Evidence Resolver ◄── Platform Dashboard Analyzer
    ├── Rule Engine         ◄── ADR, Baseline, Lifecycle rules
    └── Verdict Engine
    ↓
Answer Builder
    ↓
Audit Trail ──► Memory Layer
    ↓
Capabilities (via Role Profile)
    ↓
Integrations (host surfaces)
```

## 10.2. Dependency matrix

| Component | Depends on | Blocks |
|-----------|------------|--------|
| ACE Layer (HostContext → ContextSnapshot + PermissionBoundary) | Platform auth, Host contract, permissions | YASII handoff |
| YASII Runtime Entry (EffectiveScope) | ACE handoff | Knowledge, Graph, Evidence |
| Knowledge Layer | PermissionBoundary, EffectiveScope, Role Profile | Graph, Rules |
| Knowledge Graph | Knowledge index, analyzer, docs | Graph Resolver, Strategy, Impact |
| Code Knowledge | Repo manifest, analyzer | Developer Review, Impact |
| Runtime Engine | ACE handoff + Knowledge infra | All capabilities |
| Answer Builder | Verdict, templates | Response delivery |
| Audit Trail | Runtime stages | Constitution compliance |
| Memory Layer | Audit, Graph nodes | Session continuity |
| Roles | Core complete | Capabilities activation |
| Capabilities | Runtime + Role | Integration value |
| Integrations | HostContext + ACE + Role | User-facing YASII |

## 10.3. Critical path (build order)

```text
1. ACE Foundation (Identity → Permission → ContextSnapshot + PermissionBoundary)
2. YASII Runtime Entry (EffectiveScope) + Core contracts + Runtime skeleton + Audit
3. Host Integration Contract (normative) + dashboard HostContext bridges
4. Knowledge index (Tier 0–2)     ← normative answers
5. Knowledge Graph (platform)     ← graph before search
6. Code Knowledge + Analyzer link ← evidence layer
7. Runtime Engine (full pipeline) ← execution
8. Answer Builder + Audit         ← valid responses
9. Role: Developer                ← first user-facing role
10. Capability: Architecture Review
11. Capability: Reality Check
12. Role: Owner Assistant
13. Capability: Owner Report
14. Dashboard Integrations        ← MVP entry points
15. Memory Layer (extended)       ← post-MVP hardening
16. Tenant Knowledge + roles      ← Phase 3+
```

## 10.4. Blockers map

| Blocker | Blocks | Resolution |
|---------|--------|------------|
| No platform auth integration | Identity Layer | Use existing session model |
| No analyzer freshness | Evidence quality | Dashboard fingerprint (existing) |
| No graph index | Graph Resolver | Build platform KG index Phase 1 |
| No HostContext contract | Embedded intelligence | YASII_HOST_INTEGRATION_CONTRACT.md (normative) |
| Missing Tier 0 docs | Normative answers | Existing `docs/architecture/` |
| Standalone chat pattern | Constitution violation | Enforce embedded-only MVP |

---

# Раздел 11. Основа для Roadmap

## 11.1. Логические фазы реализации

На основе System Map выводится следующая **логическая последовательность** (детализация — в `YASII_IMPLEMENTATION_ROADMAP.md`):

```text
Phase 1 — ACE + Core Foundation
    ACE Module (Identity Resolution, Permission Resolution,
        ContextSnapshot Builder, PermissionBoundary Builder)
    YASII Module (EffectiveScope Runtime Entry, Request/Response,
        FailureResponse, Runtime skeleton, Audit, Memory basic)

Phase 2 — Knowledge Foundation
    Platform Knowledge index (Tier 0–3)
    Knowledge Graph (platform nodes: Document, ADR, Rule, Phase, WorkItem)
    Tier selection rules

Phase 3 — Evidence & Code
    Code Knowledge Layer
    Analyzer / Dashboard integration
    Evidence Resolver
    Graph nodes: Module, File, AnalyzerCheck, Evidence

Phase 4 — Runtime Engine
    Full pipeline (Intent → Verdict)
    Rule Engine (architecture, migration, legacy, evidence categories)
    Answer Builder + templates
    Memory Layer (basic)

Phase 5 — YASII Developer
    Developer Role Profile
    Capabilities: Dev Query, Architecture Review, Impact Analysis
    Integration: Platform Development Dashboard

Phase 6 — YASII Owner Assistant
    Owner Role Profile
    Capabilities: Reality Check, Owner Report
    Strategy hints (basic, not full ranking)
    Integration: Owner Dashboard

Phase 7 — MVP Hardening
    Constitution compliance verification
    Dashboard Work Items sync
    Paper-done detection
    Stale evidence handling

Phase 8 — Expansion (post-MVP)
    Strategy Capability (full ranking)
    Improvement standalone
    YASII Architect role

Phase 9 — Tenant YASII
    Tenant Knowledge domains
    Tenant Knowledge Graph
    Business roles (Analyst, PM, Auditor, …)
    Object Card / Registry integrations

Phase 10 — Advanced
    Field-level permissions
    Process Knowledge
    Navigator, Support Assistant
    Optional generative layer (ADR required)
```

## 11.2. Phase × System Map mapping

| Phase | System Map sections activated |
|-------|------------------------------|
| 1 | §2 Core (Identity, Context, Permission, Audit) |
| 2 | §3 Knowledge, §4 Graph (platform) |
| 3 | §3 Code Knowledge, §5 Evidence stage |
| 4 | §5 Runtime (full), §2 Memory, Answer Builder |
| 5 | §6 Developer, §7 Review/Impact, §8 Platform Dev integration |
| 6 | §6 Owner, §7 Report/Reality, §8 Owner Dashboard, §Reports |
| 7 | Constitution checklist, §9 MVP validation |
| 8–10 | §6 future roles, §3 tenant domains, §Future Expansion |

## 11.3. Dashboard Work Items derivation

Work Items для Platform Dashboard **выводятся** из Phase 1–7:

```text
Each Phase → Epic
Each Core component / Capability → Work Item
Each Integration point → Work Item
Dependencies from §10.3 → Work Item ordering
```

System Map **не заменяет** Dashboard — она **питает** его структурой.

---

# Раздел 12. Reports & Strategy (subsystems)

## 12.1. Reports subsystem

```text
Reports
│
├── Owner Report Pipeline
│   ├── Load Tier Sources (0–6)
│   ├── Load Dashboard State
│   ├── Load Analyzer Evidence
│   ├── Load Deviations
│   ├── Load Debt
│   ├── Build Snapshot (AIPlatformHealthSnapshot)
│   ├── Build Verdict
│   ├── Build Recommendations
│   └── Build Report (AIOwnerReport)
│
└── Report types
    ├── Platform Health Report      [MVP]
    ├── Phase Report                [MVP]
    ├── Deviation Summary           [MVP]
    └── Historical Comparison       [post-MVP]
```

**Owner:** YASII Owner Assistant via Owner Report capability.

## 12.2. Strategy subsystem

```text
Strategy
│
├── Inputs
│   ├── current_phase
│   ├── readiness (declared vs actual)
│   ├── blockers (DEBT, DEPENDS_ON)
│   ├── open_work_items
│   └── deviations
│
├── Processing
│   ├── enumerate candidates
│   ├── filter dependencies
│   ├── score (unlock, readiness_delta, risk_reduction, effort)
│   └── rank
│
└── Outputs
    ├── ranked actions
    ├── DO NEXT verdict
    └── Strategy Recommendation template
```

**MVP:** hints embedded in Owner Report only.  
**Post-MVP:** full Strategy Capability + YASII Architect role.

---

# Раздел 13. Future Expansion

```text
Future Expansion
│
├── Tenant YASII
│   ├── Tenant Knowledge Graph
│   ├── Org-aware Identity
│   └── Business roles (Analyst, PM, Auditor, …)
│
├── Deep Integrations
│   ├── Object Card embedded panel
│   ├── Registry bulk insights
│   ├── Process step assistant
│   └── Notification explainer
│
├── Advanced Permissions
│   ├── Field-level filtering
│   └── Process-level filtering
│
├── Generative Layer (optional, ADR required)
│   └── Secondary to deterministic Core
│
└── Autonomous Actions (explicitly forbidden without new ADR)
    └── Human confirmation always required
```

---

# Приложение A. Document index map

| Document | System Map section |
|----------|-------------------|
| [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) | All — governing principles |
| YASII Architecture v1 | §1, §2, §6 |
| Knowledge Architecture | §3, tier model |
| Knowledge Graph | §4 |
| Code Knowledge Architecture | §3 Code Knowledge |
| Runtime Architecture | §5 |
| Owner Control Layer | §6 Owner, §12 Reports |
| Strategy Layer | §12 Strategy, §6 Architect/Owner |
| **YASII_IMPLEMENTATION_ROADMAP.md** | §11 (to be created) |

---

# Приложение B. Glossary

| Term | Definition |
|------|------------|
| **YASII** | Цифровой интеллектуальный сотрудник платформы |
| **Core** | Единая инфраструктура всех ролей |
| **Role Profile** | Конфигурация поведения роли |
| **Capability** | Переиспользуемая операция Runtime |
| **Host Surface** | UI-контекст встраивания ЯСИИ |
| **PermissionBoundary** | Resolved access scope для request |
| **Paper-done** | Declared DONE без evidence |
| **Traversal Profile** | Named graph walk configuration |

---

# Архитектурный девиз

```text
Знание без контекста — шум.
Контекст без прав — утечка.
Права без роли — неверный ответ.
Роль без Core — дублирование.
```

*(из YASII Constitution)*

---

**Document owner:** Platform Architecture  
**Used by:** YASII_IMPLEMENTATION_ROADMAP, Dashboard Work Items, MVP Planning, KG indexing  
**Compliance:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md)
