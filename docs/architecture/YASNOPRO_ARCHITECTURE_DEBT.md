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

---

# 19. AppShell migration debt (review backlog)

Записи по миграции AppShell Phase 1+; формат review backlog (Severity / Status / Acceptance criteria).

## AD-SHELL-001 — Shell sidebar collapse state has delayed/double-click behavior

**Severity:** MEDIUM

**Status:** PARTIAL — bridge transport and freshness diagnostics added in Phase 6.12; parity validation still pending

**Area:**

- AppShell migration
- `shared/shell/useShellSidebarState.ts`
- Runtime/Designer sidebar synchronization

**Symptoms:**

- Sidebar collapse/expand may require double click.
- Collapse/expand may react with noticeable delay.
- State synchronization between component state, localStorage, storage event and custom event may be inconsistent.

**Likely causes to investigate:**

- State update and localStorage write happen in same setState callback.
- Custom event may trigger additional state update in the same tab.
- Runtime and Designer may remount and read state before write/event propagation completes.
- Toggle handler may close over stale state in one of the consumers.
- Multiple shell consumers may subscribe and update independently without a central provider.

**Recommended future fix:**

- Wire `AppShellProvider` (skeleton exists in `shared/shell/provider/`) as single runtime owner of shell state.
- Deprecate direct `useShellSidebarState()` in layouts after shadow validation (Phase 6.8).
- Keep localStorage only as persistence layer, not active state owner.
- Replace independent hook instances with context-based shared state.
- Emit event only after canonical state is committed.
- Add smoke tests/manual QA for Runtime → Designer and Designer → Runtime collapse continuity.

**Do not fix during current phase unless it blocks demo.**

**Acceptance criteria for closing:**

- Single click always toggles sidebar.
- No visible delay in Runtime or Designer.
- Collapse state persists after refresh.
- Collapse state follows mode switch.
- No duplicate state events in console.
- Works across two browser tabs.

## AD-SHELL-002 — AppSidebar icon system is temporary until analyst-driven icon configuration

**Severity:** MEDIUM

**Status:** OPEN

**Area:**

- AppSidebarRenderer
- Runtime/Designer menu icon rendering
- future Designer icon configuration

**Symptoms:**

- AppSidebarRenderer uses temporary icon mapping/fallbacks.
- Runtime icons are partially compatible with current menu but not yet driven by final editable icon configuration.
- Designer icons are temporary.

**Recommended future fix:**

- Move icon rendering to shared configurable menu icon system.
- Use menu item icon settings from analyst edit mode.
- Support upload icons, system icons and fallback icons through one renderer.
- Remove temporary icon maps from AppSidebarRenderer.

**Do not fix during current phase unless it blocks demo.**

## AD-SHELL-003 — AppShell renderers are foundation-only; production bridges missing

**Severity:** CRITICAL (for production replacement only)

**Status:** PARTIAL — visual foundation DONE (6.3 / 6.4); provider DONE (6.6); action bridge DONE (6.7); shadow design DONE (6.8); 6.9 readiness = NO-GO; production wiring OPEN

**Area:**

- `AppSidebarRenderer`, `AppHeaderRenderer`
- `LeftSidebar`, `WorkspaceTopBar`, `DesignerHeader`
- AppShell migration Phase 6.6+

**Current state:**

- Sidebar/header contracts and adapters map legacy data shapes.
- Renderers support visual contract fields (editMode, actions, capabilities, search, notifications, editable title, tree).
- All renderer actions are **no-op**; renderers do **not** own shell state.
- Production still uses legacy shell components; feature flags unchanged.

**Blockers before replacement:**

1. AppShellProvider / canonical shell state owner  
2. Action execution contract + routing/action bridge (**design done in 6.7, integration open**)  
3. Shadow validation loop / parity diagnostics in dev-only mode (**design done in 6.8, operational wiring open; confirmed in 6.9 NO-GO**)  
4. Edit mode bridge, notification bridge, search bridge  
5. Collapse sync (see AD-SHELL-001)  
6. Drag/drop integration (sidebar)  
7. Runtime + Designer parity tests  
8. Rollback strategy (not tested)  

**Acceptance criteria for closing:**

- Provider owns collapse, active nav, edit flags.
- Action keys dispatch outside renderers.
- Parity tests pass vs legacy shell.
- Feature flag can swap production shell with instant rollback.
- Coverage matrix §11 blockers cleared.

**Do not:** replace LeftSidebar / WorkspaceTopBar / DesignerHeader until criteria met.

## AD-SHELL-005 — Action key taxonomy and naming drift risk

**Severity:** MEDIUM

**Status:** PARTIAL — canonical taxonomy added in Phase 6.7, legacy aliases still present

**Area:**

- `shared/shell/actions/appShellActionKeys.ts`
- legacy action keys emitted by existing adapters/contracts

**Problem:**

- Different key styles may coexist (`kebab-case` legacy vs dot-notation canonical).
- Without normalization + lint checks, handlers can be silently missed.

**Current mitigation (6.7):**

- Canonical naming convention documented.
- Alias normalization added in Action Bridge skeleton.
- DEV diagnostics for invalid/missing keys.

**Acceptance criteria for closing:**

- Adapters/contracts emit only canonical keys.
- Legacy aliases removed.
- CI/lint guard for action key pattern enabled.

## AD-SHELL-006 — Shadow diagnostics drift from legacy behavior

**Severity:** MEDIUM

**Status:** OPEN

**Area:**

- `shared/shell/shadow/*`
- parity compare between legacy inputs and generated AppShell contracts

**Problem:**

- Shadow may report green diagnostics while real runtime/designer flows still diverge.
- Snapshot fields can become stale/incomplete if mirroring contract is not strictly maintained.

**Current mitigation (6.8–6.12):**

- Shadow mode is DEV-only and observer-only.
- Explicit compare checklist documented in `YASNOPRO_APPSHELL_SHADOW_MODE_DESIGN.md`.
- No production replacement allowed from shadow output alone.
- Runtime Shadow Bridge adds readonly snapshot transport and missing-fields diagnostics (`shared/shell/shadow/runtime/*`).

**Acceptance criteria for closing:**

- Runtime and Designer shadow checks cover full parity checklist.
- Diagnostics validated against manual QA scenarios.
- 6.9 readiness review confirms shadow data fidelity.

## AD-SHELL-007 — Production replacement blocked by 6.9 NO-GO

**Severity:** CRITICAL

**Status:** OPEN

**Area:**

- AppShell migration readiness gate
- Runtime/Designer shell replacement decision

**Problem:**

6.9 review confirms replacement criteria are not met (updated after 6.12):

- provider wired to DEV-only readonly runtime bridge sources (not production ownership);
- action handlers/routing bridge absent;
- runtime/designer parity unverified;
- rollback untested;
- AD-SHELL-001 still open.

**Acceptance criteria for closing:**

- 6.10 shadow runtime wiring complete (dev-only).
- parity checklists executed and passed.
- rollback drill passed.
- follow-up readiness review changes decision from NO-GO to GO.

## AD-SHELL-004 — Renderer icon/header action maps are temporary

**Severity:** LOW

**Status:** OPEN

**Area:**

- `AppSidebarIconRenderer` temporary type symbols (related to AD-SHELL-002)
- `AppHeaderRenderer` action icon fallbacks

**Recommended future fix:**

- Unified shell action/icon registry driven by configuration, not hardcoded maps in renderers.