# YASII Evidence Snapshot Spec

**Статус:** FOUNDATIONAL EVIDENCE ARCHITECTURE DOCUMENT  
**Версия:** 1.0  
**Дата:** 2026-05-30  

**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_DOMAIN_MODEL.md](./YASII_DOMAIN_MODEL.md) v1.3 · [ADR_YASII_AI_CONTEXT_BOUNDARY.md](./ADR_YASII_AI_CONTEXT_BOUNDARY.md) · [YASII_HOST_INTEGRATION_CONTRACT.md](./YASII_HOST_INTEGRATION_CONTRACT.md) · [YASII_PERMISSION_MODEL.md](./YASII_PERMISSION_MODEL.md)

**Область:** архитектурная спецификация evidence/snapshot слоя ЯСИИ — как фиксируются Evidence, Citation, GraphSnapshot, RuleEvaluation и DecisionSnapshot для explainability, auditability и replay.  
**Вне области:** схемы БД, REST API, код модулей, LLM prompt design, конкретные storage backends.

---

# Раздел 1. Назначение Evidence Snapshot Spec

## Зачем нужен Evidence Snapshot

**Evidence Snapshot Spec** определяет **нормативный контракт фиксации доказательств** на пути:

```text
Host Surface → ACE → YASII Runtime Entry (EffectiveScope) → Knowledge → Graph → Evidence → Verdict → Response → AuditRecord
```

Без этого слоя ЯСИИ может формировать **убедительный текст** без **проверяемой цепочки** «факт → правило → решение → цитата → ответ».

**EvidenceSnapshot**, **GraphSnapshot**, **RuleEvaluationSnapshot**, **DecisionSnapshot** и связанные артефакты обеспечивают:

- **Explainability** — пользователь и аудитор видят, *почему* дан Verdict;
- **Auditability** — каждый ответ воспроизводим из immutable snapshots;
- **Reality Over Documentation** — приоритет analyzer/runtime evidence над declared status;
- **Permission First** — доказательства и цитаты не выходят за EffectiveScope;
- **Fail Closed** — отсутствие evidence → FailureResponse, не «догадка».

## Какие риски устраняет

| Риск | Механизм spec |
|------|----------------|
| «Умный чат» без доказательств | Every non-failure Response must be evidence-backed |
| Невоспроизводимый ответ | Audit replay uses snapshots, not live state |
| Утечка через citation | Citation redaction + EffectiveScope boundary |
| Paper-done vs reality | Contradictory Evidence + priority ladder |
| COMPLIANT на устаревших данных | STALE evidence rules |
| Скрытые graph transitions | GraphSnapshot with cutOffNodes / deniedNodes |
| Непрослеживаемый Verdict | DecisionSnapshot chain Evidence → Rule → Verdict → Recommendation |

## Почему без Evidence Snapshot ЯСИИ = обычный чат

Generative narrative **не является** Evidence.  
Normative Response **обязан** ссылаться на **версионируемые источники**, **зафиксированный подграф**, **результаты rule evaluation** и **immutable bundle** на момент ответа.

Иначе нарушаются Constitution §10 (Evidence Over Opinion), §11 (Reality Over Documentation), §14 (Explainability) и Domain Model Decision Domain.

## Связь с AuditRecord и воспроизводимостью

**AuditRecord** — корневая запись audit domain. Она **агрегирует snapshots**, достаточные для replay **без доступа к live platform state**:

```text
AuditRecord
├── RequestSnapshot
├── ContextSnapshotSnapshot
├── PermissionBoundarySnapshot
├── EffectiveScopeSnapshot
├── EvidenceSnapshot
├── GraphSnapshot
├── RuleEvaluationSnapshot[]      ← bundle per evaluated rule
├── DecisionSnapshot
└── RedactionLog
```

**Инвариант:** любой normative **Response** MUST быть воспроизводим из AuditRecord snapshots (Domain Model §9).

---

# Раздел 2. Базовые принципы

| Принцип | Нормативная формулировка |
|---------|--------------------------|
| **Evidence First** | Every non-failure Response must be evidence-backed. |
| **Evidence Over Opinion** | Declared / documentation status never replaces Evidence. |
| **Reality Over Documentation** | Analyzer and runtime state override declared COMPLETED when in conflict. |
| **Explainability** | User-visible claims trace to Evidence, Citation, RuleEvaluation. |
| **Auditability** | AuditRecord must contain enough snapshots to replay the answer. |
| **Fail Closed** | No Evidence → FailureResponse or UNKNOWN; no silent guess. |
| **Permission First** | Evidence must be inside EffectiveScope; collection after EffectiveScope derivation. |
| **EffectiveScope Boundary** | Citation and Evidence outside scope are forbidden in Response. |

### Дополнительные правила

```text
Citation must point to a versioned source.

Verdict must be traceable to Evidence and Rule.

Recommendation must be traceable to Verdict.

No Evidence → FailureResponse or UNKNOWN.
```

---

# Раздел 3. Evidence Model

## Сущность Evidence

**Evidence** — проверяемый факт, подтверждающий или опровергающий утверждение в рамках одного **Request**.

| Атрибут | Назначение |
|---------|------------|
| `evidenceId` | Stable id в рамках request / audit bundle |
| `evidenceType` | Класс источника (см. §3.1) |
| `sourceType` | Тип первичного источника (document, code, analyzer, …) |
| `sourceId` | Stable ref источника в platform namespace |
| `sourceVersion` | Version ref (commit, doc revision, analyzer hash, entity version) |
| `effectiveScopeRef` | Ref EffectiveScope, внутри которого evidence collected |
| `permissionBoundaryRef` | Ref PermissionBoundary на момент collection |
| `collectedAt` | Timestamp сбора |
| `freshness` | `fresh` \| `stale` \| `unknown` |
| `strength` | STRONG \| PARTIAL \| WEAK \| STALE \| CONTRADICTED \| ABSENT |
| `payloadRef` | Opaque ref на permission-safe payload (не live pointer) |
| `integrityHash` | Hash payload + metadata для replay verification |

> **Согласование с Domain Model v1.3:** атрибуты расширяют таблицу Evidence (`sourceRef`, `knowledgeRef`, `graphNodeRef`, `observedAt`) — маппинг additive; breaking rename не требуется.

## 3.1. Evidence Types

| Type | Назначение | Типичный source |
|------|------------|-----------------|
| `DOCUMENT_EVIDENCE` | Фрагмент normative / design документа | Architecture doc, ADR |
| `ARCHITECTURE_DOC_EVIDENCE` | Специализированный architecture tier evidence | Tier 0–1 registry |
| `CODE_EVIDENCE` | Marker, module, test, static scan | Repo / module graph |
| `ANALYZER_EVIDENCE` | platform_dashboard_analyzer check result | AnalyzerCheck node |
| `DASHBOARD_EVIDENCE` | Readiness, stage status, work item state | Platform Dashboard |
| `RUNTIME_STATE_EVIDENCE` | Live runtime entity / relation state (snapshotted) | Runtime Entity layer |
| `GRAPH_EVIDENCE` | Fact derived from permitted subgraph | GraphTraversal result |
| `RULE_EVIDENCE` | Output промежуточной rule precondition | Rule Engine |
| `NEGATIVE_EVIDENCE` | Доказанное отсутствие (file not found, check fail) | Resolver negative path |
| `STALE_EVIDENCE` | Устаревший, но сохранённый факт | Stale analyzer / doc drift |
| `CONTRADICTED_EVIDENCE` | Evidence в явном конфликте с другим evidence | Conflict resolver |

**Инвариант:** каждый Evidence item MUST ссылаться ≥1 **KnowledgeSource** (Domain Model Knowledge Domain).

---

# Раздел 4. Evidence Strength

## Уровни силы

| Strength | Семантика |
|----------|-----------|
| `STRONG` | Direct, fresh, permitted proof (e.g. passing analyzer on current hash) |
| `PARTIAL` | Incomplete but directionally valid (subset of checks, indirect marker) |
| `WEAK` | Heuristic / indirect signal; insufficient alone for normative COMPLIANT |
| `STALE` | Evidence collected when source since changed or freshness window expired |
| `CONTRADICTED` | Explicit conflict with higher-priority evidence (see §12) |
| `ABSENT` | Negative proof — expected artifact missing |

## Правила применения strength

```text
COMPLIANT и NON_COMPLIANT не могут строиться только на WEAK evidence.

STALE evidence не может самостоятельно подтверждать COMPLIANT.

ABSENT evidence используется для negative checks и NON_COMPLIANT / UNKNOWN paths.

CONTRADICTED evidence MUST быть surfaced в Response (Risk или explicit conflict section).

STALE evidence не удаляется — остаётся в EvidenceSnapshot с пометкой strength=STALE.
```

### Маппинг на Domain Model

Domain Model v1.3 использует `strong` \| `partial` \| `weak` + `freshness`.  
Spec добавляет **нормативные composite states** `STALE`, `CONTRADICTED`, `ABSENT` как **allowed strength values** для audit clarity (additive extension).

---

# Раздел 5. Citation Model

## Сущность Citation

**Citation** — permission-safe, versioned указатель на происхождение утверждения в **Response**.

| Атрибут | Назначение |
|---------|------------|
| `citationId` | Stable id в Response / DecisionSnapshot |
| `sourceId` | KnowledgeSource / document / code ref |
| `sourceVersion` | Immutable version ref |
| `sourceType` | document \| code \| dashboard \| analyzer \| graph \| runtime |
| `location` | Path: file:line, doc:§, workItem:P1-W02, graphNode:… |
| `fragmentHash` | Hash цитируемого фрагмента на момент snapshot |
| `allowedFragment` | Redacted, user-safe excerpt (may be empty if denied) |
| `redactionApplied` | Boolean — был ли применён redaction pipeline |

## Правила Citation

```text
Citation не может раскрывать данные вне EffectiveScope.

Citation не может содержать закрытые поля.

Citation всегда ссылается на версию источника.

Citation fragment должен быть безопасен для пользователя.

Normative Response MUST contain ≥1 Citation (Domain Model §9).
```

**Связи:** Citation → Evidence (supporting) → KnowledgeSource; Citation → Response.

---

# Раздел 6. Evidence Snapshot

## Сущность EvidenceSnapshot

**EvidenceSnapshot** — immutable freeze **всех Evidence items**, использованных или рассмотренных при формировании Response.

| Поле | Назначение |
|------|------------|
| `snapshotId` | Unique snapshot id |
| `requestId` | Parent Request |
| `evidenceIds` | Ordered list collected / referenced evidence |
| `evidenceHashes` | Parallel integrity hashes |
| `sourceVersions` | Map sourceId → versionRef at collection time |
| `collectedAt` | Bundle timestamp |
| `effectiveScopeSnapshotRef` | Ref EffectiveScopeSnapshot |
| `permissionBoundarySnapshotRef` | Ref PermissionBoundarySnapshot |

```text
EvidenceSnapshot должен позволять проверить, какие доказательства использовались,
какие были отвергнуты (outside scope), и какие были STALE / CONTRADICTED.
```

**Rejected / out-of-scope candidates** MAY be listed in snapshot metadata as `excludedEvidenceRefs[]` with reason codes (permission, scope, stale) — без payload.

---

# Раздел 7. Graph Snapshot

## Сущность GraphSnapshot

**GraphSnapshot** — immutable freeze **подграфа**, использованного при GraphTraversal для данного Request.

| Поле | Назначение |
|------|------------|
| `snapshotId` | Unique snapshot id |
| `requestId` | Parent Request |
| `graphSchemaVersion` | Graph schema / profile version |
| `nodeRefs` | Permitted nodes visited or selected |
| `edgeRefs` | Permitted edges traversed |
| `traversalProfile` | e.g. developer_architecture, owner_reality, code_impact |
| `traversalDepth` | Max depth reached |
| `cutOffNodes` | Nodes stopped by depth / profile limit |
| `deniedNodes` | Nodes blocked by PermissionBoundary (refs only) |
| `effectiveScopeRef` | EffectiveScope at traversal time |

## Правила GraphSnapshot

```text
Denied nodes may be recorded as denied refs without exposing content.

GraphSnapshot must show where traversal stopped.

GraphSnapshot must not include content outside PermissionBoundary.

Graph traversal is mandatory in MVP path before final Verdict (Constitution §19–20).
```

---

# Раздел 8. Rule Evaluation Snapshot

## Сущность RuleEvaluationSnapshot

**RuleEvaluationSnapshot** — immutable запись результата evaluation **одного Rule** против input Evidence bundle.

| Поле | Назначение |
|------|------------|
| `snapshotId` | Unique id |
| `ruleId` | Rule ref |
| `ruleVersion` | Rule version ref |
| `inputEvidenceRefs` | Evidence ids used as input |
| `result` | PASS \| FAIL \| PARTIAL \| NOT_APPLICABLE \| INSUFFICIENT_EVIDENCE |
| `severity` | info \| warning \| error \| blocking |
| `reason` | Human-readable deterministic reason code + text |
| `evaluatedAt` | Timestamp |

## Результаты evaluation

| Result | Семантика |
|--------|-----------|
| `PASS` | Rule satisfied by evidence |
| `FAIL` | Rule violated |
| `PARTIAL` | Partial satisfaction (→ PARTIAL Verdict candidate) |
| `NOT_APPLICABLE` | Rule out of scope for request profile |
| `INSUFFICIENT_EVIDENCE` | Cannot evaluate — triggers fail-closed or UNKNOWN |

**Инвариант:** **COMPLIANT** / **NON_COMPLIANT** Verdict MUST reference ≥1 Rule with eval result PASS/FAIL respectively (Domain Model §9).

---

# Раздел 9. Decision Snapshot

## Сущность DecisionSnapshot

**DecisionSnapshot** — immutable freeze **итоговой decision chain** для Request.

| Поле | Назначение |
|------|------------|
| `snapshotId` | Unique id |
| `requestId` | Parent Request |
| `verdict` | Domain Verdict type + id |
| `verdictMapping` | Audience-specific label mapping (developer / owner) |
| `evidenceRefs` | Evidence ids supporting Verdict |
| `citationRefs` | Citation ids in Response |
| `ruleEvaluationRefs` | RuleEvaluationSnapshot ids |
| `recommendationRefs` | Recommendation ids (if any) |
| `failureReason` | Populated when Verdict=UNKNOWN or partial fail-closed path |

## Цепочка фиксации

```text
Evidence
    ↓
Citation
    ↓
RuleEvaluation
    ↓
Verdict
    ↓
Recommendation
```

**Инварианты:**

- Recommendation MUST NOT exist without Verdict;
- Verdict MUST reference Evidence (except explicit UNKNOWN fail-closed);
- DecisionSnapshot MUST be sufficient to reconstruct Answer Builder output structure (Verdict, Evidence section, Citations, Recommendations) without live resolvers.

---

# Раздел 10. Negative Evidence

**Negative Evidence** — доказательство **отсутствия** ожидаемого артефакта или **неуспеха** проверки.

## Примеры

| Ситуация | Negative Evidence |
|----------|-------------------|
| Файл не найден | `NEGATIVE_EVIDENCE`, strength=ABSENT |
| Документ отсутствует в registry | ABSENT + sourceId expected |
| Analyzer check не прошёл | ANALYZER_EVIDENCE FAIL → strength STRONG negative |
| Work item без evidence | DASHBOARD_EVIDENCE gap |
| Graph node unreachable | GRAPH_EVIDENCE negative path |

```text
Отсутствие доказательства тоже может быть Evidence.
```

Negative Evidence **используется** для NON_COMPLIANT, BLOCKED, UNKNOWN и Reality Check «falsely_done» scenarios.

---

# Раздел 11. Stale Evidence

**Stale Evidence** — evidence, whose **sourceVersion** no longer matches current platform state, или **freshness window** истёк.

## Примеры

- Analyzer run старше допустимого срока (dashboard fingerprint mismatch);
- Architecture document изменён после `sourceVersion` в snapshot;
- Dashboard readiness устарел относительно live analyzer;
- Runtime entity version drift.

## Правила

```text
STALE evidence не удаляется.

STALE evidence может использоваться только с пометкой strength=STALE или freshness=stale.

STALE evidence не может быть единственным основанием для COMPLIANT verdict.

Partial replay при stale analyzer допустим только с явным STALE status (Domain Model §9, Roadmap §6.4).
```

---

# Раздел 12. Contradictory Evidence

Когда **declared status** и **reality evidence** расходятся, система MUST **не скрывать** конфликт.

## Пример

```text
Документ / work item: COMPLETED
Analyzer check: FAIL
```

## Priority ladder (Reality Over Documentation)

```text
Analyzer Evidence
    ↓
Runtime State
    ↓
Dashboard State
    ↓
Declared Status
    ↓
Documentation
```

**Constitution §11** и **Master Map** подтверждают тот же порядок.

## Поведение

- Conflict resolver создаёт `CONTRADICTED_EVIDENCE` или помечает lower-priority item;
- Verdict **не может** быть COMPLIANT на declared-only basis при contradicting analyzer;
- Response MUST surface conflict (Verdict PARTIAL/BLOCKED/RISK + explicit evidence section);
- DecisionSnapshot MUST reference both sides via `evidenceRefs`.

```text
Reality Over Documentation.
```

---

# Раздел 13. Redaction Rules

Redaction применяется **до** включения данных в Evidence payload, Citation fragment и Response.

## Минимальные правила

| Ситуация | Действие |
|----------|----------|
| Field denied | value omitted — not null placeholder |
| Object denied | object content omitted |
| Document section denied | citation forbidden for that section |
| Graph node denied | only `deniedNode` ref in GraphSnapshot — no content |

## Сущность RedactionLog

| Поле | Назначение |
|------|------------|
| `redactionId` | Unique id |
| `reason` | permission_denied \| field_denied \| tenant_boundary \| profile_limit |
| `scope` | effectiveScopeRef / permissionBoundaryRef |
| `removedFieldRefs` | Field refs redacted |
| `removedObjectRefs` | Object refs redacted |
| `removedCitationRefs` | Citations suppressed |
| `createdAt` | Timestamp |

```text
Redaction is mandatory when denied data is encountered.

RedactionLog MUST be linked from AuditRecord when any redaction occurred.
```

Согласование: [YASII_PERMISSION_MODEL.md](./YASII_PERMISSION_MODEL.md) FB-01 (denied field absent, not masked fiction).

---

# Раздел 14. Audit Replay Requirements

## Snapshot bundle для replay

AuditRecord MUST reference:

```text
RequestSnapshot
ContextSnapshotSnapshot
PermissionBoundarySnapshot
EffectiveScopeSnapshot
EvidenceSnapshot
GraphSnapshot
RuleEvaluationSnapshot[]     (one or more)
DecisionSnapshot
RedactionLog                   (when redaction occurred)
```

## Правила replay

```text
Replay must not require live data access.

Replay uses snapshots.

Replay MUST reproduce: Verdict, Evidence list, Citations (redacted), Recommendations, failure reasons.

Replay MAY mark overall bundle STALE if sourceVersions no longer match live platform — without mutating historical AuditRecord.
```

**Host correlation:** HostContext hash → ContextSnapshotSnapshot (Host Integration Contract §22).

---

# Раздел 15. Failure Behavior

Когда pipeline **не может** выдать normative Response, формируется **FailureResponse** (без Verdict).

## Failure reason codes (minimum)

| Code | Условие |
|------|---------|
| `NO_EVIDENCE` | Нет ни одного permitted evidence item |
| `INSUFFICIENT_EVIDENCE` | Evidence есть, но недостаточно для Rule / Verdict |
| `PERMISSION_DENIED` | PermissionBoundary invalid или EffectiveScope empty |
| `EVIDENCE_OUTSIDE_SCOPE` | Candidate evidence rejected — all outside EffectiveScope |
| `GRAPH_UNAVAILABLE` | GraphTraversal failed / subgraph empty when mandatory |
| `RULE_EVALUATION_FAILED` | Rule engine error — deterministic fail |
| `SOURCE_VERSION_MISSING` | Required versionRef absent — fail closed |
| `CITATION_REDACTED` | Normative path requires citation but all citations redacted |

**Инвариант:** FailureResponse **не содержит Verdict**; MUST produce AuditRecord with available snapshots + `failureReason`.

---

# Раздел 16. Evidence Collection Boundaries

```text
Evidence collection occurs only after EffectiveScope.

Evidence outside EffectiveScope is ignored.

Evidence outside PermissionBoundary is forbidden.

Evidence must be collected deterministically where possible.
```

## Pipeline position

```text
ContextSnapshot handoff (ACE)
    ↓
EffectiveScope derivation (YASII entry)
    ↓
Evidence collection          ← START
    ↓
GraphTraversal (permitted subgraph)
    ↓
Rule evaluation
    ↓
Verdict / Response / FailureResponse
    ↓
Snapshot persistence → AuditRecord
```

YASII **не собирает** HostContext напрямую; **не расширяет** PermissionBoundary during collection.

---

# Раздел 17. Invariants

Минимум **38 инвариантов** evidence/snapshot слоя:

| # | Инвариант |
|---|-----------|
| 1 | Every normative Response has Evidence. |
| 2 | Every normative Response has Citation. |
| 3 | Evidence must be inside EffectiveScope. |
| 4 | Citation must be inside EffectiveScope. |
| 5 | Verdict must reference Evidence (except explicit UNKNOWN). |
| 6 | COMPLIANT requires non-stale STRONG or PARTIAL Evidence. |
| 7 | NON_COMPLIANT requires RuleEvaluation with FAIL. |
| 8 | Recommendation cannot exist without Verdict. |
| 9 | Redaction is mandatory for denied data. |
| 10 | Audit replay uses snapshots, not live state. |
| 11 | Denied graph nodes cannot leak content. |
| 12 | Contradictory Evidence must be surfaced. |
| 13 | Analyzer Evidence has priority over declared status. |
| 14 | EvidenceSnapshot is mandatory for every non-failure Response. |
| 15 | GraphSnapshot is mandatory when GraphTraversal executed. |
| 16 | DecisionSnapshot is mandatory for every Response and FailureResponse with partial pipeline. |
| 17 | RuleEvaluationSnapshot required for each Rule referenced by COMPLIANT/NON_COMPLIANT Verdict. |
| 18 | Citation must reference sourceVersion. |
| 19 | Citation fragmentHash must match snapshotted fragment. |
| 20 | integrityHash on Evidence enables tamper detection on replay. |
| 21 | STALE evidence never sole basis for COMPLIANT. |
| 22 | WEAK evidence never sole basis for COMPLIANT/NON_COMPLIANT. |
| 23 | ABSENT evidence may support negative Verdict paths. |
| 24 | Negative Evidence is valid Evidence type. |
| 25 | FailureResponse never contains Verdict. |
| 26 | NO_EVIDENCE → FailureResponse, not generative fill-in. |
| 27 | Evidence outside PermissionBoundary must not appear in EvidenceSnapshot. |
| 28 | Excluded evidence MUST record exclusion reason in snapshot metadata. |
| 29 | GraphSnapshot.deniedNodes contains refs only — no payloads. |
| 30 | RedactionLog required when redactionApplied=true on any Citation. |
| 31 | DecisionSnapshot.evidenceRefs must match EvidenceSnapshot.evidenceIds subset used for Verdict. |
| 32 | Recommendation refs in DecisionSnapshot must trace to Verdict rationale. |
| 33 | Multi-tenant Evidence must not cross tenant boundary. |
| 34 | LLM-generated content is not Evidence in MVP. |
| 35 | Replay without live data must reproduce Verdict type. |
| 36 | ContextSnapshotSnapshot + PermissionBoundarySnapshot required in AuditRecord. |
| 37 | EffectiveScopeSnapshot required in AuditRecord. |
| 38 | Partial replay with STALE must label Response/Audit metadata explicitly. |

---

# Раздел 18. Связь с другими документами

| Документ | Связь с Evidence Snapshot Spec |
|----------|--------------------------------|
| **YASII_CONSTITUTION.md** | §10 Evidence Over Opinion, §11 Reality Over Documentation, §14 Explainability, §19–20 Graph Mandatory — normative basis |
| **YASII_DOMAIN_MODEL.md v1.3** | Evidence, Citation, Verdict, snapshots в Decision/Audit domains — entity baseline; spec детализирует attributes и bundles |
| **YASII_PERMISSION_MODEL.md** | PermissionBoundary, EffectiveScope, field/document/graph boundaries, redaction FB-01 — security gate for collection |
| **YASII_HOST_INTEGRATION_CONTRACT.md** | HostContext → ContextSnapshot; audit correlation hash; Host не формирует Evidence |
| **ADR_YASII_AI_CONTEXT_BOUNDARY.md** | ACE owns ContextSnapshot/PermissionBoundary; YASII owns Evidence collection after EffectiveScope |
| **YASII_SYSTEM_MAP.md** | Evidence Resolver, Rule Engine, Answer Builder pipeline — implementation map |
| **YASII_IMPLEMENTATION_ROADMAP.md** | Phase 3 Graph/Evidence, Phase 4 Runtime pipeline — delivery phases |
| **YASII_DASHBOARD_WORK_ITEMS.md** | P3-W08, P4-W04, analyzer evidence types — execution evidence |

### Pipeline alignment

```text
Host Surface
    ↓ HostContext
ACE
    ↓ Identity Resolution → Permission Resolution → PermissionBoundary → ContextSnapshot
YASII entry
    ↓ EffectiveScope
Knowledge → Graph → Evidence → Citation → Rule → Verdict → Recommendation → Response
    ↓ snapshots
AuditRecord
```

---

# Раздел 19. Architecture Decisions

| ID | Decision |
|----|----------|
| **AD-01** | **EvidenceSnapshot is mandatory** for every non-failure Response. |
| **AD-02** | **Citation must be versioned and permission-safe** — fragmentHash + redaction pipeline. |
| **AD-03** | **GraphSnapshot must preserve traversal boundaries** — cutOffNodes, deniedNodes, depth. |
| **AD-04** | **RedactionLog is mandatory** when denied data is encountered. |
| **AD-05** | **Replay uses snapshots, not live state** — AuditRecord self-contained. |
| **AD-06** | **Reality Evidence overrides declared status** — priority ladder §12. |

---

# Раздел 20. MVP Boundary

## В MVP входит

```text
Evidence (all MVP types except post-MVP extensions)
Citation
EvidenceSnapshot
GraphSnapshot
RuleEvaluationSnapshot
DecisionSnapshot
RedactionLog
Negative Evidence
Stale Evidence
Contradictory Evidence handling
FailureResponse linkage with reason codes
Audit replay bundle (all snapshot refs)
```

## Не входит в MVP

```text
LLM-generated evidence summaries
Semantic compression of evidence
Cross-tenant evidence graph
Long-term evidence archive optimization
Automated evidence summarization for Strategy Layer
Cross-request evidence fusion beyond basic Memory link
```

---

# Appendix A. FailureResponse ↔ Evidence mapping

| Failure code | Typical Evidence state |
|--------------|------------------------|
| NO_EVIDENCE | Empty EvidenceSnapshot |
| INSUFFICIENT_EVIDENCE | Partial bundle + INSUFFICIENT_EVIDENCE RuleEvaluation |
| PERMISSION_DENIED | Empty EffectiveScope or invalid boundaryRef |
| EVIDENCE_OUTSIDE_SCOPE | excludedEvidenceRefs populated |
| GRAPH_UNAVAILABLE | Empty or failed GraphSnapshot |
| CITATION_REDACTED | RedactionLog.removedCitationRefs non-empty |

---

# Appendix B. Readiness by Phase

| Phase | Evidence layer readiness |
|-------|--------------------------|
| **Phase 1** | Contracts: FailureResponse, Audit skeleton, EffectiveScope — **spec ready**, implementation partial |
| **Phase 3** | GraphSnapshot, GRAPH_EVIDENCE, ANALYZER_EVIDENCE nodes — **spec ready** |
| **Phase 4** | Full pipeline: Evidence Resolver, RuleEvaluationSnapshot, DecisionSnapshot, Answer Builder — **spec ready** |

---

*Документ подчинён YASII Constitution. При конфликте — Constitution prevails. Детализация атрибутов не отменяет Domain Model v1.3; при расхождении — additive ADR или Domain Model patch v1.3.x.*
