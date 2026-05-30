# YASNOPRO Phase 9.1 — Legacy Allowlist

> **ADR-001 (2026-05-30):** Universal Table retirement **active**. Phase 9.6 adapter removal **UNBLOCKED**. «Remove After» = Legacy Removal milestones, не data migration.

## Статус

```text
ACTIVE — Layer 5: `TableBlockAddModal` удалён · Layer 6: allowlist согласован со STATUS
```

Явные исключения из [Legacy Freeze](./YASNOPRO_PHASE9_LEGACY_FREEZE.md).  
Новый файл в этот список добавляется **только** с указанием фазы удаления и причиной.

ESLint: файлы из колонки «File» с пометкой `(eslint)` имеют override в `frontend/eslint.config.js`.

---

## Allowlist — импорты `modules/universalTable`

| File | Reason | Remove After |
|------|--------|--------------|
| `frontend/src/portal/PortalPageView.jsx` | Existing-only: рендер `UniversalTableView`, без creation UI (Layer 5) | Phase 9.2 |
| `frontend/src/modules/blocks/registry/blockRegistry.js` | Регистрация `UniversalTableView` block | Phase 9.3 |
| `frontend/src/modules/blockTypes/universalTable/UniversalTableBlockEditor.jsx` | Редактор legacy block | Phase 9.3 |
| `frontend/src/modules/sections/components/SectionUniversalTableHeader.jsx` | Section header + representations bar | Phase 9.3 |
| `frontend/src/modules/sections/hooks/useSectionUniversalTableControls.js` | Section ↔ UT controls | Phase 9.3 |
| `frontend/src/modules/sections/hooks/useTableDirtyState.js` | Section dirty ↔ `tableSessionStore` | Phase 9.3 |
| `frontend/src/modules/sections/hooks/useRepresentationColumnVisibility.js` | Column identity helpers | Phase 9.3 |
| `frontend/src/modules/navigation/components/LeftSidebar.jsx` | Sidebar title/dirty bridge для UT | Phase 9.2 |
| `frontend/src/shared/shell/sidebar/usePlatformSidebarControls.js` (eslint) | AppShell ↔ UT title/primary table bridge | Phase 9.2 |
| `frontend/src/modules/notifications/components/NotificationOverlayHost.jsx` | Deep link → legacy `EntityCardModal` | Phase 9.5 |
| ~~`frontend/src/modules/runtimeReadGateway/providers/legacyTableReadProvider.js`~~ | Legacy adapter: read via `tableApi` | **REMOVED** (2026-05-30) |
| ~~`frontend/src/modules/runtimeReadGateway/providers/legacyViewReadProvider.js`~~ | Legacy adapter: views via `universalViewsApi` | **REMOVED** (2026-05-30) |
| ~~`frontend/src/modules/runtimeLegacyWriteAdapter/legacyTableWriteAdapter.js`~~ | Legacy adapter: write via `updateTableRow` | **REMOVED** (2026-05-30) |

---

## Allowlist — не импорты, но разрешённые legacy API

| Symbol / API | Allowed in | Remove After |
|--------------|------------|--------------|
| `tableApi` | `universalTable/**`, `portal/**`, `navigation/**`, `shared/shell/sidebar/**` (UT title sync) | Phase 9.6 |
| `createTableRow` / `updateTableRow` / `deleteTableRow` | `universalTable/**` | Phase 9.6 |
| `useUniversalTableController` | `universalTable/**` only | Phase 9.3 |
| `tableSessionStore` | `universalTable/**`, `sections/**` (portal) | Phase 9.3 |
| `window.__UNIVERSAL_TABLE_*` | `tableDirtySaveCompat`, navigation/portal bridges | Phase 9.2 |
| `universal-table:*` events | `universalTable/**`, `sections/**`, portal | Phase 9.3 |
| Legacy `EntityCardModal` | `universalTable/**`, `NotificationOverlayHost` | Phase 9.5 |
| `universal_table_rows` | `backend/app/modules/universal_tables/**` only | Phase 9.6 |

---

## Запрещено добавлять в allowlist без ADR

- `modules/objectViews/**`
- `modules/objectEntities/**`
- `modules/designer/**` (кроме runtime preview через gateways)
- `shared/viewEngine/**`
- `modules/objectTypeTable/**`
- `modules/runtimeWriteGateway/**`

При необходимости исключения — сначала обновить этот документ и `eslint.config.js`, затем код.

---

## Процедура снятия с allowlist

1. Реализовать замену в целевой фазе (см. Baseline в freeze-документе).
2. Удалить импорты `universalTable` из файла.
3. Убрать строку из таблицы выше и ESLint override (если был).
4. Убедиться: `npm run lint`, `npm run check:runtime-boundaries`, `npm run build`.
