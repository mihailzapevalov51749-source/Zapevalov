# Legacy Table Placeholder Isolation

## STATUS

```text
COMPLETED — Phase 5 Documentation Sync (2026-05-30)
```

Предшествующий технический статус: **TECHNICALLY COMPLETE** (Phase B — placeholder boundary + registry swap).

Связанные документы:

- [YASNOPRO_DEVELOPMENT_LIFECYCLE.md](./YASNOPRO_DEVELOPMENT_LIFECYCLE.md)
- [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md)
- [YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md](./YASNOPRO_LEGACY_BLOCK_TYPES_ISOLATION.md)
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) — Phase 2 Legacy Isolation

---

## Goal

Изолировать старые `table` / `universal_table` block types через placeholder boundary.

Legacy block types больше не должны быть прямым renderer entry point для `UniversalTableView` в `blockRegistry`.

---

## Result

Render path для legacy storage blocks на portal canvas:

```text
BlockRenderer
→ LegacyStorageBlockPlaceholderView
→ LegacyStorageSupportModeBoundary
→ UniversalTableView (dynamic import, support mode only)
```

`blockRegistry.js` **не** содержит static import `UniversalTableView`.

Existing legacy pages сохраняют support mode (rows, edit, lazy-init).

---

## Verification matrix

| Контур | Статус |
|--------|--------|
| Placeholder component | **DONE** — `shared/legacy/components/LegacyStorageBlockPlaceholderView.jsx` |
| Support boundary | **DONE** — `shared/legacy/support/LegacyStorageSupportModeBoundary.jsx` |
| Registry swap | **DONE** — `table` / `universal_table` / aliases → placeholder |
| Dynamic import | **DONE** — `React.lazy` → `modules/universalTable` |
| View mode support | **RETAINED** — auto mount legacy table |
| Edit mode shell | **DONE** — collapsed shell + preview button |
| Legacy support runtime | **RETAINED** — `UniversalTableView` unchanged internally |

---

## Completion Summary

**Статус:** Completed

**Ключевые работы:**

- Placeholder — **DONE**
- Boundary — **DONE**
- Registry swap — **DONE**
- Dynamic import — **DONE**
- Legacy support — **RETAINED**

**Результат:**

Legacy block types больше не рендерят `UniversalTableView` напрямую из `blockRegistry`.

Support runtime для existing data сохранён через lazy boundary.

**Analyzer / Dashboard:**

- `stage_works._legacy_table_blocks_use_placeholder_boundary()` — code-based check
- Legacy Isolation readiness: **60%** (3/5 work items)

**Тесты:**

- `backend/app/modules/platform_dashboard_analyzer/test_analyzer.py`
  - `test_legacy_placeholder_work_item_completed`
  - `test_legacy_isolation_readiness_uses_code_guards_not_doc_markers`

---

## Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Legacy Table Placeholder Isolation — COMPLETED (Phase 5 sync) |
