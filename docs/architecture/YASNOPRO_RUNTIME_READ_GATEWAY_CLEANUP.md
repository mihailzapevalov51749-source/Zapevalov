# YASNOPRO — RuntimeReadGateway Legacy Cleanup

## Статус

```text
COMPLETED — Phase 5 Documentation Sync (2026-05-30)
```

Предшествующий технический статус: **TECHNICALLY COMPLETE** (код + unit tests, до sync docs).

Связанные документы:

- [YASNOPRO_DEVELOPMENT_LIFECYCLE.md](./YASNOPRO_DEVELOPMENT_LIFECYCLE.md)
- [YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md](./YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md)
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) — Phase 1 Object Platform Independence
- [adr/ADR-001-universal-table-retirement.md](./adr/ADR-001-universal-table-retirement.md)

---

## 1. Purpose

Полностью удалить legacy fallback из Runtime Read Gateway.

Runtime Read Layer читает данные **только** через object-centric `queryReadProvider`.

---

## 2. Target architecture

```text
useObjectViewQuery
  → runtimeReadGateway.getObjectList / getProjection
    → assertObjectTypeKey (OBJECT_TYPE_KEY_REQUIRED)
    → queryReadProvider
      → runtimeQueryApi
        → source: "query"
```

**Не используется:** `legacyTableReadProvider`, `legacyViewReadProvider`, `getLegacyTable`, fallback branches, `legacyFallback` prop.

---

## 3. Scope

| Область | Действие |
|---------|----------|
| `runtimeReadGateway.js` | Только `queryReadProvider` |
| `useObjectViewQuery.js` | Без `legacyFallback`, без `contract: null` retry |
| Legacy providers / mappers | Удалены (orphan files отсутствовали на диске) |
| Reference docs | Синхронизированы с production |
| Production call sites | Без legacy props |

---

## 4. Verification

### Unit tests

- `runtimeReadGateway.test.js` — query provider only, guards
- `useObjectViewQuery.test.js` — no legacyFallback, explicit errors

### Production grep (frontend/src)

```text
0 production references
```

к: `legacyTableReadProvider`, `legacyViewReadProvider`, `enableLegacyFallback`, `getLegacyTable`, `legacyFallback=`, `contract: null` retry.

---

## Completion Summary

**Статус:** Completed

**Ключевые работы:**

- Удалены legacy fallback branches из Runtime Read Gateway (production)
- Удалены orphan legacy providers/mappers (файлы уже отсутствовали)
- `useObjectViewQuery` — explicit error state, без silent fallback на legacy
- Reference `docs/references/runtimeReadGateway.js` и `RuntimePreviewTab.jsx` синхронизированы
- Telemetry и `check-runtime-boundaries.js` очищены от legacy mappers allowlist

**Результат:**

- Runtime Read Layer = **Query Provider Only**
- `source: "query"` для list и projection
- Ошибки API → explicit error state; пустой список → empty state

**Тесты:**

- Passed (`npm run test:unit`, 2026-05-30)

---

## Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | RuntimeReadGateway Legacy Cleanup — COMPLETED |
