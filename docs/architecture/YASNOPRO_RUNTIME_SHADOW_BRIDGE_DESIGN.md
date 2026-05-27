# YASNOPRO_RUNTIME_SHADOW_BRIDGE_DESIGN

## 1. Purpose

Зафиксировать стабильный DEV-only Runtime Shadow Bridge для read-only передачи runtime snapshot в `AppShellShadowProvider` без вмешательства в production shell.

## 2. Problem

После 6.11 real snapshot получался нестабильно из изолированного dev route через прямые чтения hooks/api. Это не гарантирует полноту данных и не отражает фактическое состояние legacy runtime в момент рендера.

## 3. Scope

In scope:

- read-only snapshot schema для runtime;
- bridge transport через readonly emitter + registry + subscribe;
- DEV-only emitter из runtime owner-компонентов;
- интеграция shadow preview с bridge source mode.

Out of scope:

- production replacement;
- action execution/routing interception;
- изменение ownership runtime state.

## 4. Non-goals

Bridge не:

- заменяет `LeftSidebar` или `WorkspaceTopBar`;
- делает `AppShellProvider` owner production state;
- вызывает mutation API;
- перехватывает navigation.

## 5. Runtime snapshot model

Базовый контракт snapshot:

```json
{
  "mode": "runtime",
  "pathname": "/portal/1/page/1",
  "portal": {},
  "page": {},
  "user": {},
  "navigation": [],
  "activePageId": 1,
  "activeItemId": 123,
  "collapsed": false,
  "search": { "enabled": true, "value": "" },
  "notifications": { "enabled": true, "unreadCount": 0 },
  "geometry": {
    "sidebarWidth": 220,
    "workspaceLeftOffset": 220,
    "workspaceTopOffset": 0
  },
  "timestamp": 0
}
```

Snapshot всегда read-only и используется только как observer-input для shadow diagnostics/contract generation.

## 6. Bridge transport model

Transport: глобальный DEV-only readonly registry.

- `emitRuntimeShadowSnapshot(patch)` — публикует patch snapshot;
- bridge делает merge с latest snapshot;
- bridge хранит latest immutable snapshot;
- `subscribeRuntimeShadowSnapshot(cb)` — подписка/отписка;
- `getLatestRuntimeShadowSnapshot()` — pull-read для initial state.

## 7. Read-only guarantees

- snapshot deep-clone + deep-freeze перед сохранением;
- bridge не экспортирует mutation API;
- подписчики получают immutable snapshot;
- bridge не пишет в runtime state/router/store.

## 8. Runtime source ownership

- `PortalPageView` остаётся owner runtime page-level state и публикует core snapshot fields;
- `WorkspaceTopBar` публикует read-only patch по search/notifications/user;
- bridge только агрегирует snapshot, ownership не меняется.

## 9. Snapshot lifecycle

1. Runtime owner обновляет локальное состояние.
2. DEV-only emitter публикует snapshot patch.
3. Bridge merge + freeze + timestamp.
4. Shadow preview subscriber получает latest snapshot.
5. `AppShellShadowProvider` строит contracts/diagnostics.

## 10. Dev-only integration model

- Интеграция активна только при `import.meta.env.DEV`;
- Только route `/dev/appshell-shadow-runtime` использует bridge как source;
- fallback: `sourceMode = unavailable` + reason при отсутствии полноценного snapshot.

## 11. Diagnostics model

Diagnostics должны показывать:

- `sourceMode`: `bridge | mock | unavailable`;
- `snapshotAgeMs`;
- `lastUpdateTime`;
- `sourceFreshness` (`fresh | stale | expired | unknown`);
- `missingFields`;
- `runtimeParityWarnings`.

## 12. Safety constraints

Обязательные ограничения:

1. read-only only;
2. no runtime mutations;
3. no routing execution;
4. no action execution;
5. no production ownership;
6. no production replacement.

## 13. Rollback strategy

- Удалить/отключить DEV emitter вызовы;
- shadow preview автоматически вернётся к `mock/unavailable`;
- production runtime продолжит работать без изменений.

## 14. Migration phases

| Phase | Статус | Результат |
|---|---|---|
| 6.10 | DONE | Dev-only shadow runtime route |
| 6.11 | DONE | Mock/real source switch + unavailable fallback |
| 6.12 | DONE | Runtime Shadow Bridge (readonly emitter + registry + subscribe) |
| 6.13 | NEXT | Runtime/Shadow parity validation |

## 15. Definition of Done

- [x] Bridge transport реализован в `shared/shell/shadow/runtime/*`;
- [x] Snapshot schema формализована;
- [x] Runtime emitter только DEV-only/read-only;
- [x] Shadow preview читает real source через bridge;
- [x] Diagnostics расширены freshness/missing/parity warnings;
- [x] Production shell не заменён.
