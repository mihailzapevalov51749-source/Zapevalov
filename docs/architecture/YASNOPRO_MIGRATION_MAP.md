# YASNOPRO MIGRATION MAP

## 1. Назначение документа

Документ описывает поэтапную стратегию перехода ЯсноПро от текущего состояния к целевой AOBP-архитектуре.

AOBP = AI-native Object-centric Business Platform.

## Цель документа

- определить порядок архитектурной трансформации;
- исключить хаотичные refactor;
- обеспечить контролируемую migration strategy;
- минимизировать regressions;
- создать roadmap перехода к platform-first architecture.

## Простыми словами

Документ отвечает на вопрос:

«Как безопасно превратить текущий ЯсноПро в полноценную AI-native платформу?»

---

# 2. Главный принцип миграции

ЯсноПро НЕ переписывается целиком.

Переход выполняется:

- поэтапно;
- слоями;
- с контролем regressions;
- с сохранением working runtime;
- через controlled transition.

---

# 3. Главный принцип разработки

1 bug  
1 patch  
1 commit

## Запрещено

- массовые refactor;
- переписывание больших слоёв;
- AI auto-refactor;
- хаотичное разделение файлов;
- смешение platform/core и feature logic.

---

# 4. Migration Data Strategy

Существующие пользовательские данные важны, но не критичны.

Если сохранение старых данных:

- усложняет архитектуру;
- создаёт migration complexity;
- требует legacy-костылей;
- мешает переходу к целевой архитектуре;
- создаёт высокий regression risk;

то допускается:

- удаление данных;
- reset runtime data;
- пересоздание storage;
- отказ от legacy compatibility.

## Приоритеты платформы

1. правильная архитектура;
2. стабильный runtime;
3. чистый source of truth;
4. platform consistency;
5. сохранение legacy data — только если это безопасно.

---

# 5. Текущее состояние платформы

Текущая архитектура:

Hybrid Table-Centric Architecture.

## Основные признаки

- Universal Table частично является Entity Layer;
- View и Representation смешаны;
- Runtime и Designer смешаны;
- используется hidden synchronization;
- используется duplicated state;
- giant controllers управляют несколькими слоями сразу;
- platform boundaries размыты.

---

# 6. Целевое состояние платформы

Целевая архитектура:

Full AI-native Object-centric Business Platform.

## Целевое состояние включает

- Entity Layer;
- Relation Engine;
- Event Engine;
- AI Context Engine;
- Runtime Shell;
- Designer Shell;
- View Engine;
- Layout Engine;
- Session Engine;
- Platform Event Architecture.

---

# 7. Главный принцип перехода

Сначала:

- стабилизация;
- ownership;
- boundaries;
- source of truth.

Потом:

- новые engines;
- AI agents;
- advanced workflow;
- сложная automation.

---

# 8. PHASE 1 — STABILIZATION

## Цель

Остановить рост архитектурного хаоса.

## Основные задачи

- прекратить массовые refactor;
- прекратить хаотичное разделение файлов;
- зафиксировать platform rules;
- стабилизировать runtime behavior;
- ввести regression discipline.

## Что исправляем

- hidden synchronization;
- duplicated state;
- window.__ globals;
- giant controllers;
- uncontrolled CustomEvent chains.

## Что НЕ делаем

- не строим AI agents;
- не внедряем сложный workflow;
- не делаем глубокий redesign UI;
- не переписываем платформу целиком.

## Definition of Done

- runtime стабилен;
- regressions контролируются;
- state ownership понятен;
- основные flows deterministic.

---

# 9. PHASE 2 — VIEW SESSION STABILIZATION

## Цель

Стабилизировать View State и Representation Architecture.

## Основные задачи

- завершить tableSessionStore;
- отделить View Session от Representation;
- убрать split-brain state;
- убрать hidden dirty state;
- стабилизировать save/discard flow.

## Что должно исчезнуть

- hidden save behavior;
- duplicated representation state;
- implicit synchronization;
- global dirty state.

## Что должно появиться

- deterministic View Session;
- explicit dirty state;
- controlled save flow;
- scoped session ownership.

## Definition of Done

- representation save predictable;
- discard predictable;
- F5 не ломает state;
- embedded и standalone используют одну модель.

---

# 10. PHASE 3 — VIEW ENGINE EXTRACTION

## Цель

Превратить Universal Table в полноценный Table View Engine.

## Основные задачи

- отделить View от Entity;
- отделить View от business logic;
- выделить Representation Engine;
- выделить View Session Layer.

## Universal Table должна отвечать только за

- rendering;
- filters;
- sorting;
- column behavior;
- inline editing;
- virtualization;
- selection;
- scrolling.

## Universal Table НЕ должна отвечать за

- entity ownership;
- workflow logic;
- relation logic;
- AI logic;
- platform state.

## Definition of Done

- Table = pure View Layer;
- representation ownership определён;
- table не является source of truth.

---

# 11. PHASE 4 — ENTITY LAYER FOUNDATION

## Цель

Создать настоящий Entity Layer.

## Основные задачи

- внедрить ObjectType;
- внедрить Entity abstraction;
- внедрить Field Definition;
- создать Entity Service;
- отделить entity data от table rows.

## Что должно появиться

- entity registry;
- object types;
- reusable fields;
- entity API;
- entity ownership.

## Что должно исчезнуть

- table rows как platform entities;
- schema inside table logic;
- business entities inside UI.

## Definition of Done

- platform работает через Entity Layer;
- table использует Entity API;
- ObjectType существует независимо от View.

---

# 12. PHASE 5 — RELATION ENGINE

## Цель

Создать graph architecture платформы.

## Основные задачи

- внедрить Relation Definition;
- внедрить Relation Instance;
- внедрить graph traversal;
- внедрить dependency analysis;
- внедрить impact analysis.

## Что должно появиться

- semantic relations;
- entity graph;
- dependency graph;
- relation API.

## Что должно исчезнуть

- lookup как псевдо-связи;
- relation через plain text;
- hidden object dependencies.

## Definition of Done

- AI может использовать relation graph;
- Entity Layer связан через semantic relations.

---

# 13. PHASE 6 — EVENT ENGINE

## Цель

Создать timeline architecture платформы.

## Основные задачи

- внедрить Event Store;
- внедрить Event Bus;
- внедрить Audit Trail;
- внедрить Timeline Engine;
- перевести notifications на events.

## Что должно появиться

- platform events;
- event subscribers;
- event history;
- observable platform behavior.

## Что должно исчезнуть

- хаотичные CustomEvent chains;
- hidden state mutation;
- implicit side effects.

## Definition of Done

- platform behavior event-driven;
- timeline доступен для AI context.

---

# 14. PHASE 7 — RUNTIME / DESIGNER SPLIT

## Цель

Полностью разделить рабочую среду и среду моделирования.

## Основные задачи

- создать Runtime Shell;
- создать Designer Shell;
- разделить permissions;
- разделить navigation;
- разделить state ownership.

## Runtime отвечает за

- работу сотрудников;
- execution;
- workflow usage;
- entity interaction.

## Designer отвечает за

- schema;
- object modeling;
- relation modeling;
- layout modeling;
- AI configuration.

## Definition of Done

- Runtime users не видят schema;
- Designer не смешан с runtime flows.

---

# 15. PHASE 8 — LAYOUT ENGINE EXTRACTION

## Цель

Сделать Canvas полноценным Layout Engine.

## Основные задачи

- отделить Layout от View State;
- отделить spatial logic от business logic;
- стабилизировать resize;
- стабилизировать composition;
- стабилизировать embedded views.

## Layout Engine отвечает только за

- positioning;
- resize;
- drag/drop;
- composition.

## Definition of Done

- layout не владеет entity data;
- layout deterministic;
- blocks reusable.

---

# 16. PHASE 9 — AI CONTEXT ENGINE

## Цель

Сделать платформу AI-native.

## Основные задачи

- объединить Entity Graph;
- объединить Relation Graph;
- объединить Event Timeline;
- создать Semantic Layer;
- внедрить Organizational Memory.

## AI должен понимать

- структуру компании;
- связи;
- процессы;
- зависимости;
- историю;
- роли;
- последствия.

## Definition of Done

- AI reasoning использует platform graph;
- AI работает не только с текстом.

---

# 17. PHASE 10 — AI AGENTS

## Цель

Создать специализированных AI-агентов.

## Примеры

- Project AI;
- Risk AI;
- Workflow AI;
- Analyst AI;
- Executive AI;
- Document AI.

## Definition of Done

- AI agents используют platform context;
- AI agents работают через platform engines.

---

# 18. Migration Priority Rules

## Всегда сначала

1. ownership;
2. source of truth;
3. state stabilization;
4. explicit boundaries.

## Только потом

- новые features;
- automation;
- AI logic;
- complex workflow.

---

# 19. Regression Discipline

После каждого patch проверяется regression checklist.

## TABLE

- hidden columns;
- reorder columns;
- sorting;
- filters;
- representation save;
- discard;
- F5;
- embedded table.

## LAYOUT

- resize;
- drag/drop;
- composition restore.

## ENTITY

- entity card;
- comments;
- attachments;
- tabs.

## AI

- context;
- permissions;
- explainability.

---

# 20. Architectural Stop Rules

Разработка должна останавливаться, если:

- появляется duplicated state;
- View становится source of truth;
- появляются hidden synchronization;
- появляется giant controller;
- появляется implicit save behavior;
- Layout начинает владеть business data;
- Runtime смешивается с Designer.

---

# 21. Definition of Architectural Success

ЯсноПро считается успешно мигрировавшим к целевой архитектуре, если:

- platform layers разделены;
- ownership определён;
- Entity Layer независим;
- View Engine независим;
- Relation Engine существует;
- Event Engine существует;
- AI Context Engine использует platform graph;
- Runtime и Designer полностью разделены;
- hidden synchronization отсутствует;
- platform deterministic.

---

# 22. Финальная формула миграции

Stabilization  
→ View Session Stabilization  
→ View Engine Extraction  
→ Entity Layer  
→ Relation Engine  
→ Event Engine  
→ Runtime/Designer Split  
→ Layout Engine  
→ AI Context Engine  
→ AI Agents

Это путь трансформации ЯсноПро из table-centric MVP в полноценную AI-native Object-centric Business Platform.

---

# 23. AppShell migration track (Phase 6.x)

Отдельный track внутри PHASE 7 (Runtime/Designer Split): унификация shell UI без смены platform engines.

## Принцип

```text
Contracts → Renderer (visual) → AppShellProvider → Action bridge → Shadow → Production swap
```

Renderers **никогда** не становятся router, state owner или action executor.

## Phase status

| Phase | Название | Статус | Production impact |
|---|---|---|---|
| 6.1–6.2 | Shell geometry, adapters, dev routes | DONE | None |
| 6.3 | Sidebar renderer visual contract | **DONE** | None — `LeftSidebar` unchanged |
| 6.4 | Header renderer visual contract | **DONE** | None — `WorkspaceTopBar` / `DesignerHeader` unchanged |
| 6.5 | Coverage matrix + migration docs | **DONE** | None |
| 6.6 | AppShellProvider design + skeleton | **DONE** | None — not imported by layouts |
| 6.7 | Action bridge design + skeleton | **DONE** | None — not imported by layouts |
| 6.8 | Shadow Integration design / dev-only shadow mode | **DONE** | Compare only; no production wiring |
| 6.9 | Production replacement readiness review | **DONE — NO-GO** | Go/no-go gate failed |
| 6.10 | Dev-only Shadow Runtime Wiring | **DONE** | Dev-only route `/dev/appshell-shadow-runtime`, no production impact |
| 6.11 | Dev-only Real Runtime Snapshot for Shadow | **DONE** | Same dev route: mock/real/unavailable diagnostics, observer-only |
| 6.12 | Runtime Shadow Bridge (DEV-only, read-only) | **DONE** | Readonly emitter + bridge registry + shadow subscriber, no production replacement |
| 6.13 | Runtime/Shadow Parity Validation | **DONE** | Checklist statuses + parityStatus + diagnostics arrays (DEV-only) |
| 6.14 | Designer/Shadow Parity Validation | **DONE** | `/dev/appshell-shadow-designer` + designer parity checks/status arrays |
| 6.15 | Cross-mode Shadow Readiness Review | **DONE** | consolidated NO-GO checkpoint for runtime+designer parity |
| 6.16 | Designer Shadow Bridge (DEV-only, read-only) | **DONE** | readonly designer emitter + bridge transport + designer route sourceMode |

## Current production truth

| Shell | Production component | Unified renderer |
|---|---|---|
| Runtime sidebar | `LeftSidebar` | `AppSidebarRenderer` (dev only) |
| Runtime header | `WorkspaceTopBar` | `AppHeaderRenderer` (dev only) |
| Designer header | `DesignerHeader` | `AppHeaderRenderer` (dev only) |
| Designer sidebar | Designer shell sidebar | `AppSidebarRenderer` (dev only) |

## Unsafe until Phase 6.9 approval

- Replace `LeftSidebar` with `AppSidebarRenderer`
- Replace `WorkspaceTopBar` with `AppHeaderRenderer`
- Replace `DesignerHeader` with `AppHeaderRenderer`
- Wire real actions inside renderers
- Move routing or collapse state into renderers

## Safe now

- Dev previews: `/dev/app-sidebar-renderer`, `/dev/app-header-renderer`, `/dev/appshell-shadow-runtime`, `/dev/appshell-shadow-designer`
- Contract/adapter expansion without production wiring
- Visual parity review against legacy shell
- Readiness documentation and blocker triage (6.9 NO-GO)
- Shadow diagnostics baseline on runtime-like snapshot (6.10)
- Conditional real runtime snapshot probe via read-only hooks/api with fallback `unavailable` reason (6.11)
- Runtime Shadow Bridge transport (`shared/shell/shadow/runtime/*`) with sourceMode `bridge` and freshness diagnostics (6.12)
- Runtime parity checklist panel and validation status model (`YASNOPRO_APPSHELL_RUNTIME_PARITY_VALIDATION.md`) (6.13)
- Designer parity checklist panel and validation status model (`YASNOPRO_APPSHELL_DESIGNER_PARITY_VALIDATION.md`) (6.14)
- Cross-mode readiness consolidation and NO-GO rationale (`YASNOPRO_APPSHELL_CROSS_MODE_SHADOW_READINESS_REVIEW.md`) (6.15)
- Designer bridge transport and source fidelity uplift (`YASNOPRO_DESIGNER_SHADOW_BRIDGE_DESIGN.md`) (6.16)

## 6.9 Review decision

`docs/architecture/YASNOPRO_APPSHELL_PRODUCTION_REPLACEMENT_READINESS_REVIEW.md` confirms:

- **NO-GO** for production replacement;
- replacement blocked by provider wiring, action/routing bridges, parity, AD-SHELL-001, rollback tests.

## Связанные документы

- `YASNOPRO_APPSHELL_PROVIDER_DESIGN.md` — provider state model, bridges, DoD
- `YASNOPRO_APPSHELL_ACTION_BRIDGE_DESIGN.md` — action taxonomy, registry, dispatch pipeline
- `YASNOPRO_APPSHELL_SHADOW_MODE_DESIGN.md` — dev-only shadow model, diagnostics, safety
- `YASNOPRO_RUNTIME_SHADOW_BRIDGE_DESIGN.md` — runtime readonly snapshot transport for shadow mode
- `YASNOPRO_APPSHELL_DESIGNER_PARITY_VALIDATION.md` — designer parity checklist and status model
- `YASNOPRO_APPSHELL_CROSS_MODE_SHADOW_READINESS_REVIEW.md` — consolidated runtime/designer readiness checkpoint
- `YASNOPRO_DESIGNER_SHADOW_BRIDGE_DESIGN.md` — designer readonly snapshot transport for shadow mode
- `YASNOPRO_APPSHELL_PRODUCTION_REPLACEMENT_READINESS_REVIEW.md` — 6.9 GO/NO-GO decision
- `YASNOPRO_APPSHELL_FUNCTIONAL_COVERAGE_MATRIX.md` — coverage, blockers, no-op rules
- `YASNOPRO APP SHELL ARCHITECTURE.md` — target shell model
- `YASNOPRO_ARCHITECTURE_DEBT.md` — AD-SHELL-001 … AD-SHELL-004

## Skeleton location (6.6)

`frontend/src/shared/shell/provider/` — `AppShellProvider`, `useAppShell`, `appShellReducer`, `appShellTypes`, `appShellContracts`

## Skeleton location (6.7)

`frontend/src/shared/shell/actions/` — `appShellActionKeys`, `appShellActionTypes`, `appShellActionRegistry`, `appShellActionBridge`

## Skeleton location (6.8)

`frontend/src/shared/shell/shadow/` — `AppShellShadowProvider`, `AppShellShadowDiagnostics`, `appShellShadowFlags`

## Bridge location (6.12)

`frontend/src/shared/shell/shadow/runtime/` — `runtimeShadowBridge`, `runtimeShadowSnapshot`, bridge exports

## Bridge location (6.16)

`frontend/src/shared/shell/shadow/designer/` — `designerShadowBridge`, `designerShadowSnapshot`, bridge exports