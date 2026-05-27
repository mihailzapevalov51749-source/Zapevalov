# YASNOPRO_APPSHELL_FUNCTIONAL_COVERAGE_MATRIX.md

## Статус документа

| Поле | Значение |
|---|---|
| Документ | YASNOPRO_APPSHELL_FUNCTIONAL_COVERAGE_MATRIX |
| Статус | ACTIVE — designer shadow bridge enabled (Phase 6.16) |
| Последнее обновление | Phase 6.16 (designer bridge + designer shadow sourceMode) |
| Цель | Контроль миграции Runtime/Designer shell в единый AppShell |
| Область | AppSidebar / AppHeader |
| Связанные документы | YASNOPRO APP SHELL ARCHITECTURE.md, YASNOPRO_ARCHITECTURE_STATUS.md, YASNOPRO_MIGRATION_MAP.md |
| Подход | Contract-first migration |
| Критичность | CRITICAL |
| Build | passing (`npm run build`) |
| Feature flags | unchanged — renderers not wired to production |

---

# 1. Цель документа

Документ фиксирует:

- текущий функционал Runtime/Designer shell;
- степень покрытия AppSidebarRenderer/AppHeaderRenderer;
- gaps и риски миграции;
- ограничения текущей foundation-реализации;
- условия безопасной замены shell-компонентов.

---

# 2. Главный архитектурный принцип

## AppShell Principle

Runtime и Designer не должны иметь разные shell-компоненты.

Должен существовать:

- единый `AppSidebarRenderer`;
- единый `AppHeaderRenderer`.

При переключении Runtime / Designer должны меняться только:

- menu items;
- sidebar sections;
- title/subtitle;
- available actions;
- active mode/accent;
- workspace content.

---

# 3. Что НЕ должно меняться

Следующие параметры являются частью единого AppShell и не должны отличаться между Runtime и Designer:

| Категория | Требование |
|---|---|
| Sidebar layout | Единая структура |
| Header layout | Единая структура |
| Width | Единые размеры |
| Height | Единые размеры |
| Padding | Единые отступы |
| Collapse behavior | Единая логика |
| Brand block | Единая структура |
| Visual language | Единая система |
| Shell identity | Ощущение одной платформы |

---

# 4. Критическое правило миграции

## Нельзя заменять функциональные shell-компоненты декоративными renderer'ами

Текущие:

- `AppSidebarRenderer`
- `AppHeaderRenderer`

являются foundation/render layer.

Перед production migration необходимо:

1. Полностью покрыть contracts;
2. Полностью покрыть renderer behavior;
3. Проверить functional parity;
4. Только после этого заменять текущие shell-компоненты.

---

# 5. Runtime Sidebar — Functional Coverage Matrix

> **Phase 6.3 (2026-05):** `AppSidebarRenderer` + adapters + dev preview. Visual/foundation only. Production `LeftSidebar` не заменён.

| Feature | Current Owner | Required in AppShell | Covered by Contract | Covered by Renderer | Gap | Migration Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Page navigation | LeftSidebar/MenuTree | YES | YES | VISUAL | Нет routing execution; path — display only | HIGH | Action bridge + AppShellProvider |
| Active page | MenuTree | YES | YES | VISUAL | `active`/`activePageId` в contract, без canonical owner | HIGH | AppShellProvider active state |
| System pages | MenuItem | YES | YES | VISUAL | `isSystem`, `systemKey`, marker в editMode | MEDIUM | System page action bridge |
| Custom pages | MenuTree | YES | YES | VISUAL | `isCustom`, debug attrs; без page actions execution | HIGH | Page action bridge |
| Nested tree | MenuTree | YES | YES | VISUAL | Recursive render; `isExpanded`/`children`; collapse hides nested | MEDIUM | Tree state owner в provider |
| Icon rendering | MenuItem/IconRenderer | YES | YES | VISUAL | `AppSidebarIconRenderer`; temporary type map (AD-SHELL-002) | MEDIUM | Unified icon configuration |
| Upload icons | IconRenderer | YES | YES | VISUAL | Upload URL via meta; preserved | MEDIUM | AD-SHELL-002 |
| Collapse | LeftSidebar | YES | YES | VISUAL | `collapsed` + `onToggleCollapse` in contract; AD-SHELL-001 | MEDIUM | AppShellProvider collapse sync |
| Edit mode | LeftSidebar | YES | YES | VISUAL | `editMode`, `is-edit-mode`, edit affordances; **no-op** | CRITICAL | Edit mode bridge |
| Footer edit actions | LeftSidebar | YES | YES | VISUAL | `actions[]`: edit-menu, add-item, settings, menu-scale; kinds + capabilities | CRITICAL | Action execution contract |
| Actions rendering | LeftSidebar | YES | YES | VISUAL | hidden/disabled/kinds; `data-action-key`; **no execution** | CRITICAL | Action bridge |
| Capabilities visibility | LeftSidebar | YES | YES | VISUAL | `canEditMenu`, `canCreateItem`, `canOpenSettings`, `canScaleMenu` | LOW | Stable |
| Menu scale | LeftSidebar | YES | YES | VISUAL | CSS density var + label «Масштаб: XX%»; not shell width | MEDIUM | Preferences in provider |
| Drag/drop | MenuTree | YES | YES | VISUAL | Drag handle in editMode only; **no DnD engine** | CRITICAL | DnD integration |
| Disabled items | MenuItem | YES | YES | VISUAL | `disabled` class/state | LOW | Stable |
| Hidden items | MenuTree | YES | YES | VISUAL | hidden outside editMode; muted in editMode | MEDIUM | Stable |
| `level` indent | MenuTree | YES | YES | VISUAL | Indent in expanded mode only | LOW | Stable |
| Footer nav items | LeftSidebar | YES | YES | VISUAL | `footerActions[]` slot | MEDIUM | Parity tests |
| Dev preview | — | YES | YES | YES | `/dev/app-sidebar-renderer` — 5 panels | LOW | Extend parity tests |

---

# 6. Designer Sidebar — Functional Coverage Matrix

> **Phase 6.3:** Designer adapter + renderer mode accent (`--designer-accent`). Simpler preview tree by design.

| Feature | Current Owner | Required in AppShell | Covered by Contract | Covered by Renderer | Gap | Migration Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Sections | DesignerSidebar | YES | YES | VISUAL | Static menu via adapter | LOW | Dynamic menu source later |
| Active state | DesignerSidebar | YES | YES | VISUAL | `activeKey` → `active` on items | MEDIUM | Route-aware matching |
| Disabled state | DesignerSidebar | YES | PARTIAL | VISUAL | Adapter simplified (`disabled: false`) | LOW | Restore when Designer menu dynamic |
| Tenant-aware links | DesignerSidebar | YES | PARTIAL | VISUAL | Paths in contract; no router execution | HIGH | Tenant routing bridge |
| Collapse | DesignerShell | YES | YES | VISUAL | Same renderer; AD-SHELL-001 | MEDIUM | AppShellProvider |
| Mode identity | DesignerSidebar | YES | YES | VISUAL | `mode: designer`, purple accent class | LOW | Stable |
| Edit mode / DnD | DesignerSidebar | N/A | N/A | N/A | Not in Designer preview scope | LOW | Add when Designer menu editable |
| Dev preview | — | YES | YES | YES | Panels 4–5 in `/dev/app-sidebar-renderer` | LOW | Parity tests |

---

# 7. Runtime Header — Functional Coverage Matrix

> **Phase 6.4 (2026-05):** `AppHeaderRenderer` + adapters + `headerPreviewData.ts`. Visual/foundation only. Production `WorkspaceTopBar` не заменён.

| Feature | Current Owner | Required in AppShell | Covered by Contract | Covered by Renderer | Gap | Migration Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| AppModeSwitch | WorkspaceTopBar | YES | YES | VISUAL | `modeActions[]`; `canSwitchMode`; **no-op** | MEDIUM | Mode action bridge |
| Title/subtitle | WorkspaceTopBar | YES | YES | VISUAL | — | LOW | Stable |
| Editable title | WorkspaceTopBar | YES | YES | VISUAL | enabled/value/isEditing/placeholder/action keys; input + save/cancel; **no-op** | HIGH | Title edit bridge |
| Search | WorkspaceTopBar | YES | YES | VISUAL | value/placeholder/disabled/readOnly/clear; clear control; **no-op** | MEDIUM | Search bridge |
| Notifications | WorkspaceTopBar | YES | YES | VISUAL | unreadCount, badge 99+, disabled; **no live feed** | MEDIUM | Notification bridge |
| User avatar | WorkspaceTopBar | YES | YES | VISUAL | Static; **no-op** | LOW | Profile bridge later |
| Settings/save page edit | WorkspaceTopBar | YES | YES | VISUAL | `editMode` + settings icon swap; `is-edit-mode`; **no-op** | HIGH | Edit-mode bridge |
| Back button | WorkspaceTopBar | YES | YES | VISUAL | `leftActions`; **no-op** | LOW | Navigation bridge |
| Edit mode enter/exit | WorkspaceTopBar | YES | YES | VISUAL | `editMode.active`, action keys; **no execution** | CRITICAL | Edit-mode bridge |
| Page actions | WorkspaceTopBar | YES | YES | VISUAL | `pageActions[]`; kinds; `canUsePageActions`; **no-op** | HIGH | Page action bridge |
| left/right actions | WorkspaceTopBar | YES | YES | VISUAL | `leftActions`, filtered `rightActions`, `HeaderActionButton` | MEDIUM | Action bridge |
| Capabilities visibility | WorkspaceTopBar | YES | YES | VISUAL | canEditTitle, canSearch, canViewNotifications, canUsePageActions, canSwitchMode | LOW | Stable |
| Dev preview | — | YES | YES | YES | `/dev/app-header-renderer` — 5 panels via `headerPreviewData.ts` | LOW | Parity tests |

---

# 8. Designer Header — Functional Coverage Matrix

> **Phase 6.4:** Designer adapter + preview override for edit-mode panel.

| Feature | Current Owner | Required in AppShell | Covered by Contract | Covered by Renderer | Gap | Migration Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| AppModeSwitch | DesignerHeader | YES | YES | VISUAL | `modeActions`; designer accent | MEDIUM | Shared mode action bridge |
| TenantId | DesignerHeader | YES | PARTIAL | VISUAL | Tenant in contract meta; no live integration | MEDIUM | Tenant context in provider |
| User display | DesignerHeader | YES | YES | VISUAL | Avatar initials; **no-op** | LOW | Stable |
| Title/context | DesignerHeader | YES | YES | VISUAL | — | LOW | Stable |
| Search | DesignerHeader | YES | YES | VISUAL | `enabled: false` in adapter; placeholder preserved | LOW | Enable when Designer search ready |
| Edit mode (preview) | DesignerHeader | OPTIONAL | YES | VISUAL | Panel 5 in dev preview (contract override) | LOW | Designer edit parity later |
| Help/messages | DesignerHeader | OPTIONAL | PARTIAL | VISUAL | Not in foundation scope | LOW | Future shell actions |
| Dev preview | — | YES | YES | YES | Panels 4–5 in `/dev/app-header-renderer` | LOW | Parity tests |

---

# 9. AppShell migration status (Phase 6.5)

| Компонент / слой | Статус | Production |
|---|---|---|
| `AppSidebarRenderer` | **Foundation complete** (Phase 6.3) | **Not replaced** — dev preview only |
| `AppHeaderRenderer` | **Foundation complete** (Phase 6.4) | **Not replaced** — dev preview only |
| `sidebarAdapters` / `headerAdapters` | Contract mapping stable | Used by preview + future provider |
| Runtime shell | **Legacy production** | `LeftSidebar`, `WorkspaceTopBar`, `PortalLayout` |
| Designer shell | **Legacy production** | `DesignerSidebar`, `DesignerHeader`, `DesignerShell` |
| Feature flags (`shellFeatureFlags`) | **Unchanged** | Renderers not wired to production |
| Build | **Passing** | `npm run build` |

### Легенда покрытия

| Значение | Смысл |
|---|---|
| YES (contract) | Поле есть в `AppSidebarContract` / `AppHeaderContract` и adapters |
| VISUAL (renderer) | Renderer рисует UI по contract; действия **no-op** |
| NO | Не реализовано |

---

# 10. No-op limitations (foundation layer)

Следующее **намеренно не реализовано** в renderers (Phase 6.3 / 6.4):

| Область | Ограничение |
|---|---|
| Sidebar actions | `data-action-key` only; click → preventDefault; no handlers |
| Sidebar navigation | `href` / paths — display; no router integration |
| Sidebar DnD | Drag handle visual only; no reorder persistence |
| Sidebar collapse | `onToggleCollapse` from contract; production state not owned by renderer |
| Header actions | All buttons/inputs no-op or readOnly/disabled-safe |
| Header search | No query execution, no debounce, no results |
| Header notifications | Badge count display only; no API/panel |
| Header editable title | Input display only; no save/cancel execution |
| Header edit mode | Visual `is-edit-mode` + icons; no page save |

**Правило:** renderer ≠ state owner ≠ action executor.

---

# 11. Blockers before production replacement

Следующие пункты **блокируют** замену `LeftSidebar` / `WorkspaceTopBar` / `DesignerHeader`:

| # | Blocker | Зона |
|---|---|---|
| 1 | **AppShellProvider** / canonical shell state owner | Shared (shadow runtime route wired, production wiring pending) |
| 2 | **Action execution contract** (dispatch, keys, payloads) | Shared |
| 3 | **Routing / action bridge** (sidebar nav, header back, mode switch) | Runtime + Designer |
| 4 | **Edit mode bridge** (page/menu edit enter/exit/save) | Runtime |
| 5 | **Notification bridge** (live count, panel, read state) | Runtime |
| 6 | **Search bridge** (controlled value, clear, submit) | Runtime |
| 7 | **Collapse state synchronization** (AD-SHELL-001) | Runtime + Designer |
| 8 | **Drag/drop integration** (menu tree reorder) | Runtime sidebar |
| 9 | **Runtime parity tests** (visual + behavioral vs legacy) | QA (diagnostics baseline now available in `/dev/appshell-shadow-runtime`) |
| 10 | **Designer parity tests** | QA |
| 11 | **Rollback strategy** (flag off → legacy shell instant) | Ops |

### CRITICAL functional gaps (после visual foundation)

| Gap | Причина |
|---|---|
| Action execution | Без bridge все controls — декорация |
| AppShellProvider | Collapse/active/edit state размазан |
| Navigation integration | Потеря корректной навигации при замене |
| DnD tree | Потеря структуры меню |
| Live search/notifications | Потеря рабочих flows |

---

# 12. Что можно безопасно подключать behind feature flag

## Safe

| Компонент | Статус |
|---|---|
| AppSidebarRenderer visual shell | SAFE |
| AppHeaderRenderer visual shell | SAFE |
| Collapse sync | SAFE |
| Runtime/Designer shell identity | SAFE |
| Unified layout testing | SAFE |
| Accent/mode switching | SAFE |

---

# 13. Что нельзя подключать как replacement

## Unsafe (явный запрет)

| Действие | Причина |
|---|---|
| **Do not replace `LeftSidebar` yet** | Нет action/DnD/navigation bridge |
| **Do not replace `WorkspaceTopBar` yet** | Нет search/notification/edit bridges |
| **Do not replace `DesignerHeader` yet** | Нет Designer parity tests |
| Connect real actions inside renderers | Нарушает foundation layer; coupling |
| Make renderer own shell state | Должен владеть AppShellProvider |
| Move Runtime/Designer routing into renderer | Router остаётся в shell owners |
| Full Runtime Sidebar replacement | Нет behavioral parity |
| Full Runtime Header replacement | Нет edit/action parity |
| Runtime tree management without DnD bridge | Потеря структуры меню |

---

# 14. Safe next steps (recommended roadmap)

| Phase | Название | Цель |
|---|---|---|
| **6.6** | AppShellProvider design | **DONE (design + skeleton)** — см. YASNOPRO_APPSHELL_PROVIDER_DESIGN.md |
| **6.7** | Action bridge design | **DONE (design + safe skeleton)** — см. YASNOPRO_APPSHELL_ACTION_BRIDGE_DESIGN.md |
| **6.8** | Shadow Integration design / dev-only shadow mode | **DONE (design + safe skeleton)** — см. YASNOPRO_APPSHELL_SHADOW_MODE_DESIGN.md |
| **6.9** | Production replacement readiness review | **DONE** — NO-GO (see YASNOPRO_APPSHELL_PRODUCTION_REPLACEMENT_READINESS_REVIEW.md) |

**Следующий этап:** Phase **6.17 Cross-mode Parity Revalidation** — без замены production shell.

### Completed foundation phases

| Phase | Deliverable | Status |
|---|---|---|
| 6.3 | Sidebar contract + renderer visual parity | DONE |
| 6.4 | Header contract + renderer visual parity | DONE |
| 6.5 | Coverage matrix + migration docs | DONE |
| 6.6 | AppShellProvider design + skeleton (`shared/shell/provider/`) | DONE (not in production) |
| 6.7 | Action bridge design + skeleton (`shared/shell/actions/`) | DONE (not in production) |
| 6.8 | Shadow mode design + diagnostics skeleton (`shared/shell/shadow/`) | DONE (not in production) |
| 6.9 | Production replacement readiness review | DONE — **NO-GO** |
| 6.10 | Dev-only shadow runtime wiring (`/dev/appshell-shadow-runtime`) | DONE — DEV-only, observer-only |
| 6.11 | Dev-only real runtime snapshot probe (same route) | DONE — real snapshot when sources readable, fallback `unavailable` with reason |
| 6.12 | Runtime Shadow Bridge (DEV-only, read-only emitter/registry/subscribe) | DONE — sourceMode `bridge` + diagnostics freshness/missing fields |
| 6.13 | Runtime/Shadow Parity Validation (DEV-only) | DONE — checklist statuses + parityStatus (`pass/partial/fail`) |
| 6.14 | Designer/Shadow Parity Validation (DEV-only) | DONE — route `/dev/appshell-shadow-designer` + designerParityStatus/check arrays |
| 6.15 | Cross-mode Shadow Readiness Review | DONE — consolidated runtime+designer parity checkpoint, NO-GO retained |
| 6.16 | Designer Shadow Bridge (DEV-only, read-only) | DONE — sourceMode `bridge` for `/dev/appshell-shadow-designer` with fallback `mock/unavailable` |

### Go / No-Go summary (Phase 6.9)

| Item | Status |
|---|---|
| Decision | **NO-GO** |
| Provider wired to shadow runtime-like sources | YES (DEV route only) |
| Provider wired to conditional real runtime snapshot sources (DEV route) | PARTIAL (read-only hooks/api, isolated route constraints) |
| Provider wired to readonly runtime bridge snapshot sources (DEV route) | YES (observer-only bridge transport) |
| Provider wired to production runtime sources | NO |
| Action handlers implemented | NO |
| Routing bridge implemented | NO |
| Runtime parity validated | NO |
| Designer parity validated | NO |
| AD-SHELL-001 closed | NO |
| Rollback tested | NO |

### Blocker #3 status (Shadow integration baseline)

| Aspect | Phase 6.8 |
|---|---|
| Design spec | **Complete** — YASNOPRO_APPSHELL_SHADOW_MODE_DESIGN.md |
| Skeleton code | **Complete** — shadow provider + diagnostics + dev-only flag reader |
| Production wiring | **Not started** — no imports in PortalLayout/DesignerShell |
| User-facing impact | **None** — DEV-only, explicit flag |

### Blocker #2 status (Action execution contract / bridge)

| Aspect | Phase 6.7 |
|---|---|
| Design spec | **Complete** — YASNOPRO_APPSHELL_ACTION_BRIDGE_DESIGN.md |
| Skeleton code | **Complete** — registry + bridge + keys + types |
| Production wiring | **Not started** — blocked until 6.8 shadow |
| Closes runtime/header no-op | **No** — renderers still intentionally no-op in production |

### Blocker #1 status (AppShellProvider)

| Aspect | Phase 6.6 |
|---|---|
| Design spec | **Complete** — YASNOPRO_APPSHELL_PROVIDER_DESIGN.md |
| Skeleton code | **Complete** — not imported by layouts |
| Production wiring | **Not started** — blocked until 6.7–6.8 |
| Closes AD-SHELL-001 | **No** — collapse still via `useShellSidebarState` in production |

---

# 15. AppShell migration rule

## Golden Rule

```text
Сначала contracts покрывают функциональность.
Потом renderer поддерживает функциональность.
Только потом старые shell-компоненты заменяются.