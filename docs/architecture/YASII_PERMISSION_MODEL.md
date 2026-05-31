# YASII Permission Model

**Статус:** FOUNDATIONAL SECURITY ARCHITECTURE DOCUMENT  
**Версия:** 1.0  
**Дата:** 2026-05-30  

**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_DOMAIN_MODEL.md](./YASII_DOMAIN_MODEL.md) v1.3 · [ADR_YASII_AI_CONTEXT_BOUNDARY.md](./ADR_YASII_AI_CONTEXT_BOUNDARY.md) · [YASII_HOST_INTEGRATION_CONTRACT.md](./YASII_HOST_INTEGRATION_CONTRACT.md)

**Область:** архитектурная модель безопасности ЯСИИ — Permission Resolution, PermissionBoundary, Effective Scope, изоляция tenant/graph/knowledge/evidence.  
**Вне области:** схемы БД, HTTP API, RBAC-таблицы, код модулей, конкретные platform permission engine implementations.

---

# Раздел 1. Назначение Permission Model

## Почему Permission Model существует

ЯСИИ работает с **Knowledge**, **Graph**, **Evidence** и **Response** — всеми данными платформы и tenant. Без нормативной модели доступа reasoning может:

- прочитать объект вне полномочий пользователя;
- обойти tenant через graph edge;
- включить в ответ значение защищённого поля;
- «додумать» недоступные данные;
- рекомендовать действие с side effect без approval.

**Permission Model** фиксирует **как формируется граница доступа**, **кто её вычисляет**, **как YASII обязан её соблюдать** и **что аудируется**.

## Какие риски устраняет

| Риск | Механизм модели |
|------|-----------------|
| Data leak через YASII Response | PermissionBoundary + Effective Scope + Response filter |
| Cross-tenant contamination | Tenant Boundary (absolute) |
| Graph-based privilege escalation | Graph Boundary; traversal stop at denied node |
| Field-level leak | Field Boundary; no value, no mask fiction |
| Host-supplied «permissions» | ACE-only Permission Resolution |
| YASII widens access during reasoning | YASII never computes or extends boundary |
| Autonomous write via Recommendation | Recommendations Safety; Read Only default |
| Non-reproducible access decisions | Audit: PermissionBoundarySnapshot, EffectiveScopeSnapshot |

## Почему PermissionBoundary обязателен

**PermissionBoundary** — immutable per-request snapshot **максимально допустимого** read scope для YASII.  
Без него невозможно:

- детерминированно ограничить GraphTraversal;
- фильтровать Knowledge и Evidence;
- воспроизвести решение в Audit;
- отделить **access decision** (ACE) от **business decision** (YASII Verdict).

PermissionBoundary **вычисляется только AI Context Engine** и передаётся YASII через ContextSnapshot (`permissionBoundaryRef`).

---

# Раздел 2. Основные принципы

| Принцип | Суть | Последствия |
|---------|------|-------------|
| **Permission First** | Boundary до Knowledge, Graph, Evidence, Memory | YASII pipeline не стартует без valid `permissionBoundaryRef`; GraphTraversal blocked until handoff |
| **Fail Closed** | При неопределённости доступ **запрещён** | PERMISSION_DENIED / PERMISSION_RESOLUTION_FAILED; no partial guess |
| **Least Privilege** | Boundary = минимум необходимого для request context | Role ceiling ∩ platform permissions ∩ context refs; no «expand because useful» |
| **Tenant Isolation** | Tenant — абсолютная граница | All refs, Knowledge, Graph, Evidence single-tenant |
| **Graph Isolation** | Traversal не выходит за boundary | Stop at denied node; no escalation through edges |
| **Evidence Isolation** | Evidence только из permitted sources | Filter at collection; no post-hoc inclusion |
| **No Implicit Access** | Нет доступа «по умолчанию» | Unknown ref → denied; HostContext refs validated |
| **Deterministic Resolution** | Same inputs → same boundary (given same platform state) | Replay from PermissionBoundarySnapshot; versioned rules |

---

# Раздел 3. Общая модель разрешений

## Pipeline

```text
User
    ↓
Role
    ↓
Permission
    ↓
Permission Resolution          (AI Context Engine)
    ↓
PermissionBoundary
    ↓
ContextSnapshot                (permissionBoundaryRef)
    ↓
Effective Scope                (YASII runtime — derived, not recomputed ACL)
    ↓
YASII                          (read-only within Effective Scope)
```

## Разделение ответственности

```text
YASII никогда не принимает решение о доступе.
```

Access decisions = **Permission Resolution in ACE**.  
YASII **consumes** PermissionBoundary; MAY detect boundary violation during reasoning and **fail closed** — но **не grants** access.

```text
YASII работает только внутри PermissionBoundary.
```

Фактический рабочий объём = **Effective Scope** ⊆ PermissionBoundary (см. §13).

---

# Раздел 4. Permission Layers

Permission Layers — **логические уровни**, из которых ACE **агрегирует** PermissionBoundary.  
YASII **не выбирает** layer; boundary уже содержит результат всех слоёв.

| Layer | Назначение | Ответственность (ACE) | Ограничения для YASII |
|-------|------------|----------------------|------------------------|
| **Tenant Boundary** | Изоляция организаций | Single `tenantId`; reject cross-tenant refs | No cross-tenant read/write in Response |
| **Role Boundary** | YASII role profile + platform roles | `permissionCeiling`, capabilities, knowledge domains | Intent/Capability capped by role |
| **Object Boundary** | Runtime entities (projects, tasks, risks, …) | `allowedObjectRefs[]`, deny lists | Object in graph only if in boundary |
| **Field Boundary** | Attribute-level read | Allowed field set per object type (MVP: object-level default; field ADR post-MVP) | No field value if denied |
| **Document Boundary** | Docs / architecture files | `allowedDocumentRefs[]`, section scope | Section denied → no content in Evidence |
| **Process Boundary** | Workflow instances / steps | `allowedProcessRefs[]`, activity scope | Partial process → only permitted activities |
| **Knowledge Boundary** | Knowledge sources / tiers | Tier + domain filter by role + tenant | Unlisted source = inaccessible |
| **Graph Boundary** | Nodes, edges, transition types | `allowedGraphTransitionTypes[]`, node allow/deny | Traversal stops at boundary |

### MVP scope note

| Layer | MVP |
|-------|-----|
| Tenant, Role, Object, Knowledge, Graph | **●** basic (object-level) |
| Document, Process | **○** when surface provides refs |
| Field | **○** post-MVP ADR (behavior defined now; enforcement phased) |

---

# Раздел 5. Tenant Boundary

```text
Tenant является абсолютной границей безопасности.
```

Tenant Boundary применяется **первым** в Permission Resolution. Все последующие layers scoped to single `tenantId`.

## Инварианты Tenant Boundary

```text
Cross-Tenant Access запрещён.
```

```text
Cross-Tenant ContextSnapshot запрещён.
```

```text
Cross-Tenant Evidence запрещён.
```

```text
Cross-Tenant Graph Traversal запрещён.
```

| Rule | Behavior |
|------|----------|
| TB-01 | HostContext MUST contain one `tenantId` |
| TB-02 | User membership MUST include `tenantId` |
| TB-03 | Any ref resolving to another tenant → **TENANT_MISMATCH** |
| TB-04 | Knowledge index partition by tenant (+ platform tier rules) |
| TB-05 | Graph edges crossing tenant → **не существуют** для traversal (forbidden edge class) |

---

# Раздел 6. Role Boundary

**Роль не является PermissionBoundary.**  
Роль — **input** Permission Resolution: определяет ceiling, capabilities, knowledge domains, default YASII profile.

## Схема

```text
User
    ↓
Roles                    (platform + YASII role for request)
    ↓
Permissions              (atomic allow/deny from platform RBAC)
    ↓
Role Boundary Rules      (permissionCeiling, knowledgeDomains[], capabilities[])
    ↓
PermissionBoundary       (aggregated snapshot)
```

| Rule | Description |
|------|-------------|
| RB-01 | Request fixes `roleProfileVersion` for audit |
| RB-02 | Role **cannot elevate** above `permissionCeiling` |
| RB-03 | Deprecated role profile → reject or waiver-only (Domain Model) |
| RB-04 | Multiple roles → aggregate permissions; **deny overrides allow** |
| RB-05 | YASII Capability Matrix ∩ Role = effective capabilities |

---

# Раздел 7. Object Boundary

Object Boundary ограничивает доступ к **runtime business entities** и platform objects referenced in HostContext.

## Примеры object classes

```text
Проекты · Задачи · Риски · Документы · Контракты · Runtime Entity · Work Items
```

## Правила

| Rule | Description |
|------|-------------|
| OB-01 | Object access derived from platform permission engine + role ceiling |
| OB-02 | HostContext refs (`objectId`, `selectedObjects`) validated against user permissions |
| OB-03 | Ref denied → excluded from ContextReference or **INVALID_REFERENCE** at ACE |
| OB-04 | PermissionBoundary lists explicit **allowed** and **denied** refs where computable |

```text
Наличие доступа к объекту не означает доступ ко всем связанным объектам.
```

Graph neighbors require **separate** object permission evaluation in boundary construction — not inherited transitively unless policy explicitly allows (default: **no inheritance**).

---

# Раздел 8. Field Boundary

## Сценарий

```text
Объект доступен
Поле недоступно
```

## Поведение

```text
YASII не получает значение поля.
```

| Rule | Description |
|------|-------------|
| FB-01 | Denied field **absent** from Evidence payload — not null placeholder |
| FB-02 | YASII **не маскирует** (`***`, «скрыто») как substitute for value |
| FB-03 | YASII **не заменяет** denied field inferred/default value |
| FB-04 | YASII **не придумывает** field content |
| FB-05 | Response MAY state «insufficient data» / UNKNOWN for verdict requiring denied field |
| FB-06 | Citation MUST NOT expose denied field value |

**MVP:** Domain Model specifies object-level boundary first; Field Boundary **semantics normative now** — field-level enforcement via post-MVP ADR without changing YASII behavior rules.

Failure: **FIELD_ACCESS_DENIED** when explicit field request outside boundary.

---

# Раздел 9. Document Boundary

Document Boundary governs architecture docs, tenant files, normative text in Knowledge Layer.

## Сценарий

```text
Документ доступен
Раздел документа недоступен
```

## Поведение

| Case | Behavior |
|------|----------|
| Document allowed, section allowed | Section content eligible for Evidence |
| Document allowed, section denied | YASII sees document ref + metadata only; **no section body** in Evidence |
| Document denied | Document excluded from boundary; citations forbidden |
| Tier 0–1 normative doc partially denied | Normative Verdict requiring denied section → UNKNOWN or FailureResponse |

Failure: **DOCUMENT_ACCESS_DENIED**

Document refs in HostContext (Document Profile) validated at ACE; `allowedDocumentRefs[]` in PermissionBoundary.

---

# Раздел 10. Process Boundary

Process Boundary limits workflow / process instance visibility.

## Сценарий

```text
Процесс доступен
Часть процесса недоступен
```

## Поведение

| Case | Behavior |
|------|----------|
| Process allowed, activity allowed | Activity state eligible for Evidence |
| Process allowed, activity denied | Traversal stops at activity boundary; no activity payload |
| Process denied | Process ref excluded from Effective Scope |
| SLA / assignee in denied activity | MUST NOT appear in Response |

Process refs: `allowedProcessRefs[]`, activity scope in boundary metadata (architectural — not DB schema).

Failure: **BOUNDARY_VIOLATION** (process scope)

---

# Раздел 11. Knowledge Boundary

Knowledge Boundary filters **Knowledge Layer** — sources, tiers, domains — independent of but coordinated with Object/Document boundaries.

## Сценарии

| Case | Behavior |
|------|----------|
| Knowledge Source **доступен** | Source eligible for retrieval within tier rules |
| Knowledge Source **недоступен** | Source invisible to retrieval; MUST NOT appear in Evidence |
| Tier denied by Role | Entire tier excluded |
| Platform Tier 0–1 normative | Required for COMPLIANT/NON_COMPLIANT unless UNKNOWN |

```text
Knowledge никогда не обходит PermissionBoundary.
```

| Rule | Description |
|------|-------------|
| KB-01 | Knowledge retrieval pre-filtered by boundary |
| KB-02 | No «helpful» fallback to unrestricted corpus |
| KB-03 | Code Knowledge Layer subject to same boundary + repo scope rules |
| KB-04 | Stale analyzer evidence tagged; does not widen boundary |

Failure: **KNOWLEDGE_ACCESS_DENIED**

---

# Раздел 12. Graph Boundary

**Самый критичный** layer — риск escalation через связи.

## Модель

```text
Object A  ──edge──►  Object B  ──edge──►  Object C
```

## Сценарий

```text
A доступен
B доступен
C недоступен
```

## Поведение

| Step | Result |
|------|--------|
| Traverse A → B | **Allowed** if edge type permitted |
| Traverse B → C | **Blocked** at C |
| Subgraph result | Contains A, B only |
| Evidence from C | **Forbidden** |
| Verdict implying C facts | MUST NOT use C data; may note incomplete graph |

```text
GraphTraversal останавливается на Boundary.
```

```text
Permission Escalation Through Graph — запрещён.
```

| Rule | Description |
|------|-------------|
| GB-01 | Each traversed node MUST be in PermissionBoundary |
| GB-02 | Denied node = **hard stop**; no peek, no metadata leak beyond policy |
| GB-03 | `allowedGraphTransitionTypes[]` restricts edge classes |
| GB-04 | Cross-tenant edge class **forbidden** (Tenant + Graph) |
| GB-05 | Hidden path A→…→C bypassing check **forbidden** — all hops validated |

Failure: **GRAPH_ESCALATION_ATTEMPT** (security event + fail closed)

GraphTraversal mandatory (Constitution) **within** boundary — not across it.

---

# Раздел 13. Effective Scope

## Определение

**Effective Scope** — производная сущность runtime: **фактический** read scope YASII для данного Request.

```text
Effective Scope = PermissionBoundary ∩ Current Context
```

Where **Current Context** = normalized anchors from ContextSnapshot (ContextReference[], host surface focus, selected objects).

## Пример

| Set | Count |
|-----|-------|
| PermissionBoundary.`allowedObjectRefs` | 100 objects |
| ContextSnapshot selected / focused refs | 3 objects |
| **Effective Scope** | **3 objects** (must ⊆ allowed 100) |

If selected ref **not** in PermissionBoundary → excluded or request fails at ACE (Host Integration Contract).

## Правила

```text
YASII работает внутри Effective Scope.
```

| Rule | Description |
|------|-------------|
| ES-01 | Effective Scope ⊆ PermissionBoundary always |
| ES-02 | YASII MUST NOT expand scope beyond ContextSnapshot anchors for «helpful» search |
| ES-03 | Broad question on narrow context → answer scoped or explicit scope limitation in Response |
| ES-04 | Effective Scope computed at YASII runtime entry — **not** a second ACL computation |
| ES-05 | EffectiveScopeSnapshot frozen in Audit alongside PermissionBoundarySnapshot |

Effective Scope **не заменяет** PermissionBoundary — boundary remains max envelope; Effective Scope is **focus intersection**.

---

# Раздел 14. Permission Resolution

**Owner:** AI Context Engine only.  
**Output:** immutable **PermissionBoundary** attached to ContextSnapshot.

## Алгоритм (логика, не реализация)

```text
1. HostContext received
        ↓
2. Identity Resolution
   - validate userId, tenantId, sessionId
   - resolve User, Tenant membership
        ↓
3. Role Resolution
   - platform roles + YASII role (surface default + profile)
   - apply roleProfileVersion
        ↓
4. Permission Aggregation
   - collect Permission atoms (allow/deny)
   - deny overrides allow
        ↓
5. Tenant Rules
   - enforce Tenant Boundary (absolute)
   - reject cross-tenant refs
        ↓
6. Boundary Rules (layer by layer)
   - Role Boundary (ceiling, domains, capabilities)
   - Object Boundary (refs from HostContext + policy)
   - Document Boundary
   - Process Boundary
   - Knowledge Boundary (tiers, sources)
   - Graph Boundary (transition types, node allow/deny)
   - Field Boundary (where enforced)
        ↓
7. PermissionBoundary snapshot
   - boundaryId, allowed*/denied* sets, computedAt
        ↓
8. ContextSnapshot
   - permissionBoundaryRef
   - ContextReference[] (only permitted refs)
        ↓
9. Handoff YASII
```

## Resolution properties

| Property | Requirement |
|----------|-------------|
| Determinism | Same platform permission state + same HostContext → same boundary |
| Fail closed | Any unresolved layer → PERMISSION_RESOLUTION_FAILED |
| No YASII input | YASII MUST NOT influence steps 1–8 |
| No Host authority | Host MUST NOT supply boundary or permission lists |
| Versioning | Boundary records policy/rule versions for audit replay |

---

# Раздел 15. Recommendations Safety

YASII **по умолчанию Read Only** — Recommendation describes action; **does not execute**.

## YASII MAY

- classify (Verdict);
- explain with Evidence and Citation;
- suggest next steps (Recommendation);
- identify Risk;
- produce Report content within boundary.

## YASII MUST NOT (default)

```text
ЯСИИ не изменяет данные.
```

```text
ЯСИИ не создаёт объекты.
```

```text
ЯСИИ не запускает процессы.
```

```text
ЯСИИ не назначает исполнителей.
```

```text
ЯСИИ только рекомендует.
```

| Rule | Description |
|------|-------------|
| RS-01 | Recommendation ≠ autonomous write |
| RS-02 | Capability MUST NOT perform write-actions (Domain Model) |
| RS-03 | Future mutations require **Approval Layer** (separate ADR / phase) |
| RS-04 | Recommendation MUST NOT imply access user lacks |
| RS-05 | «Create task X» allowed as text; execution forbidden without approval |

---

# Раздел 16. Failure Scenarios

| Code | Layer | Meaning | Typical handler |
|------|-------|---------|-----------------|
| **PERMISSION_DENIED** | General | Operation/ref outside boundary | Fail closed; no YASII data use |
| **TENANT_MISMATCH** | Tenant | Cross-tenant ref or membership failure | ACE reject; audit security event |
| **BOUNDARY_VIOLATION** | Any | Runtime attempt outside Effective Scope | YASII FailureResponse |
| **GRAPH_ESCALATION_ATTEMPT** | Graph | Traversal into denied node / forbidden edge | Stop traversal; security audit |
| **FIELD_ACCESS_DENIED** | Field | Field requested but not in boundary | Omit field; UNKNOWN if required |
| **KNOWLEDGE_ACCESS_DENIED** | Knowledge | Source/tier blocked | Exclude from Evidence |
| **DOCUMENT_ACCESS_DENIED** | Document | Document/section blocked | No citation body |
| **PERMISSION_RESOLUTION_FAILED** | ACE | Cannot compute boundary | Host Integration error; no YASII |

### ACE vs YASII failures

| Stage | Who detects |
|-------|-------------|
| Resolution / HostContext | ACE (Host Integration Contract errors) |
| Reasoning / traversal / response assembly | YASII (FailureResponse + audit) |

---

# Раздел 17. Audit Requirements

```text
Каждое решение по доступу должно быть воспроизводимо.
```

## Mandatory audit artifacts (per Request)

| Snapshot | Content |
|----------|---------|
| **PermissionBoundarySnapshot** | Full boundary at handoff: allowed/denied sets, hashes, `computedAt`, policy versions |
| **EffectiveScopeSnapshot** | Intersection result at YASII entry: focused refs, scope hash |
| **DecisionSnapshot** | Verdict, Evidence ids, rules cited — **only** from permitted data |

Additional (Domain Model): ContextSnapshotSnapshot, EvidenceSnapshot, GraphSnapshot, RequestSnapshot.

## Replay rules

- Replay MUST reconstruct Effective Scope from snapshots — not re-run HostContext.
- Unknown policy major version → replay blocked with explicit error.
- Security failures (GRAPH_ESCALATION_ATTEMPT, TENANT_MISMATCH) MUST be auditable.

> **Будущий документ:** [YASII_EVIDENCE_SNAPSHOT_SPEC.md](./YASII_EVIDENCE_SNAPSHOT_SPEC.md) — wire format for snapshots.

---

# Раздел 18. Permission Invariants

1. **Tenant Boundary абсолютен.**
2. **Cross-Tenant Graph запрещён.**
3. **YASII не вычисляет PermissionBoundary.**
4. **YASII не расширяет PermissionBoundary.**
5. **Knowledge не обходит PermissionBoundary.**
6. **GraphTraversal останавливается на Boundary.**
7. **Evidence собирается только внутри Boundary.**
8. **Recommendation не создаёт объекты.**
9. **Recommendation не изменяет данные.**
10. **Response не содержит данные вне Boundary.**
11. **PermissionBoundary вычисляется только AI Context Engine.**
12. **Host Surface не поставляет PermissionBoundary.**
13. **deny overrides allow** в Permission Aggregation.
14. **Role не elevates above permissionCeiling.**
15. **Effective Scope ⊆ PermissionBoundary.**
16. **YASII работает внутри Effective Scope.**
17. **Denied field value не передаётся YASII** (no mask/substitute/invent).
18. **Denied document section не попадает в Evidence.**
19. **Object access не наследуется транзитивно через graph** (default).
20. **Fail Closed** при неопределённом доступе.
21. **No Implicit Access** для unknown refs.
22. **Permission Escalation Through Graph запрещён.**
23. **Cross-Tenant ContextSnapshot запрещён.**
24. **Cross-Tenant Evidence запрещён.**
25. **YASII не принимает решение о доступе** — только detects violations.
26. **Deterministic Resolution** при фиксированном platform state.
27. **Audit MUST include PermissionBoundarySnapshot.**
28. **Audit MUST include EffectiveScopeSnapshot.**
29. **GraphTraversal обязателен только within boundary** (Constitution).
30. **Capability Matrix ∩ Role** limits effective operations.
31. **Stale Knowledge does not widen boundary.**
32. **Integration errors at ACE MUST NOT invoke YASII** with partial boundary.
33. **ContextSnapshot.permissionBoundaryRef mandatory** before YASII handoff.
34. **YASII Read Only by default**; writes require future Approval Layer.
35. **COMPLIANT/NON_COMPLIANT MUST NOT rely on denied Knowledge.**

---

# Раздел 19. Связь с другими документами

| Документ | Relationship |
|----------|--------------|
| **[YASII_DOMAIN_MODEL.md](./YASII_DOMAIN_MODEL.md) v1.3** | Entities incl. **EffectiveScope**, **EffectiveScopeSnapshot**; Permission Model aligned — formula, invariants, audit snapshots **согласованы** |
| **[ADR_YASII_AI_CONTEXT_BOUNDARY.md](./ADR_YASII_AI_CONTEXT_BOUNDARY.md)** | ACE owns PermissionBoundary formation; YASII consumes; no access decisions in YASII. **Fully aligned.** |
| **[YASII_HOST_INTEGRATION_CONTRACT.md](./YASII_HOST_INTEGRATION_CONTRACT.md)** | §7 Permission Boundary Integration; PERMISSION_RESOLUTION_FAILED; Host never supplies boundary. **Fully aligned.** |
| **YASII_CONSTITUTION.md** | Permission First, Evidence First, no autonomous writes. **Aligned.** |
| **YASII_SYSTEM_MAP.md** | Permission Layer semantics; MVP object-level. System Map §8.3 host obligations superseded by Host Integration Contract for HostContext. |

### Противоречия

**Не выявлено** при соблюдении настоящей модели и Domain Model v1.3.

---

# Раздел 20. Architecture Decisions

| # | Decision |
|---|----------|
| **AD-01** | **Tenant Boundary является абсолютной границей безопасности.** |
| **AD-02** | **PermissionBoundary вычисляется только AI Context Engine.** |
| **AD-03** | **YASII никогда не принимает решение о доступе.** |
| **AD-04** | **GraphTraversal ограничивается PermissionBoundary.** |
| **AD-05** | **YASII по умолчанию работает в режиме Read Only.** |
| **AD-06** | **Effective Scope = PermissionBoundary ∩ Current Context** — YASII operational focus. |
| **AD-07** | **deny overrides allow** — platform-wide aggregation rule. |
| **AD-08** | **Field denied → absent, not masked** — no synthetic field values. |

---

# Приложение A. Document metadata

| | |
|---|---|
| **Document owner** | Platform Architecture |
| **Review cycle** | New permission layer, field-level ADR, or Approval Layer introduction |
| **Supersedes** | Informal Permission Layer descriptions without resolution algorithm |
| **Implementation gate** | ACE Permission Resolution + YASII boundary enforcement MAY proceed after this document + Host Integration Contract + ADR review |

---

**YASII Permission Model Version:** 1.0  
**Status:** FOUNDATIONAL SECURITY ARCHITECTURE DOCUMENT
