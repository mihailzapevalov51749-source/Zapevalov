# YASNOPRO Phase 9.1 — Legacy Freeze

## Статус

```text
ACTIVE — согласован с Dual-SoT Recovery L1–L6 (2026-05-29)
```

Нормативный документ. Любой новый код в object-centric слоях обязан ему соответствовать.

Связанные документы:

- [YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md) — явные исключения
- [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md) — Layer 2 + Layer 5
- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md) — Layers 1–6
- [YASNOPRO_PLATFORM_CORE.md](./YASNOPRO_PLATFORM_CORE.md) — целевая модель платформы
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) — §24 Dual-SoT track

---

## Цель

Вывести **Universal Table storage** (`universal_table_rows`) из роли source of truth.

**Не путать:** Table View / Object Views / `viewEngine` — **не** legacy; это UI над Runtime Entity.

После Phase 9.1 + Recovery Layers 2–5:

- новые фичи **не расширяют** зависимость от legacy storage;
- **создание** новых UT blocks / primary row path — **заблокировано** (Layer 2);
- existing legacy — **existing-only** с маркерами (Layer 5);
- object-centric слои защищены ESLint и code review.

---

## Object-Centric Source Of Truth

```text
Object Type        → модель (схема, поля, каталог)
Runtime Entity     → данные (экземпляры)
Object View        → представление (проекция, фильтры, сортировка)
Entity Card        → UI работы с Runtime Entity (Object Entity Card)
Table (UI)         → adapter поверх View Engine / Object Views
```

Запрещено проектировать новые business-capabilities так, будто `universal_table_rows` — первичное хранилище.

---

## Universal Table Status

```text
Universal Table storage = Legacy data path (existing-only)
Table View (object-centric) = UI adapter (NOT legacy)
```

| Аспект | Статус |
|--------|--------|
| Хранение строк | Legacy (`universal_table_rows`), **existing-only** |
| Новое создание blocks/rows | **BLOCKED** (Layer 2) |
| CRUD API | Legacy (`tableApi`, row mutations) |
| Контроллер таблицы | Legacy (`useUniversalTableController`) |
| Сессия / dirty state | Legacy (`tableSessionStore`, `window.__UNIVERSAL_TABLE_*`) |
| События | Legacy (`CustomEvent` `universal-table:*`) |
| Entity Card (UT) | Legacy (`modules/universalTable/components/entityCard/*`) |

Universal Table **не удаляется** в Phase 9.1. Удаление и миграция — последующие фазы (см. Baseline).

---

## Разрешено (для legacy и переходного периода)

- Bugfix в существующем Universal Table и portal runtime.
- Read-only support существующих таблиц и блоков.
- **Migration adapters** (~~read/write gateway adapters~~ **REMOVED** 2026-05-30).
- Visual references в `docs/references/` (не production imports).
- Compatibility layers, явно занесённые в [allowlist](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md).
- Поддержка существующих маршрутов portal без изменения контрактов.

---

## Запрещено (для новых функций)

Новый feature-код **не должен** использовать:

```text
tableApi
createTableRow
updateTableRow
deleteTableRow
useUniversalTableController
tableSessionStore
window.__UNIVERSAL_TABLE_*
CustomEvent universal-table:*
legacy EntityCard (modules/universalTable/components/entityCard/*)
universal_table_rows (прямой доступ / новые модели на этой таблице)
```

Импорт из `modules/universalTable/**` в защищённых директориях — **запрещён**, кроме [allowlist](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md).

Защищённые директории (frontend):

```text
src/modules/objectViews/**
src/modules/objectEntities/**
src/shared/**
src/modules/designer/**
src/modules/runtimeWriteGateway/**
src/modules/objectTypeTable/**
```

Проверка: `eslint` rule `no-restricted-imports` в `frontend/eslint.config.js`.

Дополнительно: `npm run check:runtime-boundaries` — запрет прямого импорта `tableApi` / `universalViewsApi` вне legacy adapters.

---

## Новые функции — обязательный стек

Все **новые** capabilities в object-centric зоне обязаны использовать:

```text
Runtime Entity          (backend + runtimeEntitiesApi)
Runtime Query           (runtimeReadGateway / query provider)
Object Views            (modules/objectViews)
Object Entity Card      (modules/objectEntities)
runtimeWriteGateway     (запись сущностей)
runtimeReadGateway        (чтение сущностей / каталога)
View Engine             (shared/viewEngine) — UI таблицы
Published Catalog       (designer publish → runtime)
```

---

## Dependency Report (baseline Phase 9.1)

Снимок на момент введения freeze (frontend `src/`, backend models). Подсчёт: вхождения символа / import path в репозитории.

| Dependency | Count | Примечание |
|------------|------:|------------|
| `tableApi` (import sites) | 10 | 8 внутри `universalTable`, 2 в legacy adapters |
| `createTableRow` | 6 | 3 вызова + 2 вызова + 1 export |
| `updateTableRow` | 9 | `universalTable/**` only |
| `deleteTableRow` | 5 | |
| `useUniversalTableController` | 4 | определение + `UniversalTableView` |
| Legacy EntityCard import | 2 | вне `universalTable`: notifications, block editor |
| `universal_table_rows` | 2 | backend `models.py` (+ 3 упоминания в docs) |
| `tableSessionStore` import | 4 | |
| `window.__UNIVERSAL_TABLE_*` | 7 | `tableDirtySaveCompat.js` |
| `universal-table:*` events | 71 | в основном `useUniversalTableEvents.js` |
| Импорт `modules/universalTable` (вне модуля) | 15 файлов | см. allowlist |

---

## Архитектурные нарушения (текущие)

### objectViews → universalTable

**Не обнаружено.** `modules/objectViews` не импортирует Universal Table.

### objectEntities → universalTable

**Не обнаружено.** `modules/objectEntities` использует `shared/entityCardShell`.

### shared → universalTable

**Нарушение:**

- **Файл:** `frontend/src/shared/shell/sidebar/usePlatformSidebarControls.js`
- **Почему опасно:** App Shell (shared) тянет title/dirty bridge Universal Table; новые sidebar-capabilities могут закрепить legacy coupling.
- **Предлагаемая фаза удаления:** Phase 9.2 (Portal Runtime / sidebar bridge)

### designer → universalTable

**Не обнаружено.**

### Прочие (вне guarded dirs, но фиксируем)

| Нарушение | Файл | Почему опасно | Фаза |
|-----------|------|---------------|------|
| Legacy EntityCard в notifications | `modules/notifications/components/NotificationOverlayHost.jsx` | Deep link открывает UT Entity Card, не Object Entity Card | 9.5 |
| Legacy table read в gateway | ~~`runtimeReadGateway/providers/legacyTableReadProvider.js`~~ | **REMOVED** (2026-05-30) | — |
| Legacy table write | ~~`runtimeLegacyWriteAdapter/legacyTableWriteAdapter.js`~~ | **REMOVED** (2026-05-30) | — |

---

## Baseline миграции (Phase 9.x)

| Legacy Area | Current Status | Target Phase |
|-------------|----------------|--------------|
| Portal Runtime | Legacy (`PortalPageView`, sidebar bridges) | 9.2 |
| UniversalTable Block | Legacy (`blockRegistry`, `UniversalTableView`) | 9.3 |
| Comments Identity | Legacy (привязка к table row) | 9.4 |
| Notes Identity | Legacy (привязка к table row) | 9.4 |
| Entity Card | Mixed (UT card + Object Entity Card) | 9.5 |
| Runtime Fallback | Legacy (`legacy*Provider` read **REMOVED**, write adapter pending) | 9.6 |

---

## Enforcement

1. **ESLint** — `no-restricted-imports` для guarded globs (см. `frontend/eslint.config.js`).
2. **Allowlist** — только явные файлы в [YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md).
3. **CI / pre-commit** — рекомендуется: `npm run lint` + `npm run check:runtime-boundaries` в frontend.
4. **Code review** — отклонять PR с новыми импортами `universalTable` вне allowlist.

---

## Что НЕ входит в Phase 9.1

- Удаление файлов Universal Table
- Смена маршрутов portal
- Миграция данных
- Portal Route refactor (Phase 9.2)

---

## Acceptance (Phase 9.1)

- [x] Нормативный freeze-документ
- [x] Allowlist
- [x] ESLint guards
- [x] Dependency report и нарушения зафиксированы
- [x] Baseline карта миграции
- [x] `npm run build` — успешно (`frontend`, Vite)
