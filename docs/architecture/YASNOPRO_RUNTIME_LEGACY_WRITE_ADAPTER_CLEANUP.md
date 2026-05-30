# YASNOPRO — RuntimeLegacyWriteAdapter Cleanup

## Статус

```text
COMPLETED — Phase 5 Documentation Sync (2026-05-30)
```

Предшествующий технический статус: **TECHNICALLY COMPLETE** (код + verification, до sync docs).

Связанные документы:

- [YASNOPRO_DEVELOPMENT_LIFECYCLE.md](./YASNOPRO_DEVELOPMENT_LIFECYCLE.md)
- [YASNOPRO_RUNTIME_READ_GATEWAY_CLEANUP.md](./YASNOPRO_RUNTIME_READ_GATEWAY_CLEANUP.md)
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) — Phase 1 Object Platform Independence
- [YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md)

---

## 1. Purpose

Удалить `runtimeLegacyWriteAdapter` — legacy write bridge между portal/navigation и Universal Table API.

Object-centric write (`runtimeWriteGateway`) **не использовал** этот adapter.

---

## 2. Scope

### Удалено

```text
frontend/src/modules/runtimeLegacyWriteAdapter/
  index.js
  legacyTableWriteAdapter.js
```

### Мигрировано (UT title sync only)

| Caller | Было | Стало |
|--------|------|-------|
| `PortalPageView.jsx` | `updateLegacyTable` | `updateTable` из `tableApi` |
| `LeftSidebar.jsx` | `updateLegacyTable` | `updateTable` |
| `usePlatformSidebarControls.js` | `updateLegacyTable` | `updateTable` |

Операция: `PATCH /universal-tables/{tableId}` с `{ title }` — поведение **без изменений**.

### Не затронуто (legacy island)

- `modules/universalTable/**` — row CRUD через `tableApi` напрямую
- `runtimeWriteGateway/**` — object-centric Create/Update без изменений

---

## 3. Target architecture

### Object-centric write (без изменений)

```text
ObjectViewHost / ObjectEntityCard
  → runtimeWriteGateway.createEntity / updateEntity
  → POST/PATCH /runtime/entities/...
```

### Legacy UT metadata write (allowlisted)

```text
Portal / Navigation / Sidebar (UT nav items only)
  → universalTable/services/tableApi.updateTable
  → PATCH /universal-tables/{tableId}
```

**Нет** промежуточного `runtimeLegacyWriteAdapter`.

---

## 4. Verification

### Grep (frontend/src)

```text
runtimeLegacyWriteAdapter — 0 references
updateLegacyTable — 0 references
legacyTableWriteAdapter — 0 references
```

### Boundary check

`check-runtime-boundaries.js` — allowlist обновлён: portal/navigation/sidebar вместо `runtimeLegacyWriteAdapter`.

---

## Completion Summary

**Статус:** Completed

**Ключевые работы:**

- Удалён модуль `runtimeLegacyWriteAdapter`
- 3 call sites переведены на прямой `tableApi.updateTable`
- Удалён dead export `updateLegacyTableRow` (не использовался)
- Обновлены architecture docs, dashboard analyzer, manifest

**Результат:**

- Object Platform write path не зависит от legacy write adapter
- UT title rename в portal/navigation работает через allowlisted `tableApi`
- `runtimeWriteGateway` остаётся единственным write gateway для Runtime Entity

**Тесты:**

- Passed (`npm run test:unit`, 2026-05-30)

---

## Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | RuntimeLegacyWriteAdapter Removal — COMPLETED |
