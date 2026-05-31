# YASII Domain Model

**Статус:** FOUNDATIONAL DOMAIN ARCHITECTURE DOCUMENT  
**Версия:** 1.3.1  
**Приоритет:** нормативный источник истины для всех сущностей ЯСИИ  
**Базис:** [YASII_CONSTITUTION.md](./YASII_CONSTITUTION.md) · [YASII_MASTER_MAP.md](./YASII_MASTER_MAP.md) · [ADR_YASII_AI_CONTEXT_BOUNDARY.md](./ADR_YASII_AI_CONTEXT_BOUNDARY.md) · [YASII_PERMISSION_MODEL.md](./YASII_PERMISSION_MODEL.md)

**Область:** предметная область ЯСИИ — сущности, связи, инварианты, версионность.  
**Вне области:** проектирование БД, HTTP API, UI, конкретные модули и классы реализации.

---

# Раздел 1. Назначение доменной модели

## Зачем существует

Доменная модель ЯСИИ фиксирует **единый словарь предметной области**: кто участвует в запросе, какие данные допустимы, как формируется ответ, что сохраняется для воспроизведения и памяти.

Без неё сущности (`User`, `ContextSnapshot`, `Evidence`, `Verdict`) упоминаются в разных документах **разрозненно**, что приводит к несовместимым DTO, расхождению Audit Trail и Knowledge Graph и дорогостоящему рефакторингу после начала кодирования.

## Какие проблемы решает

| Проблема | Решение через Domain Model |
|----------|----------------------------|
| Несовместимые DTO между Core, Runtime, Integrations | Единые определения сущностей и атрибутов |
| Разные трактовки Permission и Context | Явные инварианты и порядок применения |
| Невоспроизводимый Audit Trail | Audit Domain + snapshot-сущности |
| Размытая граница Verdict / Recommendation | Decision Domain с разделением |
| Несогласованный Graph и Knowledge | Graph Domain + Knowledge Domain + связи |
| Несовместимая Memory | Memory Domain с областями и lifecycle |

## Иерархия архитектурных документов

```text
YASII_CONSTITUTION.md          ← инварианты, принципы, запреты (наивысший приоритет)
        ↓
ADR_YASII_AI_CONTEXT_BOUNDARY.md  ← граница ACE / YASII; ownership ContextSnapshot, PermissionBoundary
        ↓
YASII_DOMAIN_MODEL.md          ← настоящий документ (сущности, связи, инварианты)
        ↓
YASII_SYSTEM_MAP.md            ← структура системы, слои Core, pipeline
        ↓
YASII_IMPLEMENTATION_ROADMAP.md  ← фазы, readiness, MVP gate
        ↓
YASII_DASHBOARD_WORK_ITEMS.md  ← execution, analyzer checks
        ↓
Implementation                 ← код, контракты, модули (Phase 1+)
```

## Документы, использующие Domain Model как источник истины

| Документ | Использование Domain Model |
|----------|----------------------------|
| **YASII_CONSTITUTION.md** | Принципы → ограничения на домен; Domain Model не отменяет Конституцию |
| **YASII_SYSTEM_MAP.md** | Слои Core и pipeline → маппинг на домены |
| **YASII_IMPLEMENTATION_ROADMAP.md** | Work items Phase 1–4 → реализация сущностей Domain Model |
| **YASII_DASHBOARD_WORK_ITEMS.md** | Evidence и readiness → ссылки на Evidence, Verdict, Graph |
| **Будущие ADD** | Graph Storage — **расширяют**, не переопределяют Domain Model |

---

# Раздел 2. Архитектурные принципы доменной модели

| Принцип | Влияние на модель |
|---------|-------------------|
| **One Core** | Все сущности принадлежат одному пространству имён YASII; запрещены параллельные «AI cores» с отдельными Request/Response/Audit |
| **Context First** | `ContextSnapshot` обязателен для каждого `Request`; текст вопроса — производный вход, не первичный |
| **Permission First** | `PermissionBoundary` вычисляется **AI Context Engine** **до** handoff YASII и до Knowledge, Graph, Evidence, Memory read; Host Surface не поставляет boundary; YASII **не пересчитывает** boundary |
| **Platform Boundary** | `ContextSnapshot` и `PermissionBoundary` — сущности доменной модели YASII; **формирование** — ответственность AI Context Engine ([ADR](./ADR_YASII_AI_CONTEXT_BOUNDARY.md)); YASII **потребляет** как immutable input |
| **Evidence First** | `Verdict` и `Response` без `Evidence` — недействительны; declared status не заменяет Evidence |
| **Deterministic First** | Decision Domain опирается на Evidence + Rules + Graph; generative inference не входит в MVP-модель |
| **Graph Mandatory** | `GraphTraversal` обязателен в runtime path до финального Verdict (Constitution §19–20) |
| **Audit Mandatory** | каждый `Response` порождает `AuditRecord` с snapshots |
| **Versioned Contracts** | все сериализуемые сущности несут `schemaVersion`; breaking change → новая major version |
| **Embedded Intelligence** | `HostSurface` и `HostIntegration` — нормативные точки входа через **AI Context Engine**; standalone chat не моделируется |

---

# Раздел 3. Карта доменных сущностей

```text
YASII Domain
│
├── Identity Domain          ← кто имеет право спрашивать (User, Tenant, Role, Permission, PermissionBoundary)
├── Context Domain           ← где и о чём спрашивают (ContextSnapshot, HostSurface, …)
├── Knowledge Domain         ← что известно системе (Knowledge, Source, Domain, Tier, Rule)
├── Graph Domain             ← как знания связаны (GraphNode, GraphEdge, Traversal, Subgraph)
├── Runtime Domain           ← исполнение запроса (Request, Response, FailureResponse, Intent, Capability)
├── Decision Domain          ← область анализа и результат (EffectiveScope, Evidence, Citation, Verdict, …)
├── Memory Domain            ← эпизодическая и стратегическая память (Memory и специализации)
├── Audit Domain             ← воспроизводимость (AuditRecord, snapshots)
└── Integration Domain       ← встраивание в платформу (HostSurface, HostIntegration, HostContext)
```

| Домен | Назначение |
|-------|------------|
| **Identity** | Субъект запроса и границы доступа на уровне платформы |
| **Context** | Снимок ситуации пользователя в host surface |
| **Knowledge** | Каталог и классификация знаний (не graph structure) |
| **Graph** | Связанная модель знаний, evidence links, traversal |
| **Runtime** | Жизненный цикл одного запроса ЯСИИ |
| **Decision** | Область анализа (EffectiveScope) и объяснимый результат: факты, вывод, рекомендации, риски |
| **Memory** | История взаимодействий и решений, связанная с graph nodes |
| **Audit** | Неизменяемая запись для replay |
| **Integration** | Контракт между host UI и YASII Core |

---

# Domain Entity Metadata

Все **основные доменные сущности** следуют единому metadata-паттерну либо явно помечаются как **immutable** (snapshot/value objects).

## Стандартный паттерн (mutable registry entities)

| Атрибут | Назначение |
|---------|------------|
| `id` | Стабильный идентификатор сущности (суффикс по типу: `userId`, `ruleId`, …) |
| `version` | Версия записи или `schemaVersion` для сериализуемых объектов |
| `status` | Состояние lifecycle (`active`, `deprecated`, …) |
| `createdAt` | UTC, момент создания |
| `updatedAt` | UTC, момент последнего изменения |

## Immutable entities (snapshots, per-request artefacts)

Сущности **без** `updatedAt`; после создания не изменяются:

- `ContextSnapshot`, `PermissionBoundary`, `EffectiveScope` (per request)
- `RequestSnapshot`, `ContextSnapshotSnapshot`, `PermissionBoundarySnapshot`, `EffectiveScopeSnapshot`
- `EvidenceSnapshot`, `GraphSnapshot`, `RuleEvaluationSnapshot`, `DecisionSnapshot`, `RedactionLog`
- `AuditRecord` (append-only)

## Request-scoped entities

`Request`, `Response`, `FailureResponse`, `EffectiveScope`, `GraphTraversal`, `GraphSubgraph`, `Evidence`, `Verdict`, `Citation` несут `createdAt` / `completedAt`; `status` отражает stage completion, не registry mutation.

---

# Раздел 4. Identity Domain

## User

| | |
|---|---|
| **Назначение** | Человек или сервисный субъект, инициирующий запрос к ЯСИИ |
| **Ответственность** | Идентификация субъекта; привязка к Tenant и Role |
| **Основные атрибуты** | `userId`, `displayName`, `status`, `tenantMemberships[]`, `platformUserRef` |
| **Связи** | принадлежит **Tenant** (через membership); имеет **Role**(s); участвует в **Request** |
| **Инварианты** | `userId` глобально уникален в scope платформы; без resolved User запрос отклоняется |
| **Жизненный цикл** | `active` → `suspended` → `deactivated`; deactivated User не инициирует Request |

## Tenant

| | |
|---|---|
| **Назначение** | Организационная граница (компания, Studio, platform scope) |
| **Ответственность** | Изоляция данных и знаний tenant-level |
| **Основные атрибуты** | `tenantId`, `tenantType` (`platform` \| `customer`), `name`, `status` |
| **Связи** | содержит **User** memberships; ограничивает **Knowledge**, **Memory**, **Permission** |
| **Инварианты** | каждый Request имеет ровно один `tenantId` в scope; cross-tenant read запрещён |
| **Жизненный цикл** | `provisioned` → `active` → `archived` |

## Role

| | |
|---|---|
| **Назначение** | Профиль поведения ЯСИИ и потолок прав (YASII role, не только platform RBAC) |
| **Ответственность** | Определяет allowed domains, capabilities, verdict vocabulary, templates |
| **Основные атрибуты** | `roleId`, `roleKey` (e.g. `yasii-developer`), `roleProfileVersion`, `capabilities[]`, `knowledgeDomains[]`, `permissionCeiling` |
| **Связи** | назначается **User** в **Request**; конфигурирует **Capability**; влияет на **Verdict** vocabulary |
| **Инварианты** | Role Profile версионируется; Request фиксирует `roleProfileVersion` в Audit |
| **Жизненный цикл** | `draft` → `published` → `deprecated`; deprecated не используется в новых Request без waiver |

## Permission

| | |
|---|---|
| **Назначение** | Атомарное право доступа к ресурсу или операции |
| **Ответственность** | Участие в построении Permission Boundary |
| **Основные атрибуты** | `permissionId`, `scope` (`tenant` \| `object` \| `module` \| `action`), `resourceRef`, `effect` (`allow` \| `deny`) |
| **Связи** | агрегируется в **PermissionBoundary**; связан с **User** и **Role** |
| **Инварианты** | deny overrides allow; PermissionBoundary вычисляется **AI Context Engine** до Knowledge/Graph access в YASII |
| **Жизненный цикл** | управляется platform permission engine; изменения не retroactive для Audit |

## PermissionBoundary

| | |
|---|---|
| **Назначение** | Фактическая область данных, доступных ЯСИИ для конкретного Request |
| **Ответственность** | Определяет: доступные объекты, поля (MVP: object-level), процессы, документы, допустимые графовые переходы |
| **Runtime owner (formation)** | **AI Context Engine** — единственный вычислитель per request |
| **YASII responsibility** | **Потребление** boundary как gate: фильтрация Graph/Knowledge/Evidence; **запрещено** пересчитывать или расширять |
| **Основные атрибуты** | `boundaryId`, `requestId`, `tenantId`, `userId`, `roleProfileVersion`, `allowedObjectRefs[]`, `allowedDocumentRefs[]`, `allowedProcessRefs[]`, `allowedGraphTransitionTypes[]`, `deniedRefs[]`, `computedAt` |
| **Metadata** | **immutable** per request (snapshot entity) |
| **Связи** | `User` → `Role` → `Permission` → **PermissionBoundary** (inputs для ACE); **PermissionBoundary** → **ContextSnapshot** (`permissionBoundaryRef`); **PermissionBoundary** → **GraphTraversal**; **PermissionBoundary** → **Evidence** (filter) |
| **Инварианты** | вычисляется **AI Context Engine**, never supplied by Host Surface; YASII **не вычисляет** PermissionBoundary; формируется **после** Identity Resolution в ACE; **GraphTraversal** запрещён до handoff PermissionBoundary; **Response** не использует данные вне PermissionBoundary |
| **Жизненный цикл** | `computed_by_ace` → `bound_to_context_snapshot` → `handoff_to_yasii` → `snapshotted_in_audit` |

> **Маппинг на Core:** Identity Layer → `AIIdentityContext`; Permission Layer → **PermissionBoundary** (normative domain entity, per-request snapshot). **Implementation note:** builder PermissionBoundary — контур AI Context Engine, не YASII reasoning pipeline.

---

# Раздел 5. Context Domain

## ContextSnapshot

**Центральная сущность запроса к YASII** — фиксирует полную ситуацию на момент Request (Constitution: Context First).  
**Runtime owner (formation):** **AI Context Engine**. YASII получает ContextSnapshot как **immutable input** и не собирает контекст напрямую.

| | |
|---|---|
| **Назначение** | Неизменяемый снимок UI/process контекста на момент Request |
| **Ответственность (ACE)** | Сбор HostContext, нормализация, привязка `permissionBoundaryRef`, handoff YASII |
| **Ответственность (YASII)** | Якоря для Knowledge, Graph, Intent, Role selection — **только потребление** |
| **Минимальный состав** | см. таблицу ниже |
| **Связи** | 1:1 с **Request**; ссылается на **HostSurface**; содержит **ContextReference**(s); ссылается на **PermissionBoundary** через `permissionBoundaryRef` |
| **Инварианты** | формируется **AI Context Engine**; immutable после handoff; host surface обязателен; timestamp monotonic; **никогда не содержит авторитетный набор разрешений**; YASII **не мутирует** ContextSnapshot |
| **Жизненный цикл** | `created_by_ace` → `bound_to_request` → `archived_in_audit` |
| **Версионность** | `contextSchemaVersion`; совместимость по major version |

### Минимальный состав ContextSnapshot

| Атрибут | Описание |
|---------|----------|
| `requestId` | Связь с Request (может дублироваться в envelope) |
| `userId` | Субъект из Identity Domain |
| `tenantId` | Tenant scope |
| `roleIds` | Активные YASII / platform roles для request |
| `hostSurface` | Код host surface (см. HostSurface) |
| `currentObject` | Опциональный якорь: object type + id |
| `currentDocument` | Опциональный якорь: document ref + tier |
| `currentProcess` | Опциональный якорь: process/workflow step |
| `selectedObjects` | Множественный выбор (registry bulk context) |
| `permissionBoundaryRef` | Ссылка на **уже вычисленный** PermissionBoundary (не список permissions) |
| `timestamp` | UTC, момент capture |

**ContextSnapshot никогда не содержит авторитетный набор разрешений.**  
ContextSnapshot может ссылаться **только** на уже вычисленный PermissionBoundary.

> **Маппинг на Core:** `AIContextSnapshot` в implementation contracts = сериализация ContextSnapshot.

## HostSurface

| | |
|---|---|
| **Назначение** | Тип UI-точки встраивания ЯСИИ |
| **Ответственность** | Определяет default Role, обязательные context fields, integration profile |
| **Основные атрибуты** | `surfaceId`, `surfaceKey` (`platform_dev_dashboard`, `owner_dashboard`, …), `requiredContextFields[]` |
| **Связи** | используется в **ContextSnapshot**; конфигурируется **HostIntegration** |
| **Инварианты** | каждый Request имеет known `surfaceKey` или classified as `unknown` → restricted mode |
| **Жизненный цикл** | registry-managed; новые surfaces требуют ADR |

## ContextReference

| | |
|---|---|
| **Назначение** | Типизированная ссылка на объект контекста |
| **Ответственность** | Единый формат anchors для Graph entry |
| **Основные атрибуты** | `refType` (`object` \| `document` \| `process` \| `work_item` \| `route`), `refId`, `refMeta` |
| **Связи** | входит в **ContextSnapshot**; может map на **GraphNode** |
| **Инварианты** | refId не выходит за Permission Boundary |
| **Жизненный цикл** | ephemeral; persists only inside Audit snapshot |

---

# Раздел 6. Knowledge Domain

## Knowledge

| | |
|---|---|
| **Назначение** | Единица знания, доступная для reasoning |
| **Ответственность** | Связь content ↔ source ↔ domain ↔ tier |
| **Основные атрибуты** | `knowledgeId`, `title`, `summary`, `domainRef`, `tierRef`, `sourceRef`, `freshnessStatus`, `contentHash` |
| **Связи** | из **KnowledgeSource**; классифицируется **KnowledgeDomain** и **KnowledgeTier**; индексируется как **GraphNode** |
| **Инварианты** | не дублирует runtime entity state; platform truth через Evidence при конфликте |

## KnowledgeSource

| | |
|---|---|
| **Назначение** | Происхождение знания |
| **Ответственность** | Traceability для citations и Audit |
| **Основные атрибуты** | `sourceId`, `sourceType` (`document` \| `analyzer` \| `dashboard` \| `code_manifest` \| `test` \| `runtime`), `locator`, `capturedAt`, `versionRef` |
| **Связи** | порождает **Knowledge**; linked from **Evidence** |
| **Инварианты** | каждый Evidence item ссылается ≥1 KnowledgeSource |

## KnowledgeDomain

| | |
|---|---|
| **Назначение** | Классификация по предметной области |
| **Ответственность** | Role-based filtering (allowed_domains) |
| **Основные атрибуты** | `domainKey` — `platform`, `code`, `tenant`, `process`, `object`, `document`, `historical`, `risk`, `strategy` |
| **Связи** | группирует **Knowledge**; ограничивается **Role** |
| **Инварианты** | MVP: `platform`, `code`, `document`, `risk` active; `tenant`, `process`, `object`, `strategy` — post-MVP |

## KnowledgeTier

| | |
|---|---|
| **Назначение** | Иерархия приоритета platform knowledge (Tier 0–7) |
| **Ответственность** | Conflict resolution; normative answers require Tier 0–1 |
| **Основные атрибуты** | `tierLevel` (0–7), `label`, `precedenceRank` |
| **Связи** | assigned to **Knowledge**; referenced in **Evidence** strength |
| **Инварианты** | lower tier number = higher normative precedence; Tier 0–1 required for normative COMPLIANT/NON_COMPLIANT без UNKNOWN |

## Rule

Мост между **Knowledge Domain** и **Decision Domain** — нормативное правило оценки.

| | |
|---|---|
| **Назначение** | Нормативное правило, по которому ЯСИИ оценивает данные |
| **Ответственность** | Связь normative knowledge → evaluable check → Verdict |
| **Основные атрибуты** | `ruleId`, `name`, `description`, `version`, `severity`, `source`, `status` |
| **Metadata** | стандартный паттерн (`id` = `ruleId`) |
| **Связи** | **Knowledge** → **Rule**; **Rule** → **Evidence**; **Rule** → **Verdict** |
| **Инварианты** | **COMPLIANT** и **NON_COMPLIANT** Verdict **всегда** ссылаются на ≥1 Rule |
| **Жизненный цикл** | `draft` → `published` → `deprecated` |

---

# Раздел 7. Graph Domain

## GraphNode

| | |
|---|---|
| **Назначение** | Вершина Knowledge Graph |
| **Ответственность** | Typed node в связанной модели |
| **Обязательные атрибуты** | `nodeId`, `nodeType`, `nodeKey` (stable slug), `schemaVersion`, `title`, `domainRef`, `indexedAt` |
| **Идентификация** | `nodeKey` = `{nodeType}:{stableId}` глобально уникален в graph namespace |
| **Версионность** | `nodeSchemaVersion`; content change → new `contentRevision`, nodeKey stable |
| **Связи** | **GraphEdge** in/out; may link to **Knowledge**, **Evidence** |

## GraphEdge

| | |
|---|---|
| **Назначение** | Типизированная связь между nodes |
| **Обязательные атрибуты** | `edgeId`, `edgeType`, `fromNodeId`, `toNodeId`, `weight`, `schemaVersion` |
| **Идентификация** | `edgeId` unique; semantic type from controlled vocabulary (DEFINES, DEPENDS_ON, VERIFIED_BY, …) |
| **Версионность** | edge types versioned via Graph Schema Version |
| **Инварианты** | no cycles on DEPENDS_ON / IMPORTS profiles unless explicitly allowed |

## GraphTraversal

| | |
|---|---|
| **Назначение** | Операция обхода графа по profile |
| **Обязательные атрибуты** | `traversalId`, `profileKey`, `entryAnchors[]`, `maxDepth`, `maxNodes`, `startedAt`, `completedAt` |
| **Идентификация** | привязан к `requestId` |
| **Версионность** | `traversalProfileVersion` |
| **Инварианты** | выполняется только **внутри** PermissionBoundary **и** **EffectiveScope**; mandatory in MVP path |

## GraphSubgraph

| | |
|---|---|
| **Назначение** | Результат traversal — рабочий подграф для Evidence и Rules |
| **Обязательные атрибуты** | `subgraphId`, `nodeIds[]`, `edgeIds[]`, `pathTraces[]`, `citationRank` |
| **Идентификация** | 1:1 с GraphTraversal result per request stage |
| **Версионность** | snapshot в Audit via GraphSnapshot |

---

# Раздел 8. Runtime Domain

## Request

| | |
|---|---|
| **Назначение** | Единица работы ЯСИИ — один вопрос/команда в контексте |
| **Ответственность** | Envelope для Identity + Context + Intent + Capability invocation |
| **Основные атрибуты** | `requestId`, `schemaVersion`, `userId`, `tenantId`, `contextSnapshotRef`, `intent`, `capabilityKey`, `questionText`, `requestedAt`, `yasiiRoleKey` |
| **Связи** | порождает **Response** или **FailureResponse**; фиксируется в **AuditRecord** |
| **Инварианты** | без valid session/identity → reject; ContextSnapshot mandatory |

> **Маппинг:** `YASIIRequest` = contract envelope для Request.

## Response

| | |
|---|---|
| **Назначение** | Успешный структурированный результат работы ЯСИИ |
| **Ответственность** | Deliver Verdict, Evidence, Citations, Recommendations пользователю host surface |
| **Основные атрибуты** | `responseId`, `requestId`, `schemaVersion`, `verdict`, `evidence[]`, `citations[]`, `recommendations[]`, `risks[]`, `summary`, `auditRecordRef`, `completedAt` |
| **Связи** | содержит **Verdict**, **Evidence**, **Citation**, **Recommendation**, **Risk** |
| **Инварианты** | MUST contain **Verdict** + **Evidence**; normative Response MUST contain ≥1 **Citation** |

> **Маппинг:** `YASIIResponse` = contract envelope для Response.

## FailureResponse

| | |
|---|---|
| **Назначение** | Неуспешный исход pipeline без Verdict |
| **Ответственность** | Fail-closed сообщение host surface о причине отказа |
| **Типы** | `PERMISSION_DENIED`, `INSUFFICIENT_CONTEXT`, `NO_EVIDENCE`, `GRAPH_UNAVAILABLE`, `RULE_EVALUATION_FAILED`, `UNKNOWN_ERROR` |
| **Основные атрибуты** | `failureId`, `requestId`, `failureType`, `message`, `auditRecordRef`, `completedAt` |
| **Связи** | alternative to **Response** for same **Request**; фиксируется в **AuditRecord** |
| **Инварианты** | **FailureResponse не содержит Verdict**; порождает AuditRecord |

## Intent

| | |
|---|---|
| **Назначение** | Классификация типа намерения пользователя |
| **Ответственность** | Выбор traversal profile, rule packs, capability routing |
| **Допустимые типы (MVP minimum)** | `SEARCH`, `EXPLAIN`, `REVIEW`, `ANALYZE`, `REPORT`, `RECOMMEND` |
| **Основные атрибуты** | `intentType`, `confidence`, `resolvedBy` (`rules` \| `explicit`), `subjectRef` |
| **Инварианты** | Intent не override Permission или Role ceiling |

## Capability

| | |
|---|---|
| **Назначение** | Переиспользуемая операция Core (Architecture Review, Reality Check, …) |
| **Ответственность** | Orchestration subset of Runtime pipeline |
| **Основные атрибуты** | `capabilityKey`, `capabilityVersion`, `requiredIntents[]`, `requiredDomains[]`, `outputSections[]` |
| **Связи** | активируется **Role**; invoked by **Request** |
| **Инварианты** | Capability ≠ Role; новая роль не создаёт новый engine |

---

# Раздел 9. Decision Domain

## EffectiveScope

**EffectiveScope** определяет **фактическую область анализа**, доступную ЯСИИ в рамках конкретного Request.

| | |
|---|---|
| **Назначение** | Operational read focus: intersection max envelope и current context |
| **Формула** | `EffectiveScope = PermissionBoundary ∩ Current Context` |
| **Current Context** | Normalized anchors из **ContextSnapshot** (`ContextReference[]`, host focus, selected objects) |
| **Ответственность** | Определяет: какие объекты, документы, process refs участвуют в анализе; допустимые graph transitions; какие **Evidence** могут быть собраны |
| **Runtime owner (derivation)** | **YASII Runtime** at pipeline entry — intersection only; **не** ACL recomputation; **не** расширение PermissionBoundary |
| **Основные атрибуты** | `effectiveScopeId`, `requestId`, `permissionBoundaryRef`, `contextSnapshotRef`, `focusedObjectRefs[]`, `focusedDocumentRefs[]`, `focusedProcessRefs[]`, `allowedGraphTransitionTypes[]`, `scopeHash`, `computedAt` |
| **Metadata** | **immutable** per request after computation |
| **Связи** | derived from **PermissionBoundary** + **ContextSnapshot**; constrains **GraphTraversal**, **Evidence** collection; snapshotted in **EffectiveScopeSnapshot** |
| **Инварианты** | **EffectiveScope никогда не шире PermissionBoundary**; **формируется после** handoff **ContextSnapshot**; **YASII работает внутри EffectiveScope**; **Response не может ссылаться на данные вне EffectiveScope** |
| **Жизненный цикл** | `computed_at_yasii_entry` → `bound_to_request` → `snapshotted_in_audit` |

### Пример

```text
PermissionBoundary = 100 объектов
Current Context      = 3 выбранных объекта
EffectiveScope       = 3 объекта
```

> **Маппинг:** [YASII_PERMISSION_MODEL.md](./YASII_PERMISSION_MODEL.md) §13 Effective Scope. PermissionBoundary — max envelope (ACE); EffectiveScope — operational focus (YASII entry).

## Evidence

| | |
|---|---|
| **Назначение** | Проверяемый факт, подтверждающий или опровергающий утверждение |
| **Ответственность** | Основа Explainability; приоритет над declaration |
| **Основные атрибуты** | `evidenceId`, `strength` (`strong` \| `partial` \| `weak`), `sourceRef`, `knowledgeRef`, `graphNodeRef`, `observedAt`, `freshness` (`fresh` \| `stale` \| `unknown`), `payloadRef` |
| **Связи** | supports **Verdict**; supports **Citation**; snapshotted in **EvidenceSnapshot**; filtered by **PermissionBoundary** and **EffectiveScope** |
| **Инварианты** | **без Evidence успешный Response недействителен**; Evidence > Declaration |

## Citation

| | |
|---|---|
| **Назначение** | Точное место происхождения утверждения |
| **Ответственность** | Traceability normative claims to KnowledgeSource |
| **Основные атрибуты** | `citationId`, `sourceId`, `versionRef`, `location`, `fragment` |
| **Metadata** | immutable per Response |
| **Связи** | **Citation** → **KnowledgeSource**; **Citation** → **Evidence**; **Citation** → **Response** |
| **Инварианты** | любой **нормативный** Response MUST contain ≥1 Citation |

## Verdict

| | |
|---|---|
| **Назначение** | Классификация итога reasoning для audience |
| **Ответственность** | Главный «ответ» в смысле решения, не narrative |
| **Допустимые типы (domain)** | `COMPLIANT`, `NON_COMPLIANT`, `PARTIAL`, `BLOCKED`, `UNKNOWN`, `RISK` |
| **Основные атрибуты** | `verdictId`, `verdictType`, `audience` (`developer` \| `owner` \| `strategy`), `confidence`, `ruleRefs[]`, `supportedByEvidenceIds[]` |
| **Связи** | part of **Response**; recorded in **DecisionSnapshot** |
| **Инварианты** | MUST be supported by ≥1 Evidence except explicit UNKNOWN fail-closed; **COMPLIANT** / **NON_COMPLIANT** MUST reference ≥1 **Rule**; не смешивается с Recommendation |

### Audience Mapping

**Domain Verdict** — единый normative vocabulary. Role-specific labels строятся **только** через mapping (не отдельные domain types).

| Domain Verdict | YASII Developer | YASII Owner Assistant |
|----------------|-----------------|------------------------|
| `COMPLIANT` | ALLOWED | ON TRACK |
| `NON_COMPLIANT` | BLOCKED | OFF TRACK |
| `PARTIAL` | WARNING | MOSTLY ON TRACK |
| `BLOCKED` | BLOCKED | AT RISK |
| `UNKNOWN` | UNKNOWN | UNKNOWN |
| `RISK` | WARNING | AT RISK |

Strategy audience (`DO NEXT`, `DEFER`, …) — post-MVP mapping extension; domain types остаются canonical.

> System Map audience vocabularies **must** conform to this table.

## Recommendation

| | |
|---|---|
| **Назначение** | Предложение следующего действия без исполнения |
| **Ответственность** | Actionable guidance; не side effect |
| **Основные атрибуты** | `recommendationId`, `priority`, `actionText`, `rationale`, `blockedBy[]`, `enables[]` |
| **Связи** | attached to **Response**; may reference **GraphNode** (ENABLES/BLOCKS) |
| **Инварианты** | отделена от Verdict; autonomous execution запрещена; **не может инициировать запись данных автоматически** |

## Risk

| | |
|---|---|
| **Назначение** | Идентифицированная угроза, блокер или архитектурный долг |
| **Ответственность** | Прозрачность для owner/developer audiences |
| **Основные атрибуты** | `riskId`, `severity`, `category`, `description`, `debtRef`, `mitigationHint` |
| **Связи** | part of **Response**; may link **GraphNode** (Debt, Deviation) |
| **Инварианты** | RISK verdict type ≠ duplicate of Risk entity; Risk entities — содержание Response |

---

# Раздел 10. Memory Domain

Memory **не дублирует** Knowledge Layer — хранит эпизодическую и решенческую историю (Constitution §16).

## Memory (base)

| | |
|---|---|
| **Назначение** | Абстракция записи памяти ЯСИИ |
| **Область действия** | Определяется специализацией |
| **Жизненный цикл** | `recorded` → `linked_to_graph` → `retained` → `expired` → `purged` |
| **Основные атрибуты** | `memoryId`, `memoryType`, `tenantId`, `createdAt`, `expiresAt`, `graphNodeRefs[]`, `auditRecordRef` |

## UserMemory

| | |
|---|---|
| **Назначение** | История взаимодействий пользователя с ЯСИИ |
| **Область действия** | `userId` + `tenantId` |
| **Жизненный цикл** | append-only; retention policy post-MVP spec |
| **MVP** | ✗ extended (basic audit-linked Q&A only via Audit Domain) |

## TenantMemory

| | |
|---|---|
| **Назначение** | Решения и контекст на уровне компании |
| **Область действия** | `tenantId` |
| **Жизненный цикл** | post-MVP |
| **MVP** | ✗ |

## DecisionMemory

| | |
|---|---|
| **Назначение** | Waivers, deviations, architectural decisions, verdict history |
| **Область действия** | platform или tenant |
| **Жизненный цикл** | linked to ADR/Deviation graph nodes; waiver expiry required |
| **MVP** | ○ partial via Audit + basic Memory |

## ProcessMemory

| | |
|---|---|
| **Назначение** | Trail решений в workflow |
| **Область действия** | `processId` + step |
| **Жизненный цикл** | future-ready schema only in MVP |
| **MVP** | ✗ |

---

# Раздел 11. Audit Domain

## AuditRecord

| | |
|---|---|
| **Назначение** | Неизменяемая запись полного trace Request → Response или FailureResponse |
| **Основные атрибуты** | `auditId`, `requestId`, `responseId`, `failureId`, `userId`, `tenantId`, `roleProfileVersion`, `pipelineStages[]`, `contractVersions{}`, `createdAt`, `replayToken` |
| **Связи** | aggregates **RequestSnapshot**, **ContextSnapshotSnapshot**, **PermissionBoundarySnapshot**, **EffectiveScopeSnapshot**, **EvidenceSnapshot**, **GraphSnapshot**, **RuleEvaluationSnapshot[]**, **DecisionSnapshot**, **RedactionLog** (when redaction occurred) |
| **Инварианты** | создаётся для **каждого** Response и FailureResponse; immutable after write; **любой Response MUST быть воспроизводим** |

## RequestSnapshot

| | |
|---|---|
| **Назначение** | Freeze Request envelope на момент обработки |
| **Основные атрибуты** | `snapshotId`, `requestId`, `schemaVersion`, `payloadHash`, `capturedAt` |

## ContextSnapshotSnapshot

| | |
|---|---|
| **Назначение** | Freeze ContextSnapshot на момент ответа |
| **Основные атрибуты** | `snapshotId`, `contextSchemaVersion`, `payloadHash`, `permissionBoundaryRef`, `capturedAt` |

## PermissionBoundarySnapshot

| | |
|---|---|
| **Назначение** | Freeze PermissionBoundary на момент Graph/Knowledge access |
| **Основные атрибуты** | `snapshotId`, `boundaryId`, `allowedRefsHash`, `deniedRefsHash`, `computedAt` |

## EffectiveScopeSnapshot

| | |
|---|---|
| **Назначение** | Freeze **EffectiveScope** на момент Graph/Knowledge access и формирования ответа — воспроизводимость области анализа |
| **Основные атрибуты** | `snapshotId`, `effectiveScopeId`, `scopeHash`, `focusedRefsHash`, `permissionBoundaryRef`, `contextSnapshotRef`, `capturedAt` |
| **Связи** | **AuditRecord** → **EffectiveScopeSnapshot** → **EffectiveScope** (logical replay) |
| **Инварианты** | **Каждый AuditRecord содержит EffectiveScopeSnapshot**; **EffectiveScopeSnapshot обязателен для воспроизводимости ответа** |

## EvidenceSnapshot

| | |
|---|---|
| **Назначение** | Freeze Evidence bundle на момент ответа |
| **Основные атрибуты** | `snapshotId`, `evidenceIds[]`, `contentHashes[]`, `analyzerRunRef`, `freshnessAtCapture` |

## GraphSnapshot

| | |
|---|---|
| **Назначение** | Freeze subgraph + traversal trace |
| **Основные атрибуты** | `snapshotId`, `subgraphId`, `nodeKeys[]`, `edgeKeys[]`, `pathTraces[]`, `graphSchemaVersion` |

## DecisionSnapshot

| | |
|---|---|
| **Назначение** | Freeze Verdict, applied rules, recommendations |
| **Основные атрибуты** | `snapshotId`, `verdict`, `ruleResults[]`, `recommendationIds[]`, `mappingVersion` |

## RuleEvaluationSnapshot

| | |
|---|---|
| **Назначение** | Freeze результата evaluation **одного Rule** на момент ответа |
| **Основные атрибуты** | `snapshotId`, `ruleId`, `ruleVersion`, `inputEvidenceRefs[]`, `result`, `severity`, `reason`, `evaluatedAt` |
| **Связи** | referenced from **DecisionSnapshot**; aggregated in **AuditRecord** (bundle per evaluated rule) |
| **Инварианты** | **COMPLIANT** / **NON_COMPLIANT** Verdict MUST reference ≥1 RuleEvaluationSnapshot with PASS/FAIL respectively |

## RedactionLog

| | |
|---|---|
| **Назначение** | Журнал удаления/подавления данных вне EffectiveScope при формировании Evidence, Citation, Response |
| **Основные атрибуты** | `redactionId`, `reason`, `scope`, `removedFieldRefs[]`, `removedObjectRefs[]`, `removedCitationRefs[]`, `createdAt` |
| **Связи** | **AuditRecord** → **RedactionLog** (when any redaction applied); supports **Citation** `redactionApplied` |
| **Инварианты** | mandatory when denied data encountered; MUST NOT leak redacted payload in Response |

### Воспроизводимость

Каждый **Response** **должен** быть воспроизводим через:

```text
AuditRecord
├── RequestSnapshot
├── ContextSnapshotSnapshot
├── PermissionBoundarySnapshot
├── EffectiveScopeSnapshot
├── EvidenceSnapshot
├── GraphSnapshot
├── RuleEvaluationSnapshot[]     (one or more per evaluated rule)
├── DecisionSnapshot
└── RedactionLog                   (when redaction occurred)
+ contract versions (Request/Response schema)
+ KnowledgeSource versionRefs (via Citation)
```

**Инвариант:** любой Response MUST быть воспроизводим из AuditRecord snapshots.

Partial replay при stale analyzer допустим только с явным статусом `STALE` в Evidence (Roadmap §6.4).

---

# Раздел 12. Integration Domain

## HostSurface

См. Context Domain — единая сущность, используемая Integration и Context.

## HostIntegration

| | |
|---|---|
| **Назначение** | Регистрация binding между platform module и YASII |
| **Основные атрибуты** | `integrationId`, `surfaceKey`, `contextProviderRef`, `panelSlot`, `defaultRoleKey`, `status` |
| **Инварианты** | обязан supply **HostContext** в AI Context Engine; не standalone chat; не direct YASII call |

## HostContext

| | |
|---|---|
| **Назначение** | Payload от host → **AI Context Engine** до normalization в ContextSnapshot |
| **Основные атрибуты** | `hostPayloadVersion`, `rawContext`, `normalizedRef` |
| **Инварианты** | normalization выполняется в ACE; normalization **не расширяет** Permission; Host **не** передаёт PermissionBoundary |

> **Нормативный контракт:** [YASII_HOST_INTEGRATION_CONTRACT.md](./YASII_HOST_INTEGRATION_CONTRACT.md) — HostContext, Surface Profiles, normalization. Domain Model задаёт семантику сущностей; Contract задаёт обязательства Host → ACE.

---

# Раздел 13. Relationship Model

## Основной pipeline (упрощённо)

```text
Host Surface ──► HostContext ──► AI Context Engine
                                      │
User ──membership──► Tenant           ├── Identity Resolution
  │                                   ├── Role ──► Permission ──► PermissionBoundary
  └──assigned──► Role                 └──► ContextSnapshot (permissionBoundaryRef)
                                                │
                                                ↓ handoff
Request ──contains──► ContextSnapshot ◄─────────┘
   │
   ├──resolves──► PermissionBoundary (via permissionBoundaryRef)
   │
   ├──derives──► EffectiveScope
   │                 (PermissionBoundary ∩ Current Context)
   │
   ├──classified_as──► Intent
   ├──invokes──► Capability
   │
   └──processed_by──► YASII Runtime pipeline
                           │
                           ├──reads──► Knowledge ──► Rule
                           ├──traverses──► GraphSubgraph ◄── GraphTraversal (within EffectiveScope)
                           ├──collects──► Evidence
                           ├──cites──► Citation
                           ├──evaluates──► Rule
                           ├──produces──► Verdict
                           ├──suggests──► Recommendation
                           └──identifies──► Risk
```

### Pipeline (Request-centric)

```text
Request
    ↓
ContextSnapshot
    ↓
PermissionBoundary
    ↓
EffectiveScope
    ↓
Knowledge
    ↓
Graph
    ↓
Evidence
    ↓
Verdict
    ↓
Response
```

> **Ownership:** PermissionBoundary и ContextSnapshot **формируются** в AI Context Engine. **EffectiveScope** **вычисляется** YASII at entry (intersection). YASII **не пересчитывает** boundary и **не собирает** контекст напрямую.

```text
Response ◄──aggregates── Verdict + Evidence + Citation + Recommendation + Risk
   OR
FailureResponse (no Verdict)

Response / FailureResponse ──persists──► AuditRecord
              ├── RequestSnapshot
              ├── ContextSnapshotSnapshot
              ├── PermissionBoundarySnapshot
              ├── EffectiveScopeSnapshot
              ├── EvidenceSnapshot
              ├── GraphSnapshot
              ├── RuleEvaluationSnapshot[]
              ├── DecisionSnapshot
              └── RedactionLog (when redaction occurred)

AuditRecord ──may_link──► Memory (DecisionMemory / basic Q&A)
GraphNode ◄──references── Knowledge, Evidence, Memory
```

## Mermaid (ключевые связи)

> **Примечание:** `PermissionBoundary` и `ContextSnapshot` **вычисляются/формируются** в AI Context Engine (`Permission` → inputs для ACE, не YASII reasoning).

```mermaid
erDiagram
    User ||--o{ Role : assigned
    User }o--|| Tenant : belongs_to
    Role ||--o{ Permission : grants
    Permission --> PermissionBoundary : inputs_for_ace_compute
    PermissionBoundary --> ContextSnapshot : referenced_by
    ContextSnapshot ||--|| PermissionBoundary : permissionBoundaryRef
    Request ||--|| ContextSnapshot : contains
    Request ||--|| EffectiveScope : derives
    PermissionBoundary ||--|| EffectiveScope : bounds
    ContextSnapshot ||--|| EffectiveScope : focuses
    EffectiveScope ||--o{ Evidence : filters
    EffectiveScope ||--o{ GraphTraversal : constrains
    ContextSnapshot }o--|| HostSurface : hosted_on
    Request ||--o| Response : produces
    Request ||--o| FailureResponse : may_produce
    Request ||--o| Intent : classified_as
    Request }o--|| Capability : invokes
    Knowledge --> Rule : defines
    Rule --> Verdict : supports
    Response ||--|| Verdict : includes
    Response ||--o{ Evidence : includes
    Response ||--o{ Citation : includes
    Response ||--o{ Recommendation : includes
    Citation }o--|| KnowledgeSource : cites
    Verdict }o--o{ Evidence : supported_by
    Response ||--|| AuditRecord : audited_by
    AuditRecord ||--|| EvidenceSnapshot : freezes
    AuditRecord ||--|| GraphSnapshot : freezes
    AuditRecord ||--|| DecisionSnapshot : freezes
    AuditRecord ||--|| RequestSnapshot : freezes
    AuditRecord ||--|| ContextSnapshotSnapshot : freezes
    AuditRecord ||--|| PermissionBoundarySnapshot : freezes
    AuditRecord ||--|| EffectiveScopeSnapshot : freezes
    Knowledge ||--o| GraphNode : indexed_as
    Evidence }o--|| KnowledgeSource : sourced_from
    GraphTraversal ||--|| GraphSubgraph : produces
```

---

# Раздел 14. Domain Invariants

Обязательные правила (v1.3):

1. Каждый **Request** имеет resolved **User** и **Tenant**; anonymous Request запрещён.
2. Каждый **Request** имеет immutable **ContextSnapshot**, **сформированный AI Context Engine**.
3. **PermissionBoundary** вычисляется **AI Context Engine** до handoff YASII и до доступа YASII к Knowledge, Graph, Evidence, Memory.
4. **Host Surface не может поставлять PermissionBoundary.**
5. **YASII не вычисляет и не пересчитывает PermissionBoundary.**
6. **YASII не собирает контекст напрямую** — только потребляет нормализованный ContextSnapshot.
7. **GraphTraversal** не начинается до handoff **PermissionBoundary** и вычисления **EffectiveScope**.
8. **GraphTraversal** always выполняется **внутри** PermissionBoundary **и** **EffectiveScope**.
9. **GraphTraversal** обязателен в MVP execution path до Verdict (Constitution §19).
10. Каждый успешный **Response** содержит **Verdict**; **FailureResponse** не содержит Verdict.
11. **Response always содержит Verdict или Request завершается FailureResponse.**
12. Каждый успешный **Response** содержит ≥1 **Evidence**, кроме явного fail-closed **UNKNOWN**.
13. **Verdict** MUST reference supporting Evidence ids (when not UNKNOWN).
14. **COMPLIANT** / **NON_COMPLIANT** Verdict MUST reference ≥1 **Rule**.
15. **Recommendation** never replaces **Verdict**; обе сущности могут co-exist.
16. **Citation обязателен для нормативных ответов** (normative Response ≥1 Citation).
17. **Evidence** имеет priority над declared/documentation status.
18. **Response** не использует данные вне **PermissionBoundary**.
19. **Cross-Tenant Graph Edge запрещён.**
20. **Recommendation не может инициировать запись данных автоматически.**
21. Каждый **Response** и **FailureResponse** порождает ровно один **AuditRecord**.
22. **AuditRecord** immutable после persist.
23. **AuditRecord содержит снимок ContextSnapshot** (ContextSnapshotSnapshot).
24. **AuditRecord содержит снимок PermissionBoundary** (PermissionBoundarySnapshot).
25. **AuditRecord** содержит contract/schema versions для replay.
26. **User** не читает cross-tenant Knowledge, Graph nodes или Memory.
27. **Role** не elevates Permission above `permissionCeiling`.
28. **Capability** не выполняет autonomous write-actions.
29. **Memory** не хранит duplicate Knowledge content — только refs + episodic data.
30. **ContextSnapshot** immutable; **никогда не содержит авторитетный набор permissions**.
31. **KnowledgeTier** 0–1 обязателен для normative COMPLIANT/NON_COMPLIANT без UNKNOWN.
32. Stale analyzer Evidence MUST mark `freshness=stale`; не выдавать COMPLIANT на stale normative checks.
33. Все основные entities следуют **Domain Entity Metadata** или помечены **immutable**.
34. Deprecated **Role Profile** не применяется без explicit waiver Audit entry.
35. **Любой Response MUST быть воспроизводим** из AuditRecord snapshots.
36. **EffectiveScope** всегда является подмножеством **PermissionBoundary**.
37. **EffectiveScope** формируется после **ContextSnapshot** handoff (и доступного **PermissionBoundary**).
38. **Evidence** собирается только внутри **EffectiveScope**.
39. **GraphTraversal** выполняется только внутри **EffectiveScope**.
40. **Response** не может ссылаться на данные вне **EffectiveScope**.
41. **EffectiveScopeSnapshot** обязателен для воспроизводимости ответа; **каждый AuditRecord** содержит **EffectiveScopeSnapshot**.

---

# Раздел 15. Versioning Strategy

| Версия | Область | Совместимость |
|--------|---------|---------------|
| **Domain Model Version** | настоящий документ (`1.3`) | Minor: additive entities/attributes; Major: breaking semantic change → ADR |
| **Contract Version** | Request, Response, ContextSnapshot envelopes | Major bump при breaking field change; minor при additive optional fields |
| **Graph Schema Version** | nodeType/edgeType vocabularies | New types additive; rename/removal → migration + reindex |
| **Role Profile Version** | Role configuration bundles | Published profiles immutable; changes → new version |
| **Rule Version** | normative rules from ADR/baseline | Rule id stable; `ruleVersion` tracks text/evaluator change |

### Правила совместимости

- **Additive change:** optional attributes, new node types, new Intent values → minor version bump.
- **Breaking change:** rename required attributes, change Verdict semantics, remove Evidence requirement → major + ADR + Constitution check.
- **Replay:** Audit MUST store versions sufficient to interpret snapshots; unknown major version → replay blocked with explicit error.
- **Implementation lag:** code MAY support N and N-1 contract minor within same major.

---

# Раздел 16. MVP Boundary

## Входит в MVP Domain Model

| Сущность | MVP scope |
|----------|-----------|
| **User, Tenant, Role, Permission, PermissionBoundary** | platform-level; basic object boundary |
| **Request, Response, FailureResponse** | full envelope + schema versioning |
| **ContextSnapshot** | mandatory; `permissionBoundaryRef` only; MVP host surfaces |
| **Rule, Citation** | normative path MVP |
| **HostSurface, HostIntegration, HostContext** | MVP surfaces only |
| **Knowledge, KnowledgeSource, KnowledgeDomain, KnowledgeTier** | Platform + Code domains; Tier 0–6 |
| **GraphNode, GraphEdge, GraphTraversal, GraphSubgraph** | platform graph only |
| **Intent** | all six MVP intent types |
| **Capability** | Developer + Owner capabilities per System Map MVP |
| **EffectiveScope** | mandatory; derived at YASII entry; MVP |
| **Evidence, Verdict, Recommendation, Risk** | full Decision Domain |
| **AuditRecord + all snapshots** | Request, Context, PermissionBoundary, **EffectiveScope**, Evidence, Graph, RuleEvaluation, Decision, RedactionLog |
| **Memory (base)** | audit-linked basic only; DecisionMemory partial |

## Не входит в MVP

| Сущность / scope | Phase |
|------------------|-------|
| **TenantMemory** | post-MVP (Phase 8+) |
| **UserMemory (extended)** | post-MVP |
| **ProcessMemory (content)** | post-MVP |
| **Strategy Knowledge** as first-class domain | post-MVP (Phase 9) |
| **Generative Memory / summarization** | forbidden MVP |
| **Multi-Tenant business Graph** (object/process nodes at scale) | Tenant track |
| **Field-level Permission entity** | post-MVP ADR |
| **LLM-derived Evidence** | forbidden MVP |

---

# Раздел 17. Связь с другими документами

| Документ | Как использует Domain Model |
|----------|----------------------------|
| **YASII_CONSTITUTION.md** | Принципы → Domain Invariants (§14); Domain Model не ослабляет запреты |
| **ADR_YASII_AI_CONTEXT_BOUNDARY.md** | Ownership ContextSnapshot, PermissionBoundary; ACE handoff; приоритет для границы компонентов |
| **YASII_PERMISSION_MODEL.md** | Permission Resolution, layers, **EffectiveScope** formula; **EffectiveScopeSnapshot** audit |
| **YASII_HOST_INTEGRATION_CONTRACT.md** | HostContext → ACE; Permission Resolution order before handoff |
| **YASII_SYSTEM_MAP.md** | Core layers → домены; pipeline stages → Runtime + Decision entities |
| **YASII_IMPLEMENTATION_ROADMAP.md** | Phase 1 work items → Identity, Context, Request/Response; Phase 3 → Graph; Phase 4 → Runtime/Decision/Audit |
| **YASII_DASHBOARD_WORK_ITEMS.md** | Analyzer Evidence → Evidence entity; work items → GraphNode types |
| **YASII_MASTER_MAP.md** | Обзорные формулы → ссылаются на Domain Model для терминов |

### Маппинг Core Layer → Domain

| System Map Core Layer | Primary Domain |
|-----------------------|----------------|
| Identity Layer | Identity |
| Context Layer | Context (**ContextSnapshot**); formation — **AI Context Engine** |
| Permission Layer | Identity (**PermissionBoundary**); formation — **AI Context Engine** |
| Memory Layer | Memory |
| Knowledge Layer | Knowledge |
| Knowledge Graph | Graph |
| Code Knowledge Layer | Knowledge (`domainKey=code`) + Graph nodes |
| Runtime Engine | Runtime + Decision |
| Answer Builder | Runtime (Response assembly) |
| Audit Trail | Audit |

---

# Раздел 18. Architecture Decisions

| # | Решение | Rationale |
|---|---------|-----------|
| AD-01 | **ContextSnapshot — центральная сущность** | Context First; Question последний вход |
| AD-02 | **Evidence обязательно** | Explainability + Evidence First; invalid без Evidence |
| AD-03 | **Permission до данных** | предотвращение leak; Constitution §5 |
| AD-04 | **Verdict и Recommendation разделены** | verdict = classification; recommendation = action hint |
| AD-05 | **Graph обязателен** | Constitution §19–20; search alone insufficient |
| AD-06 | **Audit обязателен** | воспроизводимость; Constitution §15 |
| AD-07 | **Все контракты версионируются** | совместимость Audit replay и integrations |
| AD-08 | **Memory ≠ Knowledge** | разные lifecycle и retention |
| AD-09 | **Capability reuse** | Role configures capabilities, not new engines |
| AD-10 | **Host integration only** | Embedded Intelligence; no primary chat entity |
| AD-11 | **PermissionBoundary — normative entity** | Permission First; computed by **AI Context Engine** only; consumed by YASII; Host never supplies |
| AD-12 | **Rule + Citation for normative path** | COMPLIANT/NON_COMPLIANT traceability |
| AD-13 | **Audience Mapping table** | single domain Verdict vocabulary |
| AD-14 | **FailureResponse without Verdict** | explicit fail-closed outcomes |
| AD-15 | **ACE / YASII platform boundary** | ContextSnapshot + PermissionBoundary formation in ACE; YASII reasoning-only entry ([ADR](./ADR_YASII_AI_CONTEXT_BOUNDARY.md)) |
| AD-16 | **EffectiveScope — operational analysis scope** | `PermissionBoundary ∩ Current Context`; YASII entry derivation; **EffectiveScopeSnapshot** mandatory ([Permission Model](./YASII_PERMISSION_MODEL.md)) |

---

# Приложение A. Glossary cross-reference

| Domain term | Constitution / System Map term |
|-------------|-------------------------------|
| ContextSnapshot | AIContextSnapshot (formed by AI Context Engine) |
| Request | YASIIRequest |
| Response | YASIIResponse |
| FailureResponse | pipeline failure envelope |
| PermissionBoundary | PermissionBoundary (computed by AI Context Engine; consumed by YASII Core Permission Layer) |
| EffectiveScope | Operational analysis scope (YASII entry; Permission Model §13) |
| EffectiveScopeSnapshot | Audit freeze of EffectiveScope |
| Rule | Rule Engine normative rule |
| Citation | Response citation (Constitution §14 Sources) |
| User + Tenant + Role context | AIIdentityContext |

---

# Приложение B. Document metadata

| | |
|---|---|
| **Document owner** | Platform Architecture |
| **Review cycle** | при изменении Domain Model major version или Phase 1 gate |
| **Next planned documents** | YASII_EVIDENCE_SNAPSHOT_SPEC.md |
| **Supersedes** | YASII Domain Model v1.0–v1.2; fragmented entity mentions in System Map glossary |

---

# Приложение C. Changelog

| Version | Date | Changes |
|---------|------|---------|
| **1.3.1** | 2026-05-30 | **Added (Audit Domain, additive):** **RuleEvaluationSnapshot**, **RedactionLog** in AuditRecord aggregate — aligned with [YASII_EVIDENCE_SNAPSHOT_SPEC.md](./YASII_EVIDENCE_SNAPSHOT_SPEC.md) |
| **1.3** | 2026-05-30 | **Added:** **EffectiveScope**, **EffectiveScopeSnapshot**. **Aligned with:** [YASII_PERMISSION_MODEL.md](./YASII_PERMISSION_MODEL.md). Pipeline §13, Audit §11, invariants §14 (36–41), AD-16 |
| **1.2** | 2026-05-30 | Согласование с [ADR_YASII_AI_CONTEXT_BOUNDARY.md](./ADR_YASII_AI_CONTEXT_BOUNDARY.md): **PermissionBoundary** и **ContextSnapshot** — runtime owner formation = **AI Context Engine**; YASII только потребляет; инварианты §14 расширены (5–6, renumber); AD-11 обновлён; AD-15 добавлен |
| **1.1** | 2026-05-30 | PermissionBoundary, Rule, Citation, FailureResponse, audit snapshots, Audience Mapping |
| **1.0** | 2026-05-30 | Initial foundational domain model |

---

**Domain Model Version:** 1.3.1  
**Status:** FOUNDATIONAL DOMAIN ARCHITECTURE DOCUMENT — обязателен для Phase 1 Core Foundation
