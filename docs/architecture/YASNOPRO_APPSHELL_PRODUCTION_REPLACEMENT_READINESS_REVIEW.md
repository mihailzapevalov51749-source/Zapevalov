# YASNOPRO_APPSHELL_PRODUCTION_REPLACEMENT_READINESS_REVIEW

## 1. Executive summary

Phase 6.9 review завершён как архитектурная проверка готовности замены production shell.

**Решение:** **NO-GO** для production replacement на текущем этапе.

Основание: foundation (6.3–6.8) создана, но интеграционные и parity-критерии не выполнены.

---

## 2. Current migration status

| Track | Статус |
|---|---|
| 6.3 Sidebar renderer | DONE (visual foundation) |
| 6.4 Header renderer | DONE (visual foundation) |
| 6.6 AppShellProvider | DONE (design + skeleton) |
| 6.7 Action Bridge | DONE (design + skeleton) |
| 6.8 Shadow mode | DONE (design + skeleton) |
| 6.9 Readiness review | DONE (this document) |
| 6.10 Dev-only shadow runtime wiring | DONE (dev route + diagnostics baseline) |
| 6.11 Dev-only real runtime snapshot probe | DONE (mock/real toggle + unavailable fallback) |
| 6.12 Runtime Shadow Bridge | DONE (readonly emitter + bridge source mode) |
| 6.13 Runtime/Shadow parity validation | DONE (checklist panel + parity status model) |
| 6.14 Designer/Shadow parity validation | DONE (designer checklist route + status model) |
| 6.15 Cross-mode shadow readiness review | DONE (consolidated NO-GO checkpoint) |
| 6.16 Designer Shadow Bridge | DONE (readonly designer emitter + bridge source mode) |

---

## 3. Completed phases

| Phase | Result | Production impact |
|---|---|---|
| 6.3 | `AppSidebarRenderer` functional visual support | None |
| 6.4 | `AppHeaderRenderer` functional visual support | None |
| 6.5 | Coverage/status/debt docs update | None |
| 6.6 | `shared/shell/provider/*` skeleton | None |
| 6.7 | `shared/shell/actions/*` skeleton | None |
| 6.8 | `shared/shell/shadow/*` skeleton | None |
| 6.10 | `/dev/appshell-shadow-runtime` + shadow preview wiring | None |
| 6.11 | conditional real runtime snapshot read in same dev route | None |
| 6.12 | `shared/shell/shadow/runtime/*` bridge + DEV emitters | None |
| 6.13 | parity checklist diagnostics + validation report doc | None |
| 6.14 | designer parity diagnostics + dedicated validation report doc | None |
| 6.15 | cross-mode shadow readiness review document | None |
| 6.16 | `shared/shell/shadow/designer/*` bridge + DEV-only designer emitter | None |

---

## 4. Production components still active

| Zone | Production component |
|---|---|
| Runtime sidebar | `LeftSidebar` |
| Runtime header | `WorkspaceTopBar` |
| Designer header | `DesignerHeader` |
| Designer sidebar | `DesignerSidebar` / Designer shell sidebar |
| Runtime layout owner | `PortalLayout` |
| Designer layout owner | `DesignerShell` |

---

## 5. Foundation components created

| Layer | Components |
|---|---|
| Sidebar renderer | `shared/shell/sidebar/*` |
| Header renderer | `shared/shell/header/*` |
| Provider | `shared/shell/provider/*` |
| Action bridge | `shared/shell/actions/*` |
| Shadow mode | `shared/shell/shadow/*` |

Все перечисленные компоненты не подключены к production layouts.

---

## 6. Functional coverage summary

Краткий итог покрытия:

- Sidebar contract/renderer: high visual coverage (edit mode, actions, capabilities, tree, menuScale).
- Header contract/renderер: high visual coverage (editable title, search, notifications, actions, capabilities).
- Execution layer: отсутствует в production.
- Routing/API bridges: отсутствуют.
- Parity (runtime/designer): не подтверждён тестами.

---

## 7. Known no-op areas

| Area | Current behavior |
|---|---|
| Sidebar action keys | visual only / no handler execution |
| Header actions | visual only / no handler execution |
| Search | no submit/debounce/results |
| Notifications | badge only, no panel integration |
| Edit mode actions | visual flags only |
| Drag/drop | visual handles only |

---

## 8. Open blockers

| # | Blocker | Status |
|---|---|---|
| 1 | Provider wired to readonly runtime/designer bridge snapshots in dev routes; production ownership still missing | PARTIAL |
| 2 | Action handlers not implemented | OPEN |
| 3 | Routing bridge not implemented | OPEN |
| 4 | Runtime parity not validated | OPEN |
| 5 | Designer parity not validated | OPEN |
| 6 | AD-SHELL-001 collapse sync issue | OPEN |
| 7 | Rollback scenario not tested end-to-end | OPEN |

---

## 9. Runtime parity checklist

| Check | Status |
|---|---|
| Sidebar item count parity | NOT VERIFIED |
| Active item/page parity | NOT VERIFIED |
| Hidden/system/custom behavior parity | NOT VERIFIED |
| Header title/edit/search parity | NOT VERIFIED |
| Notification behavior parity | NOT VERIFIED |
| Collapse behavior parity | NOT VERIFIED |
| Geometry offsets parity | NOT VERIFIED |
| Navigation flow parity | NOT VERIFIED |

---

## 10. Designer parity checklist

| Check | Status |
|---|---|
| Sidebar sections/active state parity | NOT VERIFIED |
| Header mode/search/profile parity | NOT VERIFIED |
| Collapse behavior parity | NOT VERIFIED |
| Designer route mapping parity | NOT VERIFIED |
| Geometry/spacing parity | NOT VERIFIED |

---

## 11. Risk assessment

| Risk | Level | Notes |
|---|---|---|
| Premature replacement | CRITICAL | high regression risk without parity |
| Navigation regression | HIGH | routing bridge absent |
| Edit/search/notification regression | HIGH | handlers absent |
| Collapse instability | MEDIUM | AD-SHELL-001 unresolved |
| Rollback failure | HIGH | not validated |

---

## 12. Rollback strategy

Текущая стратегия существует только на уровне design:

- legacy shell остаётся default;
- foundation stack не подключён к production;
- rollback path не проверен на integrated scenario.

Требуется отдельная проверка rollback в Phase 6.10+.

---

## 13. Required tests before replacement

Минимум до GO:

1. Runtime shadow parity suite (manual + automated smoke)
2. Designer shadow parity suite
3. Routing bridge integration tests
4. Action handler contract tests
5. Collapse sync regression tests (AD-SHELL-001 close criteria)
6. Rollback dry-run and failback verification
7. Build + bundle + dev/prod behavior checks with flags matrix

---

## 14. Go / No-Go decision

**Current decision: NO-GO for production replacement.**

Причины:

- Provider подключён к DEV-only readonly runtime bridge sources (production ownership отсутствует).
- Action handlers не реализованы.
- Routing bridge не реализован.
- Runtime parity не подтверждён.
- Designer parity не подтверждён.
- Collapse sync production bug AD-SHELL-001 не закрыт.
- Rollback не протестирован.

---

## 15. Recommended next phase

**Phase 6.17 — Cross-mode Parity Revalidation**

Цель:

выполнить повторную runtime+designer parity валидацию на live bridge источниках, зафиксировать статус `NOT VERIFIED` → `VERIFIED` (или mismatch backlog), затем обновить NO-GO checkpoint.
