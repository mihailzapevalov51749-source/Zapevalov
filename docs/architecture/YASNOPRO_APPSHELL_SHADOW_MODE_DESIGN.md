# YASNOPRO_APPSHELL_SHADOW_MODE_DESIGN

## 1. Purpose

Определить безопасный **dev-only shadow mode** для AppShell, где новый `AppShellProvider` и bridge собирают contracts/diagnostics рядом с legacy shell без влияния на production UX.

---

## 2. Problem

После Phase 6.6/6.7 есть provider и action bridge skeleton, но нет формального режима сравнения с legacy shell перед production replacement.

Без shadow mode:

- сложно валидировать parity contracts против legacy inputs;
- сложно безопасно отладить capability/action mismatches;
- высокий риск преждевременного replacement.

---

## 3. Scope

In scope:

- определение shadow mode и safety constraints;
- dev-only flag policy;
- read-only data mirroring model;
- contract comparison diagnostics;
- runtime/designer shadow strategies;
- optional dev-only skeleton (`shared/shell/shadow/*`) без production wiring.

Out of scope:

- замена production shell;
- real action execution;
- routing interception;
- изменение feature flag поведения в production.

---

## 4. Non-goals

Shadow mode **не**:

- рендерит production UI вместо legacy shell;
- перехватывает runtime/designer navigation;
- исполняет API/router actions;
- меняет state legacy shell;
- включается по умолчанию в production.

---

## 5. Shadow mode definition

**Shadow mode** = режим, в котором новый AppShell stack работает параллельно с legacy shell:

- получает read-only snapshot входов;
- собирает `sidebarContract` и `headerContract`;
- собирает diagnostics;
- не влияет на видимый production flow.

Формула:

```text
Legacy shell (source of truth) + Shadow AppShell (observer + diagnostics)
```

---

## 6. Dev-only feature flag

Предлагаемый отдельный flag:

`yasnopro:dev:appshell-shadow`

Правила:

- не является replacement flag;
- активен только в `import.meta.env.DEV` или на explicit dev route;
- не меняет `shellFeatureFlags.ts` production behavior;
- без flag shadow полностью выключен.

---

## 7. Data mirroring model

Shadow получает read-only snapshot:

- `mode`
- `collapsed`
- `active route/page`
- `portal/page/user`
- `navigation items`
- `header inputs`
- `sidebar inputs`
- `capabilities`

Shadow строит:

- `sidebarContract`
- `headerContract`
- `diagnostics`

Snapshot источник: legacy layouts/page controllers. Shadow никогда не владеет business payloads.

---

## 8. Contract comparison model

Минимальный compare checklist:

- item count (legacy vs contract sections/items)
- active item/page consistency
- hidden item handling
- system/custom markers presence
- page title mapping
- search availability state
- notification availability state
- mode actions visibility
- collapse state parity
- geometry offsets (`sidebarWidth`, `workspaceLeftOffset`, `workspaceTopOffset`)

Результат compare:

- `ok | warning | mismatch`
- reason/details
- mode/runtime-designer scope

---

## 9. Runtime shadow strategy

- Legacy Runtime shell остаётся основным (`LeftSidebar`, `WorkspaceTopBar`).
- Shadow provider читает snapshot и собирает contracts отдельно.
- Renderer shadow может быть показан только на dev route/debug panel.
- В production runtime никаких shadow clicks/handlers.

---

## 10. Designer shadow strategy

- Legacy Designer shell остаётся основным (`DesignerSidebar`, `DesignerHeader`).
- Shadow provider работает как observer only.
- Shadow renderer/diagnostics — только dev route/panel.
- Нет влияния на Designer navigation/state.

---

## 11. Diagnostics model

Diagnostics должны включать:

- snapshot timestamp + mode
- contract hashes/summary
- compare checklist results
- missing/blocked action keys (из action bridge)
- capability denials
- key normalization warnings

Output:

- console debug (DEV),
- optional in-page diagnostics panel (DEV only),
- no telemetry side effects in production.

---

## 12. Safety constraints

Обязательные ограничения:

1. Shadow not mounted in production by default.
2. No writes to legacy state (read-only mirroring only).
3. No routing/API execution.
4. No replacement of legacy shell components.
5. No feature flag behavior changes for production flags.
6. Hard off-switch via dev flag removal.

---

## 13. Rollback strategy

Rollback для 6.8:

- выключить `yasnopro:dev:appshell-shadow`;
- удалить/не рендерить shadow panel;
- legacy shell продолжает работать как до 6.8.

Данные не мигрируются, production unaffected.

---

## 14. Migration phases

| Phase | Статус | Результат |
|---|---|---|
| 6.6 | DONE | AppShellProvider design + skeleton |
| 6.7 | DONE | Action bridge design + skeleton |
| **6.8** | **DONE (design + optional dev skeleton)** | Shadow mode policy + diagnostics skeleton |
| **6.9** | NEXT | Production Replacement Readiness Review |

---

## 15. Definition of Done

Phase 6.8 считается завершённой, если:

- [x] Shadow mode design документ утверждён;
- [x] Dev-only flag policy зафиксирована (`yasnopro:dev:appshell-shadow`);
- [x] Data mirroring model описан;
- [x] Contract comparison checklist описан;
- [x] Runtime/Designer shadow strategies описаны;
- [x] Optional shadow skeleton не подключён к production;
- [x] Build проходит.

Не входит в 6.8:

- production replacement;
- real action execution;
- routing/api bridge integration.
