# YASII Dashboard Work Items

**Статус:** EXECUTION PLANNING DOCUMENT  
**Версия:** 1.0  
**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_MASTER_MAP.md](./YASII_MASTER_MAP.md) · [YASII_SYSTEM_MAP.md](./YASII_SYSTEM_MAP.md) · [YASII_IMPLEMENTATION_ROADMAP.md](./YASII_IMPLEMENTATION_ROADMAP.md)

---

## Executive Summary

Настоящий документ **преобразует** [YASII_IMPLEMENTATION_ROADMAP.md](./YASII_IMPLEMENTATION_ROADMAP.md) в структуру Platform Dashboard:

```text
Phase → Stage → Work Item → Evidence → Readiness
```

**Источник для:** Platform Dashboard · platform_dashboard_analyzer · Readiness Calculation · Work Item Tracking · Progress Monitoring · Owner Assistant (future reports).

**Правила:**

- 10 фаз — без изменений порядка (Roadmap §2)
- MVP Boundary — без изменений (Roadmap §8)
- Work Item без evidence → **не DONE**
- Каждый Work Item — **независимая единица контроля**

**Текущий статус YASII track (governance sync, 2026-05-31):**

| Метрика | Значение |
|---------|----------|
| Work items **DONE** | **2 / 74** (P1-W01, P1-W02) |
| Stage `yasii-core-foundation` readiness | **18%** (веса 8+10 из 100) |
| Container «Встроенный ИИ» readiness | **1%** (`compute_container_readiness`) |
| ACE track readiness | **20%** (P1-W02 из ACE Foundation, вес 10/50) |
| YASII track readiness | **0%** (P1-W01: 8/950, floor) |
| **Текущий work item** | **P1-W03** Identity Resolution (ACE) |
| Critical path W01–W02 | **completed** |

Источник истины для статусов в runtime: `yasii_catalog.py` + `yasii_checks.py` + `yasii_sync.py` (analyzer pass → task done).

---

## Implementation Status (as of 2026-05-31)

| Key | Status | Analyzer check | Code evidence |
|-----|--------|----------------|---------------|
| **P1-W01** | **DONE** | `yasii_p1_w01_module_skeleton_exists` | `backend/app/modules/yasii/`, `GET /yasii/health`, `main.py` |
| **P1-W02** | **DONE** | `yasii_p1_w02_ace_module_skeleton_exists` | `backend/app/modules/ai_context/`, `GET /ai-context/health`, `main.py` |
| P1-W03 … P1-W12 | Not Started | (per catalog) | — |
| P2-W01 … P10-W06 | Not Started | (per catalog) | — |

> **Примечание:** Description WI P1-W02 описывает полный scope (включая HostContext intake); реализован только **skeleton** (P1-W02 DoD). HostContext — P1-W03+.

---

## Work Item Schema

Каждый work item **обязан** содержать поля ниже (шаблон):

| Field | Description |
|-------|-------------|
| **Key** | Stable id: `P{N}-W{NN}` |
| **Title** | Human-readable name |
| **Description** | Scope of work |
| **Phase** | `yasii-phase-N` |
| **Stage** | Dashboard stage slug |
| **Weight** | % contribution to stage readiness (phase weights sum = 100) |
| **Depends On** | Work item keys |
| **Enables** | Work item keys |
| **Readiness Criteria** | 0/25/50/75/100 transitions |
| **Evidence Criteria** | Required proof types |
| **Definition Of Done** | Checklist |
| **Analyzer Check** | Primary check id |
| **Constitution References** | Principle ids |
| **System Map References** | Section refs |
| **MVP** | ● / ○ partial / ✗ post-MVP |

---

# Раздел 1. Dashboard Structure

## 1.1. YASII top-level track

```text
YASII (platform component: yasii)
│
├── Phase 1  yasii-core-foundation          MVP ●
├── Phase 2  yasii-knowledge-foundation     MVP ●
├── Phase 3  yasii-graph-foundation         MVP ●
├── Phase 4  yasii-runtime-foundation       MVP ●
├── Phase 5  yasii-developer-mvp            MVP ●
├── Phase 6  yasii-owner-mvp                MVP ●
├── Phase 7  yasii-embedded-intelligence    MVP ○ partial
├── Phase 8  yasii-memory-foundation        post-MVP ✗
├── Phase 9  yasii-strategy-layer           post-MVP ✗
└── Phase 10 yasii-platform-readiness       MVP ● gate
```

## 1.2. Stage registry

| Phase | Stage Slug | Stage Title | MVP | Work Items |
|-------|------------|-------------|:---:|:----------:|
| 1 | `yasii-core-foundation` | YASII Core Foundation | ● | 12 |
| 2 | `yasii-knowledge-foundation` | YASII Knowledge Foundation | ● | 6 |
| 3 | `yasii-graph-foundation` | YASII Knowledge Graph Foundation | ● | 8 |
| 4 | `yasii-runtime-foundation` | YASII Runtime Engine Foundation | ● | 8 |
| 5 | `yasii-developer-mvp` | YASII Developer MVP | ● | 7 |
| 6 | `yasii-owner-mvp` | YASII Owner Assistant MVP | ● | 7 |
| 7 | `yasii-embedded-intelligence` | YASII Embedded Intelligence | ○ | 8 |
| 8 | `yasii-memory-foundation` | YASII Memory Foundation | ✗ | 6 |
| 9 | `yasii-strategy-layer` | YASII Strategy Layer | ✗ | 6 |
| 10 | `yasii-platform-readiness` | YASII Platform Readiness | ● | 6 |

**Total work items:** 74

## 1.3. Readiness formula (stage level)

```text
stage.readiness = floor( sum(completed_item_weight) / sum(all_item_weights) × 100 )

Work item status = done  ⟺  all evidence checks pass AND DoD complete
```

---

# Раздел 2. Phase 1 Work Items

**Stage:** `yasii-core-foundation`  
**Goal:** ACE формирует ContextSnapshot и PermissionBoundary; YASII Runtime Entry вычисляет EffectiveScope и потребляет ACE handoff.

---

### P1-W01 — YASII Module Skeleton

| Field | Value |
|-------|-------|
| **Key** | `P1-W01` |
| **Title** | YASII Module Skeleton |
| **Description** | Scaffold `backend/app/modules/yasii/`: package init, router entry, module registration in app.main |
| **Phase** | `yasii-phase-1` |
| **Stage** | `yasii-core-foundation` |
| **Weight** | 8 |
| **Depends On** | — |
| **Enables** | P1-W02, P1-W07, P1-W11 |
| **Analyzer Check** | `yasii_p1_w01_module_skeleton_exists` |
| **Implementation Status** | **DONE** (2026-05-31) |
| **System Map References** | §2 YASII Core |
| **MVP** | ● |

---

### P1-W02 — ACE Module Skeleton

| Field | Value |
|-------|-------|
| **Key** | `P1-W02` |
| **Title** | ACE Module Skeleton |
| **Description** | Scaffold `backend/app/modules/ai_context/`: package init, ACE entrypoint, HostContext intake |
| **Weight** | 10 |
| **Depends On** | P1-W01 |
| **Enables** | P1-W03, P1-W04, P1-W05, P1-W06 |
| **Analyzer Check** | `yasii_p1_w02_ace_module_skeleton_exists` |
| **Implementation Status** | **DONE** (2026-05-31, skeleton only) |
| **System Map References** | §2.0 ACE Layer |
| **MVP** | ● |

---

### P1-W03 — Identity Resolution

| Field | Value |
|-------|-------|
| **Key** | `P1-W03` |
| **Title** | Identity Resolution |
| **Description** | ACE Identity Resolution: user_id, tenant_id, roles, groups, permissions from session + HostContext |
| **Weight** | 9 |
| **Depends On** | P1-W02 |
| **Enables** | P1-W04, P1-W05, P1-W06 |
| **Analyzer Check** | `yasii_p1_w03_identity_resolution_ace` |
| **System Map References** | §ACE Identity Resolution |
| **MVP** | ● |

---

### P1-W04 — Permission Resolution

| Field | Value |
|-------|-------|
| **Key** | `P1-W04` |
| **Title** | Permission Resolution |
| **Description** | ACE Permission Resolution: role ceilings, tenant scope, object-level filters **before** boundary build |
| **Weight** | 9 |
| **Depends On** | P1-W03 |
| **Enables** | P1-W05, P1-W06 |
| **Analyzer Check** | `yasii_p1_w04_permission_resolution_ace` |
| **System Map References** | §ACE Permission Resolution |
| **MVP** | ● |

---

### P1-W05 — ContextSnapshot Builder

| Field | Value |
|-------|-------|
| **Key** | `P1-W05` |
| **Title** | ContextSnapshot Builder |
| **Description** | ACE ContextSnapshot Builder from normalized HostContext: mode, module, page, object, route, source_area |
| **Weight** | 11 |
| **Depends On** | P1-W04 |
| **Enables** | P1-W06, P7-W01 |
| **Analyzer Check** | `yasii_p1_w05_context_snapshot_builder_ace` |
| **System Map References** | §ACE ContextSnapshot, §8 Host Contract |
| **MVP** | ● |

---

### P1-W06 — PermissionBoundary Builder

| Field | Value |
|-------|-------|
| **Key** | `P1-W06` |
| **Title** | PermissionBoundary Builder |
| **Description** | ACE PermissionBoundary Builder: tenant → role → object filter; immutable handoff to YASII |
| **Weight** | 11 |
| **Depends On** | P1-W04, P1-W05 |
| **Enables** | P1-W07, P2-W01 |
| **Analyzer Check** | `yasii_p1_w06_permission_boundary_builder_ace` |
| **System Map References** | §ACE PermissionBoundary |
| **MVP** | ● |

---

### P1-W07 — Request Response Contracts

| Field | Value |
|-------|-------|
| **Key** | `P1-W07` |
| **Title** | Request Response Contracts |
| **Description** | Define `YASIIRequest`, `YASIIResponse`, ACE handoff envelope schemas, validation rules |
| **Weight** | 9 |
| **Depends On** | P1-W01, P1-W06 |
| **Enables** | P1-W08, P1-W10, P1-W11 |
| **Analyzer Check** | `yasii_p1_w07_request_response_contracts` |
| **System Map References** | §2 YASII Core |
| **MVP** | ● |

---

### P1-W08 — FailureResponse

| Field | Value |
|-------|-------|
| **Key** | `P1-W08` |
| **Title** | FailureResponse |
| **Description** | Standardized FailureResponse for invalid handoff, permission denial, fail-closed paths |
| **Weight** | 7 |
| **Depends On** | P1-W07 |
| **Enables** | P1-W09 |
| **Analyzer Check** | `yasii_p1_w08_failure_response_defined` |
| **System Map References** | §5 Runtime |
| **MVP** | ● |

---

### P1-W09 — Audit Skeleton

| Field | Value |
|-------|-------|
| **Key** | `P1-W09` |
| **Title** | Audit Skeleton |
| **Description** | Audit model + persist: user, tenant, ContextSnapshot ref, EffectiveScope ref, stage hash |
| **Weight** | 8 |
| **Depends On** | P1-W10, P1-W11 |
| **Enables** | P4-W08, P10-W03 |
| **Analyzer Check** | `yasii_p1_w09_audit_skeleton_persists` |
| **System Map References** | §2 Audit Trail |
| **MVP** | ● |

---

### P1-W10 — EffectiveScope Derivation

| Field | Value |
|-------|-------|
| **Key** | `P1-W10` |
| **Title** | EffectiveScope Derivation |
| **Description** | YASII Runtime Entry: derive EffectiveScope (= PermissionBoundary ∩ Current Context) in `modules/yasii/` per Permission Model |
| **Track** | YASII |
| **Weight** | 8 |
| **Depends On** | P1-W06, P1-W07 |
| **Enables** | P1-W09, P1-W11 |
| **Analyzer Check** | `yasii_p1_w10_effective_scope_derivation` |
| **System Map References** | §EffectiveScope |
| **MVP** | ● |

---

### P1-W11 — Runtime Orchestrator Skeleton

| Field | Value |
|-------|-------|
| **Key** | `P1-W11` |
| **Title** | Runtime Orchestrator Skeleton |
| **Description** | YASII Runtime Orchestrator skeleton + state machine; validates ACE handoff, stubs Phase 4 resolvers |
| **Weight** | 6 |
| **Depends On** | P1-W07, P1-W10 |
| **Enables** | P1-W09, P4-W08 |
| **Analyzer Check** | `yasii_p1_w11_runtime_skeleton_registered` |
| **System Map References** | §5 Runtime |
| **MVP** | ● |

---

### P1-W12 — Memory Layer Basic

| Field | Value |
|-------|-------|
| **Key** | `P1-W12` |
| **Title** | Memory Layer Basic |
| **Description** | Audit-linked Q&A stub; Memory Layer basic (Constitution MVP requirement) |
| **Weight** | 4 |
| **Depends On** | P1-W09 |
| **Enables** | P8-W01 |
| **Analyzer Check** | `yasii_p1_w12_memory_basic_linked` |
| **System Map References** | §2 Memory Layer |
| **MVP** | ● |

---

# Раздел 3. Phase 2 Work Items

**Stage:** `yasii-knowledge-foundation`  
**Depends On Stage:** `yasii-core-foundation` (≥50%)

| Key | Title | Weight | Depends On | Enables | Analyzer Check | MVP |
|-----|-------|--------|------------|---------|----------------|:---:|
| **P2-W01** | Knowledge Registry | 18 | P1-W06 | P2-W02, P3-W01 | `yasii_p2_w01_knowledge_registry_exists` | ● |
| **P2-W02** | Knowledge Source Registry | 15 | P2-W01 | P2-W04, P2-W05 | `yasii_p2_w02_source_registry_complete` | ● |
| **P2-W03** | Tier Classification | 18 | P2-W01 | P2-W04, P2-W06, P4-W02 | `yasii_p2_w03_tier_model_operational` | ● |
| **P2-W04** | Knowledge Index | 22 | P2-W02, P2-W03 | P3-W03, P3-W04 | `yasii_p2_w04_knowledge_index_tier01` | ● |
| **P2-W05** | Knowledge Source Validation | 12 | P2-W02, P2-W04 | P2-W06 | `yasii_p2_w05_source_validation_passes` | ● |
| **P2-W06** | Knowledge Readiness | 15 | P2-W03, P2-W04, P2-W05 | P3-W01 | `yasii_p2_w06_knowledge_stage_ready` | ● |

### P2-W04 — Knowledge Index (detail)

**Description:** Index Platform Knowledge Tier 0–3: ADR, Direction, Baseline, Lifecycle, Migration Map, Architecture Status.

**Evidence Criteria:** `code_evidence`: indexer returns ADR-001 by slug · `analyzer_evidence`: tier0_indexed · `dashboard_evidence`: sources in stage metadata

**Definition Of Done:** Missing Tier 0 → CRITICAL flag; normative query class excludes Tier 4 dashboard-only sources

**Constitution References:** P6 Tenant Awareness, P8 Knowledge Before Intelligence, P11 Reality Over Documentation

**System Map References:** §3 Knowledge Layer, Tier mapping

### P2-W06 — Knowledge Readiness (detail)

**Description:** Tier selection rule engine (base); phase gate verifying Tier 0–3 coverage and permission-filtered retrieval.

**Definition Of Done:** Stage readiness calculable; all P2 items evidence-pass

---

# Раздел 4. Phase 3 Work Items

**Stage:** `yasii-graph-foundation`  
**Depends On Stage:** `yasii-knowledge-foundation` (≥50%)

| Key | Title | Weight | Depends On | Enables | Analyzer Check | MVP |
|-----|-------|--------|------------|---------|----------------|:---:|
| **P3-W01** | Graph Nodes | 14 | P2-W06 | P3-W02, P3-W03, P3-W04 | `yasii_p3_w01_graph_nodes_indexed` | ● |
| **P3-W02** | Graph Edges | 10 | P3-W01 | P3-W03, P3-W04, P3-W05 | `yasii_p3_w02_graph_edges_integrity` | ● |
| **P3-W03** | Dependency Graph | 14 | P3-W01, P3-W02 | P5-W04, P9-W03 | `yasii_p3_w03_dependency_graph_synced` | ● |
| **P3-W04** | Rule Graph | 14 | P3-W01, P3-W02 | P4-W05, P5-W02 | `yasii_p3_w04_rule_graph_adr001` | ● |
| **P3-W05** | Graph Query Layer | 14 | P3-W03, P3-W04 | P4-W03, P3-W08 | `yasii_p3_w05_graph_query_traversal` | ● |
| **P3-W06** | Graph Readiness | 10 | P3-W05 | P4-W03 | `yasii_p3_w06_graph_stage_ready` | ● |
| **P3-W07** | Code Knowledge Index | 12 | P3-W01 | P5-W03, P5-W05 | `yasii_p3_w07_code_knowledge_indexed` | ● |
| **P3-W08** | Analyzer Evidence Nodes | 12 | P3-W01, P3-W05 | P4-W04, P6-W02 | `yasii_p3_w08_evidence_nodes_linked` | ● |

### P3-W08 — Analyzer Evidence Nodes (detail)

**Description:** AnalyzerCheck + Evidence nodes from platform_dashboard_analyzer; VERIFIED_BY edges to WorkItem nodes.

**Evidence Criteria:** `analyzer_evidence`: evidence_nodes_linked · `dashboard_evidence`: work item slug sync

**Constitution References:** P10 Evidence Over Opinion, P19 Knowledge Graph Mandatory, P20 Graph Before Search

**System Map References:** §4 Knowledge Graph, §3 Code Knowledge

---

# Раздел 5. Phase 4 Work Items

**Stage:** `yasii-runtime-foundation`  
**Depends On Stage:** `yasii-graph-foundation` (≥50%)

| Key | Title | Weight | Depends On | Enables | Analyzer Check | MVP |
|-----|-------|--------|------------|---------|----------------|:---:|
| **P4-W01** | Intent Resolver | 10 | P1-W11, P3-W06 | P4-W02, P5-W02 | `yasii_p4_w01_intent_resolver_registered` | ● |
| **P4-W02** | Knowledge Resolver | 10 | P2-W06, P4-W01 | P4-W03 | `yasii_p4_w02_knowledge_resolver_operational` | ● |
| **P4-W03** | Graph Resolver | 14 | P3-W05, P4-W02 | P4-W04, P5-W03 | `yasii_p4_w03_graph_resolver_traversal` | ● |
| **P4-W04** | Evidence Resolver | 14 | P3-W08, P4-W03 | P4-W05, P6-W02 | `yasii_p4_w04_evidence_resolver_merge` | ● |
| **P4-W05** | Rule Engine | 14 | P3-W04, P4-W04 | P4-W06, P5-W02 | `yasii_p4_w05_rule_engine_evaluates` | ● |
| **P4-W06** | Verdict Engine | 12 | P4-W05 | P4-W07, P5-W05, P6-W03 | `yasii_p4_w06_verdict_engine_registered` | ● |
| **P4-W07** | Answer Builder | 14 | P4-W06 | P5-W06, P6-W07 | `yasii_p4_w07_answer_builder_validates` | ● |
| **P4-W08** | Runtime Orchestrator Wiring | 12 | P1-W11, P1-W09, P4-W01–P4-W07 | P5-W01, P6-W01 | `yasii_p4_w08_runtime_pipeline_complete` | ● |

### P4-W08 — Runtime Orchestrator Wiring (detail)

**Description:** Wire full pipeline; integration test: normative UT question → BLOCKED + ADR-001 citation.

**Definition Of Done:** Zero LLM; Verdict+Citations mandatory; CONFLICTED → UNKNOWN/AT RISK; fail-closed on insufficient evidence

**Constitution References:** P8, P9, P12, P14

**System Map References:** §5 Runtime Engine full

---

# Раздел 6. Phase 5 Work Items

**Stage:** `yasii-developer-mvp`  
**Depends On Stage:** `yasii-runtime-foundation` (100%)

| Key | Title | Weight | Depends On | Enables | Analyzer Check | MVP |
|-----|-------|--------|------------|---------|----------------|:---:|
| **P5-W01** | Developer Profile | 14 | P4-W08 | P5-W02–P5-W06 | `yasii_p5_w01_developer_profile_active` | ● |
| **P5-W02** | Architecture Review | 22 | P5-W01, P4-W05 | P5-W06, P10-W03 | `yasii_p5_w02_architecture_review_capability` | ● |
| **P5-W03** | Impact Analysis | 16 | P5-W01, P4-W03 | P5-W06 | `yasii_p5_w03_impact_analysis_capability` | ● |
| **P5-W04** | Dependency Analysis | 14 | P5-W01, P3-W03 | P5-W06 | `yasii_p5_w04_dependency_analysis_capability` | ● |
| **P5-W05** | Architecture Verdicts | 14 | P5-W02, P4-W06 | P5-W06 | `yasii_p5_w05_architecture_verdicts_valid` | ● |
| **P5-W06** | Dev Query Capability | 10 | P5-W01, P4-W07 | P7-W04 | `yasii_p5_w06_dev_query_operational` | ● |
| **P5-W07** | Developer Readiness | 10 | P5-W02, P5-W03, P5-W04, P5-W05, P5-W06 | P7-W04, P10-W03 | `yasii_p5_w07_developer_stage_ready` | ● |

### P5-W02 — Architecture Review (detail)

**Description:** Scope → rules → findings; legacy violation → fail + rule id.

**Evidence Criteria:** `code_evidence`: UT write review test BLOCKED · `integration_evidence`: API callable with dev context

**Constitution References:** P2 AI Developer is role, P17 Role Driven, P18 Capability Reuse

---

# Раздел 7. Phase 6 Work Items

**Stage:** `yasii-owner-mvp`  
**Depends On Stage:** `yasii-runtime-foundation` (100%)

| Key | Title | Weight | Depends On | Enables | Analyzer Check | MVP |
|-----|-------|--------|------------|---------|----------------|:---:|
| **P6-W01** | Owner Assistant Profile | 10 | P4-W08 | P6-W02–P6-W07 | `yasii_p6_w01_owner_profile_active` | ● |
| **P6-W02** | Platform Health Snapshot | 14 | P6-W01, P3-W08 | P6-W05 | `yasii_p6_w02_health_snapshot_builder` | ● |
| **P6-W03** | Reality Check | 20 | P6-W01, P4-W04 | P6-W05, P10-W03 | `yasii_p6_w03_reality_check_operational` | ● |
| **P6-W04** | Deviation Registry | 14 | P6-W01, P4-W05 | P6-W05, P6-W06 | `yasii_p6_w04_deviation_registry_active` | ● |
| **P6-W05** | Owner Report | 22 | P6-W02, P6-W03, P6-W04 | P6-W07, P10-W03 | `yasii_p6_w05_owner_report_pipeline_ready` | ● |
| **P6-W06** | Improvement Suggestions | 10 | P6-W04 | P6-W07 | `yasii_p6_w06_improvement_suggestions_in_report` | ● |
| **P6-W07** | Owner Readiness | 10 | P6-W05, P6-W06 | P7-W04, P10-W03 | `yasii_p6_w07_owner_stage_ready` | ● |

### P6-W03 — Reality Check (detail)

**Description:** confirmed / partial / falsely_done; paper-done = dashboard DONE + analyzer fail.

**Evidence Criteria:** `analyzer_evidence`: reality_check_operational · `dashboard_evidence`: uses fresh dashboard data

**Constitution References:** P10 Evidence Over Opinion, P11 Reality Over Documentation

**System Map References:** §7 Reality Check, §12 Reports

---

# Раздел 8. Phase 7 Work Items

**Stage:** `yasii-embedded-intelligence`  
**Depends On Stages:** `yasii-developer-mvp` + `yasii-owner-mvp` (≥75%)

| Key | Title | Weight | Depends On | Enables | Analyzer Check | MVP |
|-----|-------|--------|------------|---------|----------------|:---:|
| **P7-W01** | Host Contract Implementation | 12 | P1-W05, P1-W06, P5-W07, P6-W07 | P7-W02–P7-W08 | `yasii_p7_w01_host_contract_implemented` | ● |
| **P7-W02** | Object Card Integration | 8 | P7-W01 | — | `yasii_p7_w02_object_card_integration` | ✗ |
| **P7-W03** | Registry Integration | 8 | P7-W01 | — | `yasii_p7_w03_registry_integration` | ✗ |
| **P7-W04** | Dashboard Integration | 22 | P7-W01, P5-W07, P6-W07 | P7-W08, P10-W03 | `yasii_p7_w04_dashboard_integration_mvp` | ● |
| **P7-W05** | Designer Integration | 10 | P7-W01, P5-W07 | — | `yasii_p7_w05_designer_integration` | ○ |
| **P7-W06** | Document Integration | 8 | P7-W01 | — | `yasii_p7_w06_document_integration` | ✗ |
| **P7-W07** | Process Integration | 8 | P7-W01 | — | `yasii_p7_w07_process_integration` | ✗ |
| **P7-W08** | Embedded Entry Points | 24 | P7-W04 | P10-W03 | `yasii_p7_w08_embedded_no_standalone_chat` | ● |

### P7-W04 — Dashboard Integration (detail)

**Description:** Platform Development Dashboard + Owner Dashboard context bridges; full HostContext (ACE → ContextSnapshot); role auto-selection.

**Definition Of Done (MVP):** Both dashboards send context; Owner → Owner Assistant; Dev → Developer; stale context warning

**Constitution References:** P4 Context First, P13 Embedded Intelligence

### MVP Phase 7 readiness

```text
MVP Phase 7 Complete =
    P7-W01 + P7-W04 + P7-W08 at 100%
    (P7-W02, W03, W06, W07 excluded from MVP readiness denominator)
```

---

# Раздел 9. Phase 8 Work Items

**Stage:** `yasii-memory-foundation`  
**Depends On Stage:** `yasii-platform-readiness` (100%) — post-MVP gate  
**MVP:** ✗

| Key | Title | Weight | Depends On | Enables | Analyzer Check |
|-----|-------|--------|------------|---------|----------------|
| **P8-W01** | User Memory | 18 | P10-W06, P1-W12 | P8-W06, P9-W01 | `yasii_p8_w01_user_memory_store` |
| **P8-W02** | Tenant Memory | 18 | P10-W06 | P8-W06 | `yasii_p8_w02_tenant_memory_store` |
| **P8-W03** | Decision Memory | 20 | P6-W04, P1-W09 | P9-W01, P9-W04 | `yasii_p8_w03_decision_memory_linked` |
| **P8-W04** | Session Memory | 16 | P8-W01 | P9-W01 | `yasii_p8_w04_session_memory_multiturn` |
| **P8-W05** | Process Memory Schema | 14 | P8-W02 | — | `yasii_p8_w05_process_memory_schema` |
| **P8-W06** | Memory Graph Linking | 14 | P8-W01, P8-W03 | P9-W02 | `yasii_p8_w06_memory_graph_linked` |

**Constitution References:** P16 Memory Is Strategic Asset; forbidden isolated per-role memory

---

# Раздел 10. Phase 9 Work Items

**Stage:** `yasii-strategy-layer`  
**Depends On:** P6-W07, P3-W03; P8-W03 partial  
**MVP:** ✗

| Key | Title | Weight | Depends On | Enables | Analyzer Check |
|-----|-------|--------|------------|---------|----------------|
| **P9-W01** | Strategy Capability Engine | 20 | P6-W07, P3-W03 | P9-W02, P9-W04 | `yasii_p9_w01_strategy_engine_operational` |
| **P9-W02** | Unlock Score Ranking | 18 | P9-W01, P8-W06 | P9-W04 | `yasii_p9_w02_unlock_score_ranking` |
| **P9-W03** | Blocker Detection | 18 | P9-W01, P3-W03 | P9-W04 | `yasii_p9_w03_blocker_detection` |
| **P9-W04** | Strategy Recommendation Templates | 16 | P9-W02, P9-W03 | P9-W06 | `yasii_p9_w04_strategy_templates_ready` |
| **P9-W05** | YASII Architect Profile | 14 | P9-W01, P5-W01 | — | `yasii_p9_w05_architect_profile_active` |
| **P9-W06** | Improvement Query Standalone | 14 | P6-W06, P9-W01 | — | `yasii_p9_w06_improvement_query_standalone` |

**Definition Of Done (phase):** «Что делать дальше?» → top 5 ranked + DO NEXT + graph citations; no autonomous actions

---

# Раздел 11. Phase 10 Work Items

**Stage:** `yasii-platform-readiness`  
**Depends On Stages:** Phases 1–7 MVP items (100%)  
**MVP:** ● gate

| Key | Title | Weight | Depends On | Enables | Analyzer Check |
|-----|-------|--------|------------|---------|----------------|
| **P10-W01** | Constitution Compliance Audit | 18 | P1–P7 MVP complete | P10-W06 | `yasii_p10_w01_constitution_compliance_pass` |
| **P10-W02** | System Map Coverage Matrix | 16 | P1–P7 MVP complete | P10-W06 | `yasii_p10_w02_system_map_coverage_pass` |
| **P10-W03** | E2E MVP Scenario Tests | 22 | P5-W07, P6-W07, P7-W08 | P10-W06 | `yasii_p10_w03_e2e_mvp_scenarios_pass` |
| **P10-W04** | Analyzer Evidence Suite | 18 | All MVP work items | P10-W05 | `yasii_p10_w04_analyzer_suite_complete` |
| **P10-W05** | Dashboard Readiness Rollup | 12 | P10-W04 | P10-W06 | `yasii_p10_w05_dashboard_readiness_100` |
| **P10-W06** | Architecture Sign-Off | 14 | P10-W01–P10-W05 | MVP Release, P8-W01 | `yasii_p10_w06_architecture_signoff` |

### P10-W03 — E2E MVP Scenario Tests (detail)

**Description:** Verify all 9 Success Criteria from Roadmap §9 + Constitution readiness criteria.

**Evidence Criteria:** `integration_evidence`: staging E2E · `code_evidence`: scenario test suite · `documentation_evidence`: sign-off report

---

# Раздел 12. Dependency Graph

## 12.1. Intra-phase chain (Phase 1 example)

```text
P1-W01 YASII Module Skeleton
    ↓
P1-W02 ACE Module Skeleton
    ↓
P1-W03 Identity Resolution
    ↓
P1-W04 Permission Resolution
    ↓
P1-W05 ContextSnapshot Builder
    ↓
P1-W06 PermissionBoundary Builder
    ↓
P1-W07 Request Response Contracts
    ↓
P1-W10 EffectiveScope Derivation
    ↓
P1-W11 Runtime Orchestrator Skeleton
    ↓
P1-W09 Audit Skeleton
    ↓
P1-W12 Memory Basic
```

## 12.2. Inter-phase chain (MVP critical path)

```text
Phase 1 (Core)
    P1-W01 → … → P1-W12
        ↓
Phase 2 (Knowledge)
    P2-W01 → … → P2-W06
        ↓
Phase 3 (Graph)
    P3-W01 → … → P3-W08
        ↓
Phase 4 (Runtime)
    P4-W01 → … → P4-W08
        ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
Phase 5 (Developer)           Phase 6 (Owner)
P5-W01 → … → P5-W07           P6-W01 → … → P6-W07
    └───────────────┬───────────────┘
                    ↓
Phase 7 (Embedded MVP subset)
    P7-W01 → P7-W04 → P7-W08
        ↓
Phase 10 (Readiness Gate)
    P10-W01 → … → P10-W06
        ↓
    MVP RELEASE
        ↓
Phase 8 (Memory) ──► Phase 9 (Strategy)
```

## 12.3. Parallel tracks

| Track | Items | May parallel with |
|-------|-------|-----------------|
| Developer | P5-* | P6-* (after P4-W08) |
| Post-MVP Memory | P8-* | P9-* (partial, after P10) |
| Post-MVP Integrations | P7-W02, W03, W05–W07 | After MVP release |

---

# Раздел 13. Readiness Model

## 13.1. Work Item readiness levels

| % | Status | Entry criteria |
|---|--------|----------------|
| **0%** | Not Started | No code; planned only |
| **25%** | Foundation | Schema/module exists; tests stubbed |
| **50%** | Operational | Core function passes unit tests |
| **75%** | Integrated | Upstream/downstream dependency verified |
| **100%** | Completed | DoD ✓; all evidence checks pass |

## 13.2. Transition rules

```text
0 → 25:   first commit merged
25 → 50:  primary analyzer check passes
50 → 75:  integration with Depends On items verified
75 → 100: DoD checklist complete + all evidence types satisfied
```

**Forbidden:** 100% without `analyzer_evidence` (where check defined).

## 13.3. Stage readiness (by phase)

| Stage | 25% | 50% | 75% | 100% |
|-------|-----|-----|-----|------|
| P1 | W01–W02 | W03–W05 | W06–W07 | all 9 items |
| P2 | W01–W02 | W03–W04 | W05 | all 6 |
| P3 | W01–W02 | W03–W04 | W05, W07–W08 | all 8 |
| P4 | W01–W02 | W03–W04 | W05–W06 | all 8 |
| P5 | W01 | W02 | W03–W05 | all 7 |
| P6 | W01 | W02–W03 | W04–W05 | all 7 |
| P7 MVP | W01 | W04 | W08 | W01+W04+W08 |
| P10 | W01–W02 | W03 | W04–W05 | all 6 |

---

# Раздел 14. Evidence Model

## 14.1. Evidence types (required per work item)

| Type | Field | Source |
|------|-------|--------|
| Code | `code_evidence` | Unit/integration tests, module markers |
| Analyzer | `analyzer_evidence` | platform_dashboard_analyzer check |
| Dashboard | `dashboard_evidence` | Stage/task status, readiness rollup |
| Documentation | `documentation_evidence` | Committed specs, ADR sync |
| Integration | `integration_evidence` | E2E host surface tests |

## 14.2. DONE gate (mandatory)

```text
Work Item DONE =
    implementation merged
    AND analyzer_check = pass (if defined)
    AND code_evidence = pass
    AND DoD checklist = all checked
    AND no CRITICAL constitution violation open for this item
```

**Запрещено:** status `done` without evidence (Roadmap §5.3).

## 14.3. Paper-done propagation

```text
IF work_item.status = done AND analyzer_check = fail
THEN dashboard flags falsely_done
AND P6-W03 Reality Check surfaces item
AND P10-W04 blocks until resolved
```

---

# Раздел 15. Analyzer Integration

## 15.1. Naming convention

```text
yasii_p{phase}_w{workitem}_{check_name}

Examples:
  yasii_p1_w03_identity_resolution_ace
  yasii_p4_w06_verdict_engine_registered
  yasii_p6_w05_owner_report_pipeline_ready
  yasii_p7_w04_dashboard_integration_mvp
  yasii_p10_w03_e2e_mvp_scenarios_pass
```

## 15.2. Component registration (analyzer)

```text
platform_dashboard components (planned):
  yasii-core          → Phase 1 checks
  yasii-knowledge     → Phase 2 checks
  yasii-graph         → Phase 3 checks
  yasii-runtime       → Phase 4 checks
  yasii-developer     → Phase 5 checks
  yasii-owner         → Phase 6 checks
  yasii-embedded      → Phase 7 checks
  yasii-readiness     → Phase 10 checks
  yasii-memory        → Phase 8 checks (post-MVP)
  yasii-strategy      → Phase 9 checks (post-MVP)
```

## 15.3. Stale analyzer handling

```text
IF analyzer_hash != current_hash
THEN yasii evidence = STALE
AND owner report progress sections = UNKNOWN
AND work item remains done ONLY IF code_evidence still valid
```

---

# Раздел 16. Dashboard Seed Data

## 16.1. Stage seed structure

```json
[
  {
    "slug": "yasii-core-foundation",
    "title": "YASII Core Foundation",
    "description": "Identity, Context, Permission, Runtime skeleton, Audit",
    "order_index": 100,
    "status": "planned",
    "completion_criteria": [
      "Request without session rejected",
      "Identity + Context + Permission resolve",
      "Audit trail persists"
    ],
    "mvp": true
  },
  {
    "slug": "yasii-knowledge-foundation",
    "title": "YASII Knowledge Foundation",
    "order_index": 101,
    "mvp": true
  },
  {
    "slug": "yasii-graph-foundation",
    "title": "YASII Knowledge Graph Foundation",
    "order_index": 102,
    "mvp": true
  },
  {
    "slug": "yasii-runtime-foundation",
    "title": "YASII Runtime Engine Foundation",
    "order_index": 103,
    "mvp": true
  },
  {
    "slug": "yasii-developer-mvp",
    "title": "YASII Developer MVP",
    "order_index": 104,
    "mvp": true
  },
  {
    "slug": "yasii-owner-mvp",
    "title": "YASII Owner Assistant MVP",
    "order_index": 105,
    "mvp": true
  },
  {
    "slug": "yasii-embedded-intelligence",
    "title": "YASII Embedded Intelligence",
    "order_index": 106,
    "mvp": "partial"
  },
  {
    "slug": "yasii-memory-foundation",
    "title": "YASII Memory Foundation",
    "order_index": 107,
    "mvp": false
  },
  {
    "slug": "yasii-strategy-layer",
    "title": "YASII Strategy Layer",
    "order_index": 108,
    "mvp": false
  },
  {
    "slug": "yasii-platform-readiness",
    "title": "YASII Platform Readiness",
    "order_index": 109,
    "mvp": true
  }
]
```

## 16.2. Work item seed record (template)

```json
{
  "key": "P1-W03",
  "phase": "yasii-phase-1",
  "stage": "yasii-core-foundation",
  "title": "Identity Resolution",
  "slug": "p1-w03-identity-resolution",
  "weight": 9,
  "status": "planned",
  "priority": "high",
  "depends_on": ["P1-W02"],
  "enables": ["P1-W04", "P1-W05", "P1-W06"],
  "readiness": 0,
  "mvp": true,
  "constitution_ref": ["P4", "P12", "P15"],
  "system_map_ref": ["§ACE Identity Resolution"],
  "analyzer_check": "yasii_p1_w03_identity_resolution_ace",
  "evidence_types": ["code_evidence", "analyzer_evidence", "integration_evidence"]
}
```

## 16.3. Full work item index (import-ready)

| Key | Stage | Title | Weight | DependsOn | MVP |
|-----|-------|-------|--------|-----------|:---:|
| P1-W01 | yasii-core-foundation | YASII Module Skeleton | 8 | — | ● |
| P1-W02 | yasii-core-foundation | ACE Module Skeleton | 10 | P1-W01 | ● |
| P1-W03 | yasii-core-foundation | Identity Resolution | 9 | P1-W02 | ● |
| P1-W04 | yasii-core-foundation | Permission Resolution | 9 | P1-W03 | ● |
| P1-W05 | yasii-core-foundation | ContextSnapshot Builder | 11 | P1-W04 | ● |
| P1-W06 | yasii-core-foundation | PermissionBoundary Builder | 11 | P1-W04,P1-W05 | ● |
| P1-W07 | yasii-core-foundation | Request Response Contracts | 9 | P1-W01,P1-W06 | ● |
| P1-W08 | yasii-core-foundation | FailureResponse | 7 | P1-W07 | ● |
| P1-W09 | yasii-core-foundation | Audit Skeleton | 8 | P1-W10,P1-W11 | ● |
| P1-W10 | yasii-core-foundation | EffectiveScope Derivation | 8 | P1-W06,P1-W07 | ● |
| P1-W11 | yasii-core-foundation | Runtime Orchestrator Skeleton | 6 | P1-W07,P1-W10 | ● |
| P1-W12 | yasii-core-foundation | Memory Layer Basic | 4 | P1-W09 | ● |
| P2-W01 | yasii-knowledge-foundation | Knowledge Registry | 18 | P1-W06 | ● |
| P2-W02 | yasii-knowledge-foundation | Knowledge Source Registry | 15 | P2-W01 | ● |
| P2-W03 | yasii-knowledge-foundation | Tier Classification | 18 | P2-W01 | ● |
| P2-W04 | yasii-knowledge-foundation | Knowledge Index | 22 | P2-W02,P2-W03 | ● |
| P2-W05 | yasii-knowledge-foundation | Knowledge Source Validation | 12 | P2-W02,P2-W04 | ● |
| P2-W06 | yasii-knowledge-foundation | Knowledge Readiness | 15 | P2-W03–W05 | ● |
| P3-W01 | yasii-graph-foundation | Graph Nodes | 14 | P2-W06 | ● |
| P3-W02 | yasii-graph-foundation | Graph Edges | 10 | P3-W01 | ● |
| P3-W03 | yasii-graph-foundation | Dependency Graph | 14 | P3-W01,P3-W02 | ● |
| P3-W04 | yasii-graph-foundation | Rule Graph | 14 | P3-W01,P3-W02 | ● |
| P3-W05 | yasii-graph-foundation | Graph Query Layer | 14 | P3-W03,P3-W04 | ● |
| P3-W06 | yasii-graph-foundation | Graph Readiness | 10 | P3-W05 | ● |
| P3-W07 | yasii-graph-foundation | Code Knowledge Index | 12 | P3-W01 | ● |
| P3-W08 | yasii-graph-foundation | Analyzer Evidence Nodes | 12 | P3-W01,P3-W05 | ● |
| P4-W01 | yasii-runtime-foundation | Intent Resolver | 10 | P1-W11,P3-W06 | ● |
| P4-W02 | yasii-runtime-foundation | Knowledge Resolver | 10 | P2-W06,P4-W01 | ● |
| P4-W03 | yasii-runtime-foundation | Graph Resolver | 14 | P3-W05,P4-W02 | ● |
| P4-W04 | yasii-runtime-foundation | Evidence Resolver | 14 | P3-W08,P4-W03 | ● |
| P4-W05 | yasii-runtime-foundation | Rule Engine | 14 | P3-W04,P4-W04 | ● |
| P4-W06 | yasii-runtime-foundation | Verdict Engine | 12 | P4-W05 | ● |
| P4-W07 | yasii-runtime-foundation | Answer Builder | 14 | P4-W06 | ● |
| P4-W08 | yasii-runtime-foundation | Runtime Orchestrator Wiring | 12 | P4-W01–W07,P1-W11,P1-W09 | ● |
| P5-W01 | yasii-developer-mvp | Developer Profile | 14 | P4-W08 | ● |
| P5-W02 | yasii-developer-mvp | Architecture Review | 22 | P5-W01,P4-W05 | ● |
| P5-W03 | yasii-developer-mvp | Impact Analysis | 16 | P5-W01,P4-W03 | ● |
| P5-W04 | yasii-developer-mvp | Dependency Analysis | 14 | P5-W01,P3-W03 | ● |
| P5-W05 | yasii-developer-mvp | Architecture Verdicts | 14 | P5-W02,P4-W06 | ● |
| P5-W06 | yasii-developer-mvp | Dev Query Capability | 10 | P5-W01,P4-W07 | ● |
| P5-W07 | yasii-developer-mvp | Developer Readiness | 10 | P5-W02–W06 | ● |
| P6-W01 | yasii-owner-mvp | Owner Assistant Profile | 10 | P4-W08 | ● |
| P6-W02 | yasii-owner-mvp | Platform Health Snapshot | 14 | P6-W01,P3-W08 | ● |
| P6-W03 | yasii-owner-mvp | Reality Check | 20 | P6-W01,P4-W04 | ● |
| P6-W04 | yasii-owner-mvp | Deviation Registry | 14 | P6-W01,P4-W05 | ● |
| P6-W05 | yasii-owner-mvp | Owner Report | 22 | P6-W02–W04 | ● |
| P6-W06 | yasii-owner-mvp | Improvement Suggestions | 10 | P6-W04 | ● |
| P6-W07 | yasii-owner-mvp | Owner Readiness | 10 | P6-W05,P6-W06 | ● |
| P7-W01 | yasii-embedded-intelligence | Host Contract Implementation | 12 | P1-W05,P1-W06,P5-W07,P6-W07 | ● |
| P7-W02 | yasii-embedded-intelligence | Object Card Integration | 8 | P7-W01 | ✗ |
| P7-W03 | yasii-embedded-intelligence | Registry Integration | 8 | P7-W01 | ✗ |
| P7-W04 | yasii-embedded-intelligence | Dashboard Integration | 22 | P7-W01,P5-W07,P6-W07 | ● |
| P7-W05 | yasii-embedded-intelligence | Designer Integration | 10 | P7-W01,P5-W07 | ○ |
| P7-W06 | yasii-embedded-intelligence | Document Integration | 8 | P7-W01 | ✗ |
| P7-W07 | yasii-embedded-intelligence | Process Integration | 8 | P7-W01 | ✗ |
| P7-W08 | yasii-embedded-intelligence | Embedded Entry Points | 24 | P7-W04 | ● |
| P8-W01 | yasii-memory-foundation | User Memory | 18 | P10-W06,P1-W12 | ✗ |
| P8-W02 | yasii-memory-foundation | Tenant Memory | 18 | P10-W06 | ✗ |
| P8-W03 | yasii-memory-foundation | Decision Memory | 20 | P6-W04,P1-W09 | ✗ |
| P8-W04 | yasii-memory-foundation | Session Memory | 16 | P8-W01 | ✗ |
| P8-W05 | yasii-memory-foundation | Process Memory Schema | 14 | P8-W02 | ✗ |
| P8-W06 | yasii-memory-foundation | Memory Graph Linking | 14 | P8-W01,P8-W03 | ✗ |
| P9-W01 | yasii-strategy-layer | Strategy Capability Engine | 20 | P6-W07,P3-W03 | ✗ |
| P9-W02 | yasii-strategy-layer | Unlock Score Ranking | 18 | P9-W01,P8-W06 | ✗ |
| P9-W03 | yasii-strategy-layer | Blocker Detection | 18 | P9-W01,P3-W03 | ✗ |
| P9-W04 | yasii-strategy-layer | Strategy Recommendation Templates | 16 | P9-W02,P9-W03 | ✗ |
| P9-W05 | yasii-strategy-layer | YASII Architect Profile | 14 | P9-W01,P5-W01 | ✗ |
| P9-W06 | yasii-strategy-layer | Improvement Query Standalone | 14 | P6-W06,P9-W01 | ✗ |
| P10-W01 | yasii-platform-readiness | Constitution Compliance Audit | 18 | P1–P7 MVP | ● |
| P10-W02 | yasii-platform-readiness | System Map Coverage Matrix | 16 | P1–P7 MVP | ● |
| P10-W03 | yasii-platform-readiness | E2E MVP Scenario Tests | 22 | P5-W07,P6-W07,P7-W08 | ● |
| P10-W04 | yasii-platform-readiness | Analyzer Evidence Suite | 18 | all MVP items | ● |
| P10-W05 | yasii-platform-readiness | Dashboard Readiness Rollup | 12 | P10-W04 | ● |
| P10-W06 | yasii-platform-readiness | Architecture Sign-Off | 14 | P10-W01–W05 | ● |

---

# Раздел 17. MVP Critical Path

## 17.0. Progress on critical path (2026-05-31)

```text
P1-W01 ✓  →  P1-W02 ✓  →  P1-W03 (current)  →  …
```

## 17.1. Critical path (blocking MVP)

```text
P1-W01 → P1-W02 → P1-W03 → P1-W04 → P1-W05 → P1-W06 → P1-W07 → P1-W10 → P1-W11 → P1-W09
    → P2-W01 → P2-W06
    → P3-W01 → P3-W08
    → P4-W08
    → P5-W02 + P6-W05 (parallel after P4-W08)
    → P7-W01 → P7-W04 → P7-W08
    → P10-W03 → P10-W06
```

**Minimum sequential depth:** 7 phases + gate ≈ 28 blocking work items.

## 17.2. MVP blockers

| Blocker | Blocks |
|---------|--------|
| P1-W03 Identity Resolution (ACE) | All data access |
| P1-W06 PermissionBoundary (ACE) | Knowledge, Graph, answers |
| P1-W10 EffectiveScope | Scoped Knowledge/Graph reads |
| P4-W08 Runtime | Developer + Owner roles |
| P3-W08 Evidence nodes | Reality Check, Owner Report accuracy |
| P6-W05 Owner Report | Phase 10 E2E |
| P7-W08 Embedded entry | Constitution §13 MVP |
| P10-W06 Sign-off | MVP release |

## 17.3. Accelerators (parallel safe)

| Parallel track | Condition |
|----------------|-----------|
| P5-* ∥ P6-* | After P4-W08 complete |
| P5-W03 Impact ∥ P5-W04 Dependency | After P5-W01 |
| P6-W04 Deviation ∥ P6-W02 Snapshot | After P6-W01 |
| P10-W01 ∥ P10-W02 | After P7 MVP complete |

## 17.4. Non-MVP path (does not block MVP)

```text
P7-W02 Object Card
P7-W03 Registry
P7-W05 Designer (optional)
P7-W06 Document
P7-W07 Process
P8-* Memory extended
P9-* Strategy full
```

---

# Раздел 18. Success Metrics

## 18.1. Readiness YASII (overall)

```text
yasii_mvp_readiness =
    sum(completed_mvp_item_weights) / sum(all_mvp_item_weights) × 100

MVP item set = all items with MVP ● in Phases 1–7 + Phase 10
Excluded from MVP denominator: P7-W02, W03, W05, W06, W07; all P8, P9
```

## 18.2. Readiness by phase

```text
phase_readiness = sum(completed_weights_in_phase) / sum(weights_in_phase) × 100
```

## 18.3. Readiness platform (YASII contribution)

```text
platform_readiness includes yasii_mvp_readiness as weighted track
(recommended weight: align with platform implementation roadmap stage order)
```

## 18.4. MVP success (binary)

```text
yasii_mvp_complete = 1  ⟺  P10-W06 done AND yasii_mvp_readiness = 100%
```

## 18.5. Target metrics (post-implementation)

| Metric | Target |
|--------|--------|
| MVP work items with analyzer evidence | 100% |
| Falsely_done YASII items | 0 |
| Responses without Citations | 0 |
| Constitution CRITICAL violations | 0 |
| Standalone chat primary route | 0 (must not exist) |
| LLM calls in runtime path | 0 |

## 18.6. Owner Assistant readiness

```text
owner_assistant_operational =
    P6-W07 = 100%
    AND P7-W04 = 100%
    AND P10-W03 scenario #9 pass (Owner Report + paper-done)
```

---

# Приложение A. Capability → Work Item Map

| Capability | Primary Work Items |
|------------|-------------------|
| Architecture Review | P5-W02, P5-W05 |
| Dev Query | P5-W06 |
| Impact Analysis | P5-W03 |
| Dependency Analysis | P5-W04 |
| Reality Check | P6-W03 |
| Owner Report | P6-W05 |
| Improvement Suggestions | P6-W06 |
| Strategy Recommendation | P9-W04 (post-MVP); hints in P6-W05 |
| Embedded Intelligence | P7-W01, P7-W04, P7-W08 |

---

# Приложение B. Document Hierarchy

```text
YASII_MASTER_MAP.md
    ↓
YASII_CONSTITUTION.md
    ↓
YASII_SYSTEM_MAP.md
    ↓
YASII_IMPLEMENTATION_ROADMAP.md
    ↓
YASII_DASHBOARD_WORK_ITEMS.md    ← настоящий документ
    ↓
platform_dashboard seed + platform_dashboard_analyzer checks
    ↓
Implementation
```

---

**Document owner:** Platform Architecture  
**Next implementation step:** Seed `platform_implementation_stages` + `platform_tasks` from §16; register analyzer checks from §15  
**Compliance:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_IMPLEMENTATION_ROADMAP.md](./YASII_IMPLEMENTATION_ROADMAP.md)
