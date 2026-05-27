# YASNOPRO_DESIGNER_SHADOW_BRIDGE_DESIGN

## 1. Purpose

Определить DEV-only read-only bridge для передачи snapshot из legacy Designer shell в AppShell shadow diagnostics без production replacement.

## 2. Problem

До 6.16 designer parity в основном опирался на mock/designer-like snapshot. Это ограничивало доказательность parity readiness и создавало разрыв fidelity между runtime и designer tracks.

## 3. Scope

In scope:

- designer snapshot contract;
- bridge transport (`emit/get/subscribe`);
- DEV-only readonly emitter из legacy Designer shell;
- интеграция `/dev/appshell-shadow-designer` с bridge source.

Out of scope:

- замена `DesignerShell` / `DesignerHeader`;
- вмешательство в Designer routing/navigation;
- real actions/API calls.

## 4. Non-goals

Bridge не:

- назначает `AppShellProvider` owner production Designer state;
- изменяет legacy Designer behavior;
- включает production feature flags.

## 5. Designer snapshot model

```json
{
  "mode": "designer",
  "pathname": "/designer/tenant/1/object-types",
  "activeItemId": "designer-objects",
  "activeDesignerObjectId": "123",
  "collapsed": false,
  "navigation": [],
  "header": {
    "title": "Типы объектов",
    "subtitle": "Режим аналитика",
    "modeActions": [],
    "pageActions": []
  },
  "capabilities": {},
  "geometry": {
    "sidebarWidth": 220,
    "workspaceLeftOffset": 0,
    "workspaceTopOffset": 0
  },
  "timestamp": 0
}
```

## 6. Bridge transport model

Transport по аналогии с runtime bridge:

- `emitDesignerShadowSnapshot(patch)`
- `getLatestDesignerShadowSnapshot()`
- `getDesignerShadowBridgeMeta()`
- `subscribeDesignerShadowSnapshot(cb)`

Bridge хранит latest immutable snapshot в DEV-only registry.

## 7. Read-only guarantees

- deep-clone + deep-freeze каждого обновления;
- subscribe API выдаёт только readonly snapshot;
- bridge не содержит mutation API;
- no routing/action execution.

## 8. Designer source ownership

- Legacy `DesignerShell` остаётся source of truth для visual shell state;
- bridge только читает и публикует snapshot;
- shadow route только наблюдатель/диагностика.

## 9. Snapshot lifecycle

1. Legacy Designer state обновляется.
2. DEV-only emitter публикует snapshot patch.
3. Bridge merge + freeze + timestamp.
4. Shadow preview читает latest snapshot через subscribe.
5. Diagnostics/parity checks пересчитываются.

## 10. Dev-only integration model

- активен только при `import.meta.env.DEV`;
- route `/dev/appshell-shadow-designer` использует sourceMode `bridge | mock | unavailable`;
- fallback на mock при отсутствии/неполноте bridge snapshot.

## 11. Diagnostics model

Designer diagnostics должны показывать:

- `sourceMode`, `sourceReason`;
- `snapshotAgeMs`, `lastUpdateTime`, `sourceFreshness`;
- `missingFields`;
- `designerParityStatus` и check arrays.

## 12. Safety constraints

1. read-only observer only;
2. no Designer state mutations;
3. no navigation/routing execution;
4. no action execution;
5. no production replacement;
6. no production feature flag behavior changes.

## 13. Rollback strategy

- отключить DEV emitter/import в Designer shell;
- shadow route автоматически уходит в `mock/unavailable`;
- production Designer shell продолжает работать без изменений.

## 14. Migration phases

| Phase | Статус | Результат |
|---|---|---|
| 6.14 | DONE | Designer parity checklist + status model |
| 6.16 | DONE | Designer Shadow Bridge (DEV-only, read-only) |
| 6.17 | NEXT | Cross-mode parity revalidation on bridge sources |

## 15. Definition of Done

- [x] Design doc создан.
- [x] Bridge skeleton создан в `shared/shell/shadow/designer/*`.
- [x] DEV-only readonly emitter добавлен в legacy Designer shell.
- [x] `/dev/appshell-shadow-designer` читает bridge snapshot с fallback.
- [x] mock mode отмечен как non-readiness evidence в designer parity checks.
