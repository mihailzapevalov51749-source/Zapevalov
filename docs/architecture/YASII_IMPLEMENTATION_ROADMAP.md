# YASII Implementation Roadmap

**Статус:** IMPLEMENTATION GOVERNANCE DOCUMENT  
**Версия:** 1.0  
**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_MASTER_MAP.md](./YASII_MASTER_MAP.md) · [YASII_SYSTEM_MAP.md](./YASII_SYSTEM_MAP.md)

---

## Executive Summary

### Цель ЯСИИ

**ЯСИИ** — цифровой интеллектуальный сотрудник платформы ЯсноПро. Roadmap переводит утверждённую архитектуру в **управляемый план реализации** с измеримым readiness, evidence и привязкой к Platform Dashboard.

### Текущая стадия

| Область | Статус |
|---------|--------|
| Архитектурное проектирование | **Завершено** (Constitution, Master Map, System Map, domain ADDs) |
| Реализация YASII module | **In Progress** — skeleton P1-W01 **DONE** (`modules/yasii/`) |
| Реализация ACE module | **In Progress** — skeleton P1-W02 **DONE** (`modules/ai_context/`) |
| Phase 1 `yasii-core-foundation` | **18%** (2/12 WI по весу: P1-W01, P1-W02) |
| Container «Встроенный ИИ» (MVP rollup) | **1%** (`compute_container_readiness`, 2/74 WI) |
| Platform Dashboard + analyzer | **Active** — catalog, checks, sync; refresh обновляет task status |
| **Следующий WI** | **P1-W03** Identity Resolution (ACE) |

### Целевое состояние (MVP)

Полноценный MVP ЯСИИ (Phase 10 gate passed):

- понимает **user**, **tenant**, **context**, **permissions**;
- использует **Knowledge Graph** и **deterministic Runtime**;
- роли **YASII Developer** и **YASII Owner Assistant** operational;
- capabilities: **Architecture Review**, **Reality Check**, **Owner Report**;
- embedded в **Platform Development Dashboard** и **Owner Dashboard**;
- каждый ответ: **Verdict + Evidence + Citations + Audit Trail**.

### Принципы реализации

1. **Constitution-first** — ни одна work item без ссылки на принцип Конституции.  
2. **Top-down** — Core → Knowledge → Graph → Runtime → Roles → Integrations.  
3. **Evidence-gated** — фаза не Completed без evidence (analyzer / code / dashboard).  
4. **No scope drift** — компоненты только из System Map; новые — через ADR.  
5. **Deterministic MVP** — zero LLM в execution path.  
6. **Dashboard-native** — каждая фаза → stage → work items → evidence → readiness.

---

## Иерархия управления

```text
YASII_CONSTITUTION.md
        ↓
YASII_MASTER_MAP.md
        ↓
YASII_SYSTEM_MAP.md
        ↓
YASII_IMPLEMENTATION_ROADMAP.md    ← настоящий документ
        ↓
Platform Dashboard Work Items
        ↓
Implementation (backend module + integrations)
        ↓
Platform Dashboard Analyzer (evidence checks)
```

---

# Раздел 1. Правила построения Roadmap

## 1.1. Последовательность реализации

Реализация идёт **сверху вниз** — от Core к Roles и Integrations.

```text
Constitution
    ↓
System Map
    ↓
Roadmap (фазы 1–10)
    ↓
Dashboard Work Items
    ↓
Implementation
    ↓
Analyzer Evidence → Readiness update
```

## 1.2. Запрещено

| # | Запрет |
|---|--------|
| 1 | Реализовывать компоненты **вне** Roadmap и System Map |
| 2 | Менять порядок фаз без **ADR + Constitution review** |
| 3 | Создавать функциональность **без привязки к фазе** |
| 4 | Закрывать фазу **без evidence** |
| 5 | Создавать **отдельный AI Core** или standalone chat (Constitution §3, §13) |
| 6 | Вводить LLM в MVP execution path (Constitution §9) |
| 7 | Autonomous write-actions (Constitution §21) |

## 1.3. Work Item обязательные поля

Каждая work item в Dashboard **обязана** содержать:

```text
phase_id          → yasii-phase-N
constitution_ref  → Principle N, …
system_map_ref    → §section
evidence_type     → code | analyzer | dashboard | doc | integration
readiness_weight  → contribution to phase readiness
```

---

# Раздел 2. Dependency Strategy

## 2.1. Полный dependency chain

```text
Phase 1  Core Foundation
    ↓
Phase 2  Knowledge Foundation
    ↓
Phase 3  Knowledge Graph Foundation (+ Code Knowledge nodes, Analyzer links)
    ↓
Phase 4  Runtime Engine Foundation
    ↓
    ├── Phase 5  YASII Developer MVP
    │       ↓
    └── Phase 6  YASII Owner Assistant MVP
            ↓
Phase 7  Embedded Intelligence (MVP: Dashboard surfaces)
    ↓
Phase 10 YASII Platform Readiness  ← MVP GATE
    ↓
Phase 8  Memory Foundation (extended)
    ↓
Phase 9  Strategy Layer (full)
```

> **Примечание:** Phase 8–9 — **post-MVP expansion**. Phase 10 validates MVP (Phases 1–7). Phases 8–9 могут идти параллельно после Phase 10 gate, но не блокируют MVP.

## 2.2. Phase dependency matrix

| Phase | Depends On | Enables | Blocked By |
|-------|------------|---------|------------|
| **1** Core | Platform auth/session | All phases | No session model |
| **2** Knowledge | Phase 1 | Phase 3, 4 | No Permission Boundary |
| **3** Graph | Phase 2 | Phase 4, 5, 6 | No knowledge index |
| **4** Runtime | Phase 1, 2, 3 | Phase 5, 6 | No graph index; no analyzer link |
| **5** Developer | Phase 4 | Phase 7 (dev integration) | Runtime incomplete |
| **6** Owner | Phase 4 | Phase 7 (owner integration), Phase 10 | Runtime incomplete; no dashboard/analyzer |
| **7** Embedded | Phase 5, 6 | Phase 10 | No host contract |
| **8** Memory ext. | Phase 10 (MVP gate) | Phase 9 | MVP not validated |
| **9** Strategy | Phase 6, 8 (partial) | Future roles | No Owner data; no graph deps |
| **10** Readiness | Phases 1–7 | Release MVP; Phase 8–9 | Any phase < Operational |

## 2.3. Critical blockers (cross-cutting)

| Blocker | Affects | Mitigation |
|---------|---------|------------|
| Platform auth not wired | Phase 1 | Reuse existing FastAPI session |
| No Host Integration Contract | Phase 1, 7 | Spec in Phase 1; implement in Phase 7 |
| Analyzer stale data | Phase 3, 4, 6 | Existing fingerprint mechanism |
| Tier 0 docs missing | Phase 2 | Existing `docs/architecture/` |
| Standalone chat pattern | Phase 7 | Constitution enforcement in review |

---

# Раздел 3. Реализационные фазы

## Dashboard stage mapping

| Roadmap Phase | Dashboard Stage Slug | MVP |
|---------------|----------------------|:---:|
| Phase 1 | `yasii-core-foundation` | ● |
| Phase 2 | `yasii-knowledge-foundation` | ● |
| Phase 3 | `yasii-graph-foundation` | ● |
| Phase 4 | `yasii-runtime-foundation` | ● |
| Phase 5 | `yasii-developer-mvp` | ● |
| Phase 6 | `yasii-owner-mvp` | ● |
| Phase 7 | `yasii-embedded-intelligence` | ● partial |
| Phase 8 | `yasii-memory-foundation` | ✗ |
| Phase 9 | `yasii-strategy-layer` | ✗ |
| Phase 10 | `yasii-platform-readiness` | ● gate |

---

## Phase 1. YASII Core Foundation

### Goal

Создать фундамент ACE + YASII: ACE module (Identity/Permission/ContextSnapshot/PermissionBoundary), YASII Runtime Entry (EffectiveScope), contracts, Runtime skeleton, Audit.

**Результат:** платформа понимает *кто спрашивает*, *где спрашивает*, *какие права имеет* — через ACE handoff до YASII.

### Implementation progress (governance sync 2026-05-31)

| WI | Status | Evidence |
|----|--------|----------|
| P1-W01 | **DONE** | `modules/yasii/`, health endpoint, analyzer `yasii_p1_w01_module_skeleton_exists` |
| P1-W02 | **DONE** | `modules/ai_context/`, health endpoint, analyzer `yasii_p1_w02_ace_module_skeleton_exists` |
| P1-W03–P1-W12 | Not Started | — |

**Phase 1 readiness:** 18% (catalog weights). **25% Foundation** gate: modules exist ✓; contracts — not yet.

### Scope

- **ACE module** (`backend/app/modules/ai_context/` — **skeleton**, P1-W02 done)
- Identity Resolution, Permission Resolution
- ContextSnapshot Builder, PermissionBoundary Builder
- **YASII module** (`backend/app/modules/yasii/` — **skeleton**, P1-W01 done)
- YASII Runtime Entry: EffectiveScope derivation (= PermissionBoundary ∩ Current Context)
- Core contracts: `YASIIRequest`, `YASIIResponse`, `FailureResponse`
- Runtime Orchestrator skeleton (state machine, no full pipeline)
- Audit Trail persistence skeleton
- Memory Layer **basic** (audit-linked Q&A stub — Constitution MVP requirement)

> Host Integration Contract — normative doc [YASII_HOST_INTEGRATION_CONTRACT.md](./YASII_HOST_INTEGRATION_CONTRACT.md) (не отдельный P1 work item).

### Out Of Scope

- Knowledge index, Graph, full Runtime resolvers
- Role profiles, capabilities
- UI panels
- Tenant business memory (Phase 8)

### Dependencies

- Platform auth/session
- Tenant membership model
- Platform permission engine (existing)
- Normative stack: Constitution, ADR, Domain Model v1.3, Host Contract, Permission Model

### Enables

- Phase 2 (Knowledge needs PermissionBoundary via ACE)
- All subsequent phases

### Work Items

#### ACE Foundation

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P1-W02 | ACE Module Skeleton | 10% |
| P1-W03 | Identity Resolution | 9% |
| P1-W04 | Permission Resolution | 9% |
| P1-W05 | ContextSnapshot Builder | 11% |
| P1-W06 | PermissionBoundary Builder | 11% |

#### YASII Core Foundation

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P1-W01 | YASII module scaffold + router entry | 8% |
| P1-W07 | Request / Response contracts | 9% |
| P1-W08 | FailureResponse | 7% |
| P1-W09 | Audit Skeleton | 8% |
| P1-W10 | EffectiveScope derivation (YASII Runtime Entry) | 8% |
| P1-W11 | Runtime Orchestrator skeleton + state machine | 6% |
| P1-W12 | Memory Layer basic (audit-linked) | 4% |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% Foundation | ACE + YASII modules exist; contracts defined |
| 50% Operational | ACE produces ContextSnapshot + PermissionBoundary on test HostContext; YASII Runtime Entry derives EffectiveScope |
| 75% Integrated | YASII validates ACE handoff; EffectiveScope persisted; Audit persist; state machine transitions logged |
| 100% Completed | All P1 work items evidence-pass; request without ACE handoff → rejected |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **code** | `modules/ai_context/` + `modules/yasii/` paths (**P1-W01/W02** ✓); unit tests skeleton; ACE pipeline + YASII contracts — pending |
| **analyzer** | `yasii_p1_w01_module_skeleton_exists`, `yasii_p1_w02_ace_module_skeleton_exists` (**pass**); `yasii_p1_w03_identity_resolution_ace`, … |
| **documentation** | Host Integration Contract committed (normative) |
| **integration** | Test HostContext → ACE → YASII skeleton returns audit id |

### Definition Of Done

- [ ] Request without valid ACE handoff → rejected (fail-closed)
- [ ] Valid HostContext produces `ContextSnapshot` + `PermissionBoundary` via ACE
- [ ] YASII Runtime Entry derives `EffectiveScope` from ACE handoff
- [ ] YASII consumes handoff read-only; no direct HostContext fetch
- [ ] Audit record created with identity + context + EffectiveScope refs
- [ ] Runtime state machine: RECEIVED → … → COMPLETED | FAILED
- [ ] Phase 5 Development Lifecycle doc sync (if applicable)

### Constitution References

- Principle 3 (One Core)
- Principle 4 (Context First)
- Principle 5 (Permission First)
- Principle 12 (Fail Closed)
- Principle 13 (Embedded Intelligence — HostContext)
- Principle 15 (Auditability)
- MVP Core invariants (Memory basic, Audit)

### System Map References

- §2.0 ACE Layer; §2 Core (post-handoff); Memory (basic), Runtime skeleton, Audit
- §10 Critical path steps 1–2
- §8 Host Integration Contract

---

## Phase 2. Knowledge Foundation

### Goal

ЯСИИ знает, **откуда получать знания** — registry, tiers, platform knowledge index.

### Scope

- Knowledge Registry (domain + tier registration)
- Knowledge Source Registry (doc paths, dashboard refs, analyzer refs)
- Tier Model implementation (Tier 0–7 metadata)
- Knowledge Index: Platform Knowledge Tier 0–3 (ADR, Direction, Baseline, Lifecycle, Migration Map, Status)
- Tier selection rules (Role-agnostic base rules)
- Knowledge freshness metadata (doc hash, stale flags)

### Out Of Scope

- Graph nodes/edges (Phase 3)
- Code Knowledge full index (Phase 3)
- Tenant Knowledge domains
- Runtime Knowledge Resolver (Phase 4)

### Dependencies

- Phase 1 (Permission Boundary filters knowledge access)

### Enables

- Phase 3 (Graph indexes knowledge entities)
- Phase 4 (Knowledge Resolver)

### Work Items

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P2-W01 | Knowledge Registry model | 20% |
| P2-W02 | Knowledge Source Registry | 15% |
| P2-W03 | Tier Model (0–7) metadata + rules | 20% |
| P2-W04 | Platform doc indexer (Tier 0–1) | 20% |
| P2-W05 | Migration Map + Status indexer (Tier 2–3) | 15% |
| P2-W06 | Tier selection rule engine (base) | 10% |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% | Registry + Tier model defined |
| 50% | Tier 0–1 documents indexed and retrievable |
| 75% | Tier 2–3 indexed; tier rules select correct set for test queries |
| 100% | All sources registered; missing Tier 0 → CRITICAL flag |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **code** | Indexer returns ADR-001, Direction, Baseline by slug |
| **analyzer** | `knowledge_registry_exists`, `tier0_indexed` |
| **documentation** | Source registry lists all Tier 0–3 paths |
| **dashboard** | Knowledge sources linked in stage metadata |

### Definition Of Done

- [ ] Tier 0 document missing → CRITICAL knowledge gap flagged
- [ ] Query «normative» class → returns Tier 0–1 only (no Tier 4 dashboard)
- [ ] Source registry complete for MVP platform knowledge
- [ ] Permission Boundary filters unavailable docs for non-owner roles

### Constitution References

- Principle 6 (Tenant Awareness — Platform Knowledge scope)
- Principle 8 (Knowledge Before Intelligence)
- Principle 11 (Reality Over Documentation — tier hierarchy)

### System Map References

- §3 Knowledge Layer, Tier mapping
- §3 Platform Knowledge domain
- §10 step 3

---

## Phase 3. Knowledge Graph Foundation

### Goal

ЯСИИ понимает **связи** между знаниями + Code Knowledge nodes + Analyzer evidence links.

### Scope

- Graph node types: ArchitectureDocument, ADR, Rule, Roadmap, Phase, WorkItem, Module, File, AnalyzerCheck, Evidence
- Graph edge types: DEFINES, REGULATES, CONTAINS, DEPENDS_ON, VERIFIED_BY, PRODUCES, VIOLATES, AFFECTS, IMPORTS, …
- Dependency Graph (WorkItem deps from Migration Map / Dashboard)
- Rule Graph (ADR → Rule → Module)
- Graph Query Layer (traversal profiles, depth limits, cycle prevention)
- Code Knowledge Layer index (manifest, module registry, legacy zones)
- Analyzer → Evidence node linking (platform_dashboard_analyzer integration)

### Out Of Scope

- Full Runtime Graph Resolver (Phase 4)
- Tenant graph nodes
- Strategy ENABLES/BLOCKS full scoring (Phase 9)

### Dependencies

- Phase 2 (Knowledge index provides node sources)
- Platform Dashboard Analyzer (existing)
- Repository manifest (existing)

### Enables

- Phase 4 (Graph Resolver, Evidence Resolver)
- Phase 5 (Impact Analysis, Dependency Analysis)
- Phase 6 (Reality Check via VERIFIED_BY edges)

### Work Items

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P3-W01 | Graph node model + persistence/index | 15% |
| P3-W02 | Graph edge model + integrity checks | 10% |
| P3-W03 | Rule Graph builder (ADR → Rule → Module) | 15% |
| P3-W04 | Dependency Graph (Phase → WorkItem → deps) | 15% |
| P3-W05 | Code Knowledge index (manifest, modules) | 15% |
| P3-W06 | AnalyzerCheck + Evidence nodes from analyzer | 15% |
| P3-W07 | Graph Query Layer + traversal profiles | 15% |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% | Node/edge models; Rule Graph for ADR-001 |
| 50% | Dependency Graph for current migration phase |
| 75% | Code modules indexed; analyzer checks → Evidence nodes |
| 100% | Traversal ADR-001 → Rule → Module → WorkItem → Evidence succeeds |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **code** | Graph query returns path ADR-001 → NO_UT_MIGRATION → module |
| **analyzer** | `knowledge_graph_indexed`, `evidence_nodes_linked` |
| **dashboard** | WorkItem nodes sync with dashboard slugs |
| **documentation** | Graph schema matches System Map §4 |

### Definition Of Done

- [ ] Graph traversal mandatory before search-only answers (Constitution §19–20)
- [ ] Broken edge → skip + log (failure model)
- [ ] Analyzer evidence linked to WorkItem via VERIFIED_BY
- [ ] Code Knowledge: legacy zones tagged in graph

### Constitution References

- Principle 19 (Knowledge Graph Is Mandatory)
- Principle 20 (Graph Before Search)
- Principle 10 (Evidence Over Opinion)

### System Map References

- §4 Knowledge Graph (full)
- §3 Code Knowledge
- §10 step 4–5
- System Map Phase 3 «Evidence & Code» content merged here

---

## Phase 4. Runtime Engine Foundation

### Goal

Deterministic pipeline: **Question → Knowledge → Graph → Evidence → Rules → Verdict → Answer**.

### Scope

- Intent Resolver (Developer Query, Review, Owner Query, Report request types)
- Knowledge Resolver (tier + domain selection by Role Profile stub)
- Graph Resolver (subgraph traversal, relevance scoring)
- Evidence Resolver (merge analyzer > dashboard > declared; conflict detection)
- Rule Engine (Architecture, Migration, Legacy, Evidence rule categories)
- Verdict Engine (Developer + Owner verdict vocabularies)
- Answer Builder (mandatory sections: Verdict, Summary, Evidence, Citations, Risks, Recommendations, Next Actions)
- Memory Layer integration in pipeline (basic read/write)
- Full Runtime Orchestrator wiring

### Out Of Scope

- Role profiles (Phase 5–6)
- Capabilities as user-facing features (Phase 5–6)
- Dashboard UI integration (Phase 7)
- Strategy ranking (Phase 9)

### Dependencies

- Phase 1 (Core contracts, Audit)
- Phase 2 (Knowledge Resolver)
- Phase 3 (Graph + Evidence nodes, Code Knowledge)

### Enables

- Phase 5 (Developer capabilities)
- Phase 6 (Owner capabilities)

### Work Items

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P4-W01 | Intent Resolver + request profiles | 10% |
| P4-W02 | Knowledge Resolver | 10% |
| P4-W03 | Graph Resolver + traversal profiles | 15% |
| P4-W04 | Evidence Resolver + conflict detection | 15% |
| P4-W05 | Rule Engine (4 rule categories) | 15% |
| P4-W06 | Verdict Engine (Developer + Owner vocab) | 10% |
| P4-W07 | Answer Builder + template validation | 15% |
| P4-W08 | Full Orchestrator wiring + state machine | 10% |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% | Intent + Knowledge resolvers operational |
| 50% | Graph + Evidence merge; conflict → CONTRADICTS |
| 75% | Rule Engine evaluates ADR-001 rule; Verdict emitted |
| 100% | End-to-end test query → valid YASIIResponse + Audit |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **code** | Integration test: normative query → BLOCKED + ADR citation |
| **analyzer** | `runtime_pipeline_complete`, `verdict_engine_operational` |
| **documentation** | Pipeline matches System Map §5 |
| **dashboard** | Runtime stage readiness ≥ 100% |

### Definition Of Done

- [ ] «Можно ли писать в universal_table_rows?» → BLOCKED + ADR-001 citation
- [ ] Insufficient evidence → UNKNOWN (fail-closed)
- [ ] Every response includes Verdict + Citations (validation gate)
- [ ] CONFLICTED evidence → AT RISK / UNKNOWN per profile
- [ ] Zero LLM calls in pipeline

### Constitution References

- Principle 8 (Knowledge Before Intelligence)
- Principle 9 (Deterministic First)
- Principle 12 (Fail Closed)
- Principle 14 (Explainability)

### System Map References

- §5 Runtime Engine (full pipeline)
- §5 Verdict vocabularies
- §5 Response sections
- §10 step 6

---

## Phase 5. YASII Developer MVP

### Goal

ЯСИИ **помогает разрабатывать ЯсноПро** — Developer role + architecture capabilities.

### Scope

- YASII Developer Role Profile
- Capabilities: Dev Query, Architecture Review, Dependency Analysis, Impact Analysis
- Developer verdict templates (ALLOWED / WARNING / BLOCKED / UNKNOWN)
- Architecture Review flow (scope → rules → findings)
- Code path citations (permission-filtered for developer role)
- Integration stub: Platform Development Dashboard entry point (context payload)

### Out Of Scope

- Owner Report, Reality Check (Phase 6)
- Full Designer integration (Phase 7 optional)
- Strategy full ranking
- Tenant roles

### Dependencies

- Phase 4 (full Runtime)

### Enables

- Phase 7 (Developer dashboard integration)
- Phase 10 (MVP Developer criteria)

### Work Items

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P5-W01 | Developer Role Profile | 15% |
| P5-W02 | Dev Query capability | 20% |
| P5-W03 | Architecture Review capability | 25% |
| P5-W04 | Dependency Analysis capability | 15% |
| P5-W05 | Impact Analysis capability | 15% |
| P5-W06 | Developer answer templates | 10% |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% | Role profile loaded; Dev Query returns template response |
| 50% | Architecture Review on declared scope → findings |
| 75% | Legacy import in scope → fail + rule id |
| 100% | Impact Analysis returns module blast radius + citations |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **code** | Review test: forbidden UT write → BLOCKED |
| **analyzer** | `yasii_developer_role_active`, `architecture_review_capability` |
| **integration** | Dev Query callable from Platform Dev context (API/stub) |
| **documentation** | Role profile matches System Map §6 |

### Definition Of Done

- [ ] Developer role ≠ separate AI Core (Constitution §2)
- [ ] Review declared scope with legacy violation → fail + rule id
- [ ] Non-developer role cannot see raw code paths in response
- [ ] All Developer responses pass Answer Builder validation

### Constitution References

- Principle 2 (AI Developer — role, not system)
- Principle 17 (Role Driven Behavior)
- Principle 18 (Capability Reuse)

### System Map References

- §6 YASII Developer
- §7 Architecture Review, Impact, Dependency capabilities
- §9 MVP Developer scope

---

## Phase 6. YASII Owner Assistant MVP

### Goal

ЯСИИ **помогает владельцу платформы** — control, reality, reports.

### Scope

- YASII Owner Assistant Role Profile
- Platform Health Snapshot builder
- Reality Check capability (confirmed / partial / falsely_done)
- Owner Report capability + Owner Report Pipeline
- Deviation Registry (open + rule-generated candidates)
- Improvement Suggestions (top N from debt/deviations — not standalone Phase 9)
- Owner verdict templates (ON TRACK … OFF TRACK)
- Integration stub: Owner Dashboard entry point
- Strategy **hints** in Owner Report (not full Phase 9 ranking)

### Out Of Scope

- Full Strategy Layer (Phase 9)
- Scheduled reports
- Tenant owner roles
- Extended Memory (Phase 8)

### Dependencies

- Phase 4 (Runtime)
- Phase 3 (Evidence nodes, Reality graph profile)
- Platform Dashboard + Analyzer (existing, stale-aware)

### Enables

- Phase 7 (Owner Dashboard integration)
- Phase 10 (MVP Owner criteria)

### Work Items

| ID | Work Item | Readiness weight |
|----|-----------|------------------|
| P6-W01 | Owner Assistant Role Profile | 10% |
| P6-W02 | Platform Health Snapshot | 15% |
| P6-W03 | Reality Check capability | 20% |
| P6-W04 | Deviation Registry | 15% |
| P6-W05 | Owner Report Pipeline | 25% |
| P6-W06 | Improvement Suggestions (top N in report) | 10% |
| P6-W07 | Owner answer + report templates | 5% |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% | Owner role profile; Health Snapshot partial |
| 50% | Reality Check lists work items with evidence strength |
| 75% | Paper-done detected (declared DONE + analyzer fail) |
| 100% | Owner Report generated with verdict + paper-done section |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **code** | Owner Report integration test passes |
| **analyzer** | `reality_check_operational`, `owner_report_capability` |
| **dashboard** | Report uses fresh dashboard + analyzer data |
| **documentation** | Owner Report Pipeline matches System Map §12 |

### Definition Of Done

- [ ] «Что реально сделано по phase X?» → confirmed vs falsely_done list
- [ ] Dashboard stale → flagged in report (UNKNOWN progress sections)
- [ ] Owner Report includes Health Snapshot + Deviations + Recommendations
- [ ] Owner role cannot get implementation how-to without dev escalation flag

### Constitution References

- Principle 10 (Evidence Over Opinion)
- Principle 11 (Reality Over Documentation)
- Principle 14 (Explainability)
- Owner Control Layer mapping (System Map §8)

### System Map References

- §6 YASII Owner Assistant
- §7 Reality Check, Owner Report capabilities
- §12 Reports subsystem
- §11 Owner Report Pipeline steps

---

## Phase 7. Embedded Intelligence

### Goal

ЯСИИ **встроен в платформу** — host surfaces pass context automatically.

### Scope (MVP)

- Host Integration Contract **implementation**
- Platform Development Dashboard integration (Developer)
- Owner Dashboard integration (Owner Assistant)
- Context auto-capture on navigation / selection change
- Embedded panel contract (spec only — no UI design in this doc)
- Anti-pattern guard: no standalone chat route as primary

### Scope (post-MVP within phase)

- Designer integration (Developer context)
- Document view integration
- Task/work item context

### Out Of Scope (post-MVP)

- Object Card, Registry (tenant — Phase 9+ tenant track)
- Process, Comment, Notification integrations
- Field-level context

### Dependencies

- Phase 5 (Developer role)
- Phase 6 (Owner role)
- Phase 1 Host Contract spec

### Enables

- Phase 10 (Embedded Intelligence criteria)
- Constitution Principle 13 validation

### Work Items

| ID | Work Item | MVP | Readiness weight |
|----|-----------|:---:|------------------|
| P7-W01 | Host Integration Contract implementation | ● | 20% |
| P7-W02 | Platform Dev Dashboard context bridge | ● | 25% |
| P7-W03 | Owner Dashboard context bridge | ● | 25% |
| P7-W04 | Context auto-refresh on navigation | ● | 15% |
| P7-W05 | Embedded entry point registration (no standalone chat) | ● | 15% |
| P7-W06 | Designer context bridge | ✗ | — |
| P7-W07 | Document / Task context bridges | ✗ | — |

### Readiness Criteria

| Level | Criteria |
|-------|----------|
| 25% | Host contract implemented; context validated |
| 50% | Platform Dev Dashboard sends full HostContext (ACE produces ContextSnapshot) |
| 75% | Owner Dashboard sends full snapshot; role auto-selected |
| 100% MVP | Both MVP dashboards embedded; standalone chat absent |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **integration** | Request from Owner Dashboard includes source_area=dashboard |
| **code** | Context without identity → rejected at dashboard entry |
| **analyzer** | `yasii_embedded_platform_dev`, `yasii_embedded_owner_dashboard` |
| **documentation** | Integration map matches System Map §8 |

### Definition Of Done (MVP subset)

- [ ] YASII panel invocable from Platform Dev + Owner Dashboard
- [ ] HostContext mandatory on each request; ACE produces ContextSnapshot
- [ ] Role auto-selected from surface (Owner Dashboard → Owner Assistant)
- [ ] No primary standalone chat route in MVP
- [ ] Constitution §13 Embedded Intelligence satisfied for MVP surfaces

### Constitution References

- Principle 4 (Context First)
- Principle 13 (Embedded Intelligence)
- Anti-pattern guard (Constitution forbidden list #7)

### System Map References

- §8 Integrations (full)
- §8 Host Integration Contract
- §9 MVP integration points

---

## Phase 8. Memory Foundation

### Goal

ЯСИИ **помнит историю** — extended strategic memory beyond MVP basic layer.

### Scope

- User Memory (interaction history per user)
- Tenant Memory (tenant-scoped decisions and context)
- Decision Memory (ADR waivers, architectural decisions, verdict history)
- Process Memory (workflow decision trail) [future-ready schema]
- Session Memory (multi-turn context within session)
- Memory ↔ Knowledge Graph linking (memory refs → graph nodes)

### Out Of Scope

- Tenant business process memory content (until Tenant YASII track)
- Generative summarization of memory
- Isolated per-role memory stores (Constitution forbidden)

### Dependencies

- Phase 10 MVP gate passed (recommended)
- Phase 1 basic Memory + Audit
- Phase 4 Runtime

### Enables

- Phase 9 (Strategy uses decision + session context)
- Future tenant roles

### Work Items

| ID | Work Item |
|----|-----------|
| P8-W01 | User Memory store + retrieval |
| P8-W02 | Tenant Memory store |
| P8-W03 | Decision Memory (waivers, verdicts) |
| P8-W04 | Session Memory (multi-turn) |
| P8-W05 | Process Memory schema (stub) |
| P8-W06 | Memory ↔ Graph node linking |

### Readiness Criteria

| 100% Completed | Session recall works; Decision Memory links to Deviation nodes |

### Evidence Criteria

| **analyzer** | `memory_layer_extended`; replay prior verdict by request_id |

### Definition Of Done

- [ ] Memory in single Core Memory Layer (not per-role)
- [ ] Audit Trail ↔ Memory cross-reference
- [ ] Constitution Principle 16 satisfied (extended)

### Constitution References

- Principle 16 (Memory Is Strategic Asset)
- Forbidden: roles with isolated memory

### System Map References

- §2 Memory Layer
- §10 Memory in critical path step 14

---

## Phase 9. Strategy Layer

### Goal

ЯСИИ **рекомендует следующие шаги** — full Strategy Capability.

### Scope

- Dependency Intelligence (ENABLES, BLOCKS, DEPENDS_ON analysis)
- Next Best Action ranking (unlock score, readiness delta, risk reduction, effort)
- Blocker Detection (articulation points on dependency graph)
- Strategic Recommendations (DO NEXT, DEFER, BLOCKED BY DEPENDENCY, NEEDS DECISION)
- YASII Architect role profile (optional within phase)
- Improvement Query standalone capability

### Out Of Scope

- Autonomous execution of recommended actions
- LLM-based strategy
- Tenant project prioritization (future PM role)

### Dependencies

- Phase 6 (Owner data, Reality Check)
- Phase 3 (Strategy graph edges)
- Phase 8 (Decision Memory — partial, can start without full P8)

### Enables

- Future YASII Architect role operational
- Owner strategic briefings beyond report hints

### Work Items

| ID | Work Item |
|----|-----------|
| P9-W01 | Strategy Capability engine |
| P9-W02 | Unlock score + ranking formula |
| P9-W03 | Blocker Detection on dependency graph |
| P9-W04 | Strategy Recommendation templates |
| P9-W05 | YASII Architect Role Profile |
| P9-W06 | Improvement Query standalone |

### Readiness Criteria

| 100% Completed | «Что делать дальше?» → ranked top 5 + DO NEXT verdict with graph citations |

### Evidence Criteria

| **code** | Strategy query on runtime-foundation phase → Runtime auth ranked if deps satisfied |
| **analyzer** | `strategy_capability_operational` |

### Definition Of Done

- [ ] Top two scores within 5% → NEEDS DECISION
- [ ] All candidates blocked → BLOCKED BY DEPENDENCY with articulation point
- [ ] Strategy uses graph, not search-only (Constitution §20)

### Constitution References

- Principle 18 (Capability Reuse)
- Principle 21 (No Autonomous Actions)
- Strategy Layer mapping

### System Map References

- §12 Strategy subsystem
- §7 Strategy Recommendation capability
- §6 YASII Architect

---

## Phase 10. YASII Platform Readiness

### Goal

**MVP GATE** — финальная интеграционная проверка; полноценный MVP ЯСИИ.

### Scope

- Constitution Compliance audit (all 22 principles + MVP invariants)
- System Map Coverage verification (§2–§9 MVP sections)
- Knowledge Coverage audit (Tier 0–6 indexed, graph complete for platform)
- Runtime Coverage (full pipeline, all MVP request types)
- Role Coverage (Developer + Owner operational)
- Capability Coverage (Review, Reality Check, Owner Report)
- Integration Coverage (MVP dashboards embedded)
- Dashboard stage `yasii-platform-readiness` at 100%
- Owner Assistant readiness for production use

### Out Of Scope

- Phase 8–9 completion (post-MVP)
- Tenant YASII track
- Generative layer

### Dependencies

- Phases 1–7 at ≥ Operational (75%+); Phases 5–6 at 100%

### Enables

- **YASII MVP declared Complete**
- Phase 8–9 post-MVP work
- Production owner briefings

### Work Items

| ID | Work Item |
|----|-----------|
| P10-W01 | Constitution Compliance Checklist run |
| P10-W02 | System Map Coverage matrix |
| P10-W03 | End-to-end MVP scenario tests (9 success criteria) |
| P10-W04 | Analyzer evidence suite for all MVP work items |
| P10-W05 | Dashboard readiness rollup stage |
| P10-W06 | Architecture sign-off document |

### Readiness Criteria

| 100% Completed | All §9 Success Criteria pass; Constitution checklist 100% |

### Evidence Criteria

| Type | Evidence |
|------|----------|
| **analyzer** | All MVP work items `completed` with evidence |
| **dashboard** | `yasii-platform-readiness` readiness = 100% |
| **documentation** | Sign-off + compliance report |
| **integration** | E2E scenarios pass in staging |

### Definition Of Done

- [ ] All 9 Success Criteria (§9) verified
- [ ] Constitution Compliance Checklist (Appendix A) — all items checked
- [ ] No CRITICAL architecture violations open
- [ ] Platform owner accepts MVP scope boundary

### Constitution References

- All MVP invariants
- Architecture readiness criteria (Constitution § «ЯСИИ считается существующим»)

### System Map References

- §9 MVP Scope (full validation)
- §12–§13 Reports (Owner Report operational)

---

# Раздел 4. Readiness Model

## 4.1. Шкала readiness

| % | Status | Meaning |
|---|--------|---------|
| **0%** | Not Started | No implementation; planning only |
| **25%** | Foundation | Contracts, models, scaffold exist |
| **50%** | Operational | Core function works in isolation |
| **75%** | Integrated | Works with upstream/downstream phases |
| **100%** | Completed | All work items done; evidence passed; DoD met |

## 4.2. Phase transition rules

| Transition | Requirement |
|------------|-------------|
| 0% → 25% | First work item merged; module/schema exists |
| 25% → 50% | Core function demonstrable in test |
| 50% → 75% | Integration with dependency phase verified |
| 75% → 100% | All work items evidence-pass; DoD checklist complete |
| Phase N → N+1 start | Phase N ≥ 50% Operational **or** explicit parallel track approved via ADR |

## 4.3. Overall YASII readiness

```text
Overall Readiness =
    weighted average of MVP phases (1–7, 10)
    weights = sum of work item readiness_weights per phase

MVP Complete ⟺ Phase 10 = 100% AND Phases 1–7 ≥ 100%
```

---

# Раздел 5. Evidence Model

## 5.1. Evidence types

| Type | Source | Used for |
|------|--------|----------|
| **code** | Unit/integration tests, module existence | All phases |
| **analyzer** | `platform_dashboard_analyzer` checks | Phases 3–10 |
| **dashboard** | Platform Dashboard state, readiness | Phases 2, 6, 10 |
| **documentation** | Committed specs, ADRs, sync | Phases 1, 2, 10 |
| **integration** | E2E host surface tests | Phases 5–7, 10 |

## 5.2. Evidence strength (for Reality Check alignment)

| Strength | Rule |
|----------|------|
| **strong** | Analyzer check pass OR integration test pass |
| **partial** | Some markers pass |
| **weak** | Indirect marker only |
| **conflicting** | strong pass + strong fail on same subject |

## 5.3. Phase completion gate

**Запрещено** переводить фазу в **100% Completed** без:

1. ≥ 1 **analyzer** evidence check passed (where applicable)
2. ≥ 1 **code** evidence (test or module check)
3. DoD checklist fully checked
4. No open CRITICAL Constitution violations

## 5.4. Paper-done rule (cross-phase)

```text
IF dashboard status = DONE AND analyzer evidence = fail
THEN work item = falsely_done (flag in Reality Check, Phase 6+)
```

---

# Раздел 6. Dashboard Compatibility

## 6.1. Hierarchy mapping

```text
YASII Implementation Roadmap
    ↓
Phase (PlatformImplementationStage)
    slug: yasii-{phase-name}
    ↓
Work Item (PlatformTask)
    slug: p{N}-w{NN}-{short-name}
    ↓
Evidence (AnalyzerCheck → Evidence node)
    check_id: yasii_p{N}_w{NN}_{check}
    ↓
Readiness (stage.cached_readiness)
    formula: completed_weight / total_weight × 100
```

## 6.2. Analyzer check naming convention

```text
yasii_{phase_slug}_{work_item_slug}_{check_name}

Examples:
  yasii_core_foundation_identity_resolver_implemented
  yasii_graph_foundation_evidence_nodes_linked
  yasii_developer_mvp_architecture_review_capability
  yasii_owner_mvp_owner_report_capability
```

## 6.3. Automatic Work Item derivation

| Roadmap element | Dashboard field |
|-----------------|-----------------|
| Phase Goal | `stage.description` |
| Work Items | `stage.current_tasks` / `completed_items` |
| Readiness Criteria | `stage.completion_criteria` |
| Dependencies | `stage.blockers` |
| Evidence checks | analyzer component checks |
| Constitution ref | task metadata `constitution_ref` |
| System Map ref | task metadata `system_map_ref` |

## 6.4. Refresh compatibility

YASII readiness **must** respect analyzer freshness (existing `is_stale` pattern):

- Stale analyzer → YASII evidence marked STALE
- Owner Report → UNKNOWN progress sections until refresh

---

# Раздел 7. Architecture Governance

## 7.1. Work authorization rules

Любая реализационная работа **должна иметь**:

| Field | Required |
|-------|:--------:|
| Phase ID (`yasii-phase-N`) | ● |
| Work Item ID (`P{N}-W{NN}`) | ● |
| Constitution reference | ● |
| System Map reference | ● |
| Evidence type + expected check | ● |
| Readiness weight | ● |

## 7.2. Review gates

| Gate | When | Reviewer |
|------|------|----------|
| **Phase Start** | Before first work item | Architecture owner |
| **Phase Complete** | 100% readiness | Architecture owner + Constitution checklist |
| **MVP Gate** | Phase 10 | Platform owner |
| **Post-MVP** | Phase 8–9 start | Architecture owner + ADR if scope change |

## 7.3. Change control

| Change type | Process |
|-------------|---------|
| New component not in System Map | ADR + Constitution review — **reject by default** |
| Phase reorder | ADR + update Roadmap |
| MVP scope change | Constitution amendment or waiver ADR |
| Skip evidence | **Forbidden** |

## 7.4. Architecture debt

MAJOR/CRITICAL Constitution violations during implementation → Architecture Debt registry entry with:

- `phase_id`, `work_item_id`
- violated principle
- remediation owner
- blocks dependent work items until closed

---

# Раздел 8. MVP Boundary

## 8.1. MVP includes (Phases 1–7 + Phase 10 gate)

```text
Core
├── Identity Layer
├── Context Layer
├── Permission Layer
├── Memory Layer (basic — Phase 1/4)
├── Knowledge Layer
├── Knowledge Graph
├── Code Knowledge Layer
├── Runtime Engine (full pipeline)
├── Answer Builder
└── Audit Trail

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
├── Dev Query
├── Dependency Analysis
├── Impact Analysis
└── Improvement Suggestions (in report)

Integrations (MVP)
├── Platform Development Dashboard
└── Owner Dashboard
```

## 8.2. MVP excludes

| Excluded | Phase |
|----------|-------|
| Autonomous actions | Never without ADR |
| Analyst, Auditor, PM, Navigator, Support roles | Post-MVP / Tenant track |
| Full Strategy Layer | Phase 9 |
| Extended Memory | Phase 8 (basic in MVP) |
| Complex tenant graph | Tenant track (System Map Phase 9 equivalent) |
| AI-generated actions / LLM execution | Forbidden in MVP |
| Object Card, Registry, Process integrations | Phase 7 post-MVP subset |
| Standalone universal chat | Forbidden |

## 8.3. MVP completion definition

```text
MVP Complete =
    Phase 10 passed (100%)
    AND Phases 1–7 at 100%
    AND §9 Success Criteria verified
```

---

# Раздел 9. Success Criteria

ЯСИИ считается **реализованным в MVP** только если **все** условия выполнены (verified in Phase 10):

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Понимает пользователя | Identity resolved; non-session → reject |
| 2 | Понимает tenant | tenant_id in every operation scope |
| 3 | Понимает контекст | HostContext → ContextSnapshot (ACE) mandatory from dashboards |
| 4 | Учитывает права | Permission Boundary before data; partial access message |
| 5 | Использует Knowledge Graph | Graph trace in Audit for every response |
| 6 | Умеет объяснять ответы | Verdict + Summary + Citations in every response |
| 7 | Умеет показывать evidence | Evidence section with strength tags |
| 8 | Architecture Review | Legacy violation → fail + rule id |
| 9 | Owner Report | Verdict + paper-done section from live analyzer |

**Additional MVP invariants:**

- Normative question → BLOCKED/ALLOWED + Tier 0–1 citation
- Zero LLM in execution path
- Audit Trail replayable by request_id
- Constitution Compliance Checklist 100%

---

# Приложение A. System Map Phase Cross-Reference

Roadmap phases align with [YASII_SYSTEM_MAP.md](./YASII_SYSTEM_MAP.md) §11:

| Roadmap Phase | System Map §11 Phase | Notes |
|---------------|---------------------|-------|
| Phase 1 | Phase 1 Core Foundation | Aligned |
| Phase 2 | Phase 2 Knowledge Foundation | Aligned |
| Phase 3 | Phase 3 Evidence & Code | Graph + Code + Analyzer merged |
| Phase 4 | Phase 4 Runtime Engine | Aligned |
| Phase 5 | Phase 5 YASII Developer | Aligned |
| Phase 6 | Phase 6 YASII Owner Assistant | Aligned |
| Phase 7 | Phase 7 MVP Hardening + Integrations | Embedded focus |
| Phase 8 | Memory (Constitution §16 extended) | Post-MVP expansion |
| Phase 9 | Phase 8 Expansion (Strategy) | Aligned |
| Phase 10 | MVP validation gate | New explicit gate |

System Map Phase 9 (Tenant YASII) and Phase 10 (Advanced) → **future Roadmap v2** (out of scope v1.0).

---

# Приложение B. Planned Analyzer Stage Registration

```text
platform_implementation_stage:
  slug: yasii-core-foundation
  title: YASII Core Foundation
  order_index: (after existing stages)

components:
  - yasii-core
  - yasii-knowledge
  - yasii-graph
  - yasii-runtime
  - yasii-developer
  - yasii-owner
  - yasii-embedded
  - yasii-readiness
```

> Registration in Platform Dashboard seed/analyzer — **done** (catalog + `yasii_checks` + `yasii_sync`; derived from P1-W01). Task status обновляется через `refresh_platform_dashboard` / `sync_yasii_track`.

---

# Приложение C. Document Index

| Read order | Document |
|------------|----------|
| 1 | [YASII_MASTER_MAP.md](./YASII_MASTER_MAP.md) |
| 2 | [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) |
| 3 | [YASII_SYSTEM_MAP.md](./YASII_SYSTEM_MAP.md) |
| 4 | **YASII_IMPLEMENTATION_ROADMAP.md** (this) |

---

**Document owner:** Platform Architecture  
**Consumers:** Platform Dashboard, platform_dashboard_analyzer, YASII module team, Owner Assistant  
**Next artifact:** Dashboard Work Items seed from Phase 1–7 work item tables
