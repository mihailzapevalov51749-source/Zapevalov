# Legacy Block Types Isolation

## STATUS

```text
COMPLETED — Phase 5 Documentation Sync (2026-05-30)
```

Предшествующий технический статус: **TECHNICALLY COMPLETE** (Layer 2 / 2b / 5 — guards и UI entry points).

Связанные документы:

- [YASNOPRO_DEVELOPMENT_LIFECYCLE.md](./YASNOPRO_DEVELOPMENT_LIFECYCLE.md)
- [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md)
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) — Phase 2 Legacy Isolation

---

## Goal

Запретить создание новых `table` / `universal_table` block types в portal-сценариях.

Новые данные — только через object-centric path: Object Type → Publish → Office.

---

## Result

Создание новых legacy block types через UI и API **заблокировано**.

Legacy block types остаются только для:

- поддержки **существующих** portal-страниц;
- миграции и audit reference;
- **render existing content** (`blockViewRegistry`, `UniversalTableView`).

---

## Verification matrix

| Контур | Статус |
|--------|--------|
| Widget Library | **DONE** — legacy types отсутствуют в drag list |
| Canvas Context Menu | **DONE** — `getCreatablePageCanvasBlockTypes()` без legacy |
| Portal Editor (`PortalPageView`) | **DONE** — guards + toast |
| Navigation (`CreateMenuItemModal`, `useMenuEditor`) | **DONE** — legacy nav creation blocked |
| Frontend API (`blocksApi.createBlock`) | **DONE** — `assertLegacyStorageBlockCreationAllowed` |
| Backend (`POST /blocks`) | **DONE** — `legacy_storage_creation_forbidden` (422) |
| Legacy render support | **RETAINED** — existing blocks не затронуты |

---

## Completion Summary

**Статус:** Completed

**Ключевые работы:**

- Widget Library isolation — **DONE**
- Canvas isolation — **DONE**
- Portal editor isolation — **DONE**
- Navigation legacy block creation — **DONE**
- Backend block creation guard — **DONE**
- Legacy render support — **RETAINED**

**Результат:**

Создание новых `table` / `universal_table` block types через UI и API заблокировано.

Legacy block types остаются только для:

- поддержки существующих страниц;
- миграции;
- render existing content.

Новые сценарии используют object-centric путь.

**Тесты / verification:**

- Manual QA checklist: [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md) §7
- Backend: `backend/app/modules/blocks/test_legacy_guard.py`

---

## Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Legacy Block Types Isolation — COMPLETED (Phase 5 sync) |
