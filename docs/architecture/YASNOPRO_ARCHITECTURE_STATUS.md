# YASNOPRO ARCHITECTURE STATUS

## Статус документа

```text
ACTIVE — синхронизирован после Legacy Block Types Isolation COMPLETED (2026-05-30); ADR-001
```

Нормативные детали recovery: [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md).  
Стратегическое решение по UT: [adr/ADR-001-universal-table-retirement.md](./adr/ADR-001-universal-table-retirement.md).

---

## 1. Назначение документа

Документ фиксирует текущее состояние архитектуры ЯсноПро относительно целевой AOBP-модели.

AOBP = AI-native Object-centric Business Platform.

## Цель документа

- измерять архитектурный прогресс;
- фиксировать текущее состояние платформы;
- выявлять деградацию архитектуры;
- контролировать migration phases;
- синхронизировать архитектурные решения.

## Простыми словами

Документ отвечает на вопрос:

«Насколько ЯсноПро уже приблизился к целевой архитектуре?»

---

# 2. Общий уровень зрелости платформы

| Уровень | Описание |
|---|---|
| Level 0 | Table-centric MVP |
| Level 1 | Hybrid Architecture |
| Level 2 | Partial Platform Core |
| Level 3 | Object-centric Platform |
| Level 4 | AI-native Platform |
| Level 5 | Full AOBP |

## Текущий уровень

Level 1 — Hybrid Architecture (с активным object-centric контуром)

## Причины (актуально)

- **Целевой SoT** для новых данных: Runtime Entity — **внедрён** (Designer publish → Office).
- **Рост dual SoT остановлен:** новые `universal_table` blocks / rows как primary path — **заблокированы** (Layer 2).
- **Legacy UT storage** — **existing-only** (Layer 5); табличный UI на portal не запрещён.
- Relation Engine, Event Engine, Permission Engine — **не реализованы**.
- View session / representation — **нестабильны** в legacy UT контуре.
- Runtime и Designer — **частично** разделены (Designer Shell + object routes; legacy portal смешан).

### Обязательная формулировка

```text
Table is UI. universal_table_rows is legacy storage. Runtime Entity is the business source of truth.
```

---

# 2.1. Dual-SoT Recovery — текущий снимок

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| **Object Type** (Designer) | **IMPLEMENTED / ACTIVE** | Publish → published catalog |
| **Runtime Entity** | **IMPLEMENTED / ACTIVE** | `runtime_entities`, gateways read/write |
| **Object Views** | **IMPLEMENTED / ACTIVE** | `ObjectViewHost`, Table View UI |
| **Table View → Runtime Entity** | **VERIFIED** | Layer 3, audit-only PR #3 |
| **Legacy UT storage** | **EXISTING-ONLY / ISOLATED** | Layer 5; markers + creation UI removed |
| **New legacy creation** | **BLOCKED** | FE guards + `POST /blocks` 422 |
| **Comments (object path)** | **DONE** | `entity_type=runtime_entity` |
| **Notes (object path)** | **DONE** | `entity_type=runtime_entity` |
| **Attachments (object path)** | **DONE** | file fields в `runtime_entities.values` |
| **Comments/notes (UT path)** | **COMPAT** | legacy identity сохранена |
| **universal_views** (legacy tables) | **ACTIVE (legacy)** | для existing `table_id`; **retirement active** |
| **Universal Table migration** | **CANCELLED** | Данные UT неценны; см. ADR-001 |
| **Universal Table retirement** | **ACTIVE** | Изоляция → удаление legacy-контура |

| Recovery Layer | Статус |
|----------------|--------|
| L1 Entity Identity Contract | **DONE** |
| L2 Stop New Legacy Creation | **DONE** |
| L3 Table View over Runtime Entity | **VERIFIED** |
| L4 Communication Identity | **DONE** |
| L5 Legacy UT Storage Isolation | **DONE** |
| L6 Documentation Alignment | **DONE** |

---

# 2.2. Universal Table Retirement — статус (ADR-001)

| Область | Старый статус | Новый статус | Причина |
|---|---|---|---|
| UT → Runtime Entity migration | REQUIRED / BLOCKER | **CANCELLED** | Данные UT неценны |
| Dual SoT | CRITICAL | **TEMPORARY LEGACY STATE** | UT будет удалена, не мигрирована |
| Phase 9.6 | BLOCKED | **UNBLOCKED** | Миграция больше не требуется |
| Runtime Entity | PARTIAL | **TARGET SOURCE OF TRUTH** | Единственный целевой контур |
| Universal Table | LEGACY | **RETIREMENT ACTIVE** | Подлежит удалению |
| Object Platform Independence | — | **IN PROGRESS** | runtimeReadGateway read **REMOVED**; runtimeLegacyWriteAdapter **REMOVED** (2026-05-30) |

---

# 3. Migration Phase Status

| Phase | Статус |
|---|---|
| PHASE 1 — Stabilization | IN PROGRESS |
| PHASE 2 — View Session Stabilization | NOT STARTED |
| PHASE 3 — View Engine Extraction | NOT STARTED |
| PHASE 4 — Entity Layer | **PARTIAL** (Runtime Entity + Object Type в production; legacy rows coexist) |
| **Dual-SoT Recovery L1–L5** | **DONE** (см. §2.1) |
| **Phase 9.1 Legacy Freeze** | **ACTIVE** |
| **Phase 9.3 Block isolation** | **DONE** (Layer 2) |
| **Legacy Block Types Isolation** | **COMPLETED** (2026-05-30, [LEGACY_BLOCK_TYPES_ISOLATION.md](./YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md)) |
| **Phase 9.5 Notifications → object card** | **DONE** (PR #8) |
| **Phase 9.6 Adapter removal** | **UNBLOCKED** (legacy removal program; см. ADR-001) |
| **Object Platform Independence** | **IN PROGRESS** — read gateway **DONE**; write adapter **DONE** (2026-05-30); entityCardShell pending |
| **Legacy Isolation (Phase 2)** | **IN PROGRESS** — block types **COMPLETED**; placeholder **COMPLETED** (2026-05-30); nav bridges / PortalPageView separation pending |
| **Legacy Removal Program** | **ACTIVE** (вместо data migration) |
| PHASE 5 — Relation Engine | NOT STARTED |
| PHASE 6 — Event Engine | NOT STARTED |
| PHASE 7 — Runtime/Designer Split | NOT STARTED |
| PHASE 8 — Layout Engine | PARTIAL |
| PHASE 9 — AI Context Engine | CONCEPT ONLY |
| PHASE 10 — AI Agents | NOT STARTED |

---

# 4. Platform Core Status

## ObjectType

Статус:
**IMPLEMENTED / ACTIVE** (Designer)

Реализовано:
- Object Type workspace, fields, views, publish;
- published catalog для Runtime.

Остаточный долг:
- legacy portal blocks не используют ObjectType model;
- не все legacy tables имеют published Object Type.

---

## Entity Layer (Runtime Entity)

Статус:
**IMPLEMENTED / ACTIVE** (целевой path) · **DUAL READ** (legacy rows coexist)

Реализовано:
- `runtime_entities` / runtime query / write gateways;
- Object Entity Card, Object Views, communication на `runtime_entity`.

Legacy (до удаления UT-контура):

- `universal_table_rows` — **не** целевой SoT; disposable legacy storage.

Целевое состояние (post-retirement):

- единственный SoT для всех бизнес-данных — Runtime Entity;
- Universal Table полностью удалена из платформы.

---

## Object Views (Table View)

Статус:
**IMPLEMENTED / ACTIVE**

Реализовано:
- `ObjectViewHost`, `shared/viewEngine`, runtime read/write gateways;
- Table View — UI adapter, **не** legacy storage.

Верификация:
- [YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md](./YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md) — Layer 3 **VERIFIED**.

---

## Field System

Статус:
PARTIAL

Проблемы:
- fields tightly coupled with table;
- reusable fields отсутствуют.

Целевое состояние:
- reusable field definitions.

---

## Relation Engine

Статус:
NOT IMPLEMENTED

Проблемы:
- relations отсутствуют как semantic graph;
- lookup используется как pseudo relation.

Целевое состояние:
- semantic relation graph.

---

## Event Engine

Статус:
NOT IMPLEMENTED

Проблемы:
- platform timeline отсутствует;
- используются хаотичные CustomEvent.

Целевое состояние:
- Event Store;
- Event Bus;
- Timeline Engine.

---

# 5. View Engine Status

## Universal Table (разделить storage и UI)

### Universal Table storage (`universal_table_rows`)

Статус:
**LEGACY / EXISTING-ONLY / ISOLATED**

- Новое создание blocks / primary row path — **заблокировано** (Layer 2).
- Existing blocks: render, edit, `universal_views`, lazy `createTableForBlock` — **работают**.
- Маркеры «режим поддержки» на canvas и в block editor (Layer 5).

**Не является:** бизнес-сущностью, целевым SoT, Object Type.

### Universal Table View (portal render)

Статус:
**ACTIVE** — UI над legacy storage для existing portal blocks (`UniversalTableView`).

**Не путать** с Object Views / `viewEngine` (object-centric Table View).

### Table View (object-centric)

Статус:
**IMPLEMENTED** — UI над **Runtime Entity** (не legacy).

Целевое состояние для legacy storage:
- retirement adapters (Phase 9.6 / Legacy Removal).

> Superseded by ADR-001: data migration **не выполняется**; legacy removal вместо ETL.

---

## Representation Architecture

Статус:
PARTIAL

Проблемы:
- split-brain state;
- dirty state distributed;
- representation и session смешаны.

Целевое состояние:
- deterministic representation model.

---

## View Session

Статус:
UNSTABLE

Проблемы:
- multiple owners;
- hidden synchronization;
- global state fragments.

Целевое состояние:
- scoped session ownership.

---

# 6. State Architecture Status

## Общий статус

UNSTABLE

## Основные проблемы

- duplicated state;
- hidden synchronization;
- window.__ globals;
- uncontrolled CustomEvent chains;
- giant controllers.

## Целевое состояние

- one scope = one owner;
- explicit state flow;
- deterministic save/discard.

---

# 7. Runtime / Designer Status

## Runtime

Статус:
PARTIAL

Проблемы:
- runtime содержит designer behavior.

---

## Designer

Статус:
PARTIAL (shell exists; platform layer incomplete)

Проблемы:
- Designer Shell работает, но не отделён на уровне platform engines;
- отдельный Designer Layer для schema/modeling — в roadmap.

---

## AppShell migration (Phase 6.x)

| Компонент | Foundation | Production |
|---|---|---|
| `AppSidebarRenderer` | **COMPLETE** (Phase 6.3) | **Not connected** |
| `AppHeaderRenderer` | **COMPLETE** (Phase 6.4) | **Not connected** |
| Runtime shell (`LeftSidebar`, `WorkspaceTopBar`) | Legacy | **Active** |
| Designer shell (`DesignerHeader`, Designer sidebar) | Legacy | **Active** |
| Feature flags | Unchanged | Renderers dev-only |
| Build | Passing | — |

### Dev previews

| Route | Назначение |
|---|---|
| `/dev/app-sidebar-renderer` | Sidebar contract visual validation (5 panels) |
| `/dev/app-header-renderer` | Header contract visual validation (5 panels) |
| `/dev/appshell-shadow-runtime` | Dev-only shadow runtime wiring: provider snapshot + renderer contracts + diagnostics |
| `/dev/appshell-shadow-designer` | Dev-only shadow designer parity diagnostics route |

### AppShellProvider (Phase 6.6)

| Артефакт | Статус |
|---|---|
| Design | `docs/architecture/YASNOPRO_APPSHELL_PROVIDER_DESIGN.md` |
| Skeleton | `frontend/src/shared/shell/provider/*` |
| Production wiring | **Not connected** |
| Build | Passing (skeleton tree-shaken) |

### Action Bridge (Phase 6.7)

| Артефакт | Статус |
|---|---|
| Design | `docs/architecture/YASNOPRO_APPSHELL_ACTION_BRIDGE_DESIGN.md` |
| Skeleton | `frontend/src/shared/shell/actions/*` |
| Production wiring | **Not connected** |
| Real action execution | **Disabled (design/skeleton only)** |

### Shadow Mode (Phase 6.8)

| Артефакт | Статус |
|---|---|
| Design | `docs/architecture/YASNOPRO_APPSHELL_SHADOW_MODE_DESIGN.md` |
| Skeleton | `frontend/src/shared/shell/shadow/*` |
| Flag | `yasnopro:dev:appshell-shadow` (DEV-only) |
| Production wiring | **Not connected** |
| Impact on users | **None** (observer + diagnostics only) |

### Production Replacement Readiness Review (Phase 6.9)

| Артефакт | Статус |
|---|---|
| Review doc | `docs/architecture/YASNOPRO_APPSHELL_PRODUCTION_REPLACEMENT_READINESS_REVIEW.md` |
| Decision | **NO-GO** |
| Reason summary | provider/handlers/routing/parity/rollback not ready |

### Dev-only Shadow Runtime Wiring (Phase 6.10)

| Артефакт | Статус |
|---|---|
| Dev route | `/dev/appshell-shadow-runtime` |
| Source model | Runtime-like read-only snapshot |
| Output | `AppSidebarRenderer` + `AppHeaderRenderer` + `AppShellShadowDiagnostics` |
| Diagnostics fields | mode, collapsed, activePageId, activeItemId, section/item counters, title, search, notifications, geometry offsets, timestamp |
| Real actions | **Disabled (no-op)** |
| Production wiring | **Not connected** |

### Dev-only Real Runtime Snapshot Probe (Phase 6.11)

| Артефакт | Статус |
|---|---|
| Route mode switch | `Mock snapshot` / `Real runtime snapshot` |
| Real sources | `useNavigationTree`, `getPageFull`, `getMe`, `readShellSidebarCollapsed`, `getLastRuntimePath`, unread notifications count |
| Diagnostics sourceMode | `mock` / `real` / `unavailable` |
| Unavailable reason | `real runtime sources unavailable in isolated dev route` |
| Actions/routing/API mutate | **Disabled** |
| Production wiring | **Not connected** |

### Runtime Shadow Bridge (Phase 6.12)

| Артефакт | Статус |
|---|---|
| Design | `docs/architecture/YASNOPRO_RUNTIME_SHADOW_BRIDGE_DESIGN.md` |
| Bridge files | `shared/shell/shadow/runtime/*` (`runtimeShadowBridge.js`, `runtimeShadowSnapshot.ts`) |
| Transport | readonly emitter + latest snapshot registry + subscribe/unsubscribe |
| Runtime emitter | DEV-only observer emit from `PortalPageView` + `WorkspaceTopBar` |
| Source mode | `bridge` / `mock` / `unavailable` |
| Diagnostics | snapshot age, last update time, freshness, missing fields, runtime parity warnings |
| Production impact | **None** |

### Runtime/Shadow Parity Validation (Phase 6.13)

| Артефакт | Статус |
|---|---|
| Validation doc | `docs/architecture/YASNOPRO_APPSHELL_RUNTIME_PARITY_VALIDATION.md` |
| UI panel | parity checklist panel on `/dev/appshell-shadow-runtime` |
| Check statuses | `pass`, `warn`, `fail`, `not_applicable` |
| Aggregate status | `parityStatus = pass | partial | fail` |
| Diagnostics arrays | `failedChecks[]`, `warningChecks[]`, `passedChecks[]` |
| Production impact | **None** |

### Designer/Shadow Parity Validation (Phase 6.14)

| Артефакт | Статус |
|---|---|
| Validation doc | `docs/architecture/YASNOPRO_APPSHELL_DESIGNER_PARITY_VALIDATION.md` |
| Dev route | `/dev/appshell-shadow-designer` |
| Check statuses | `pass`, `warn`, `fail`, `not_applicable` |
| Aggregate status | `designerParityStatus = pass | partial | fail` |
| Diagnostics arrays | `designerFailedChecks[]`, `designerWarningChecks[]`, `designerPassedChecks[]` |
| Production impact | **None** |

### Cross-mode Shadow Readiness Review (Phase 6.15)

| Артефакт | Статус |
|---|---|
| Review doc | `docs/architecture/YASNOPRO_APPSHELL_CROSS_MODE_SHADOW_READINESS_REVIEW.md` |
| Decision | **NO-GO** (unchanged) |
| Runtime parity status | Partial / manual verification pending |
| Designer parity status | Partial / mock-based |
| Main cross-mode risk | different fidelity of runtime/designer shadow sources |
| Production impact | **None** |

### Designer Shadow Bridge (Phase 6.16)

| Артефакт | Статус |
|---|---|
| Design | `docs/architecture/YASNOPRO_DESIGNER_SHADOW_BRIDGE_DESIGN.md` |
| Bridge files | `shared/shell/shadow/designer/*` (`designerShadowBridge.js`, `designerShadowSnapshot.ts`) |
| Transport | readonly emitter + latest snapshot registry + subscribe/unsubscribe |
| Designer emitter | DEV-only observer emit from `DesignerShell` |
| Source mode | `bridge` / `mock` / `unavailable` on `/dev/appshell-shadow-designer` |
| Production impact | **None** |

### Следующий шаг

Phase **6.17 — Cross-mode parity revalidation**.  
Production replacement остаётся **заблокирован** до закрытия NO-GO причин из 6.9 review.

---

# 8. Layout Engine Status

## Canvas

Статус:
PARTIAL LAYOUT ENGINE

Проблемы:
- layout смешан с runtime behavior;
- resize partially unstable.

Целевое состояние:
- independent Layout Engine.

---

# 9. AI Architecture Status

## AI Context Engine

Статус:
CONCEPT ONLY

Проблемы:
- AI не использует platform graph;
- нет semantic context.

---

## AI Agents

Статус:
NOT IMPLEMENTED

---

# 10. Architecture Debt Status

См. [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md).

## Снижено (Layers 1–5)

- **Рост dual SoT** — остановлен (новые UT storage sources не создаются).
- **Legacy creation path** — закрыт (UI + API).
- **Communication identity split (object path)** — закрыт для comments / notes / attachments.

## Критические проблемы (остаются)

- **Universal Table retirement** — legacy-код и зависимости ещё связаны с Object Platform (см. AD-UT-RETIREMENT);
- split-brain state в legacy UT session / representations (до удаления UT);
- hidden synchronization (`window.__`, CustomEvent);
- giant controllers (`useUniversalTableController`, `PortalPageView`);
- Relation / Event / Permission engines отсутствуют;
- legacy notification path → legacy `EntityCardModal` (runtime_entity path — **DONE**, Phase 9.5).

---

# 11. Regression Risk Status

| Зона | Риск |
|---|---|
| Universal Table | HIGH |
| Representation Save | HIGH |
| View Session | HIGH |
| Canvas Resize | MEDIUM |
| Entity Card | MEDIUM |
| Comments | LOW |
| Notifications | MEDIUM |

---

# 12. Architecture Health Indicators

| Индикатор | Статус |
|---|---|
| Source of Truth определён | **PARTIAL → TARGETING SINGLE SoT** (Runtime Entity; UT retirement active) |
| Ownership определён | PARTIAL |
| Runtime deterministic | NO |
| Hidden sync отсутствует | NO |
| Layers separated | PARTIAL |
| AI-ready architecture | NO |

---

# 13. Главные текущие приоритеты

1. **Object Platform Independence** — entityCardShell/objectEntities; read + write adapters **DONE** (2026-05-30)
2. Phase **9.6** — legacy adapter removal (**IN PROGRESS** — read + write gateway adapters **DONE**; UT module pending)
3. **Legacy Removal Program** — изоляция и удаление Universal Table
4. View Session stabilization (legacy UT — до удаления модуля)
5. Relation / Event engines (долгосрочно)

> Ранее: «Планирование data migration `universal_table_rows` → `runtime_entities`» — **CANCELLED** (ADR-001).

---

# 14. Что запрещено до завершения Stabilization

Запрещено:

- massive refactor;
- новые сложные modules;
- AI auto-refactor;
- сложный workflow;
- deep UI redesign;
- platform rewrite.

---

# 15. Definition of Current Success

Текущий успех платформы определяется НЕ количеством feature.

А:

- снижением хаоса;
- стабилизацией state;
- разделением ownership;
- уменьшением regressions;
- приближением к целевой AOBP-архитектуре.

---

# 16. Финальная цель

ЯсноПро должно перейти:

от:
- table-centric runtime;
- feature-first architecture;

к:
- AI-native;
- object-centric;
- graph-driven;
- platform-first architecture.