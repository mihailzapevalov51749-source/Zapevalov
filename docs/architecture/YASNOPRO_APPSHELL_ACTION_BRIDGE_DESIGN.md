# YASNOPRO_APPSHELL_ACTION_BRIDGE_DESIGN

## Статус документа

| Поле | Значение |
|---|---|
| Документ | YASNOPRO_APPSHELL_ACTION_BRIDGE_DESIGN |
| Фаза | 6.7 — design + safe skeleton |
| Статус | DRAFT |
| Production | **Not connected** |
| Связанные документы | YASNOPRO_APPSHELL_PROVIDER_DESIGN.md, YASNOPRO_APPSHELL_FUNCTIONAL_COVERAGE_MATRIX.md |
| Следующая фаза | **6.8 — Shadow integration design / dev-only shadow mode** |

---

## 1. Purpose

Определить AppShell Action Bridge как слой, который связывает `data-action-key` из shell contracts с безопасным, проверяемым dispatch-пайплайном.

Bridge нужен для:

- устранения no-op деградации в будущем (без изменения renderers);
- единого registry для Runtime/Designer actions;
- capability/mode/payload guards перед выполнением handler;
- диагностируемого поведения при ошибках, blocked/missing actions.

---

## 2. Problem

На Phase 6.6:

- `AppSidebarRenderer` и `AppHeaderRenderer` уже имеют `data-action-key`;
- provider умеет локальные state actions;
- но отсутствует стандартизованный bridge для не-локальных action intent.

Итог: actions остаются декоративными, а интеграция рискует разрастись ad-hoc handlers по layout-компонентам.

---

## 3. Scope

### In scope

- taxonomy action groups;
- naming convention `domain.area.intent`;
- registry API: register/unregister/dispatch/has;
- dispatch pipeline + checks;
- context payload schema;
- runtime/designer/routing/api bridge boundaries;
- safe skeleton files в `shared/shell/actions/*`.

### Out of scope

- подключение к `PortalLayout` / `DesignerShell`;
- реальный routing/API side effects;
- изменение renderers/adapters/feature flags;
- production wiring.

---

## 4. Non-goals

Action Bridge **не**:

- исполняет router/API напрямую в Phase 6.7 skeleton;
- заменяет state owner (это `AppShellProvider`);
- хранит business data/page content;
- встраивается в production flows.

---

## 5. Action taxonomy

### Sidebar actions

- `shell.sidebar.toggleCollapse`
- `shell.sidebar.enterEditMode`
- `shell.sidebar.exitEditMode`
- `shell.sidebar.addItem`
- `shell.sidebar.openSettings`
- `shell.sidebar.changeMenuScale`
- `shell.sidebar.toggleItemExpanded`
- `shell.sidebar.openItem`
- `shell.sidebar.dragItem`

### Header actions

- `shell.header.goBack`
- `shell.header.editTitle`
- `shell.header.saveTitle`
- `shell.header.cancelTitle`
- `shell.header.search`
- `shell.header.clearSearch`
- `shell.header.openNotifications`
- `shell.header.enterEditMode`
- `shell.header.exitEditMode`
- `shell.header.savePage`
- `shell.header.openSettings`
- `shell.header.switchMode`

### System actions

- `shell.mode.switchToRuntime`
- `shell.mode.switchToDesigner`
- `shell.route.openPage`
- `shell.route.openDesignerObject`
- `shell.notification.open`
- `shell.search.submit`

---

## 6. Action key naming convention

Формат:

```text
domain.area.intent
```

Примеры:

- `shell.sidebar.addItem`
- `shell.header.saveTitle`
- `shell.route.openPage`
- `designer.objectType.open`
- `runtime.page.open`

Запрещено:

- random strings (`"click1"`, `"foo"`),
- component-local names (`"headerEditBtn"`),
- API endpoint names как action key (`"/api/page/save"`),
- router paths как action key (`"/designer/object-types/12"`).

Legacy keys допускаются только через alias-normalization в bridge (transitional compatibility).

---

## 7. Action registry model

Skeleton API:

```ts
registerAction(actionKey, handler, options?)
unregisterAction(actionKey)
dispatchAction(actionKey, payload?, meta?)
hasAction(actionKey)
```

Handler signature:

```ts
async function handler(ctx) {
  // ctx: actionKey, payload, meta, state, sources, capabilities
}
```

Registry хранит:

- action key,
- handler,
- options (`enabled`, `modes`, `requiredCapabilities`, `validatePayload`, `description`).

---

## 8. Dispatch pipeline

```text
Renderer click
→ data-action-key
→ renderer calls onAction / callback (future)
→ AppShellProvider.dispatchAction
→ Action Bridge normalize + guard checks
→ registry lookup
→ bridge handler
→ result / error
→ DEV diagnostics
```

Важно: на текущем этапе renderers остаются no-op; пайплайн зафиксирован как target behavior.

---

## 9. Context payload model

`ctx` для handler:

| Поле | Описание |
|---|---|
| `actionKey` | canonical normalized key |
| `payload` | action payload (opaque) |
| `meta` | source, traceId, timestamp, reason |
| `state` | текущий `AppShellState` snapshot |
| `sources` | текущие `AppShellSources` snapshot |
| `capabilities` | `state.capabilities` |

`dispatchAction` возвращает `AppShellActionResult`:

- `ok: boolean`
- `status: handled \| missing \| blocked \| invalid_payload \| error \| noop`
- `reason?: string`

---

## 10. Runtime bridge

Runtime bridge в Phase 6.8+:

- регистрирует handlers для runtime-only actions;
- связывает `shell.header.*`, `shell.sidebar.*`, `shell.route.openPage`;
- использует routing/api bridges (не renderer).

Phase 6.7 skeleton: только registry entry points без реального подключения.

---

## 11. Designer bridge

Designer bridge в Phase 6.8+:

- регистрирует handlers для designer mode;
- обрабатывает `shell.mode.switchToRuntime`, `shell.route.openDesignerObject`;
- применяет mode/capability guards.

Phase 6.7 skeleton: интерфейс и taxonomy, без исполнения.

---

## 12. Routing bridge

Routing bridge отделён от action bridge:

- Action bridge → intent validation/dispatch
- Routing bridge → реальный `navigate`

Ключи route-группы:

- `shell.route.openPage`
- `shell.route.openDesignerObject`
- `runtime.page.open`
- `designer.objectType.open`

Action bridge не импортирует router API в skeleton.

---

## 13. API bridge

API bridge обрабатывает side effects (future):

- search submit,
- notifications open/read,
- page save/title save.

Phase 6.7:

- API bridge не реализуется;
- action handlers могут быть зарегистрированы как stub/no-op для dev diagnostics.

---

## 14. Error handling

Результаты dispatch:

- `missing`: handler не зарегистрирован;
- `blocked`: capability/mode/enabled guard failed;
- `invalid_payload`: validation или naming convention fail;
- `error`: exception внутри handler.

Поведение:

- не падать в runtime UI;
- возвращать structured result;
- DEV diagnostics в консоль.

---

## 15. Dev diagnostics

DEV-only logs:

- invalid key format,
- missing handler,
- blocked action + reason,
- handled action,
- handler exception.

Диагностика выключается в production build.

---

## 16. Security / capability checks

Перед handler call bridge обязан проверить:

1. action exists;
2. action enabled (`options.enabled !== false`);
3. capability allows (`requiredCapabilities`);
4. mode allows (`options.modes`);
5. payload valid (`validatePayload`).

Если любой check не проходит — `status = blocked | invalid_payload`.

---

## 17. Rollback strategy

Phase 6.7 безопасен по умолчанию:

- bridge skeleton не подключён к production;
- неизвестные keys → no-op result + DEV debug;
- отключение bridge = возврат к текущему provider stub dispatch.

Rollback не требует миграции данных.

---

## 18. Migration phases

| Phase | Статус | Результат |
|---|---|---|
| 6.6 | DONE | AppShellProvider design + skeleton |
| **6.7** | **DONE (design + safe skeleton)** | Action taxonomy, registry, dispatch guards |
| 6.8 | NEXT | Shadow integration design + dev-only shadow mode |
| 6.9 | PLANNED | Production replacement readiness review |

---

## 19. Definition of Done

### Done for Phase 6.7

- [x] Отдельный action bridge design document.
- [x] Формальная taxonomy для sidebar/header/system actions.
- [x] Naming convention и explicit запреты.
- [x] Skeleton registry + bridge + types + keys.
- [x] No production wiring, no router/API execution.
- [x] Build passes.

### Not done (next phases)

- [ ] Runtime/Designer handler registration from layouts.
- [ ] Routing/API bridges implementation.
- [ ] Shadow mode runtime validation.
- [ ] Parity test suite and go/no-go checklist.
