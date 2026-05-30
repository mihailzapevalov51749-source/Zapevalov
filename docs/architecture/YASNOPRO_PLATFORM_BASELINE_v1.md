# YASNOPRO Platform Baseline v1

## Статус

```text
ACTIVE — нормативный снимок платформы после Dual-SoT Recovery Layers 1–6 (PR #7)
```

---

## 1. Purpose

Документ фиксирует **архитектурный baseline** платформы ЯсноПро после завершения программы Dual-SoT Recovery (Layers 1–6).

Baseline отвечает на вопрос: *«Как платформа устроена **сейчас** для новых и существующих данных?»* — без планов миграции в деталях (они в linked docs).

### Завершённые слои

| Layer | Название | PR |
|-------|----------|-----|
| Layer 1 | Entity Identity Contract | #1 |
| Layer 2 | Stop New Legacy Data Creation | #2, #2b |
| Layer 3 | Table View over Runtime Entity | #3 (verified) |
| Layer 4 | Communication Identity Migration | #4a–c |
| Layer 5 | Legacy UT Storage Isolation | #5 |
| Layer 6 | Documentation Alignment | #6 |

**Baseline v1** не меняет код — фиксирует согласованное состояние для onboarding, review и следующих фаз (9.5 **DONE**, 9.6 **UNBLOCKED**, Legacy Removal **ACTIVE**).

---

## 2. Current Platform Principle

Обязательная формулировка для кода, UX и документации:

```text
Table is UI.
universal_table_rows is legacy storage.
Runtime Entity is the business source of truth.
```

| Понятие | Роль |
|---------|------|
| **Table / Table View** | UI-адаптер (отображение, фильтры, сортировка) — **не** SoT |
| **universal_table_rows** | Legacy **storage** для existing portal-данных |
| **Runtime Entity** | Целевой SoT для **новых** бизнес-данных |
| **Object Type** | Метаданные (схема, поля, views) — **не** SoT данных |
| **Block / Page** | Композиция портала — **не** владелец бизнес-данных |

**Запрещено** в новых фичах: проектировать capabilities так, будто Universal Table storage — бизнес-сущность или равноправный SoT с Runtime Entity.

---

## 3. Current Target Path

Целевой контур для **новых** бизнес-данных и product features:

```text
Studio
  → Object Type (Designer)
  → Publish (published catalog)
  → Office (runtime routes)
  → Runtime Entity (runtime_entities / runtime_entity_values)
  → Object Views / Table View (ObjectViewHost, shared/viewEngine)
  → Comments / Notes / Attachments (entity_type = runtime_entity)
```

### Identity (object path)

- Canonical: `runtime_entity:{uuid}`
- Read/write: `runtimeReadGateway` / `runtimeWriteGateway`
- Коммуникации: без новых `universal_table:*` writes из object-centric modules

Детали: [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md), [YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md](./YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md).

---

## 4. Legacy Support Path

Контур **существующих** portal-данных (existing-only):

```text
Portal Page
  → Universal Table Block (universal_table / table aliases)
  → universal_tables
  → universal_table_rows
  → universal_views (представления в scope table_id)
```

### Статус

```text
EXISTING-ONLY SUPPORT MODE
```

- **Новое** создание blocks / menu / primary row path — **заблокировано** (Layer 2).
- **Существующие** страницы, строки, views, коммуникации — **поддерживаются**.
- UI-маркеры «режим поддержки» на canvas и в block editor (Layer 5).

**Не путать:** рендер `UniversalTableView` — это **UI** над legacy storage, не запрет «таблиц» как интерфейса.

Детали: [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md).

---

## 5. What Is Active

Компоненты в **production** для целевого и смежных контуров:

| Область | Статус |
|---------|--------|
| **Object Type** (Designer workspace, fields, views) | ACTIVE |
| **Publish** → published catalog | ACTIVE |
| **Runtime Entity** (`runtime_entities`, query, write) | ACTIVE |
| **Published Catalog** (runtime read) | ACTIVE |
| **Object Views** (`ObjectViewHost`, view definitions) | ACTIVE |
| **Table View over Runtime Entity** | ACTIVE · VERIFIED (Layer 3) |
| **Runtime Entity Card** (Object Entity Card) | ACTIVE |
| **Runtime comments** (`entity_type=runtime_entity`) | ACTIVE |
| **Runtime notes** (`entity_type=runtime_entity`) | ACTIVE |
| **Runtime attachments** (file fields в entity values) | ACTIVE |
| **Runtime identity** (`shared/entityIdentity`, contract) | ACTIVE |
| **Legacy guards** (FE + `POST /blocks` 422) | ACTIVE |
| **shared/viewEngine** | ACTIVE (object-centric table UI) |

---

## 6. What Is Legacy

Элементы **legacy storage / compat**, не целевой SoT:

| Элемент | Примечание |
|---------|------------|
| `universal_tables` | Метаданные legacy-таблицы |
| `universal_table_rows` | Строки legacy storage |
| `universal_table_columns` | Колонки legacy schema |
| `universal_views` | Представления в scope `table_id` (не Designer View Definitions для новых OT) |
| Universal Table **block creation** path | Удалён из UI; API create blocked |
| **legacy EntityCardModal** | UT rows, notifications allowlist (Phase 9.5) |
| **`/universal-table`** system route | Active; судьба — отдельный ADR |
| **legacy gateway providers** | ~~read + write adapters~~ **REMOVED** (2026-05-30) |
| `tableApi` row CRUD | Existing rows only, allowlisted paths |
| `tableSessionStore`, `window.__UNIVERSAL_TABLE_*` | Legacy UT session |
| UT comments/notes identity | `table_row`, `universal_table:{id}` — compat, не canonical для новых object features |

---

## 7. What Is Blocked

Создание **новых** legacy data sources:

| Действие | Механизм |
|----------|----------|
| Новые Universal Table blocks на portal | FE guards, creatable types filter, toast |
| Новые Universal Table menu / pages (nav `universal_table`) | Menu editor, CreateMenuItemModal |
| `POST /blocks` с `universal_table` / aliases (`table`, `table_block`, `tableBlock`) | Backend 422 `legacy_storage_creation_forbidden` |
| Новые бизнес-данные через `universal_table_rows` как **primary** greenfield path | Product rule + freeze; object path → Runtime Entity |
| Новые `universal_table:*` writes из object-centric modules | Layer 4 + ESLint Phase 9.1 |
| Импорт `modules/universalTable/**` в object-centric layers | ESLint (allowlist only) |

---

## 8. What Still Works

Existing runtime **без регрессий** после Layers 1–6:

| Область | Поведение |
|---------|-----------|
| Existing UT portal pages | Open, render via `UniversalTableView` |
| Existing UT rows | Read, edit, delete (allowlisted APIs) |
| Existing UT comments | Legacy identity, open/display |
| Existing UT notes | Legacy `table_row` identity |
| Existing UT attachments | File columns в row values |
| **`createTableForBlock`** | Lazy-init для block без `table_id` |
| Legacy file viewer comments | `file` entity type |
| **Object-centric runtime path** | Object Type routes, Table View, Entity Card, runtime communication |
| `updateTableRow` / `deleteTableRow` | Existing rows only |
| `universal_views` CRUD | Existing legacy tables |

---

## 9. Remaining Architecture Debt

Baseline **не** означает «долг устранён». Остаётся:

| Долг | Статус / фаза |
|------|----------------|
| Existing `universal_table_rows` data not migrated | **CANCELLED** — ADR-001; data disposable |
| `universal_views` vs Designer View Definitions | Split · PARTIAL (AD-017) |
| `/universal-table` route still active | ACTIVE · ADR (Q6) |
| Legacy gateway providers present | **PARTIAL** — read + write adapters **REMOVED** (2026-05-30); UT module Phase 9.6 |
| `NotificationOverlayHost` legacy paths (UT/file) | ACTIVE · runtime_entity → Object Card (**9.5 DONE**) |
| Permission Engine | NOT IMPLEMENTED |
| Representation store split (UT session vs object views) | PARTIAL |
| Relation Engine | NOT IMPLEMENTED |
| Event Engine | NOT IMPLEMENTED |
| Data migration program | **CANCELLED** — Legacy Removal **ACTIVE** (ADR-001) |
| UT view session / dirty state instability | ACTIVE (AD-002, AD-006) |

Реестр: [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md).  
Снимок: [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md).

---

## 10. Next Recommended Phases

> **Strategic correction (ADR-001, 2026-05-30):** Universal Table data migration **cancelled**. Legacy removal program **active**.

### Object Platform Independence — **NEXT**

**Цель:** Object Platform не импортирует Universal Table.

**Ключевые работы:** entityCardShell decouple, remove legacy adapters/fallbacks, legacy notification path removal.

---

### Phase 9.5 — Notification Routing Hardening

**Статус:** **DONE** (PR #8) — см. [YASNOPRO_NOTIFICATION_ROUTING_HARDENING.md](./YASNOPRO_NOTIFICATION_ROUTING_HARDENING.md)

**Результат:**

- `runtime_entity` notifications → Object Entity Card (Office route + fetch-by-id)
- Legacy UT / file notifications → прежние overlay paths
- `NotificationOverlayHost` не перехватывает runtime_entity targets

---

### Phase 9.6 — Legacy Adapter Cleanup

**Статус:** **IN PROGRESS** — read + write gateway adapters **DONE** (2026-05-30); UT module pending

**Цель:** удалить legacy gateway adapters, UT bridges и deprecated routes.

**Кандидаты:**

- ~~`legacyTableReadProvider`~~ — **REMOVED**
- ~~`legacyViewReadProvider`~~ — **REMOVED**
- ~~`legacyTableWriteAdapter`~~ — **REMOVED** (2026-05-30)
- navigation/sidebar UT bridges
- `NotificationOverlayHost` legacy path

**Предусловие:** Object Platform Independence (нет UT imports в object-centric modules).

> Superseded: «data migration plan согласован» — migration **не выполняется**.

---

### ~~Future ADR — Data Migration~~

> **Superseded by [ADR-001 Universal Table Retirement](./adr/ADR-001-universal-table-retirement.md).**

~~ETL `universal_table_rows` → `runtime_entities`~~ — **CANCELLED**. Данные UT disposable. Legacy **removal** вместо migration.

---

## Current Strategic Correction

Baseline v1 фиксирует переходное состояние Hybrid Architecture.

После аудита принято решение (ADR-001):
Universal Table **не мигрируется**, а выводится из целевой платформы.

В Baseline остаётся факт наличия legacy UT-кода, но он **больше не является частью целевой архитектуры**.

**Целевой контур:**

```text
Object Type
→ Published Catalog
→ Runtime Entity
→ ObjectViewHost
→ ObjectEntityCard
→ Relations / Permissions / Search / AI Context
```

**Legacy контур:**

```text
Universal Table → frozen → isolated → removed
```

---

## 11. Do Not Do Yet

До завершения **Legacy Removal Program** (ADR-001) **запрещено** без замены:

| Действие | Причина |
|----------|---------|
| Новые features на `tableApi` / UT storage | Phase 9.1 freeze + ADR-001 |
| Universal Table как fallback для Object Platform | ADR-001 |
| Big-bang удаление UT до decouple objectEntities | HIGH regression risk |
| Новые UT blocks / tables | Layer 2 + ADR-001 |

**Разрешено после Legacy Removal Program:**

| Действие | Условие |
|----------|---------|
| DROP `universal_table_*` tables | ADR-001: данные disposable |
| Удалить `modules/universalTable` | Object Platform Independence DONE |
| Удалить legacy adapters | Phase 9.6 |
| Удалить `/universal-table` route | Legacy Removal Phase 3 |

> Superseded: «DROP truncate universal_table_rows — потеря existing data» как **блокер** — данные **неценны** (ADR-001). DROP допустим **после** dependency removal, не «до ADR migration».

См. also: [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md) §7 Do Not Touch.

---

## 12. Architecture Status Snapshot

### Dual-SoT Recovery

| Layer | Status |
|-------|--------|
| L1 Entity Identity | **DONE** |
| L2 Stop New Legacy Creation | **DONE** |
| L3 Table View over Runtime Entity | **VERIFIED** |
| L4 Communication Identity | **DONE** |
| L5 Legacy Storage Isolation | **DONE** |
| L6 Documentation Alignment | **DONE** |

### Platform maturity (кратко)

| Индикатор | Значение |
|-----------|----------|
| Target SoT для новых данных | Runtime Entity |
| Dual-SoT **growth** | Stopped |
| Legacy UT storage | Existing-only |
| Object-centric path | Active |
| Full AOBP (Relation/Event/AI) | Not reached |

---

## 13. Links

### Нормативные (Dual-SoT)

- [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md) — план Layers 1–6, Do Not Touch, риски
- [YASNOPRO_ENTITY_IDENTITY_CONTRACT.md](./YASNOPRO_ENTITY_IDENTITY_CONTRACT.md) — canonical vs legacy identity
- [YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md](./YASNOPRO_TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION.md) — Layer 3 audit
- [YASNOPRO_COMMUNICATION_IDENTITY_MIGRATION_PLAN.md](./YASNOPRO_COMMUNICATION_IDENTITY_MIGRATION_PLAN.md) — Layer 4 matrix

### Phase 9 Legacy

- [YASNOPRO_PHASE9_LEGACY_FREEZE.md](./YASNOPRO_PHASE9_LEGACY_FREEZE.md) — ESLint, object-centric SoT
- [YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md](./YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md) — исключения
- [YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md](./YASNOPRO_PHASE9_LEGACY_BLOCK_ISOLATION.md) — Layer 2 + Layer 5

### Статус и миграция

- [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md) — детальный снимок платформы
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md) — roadmap PHASE 1–10 + §24 Dual-SoT track
- [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md) — AD-001…AD-017

### Index

- [README.md](./README.md) — Current Architecture Status

---

## Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-29 | Initial Platform Baseline v1 (PR #7) after Layers 1–6 |

Следующая версия baseline (`v2`) — после Object Platform Independence, Phase 9.6 или Legacy Removal milestones (ADR-001).
