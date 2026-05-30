# YASNOPRO Architecture

## Главная цель

ЯсноПро развивается как:

AI-native Object-centric Business Platform (AOBP)

По-русски:

AI-ориентированная объектно-центричная бизнес-платформа.

Платформа, где:
- Entity Layer хранит бизнес-объекты;
- Relation Engine хранит связи;
- Event Engine хранит историю;
- View Engine отвечает только за отображение;
- Runtime Personalization Layer позволяет пользователям настраивать рабочую среду;
- AI Context Engine формирует понимание компании.

---

## Документы

- **ADR-001** — Universal Table Retirement (accepted)
- **ARCHITECTURE_DIRECTION** — стратегический arbiter
- **PLATFORM_CORE** — фундамент платформы
- ENTITY_MODEL — объектная модель
- STATE_MODEL — управление состоянием
- VIEW_ENGINE_MODEL — отображение данных
- RUNTIME_DESIGNER_MODEL — разделение Runtime/Designer
- RUNTIME_PERSONALIZATION_MODEL — персонализация Runtime пользователями
- RELATION_ENGINE_MODEL — связи объектов
- EVENT_ENGINE_MODEL — события и timeline
- AI_CONTEXT_MODEL — AI-context и semantic layer
- IMPLEMENTATION_ROADMAP — путь трансформации платформы
- TECHNICAL_ARCHITECTURE — техническая архитектура
- **PHASE9_LEGACY_FREEZE** — freeze Universal Table для нового кода (Phase 9.1)
- **PHASE9_LEGACY_ALLOWLIST** — исключения из freeze
- **PHASE9_LEGACY_BLOCK_ISOLATION** — остановка создания legacy UT storage (Layer 2)
- **DUAL_SOT_RECOVERY_PLAN** — план устранения dual source of truth
- **ENTITY_IDENTITY_CONTRACT** — canonical `runtime_entity:{uuid}`
- **TABLE_VIEW_RUNTIME_ENTITY_VERIFICATION** — Layer 3 audit (Table View → Runtime Entity)
- **COMMUNICATION_IDENTITY_MIGRATION_PLAN** — comments / notes / attachments identity (Layer 4)
- **PLATFORM_BASELINE_v1** — нормативный снимок платформы после Layers 1–6 (PR #7)
- **NOTIFICATION_ROUTING_HARDENING** — Phase 9.5 notification routing (PR #8)
- **OBJECT_ENTITY_CARD_UX_BASELINE** — визуальный UX runtime Object Entity Card (PR-A / PR-A2 / PR-B)
- **LEGACY_BLOCK_TYPES_ISOLATION** — table/universal_table block types из новых сценариев (COMPLETED, 2026-05-30)
- **LEGACY_TABLE_PLACEHOLDER_ISOLATION** — placeholder boundary для existing legacy table blocks (COMPLETED, 2026-05-30)
- **RUNTIME_READ_GATEWAY_CLEANUP** — Runtime Read Gateway query-only (Phase 1 OPI, 2026-05-30)
- **RUNTIME_LEGACY_WRITE_ADAPTER_CLEANUP** — write adapter removed (Phase 1 OPI, 2026-05-30)
- **DEVELOPMENT_LIFECYCLE** — обязательный Phase 5 (Documentation & Status Sync)

---

## Current Architecture Decision

**Universal Table Retirement is now accepted.**

Read first:

1. [YASNOPRO_ARCHITECTURE_DIRECTION.md](./YASNOPRO_ARCHITECTURE_DIRECTION.md)
2. [adr/ADR-001-universal-table-retirement.md](./adr/ADR-001-universal-table-retirement.md)
3. [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md)
4. [YASNOPRO_ARCHITECTURE_DEBT.md](./YASNOPRO_ARCHITECTURE_DEBT.md)
5. [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md)

**Important:**

- Universal Table data is **not migrated**.
- Universal Table is **retired**.
- Runtime Entity is the **only target source of truth**.

---

## Current Architecture Status

**Нормативный baseline:** [YASNOPRO_PLATFORM_BASELINE_v1.md](./YASNOPRO_PLATFORM_BASELINE_v1.md) — единая точка входа после Layers 1–6.

**Синхронизировано:** PR #7 — Platform Baseline v1 (2026-05-29); Layers 1–6 **DONE**.

Подробный снимок: [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md) · план recovery: [YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md](./YASNOPRO_DUAL_SOT_RECOVERY_PLAN.md).

### Обязательная формулировка

```text
Table is UI.
universal_table_rows is legacy storage.
Runtime Entity is the business source of truth.
```

### Target vs legacy

| Контур | Статус |
|--------|--------|
| **Runtime Entity** (`runtime_entities`) | **IMPLEMENTED / ACTIVE** — целевой SoT для новых бизнес-данных |
| **Object Type** (Designer → publish) | **IMPLEMENTED / ACTIVE** — метаданные сущности |
| **Object Views** (`ObjectViewHost`, `shared/viewEngine`) | **IMPLEMENTED / ACTIVE** — Table View как UI над Runtime Entity |
| **Table View over Runtime Entity** | **VERIFIED** (Layer 3, PR #3) |
| **Legacy UT storage** (`universal_tables` → `universal_table_rows`) | **EXISTING-ONLY / ISOLATED** (Layer 5, PR #5) |
| **New legacy data creation** | **BLOCKED** (Layer 2, PR #2 / #2b) |
| **Communication (object path)** | **DONE** — `runtime_entity` для comments, notes, attachments (Layer 4) |

### Dual-SoT Recovery (Layers 1–5)

| Layer | Статус |
|-------|--------|
| L1 Entity Identity Contract | **DONE** |
| L2 Stop New Legacy Creation | **DONE** |
| L3 Table View → Runtime Entity | **VERIFIED** |
| L4 Communication Identity | **DONE** |
| L5 Legacy UT Storage Isolation | **DONE** |
| L6 Documentation Alignment | **DONE** (этот PR) |

### Следующие этапы (после Phase 9.5)

- **Phase 9.6** — legacy adapter removal — **UNBLOCKED** (ADR-001)
- **Legacy Removal Program** — **ACTIVE** (вместо ETL)

> Superseded: «Future ETL universal_table_rows → runtime_entities»

---

## Рекомендуемый порядок чтения

1. YASNOPRO_PLATFORM_CORE.md
2. YASNOPRO_ENTITY_MODEL.md
3. YASNOPRO_STATE_MODEL.md
4. YASNOPRO_VIEW_ENGINE_MODEL.md
5. YASNOPRO_RUNTIME_DESIGNER_MODEL.md
6. YASNOPRO_RUNTIME_PERSONALIZATION_MODEL.md
7. YASNOPRO_RELATION_ENGINE_MODEL.md
8. YASNOPRO_EVENT_ENGINE_MODEL.md
9. YASNOPRO_AI_CONTEXT_MODEL.md
10. YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md
11. YASNOPRO_TECHNICAL_ARCHITECTURE.md

---

## Архитектурный принцип

Feature строятся поверх platform core.

Platform core НЕ строится вокруг feature.

Designer создаёт возможности, ограничения и правила.

Runtime users создают рабочую среду внутри этих ограничений.

---

## Главные правила платформы

- **Table View / View Engine** = UI (не source of truth)
- **Universal Table storage** (`universal_table_rows`) = legacy storage, existing-only
- **Runtime Entity** = source of truth для бизнес-данных
- Object Type = метаданные (не SoT данных)
- Representation != View
- View Template != Runtime Representation
- Tabs != Representations
- Runtime != Designer
- Runtime Personalization != Designer Configuration
- Layout Engine != Entity Layer
- Event Engine owns history
- Relation Engine owns graph logic
- AI Context Engine owns semantic understanding
- View never owns business truth

---

## Что это означает

### Table View и Universal Table (разделить!)

**Table View** (Object Views, `shared/viewEngine`) — UI-адаптер над **Runtime Entity**. Не legacy.

**Universal Table storage** — legacy path:

```text
Portal Page → block universal_table → universal_tables → universal_table_rows
```

- **Не** бизнес-сущность и **не** целевой SoT.
- Режим **existing-only** (новое создание заблокировано, Layer 2–5).
- Рендер таблицы на portal (`UniversalTableView`) — UI над legacy storage.

Табличный UI отвечает за отображение, сортировку, фильтрацию, selection, virtualization — но **не** владеет бизнес-истиной в object-centric path.

---

### Entity Layer

Entity Layer — главный источник бизнес-данных платформы.

Все объекты компании должны существовать как Entity.

---

### View Template

View Template создаётся аналитиком в Designer.

Это официальный способ отображения объекта.

Примеры:
- Таблица проектов
- Канбан проектов
- Гант проектов
- Календарь проектов

---

### Runtime Representation

Runtime Representation создаётся пользователем в Runtime.

Это личная или командная настройка View Template.

Примеры:
- Мои проекты
- Просроченные проекты
- Проекты отдела
- Проекты на согласовании

---

### Tabs

Tabs — элементы интерфейса Runtime.

Tabs НЕ являются representations.

Пример:
- Таблица
- Дерево
- Канбан

Это Tabs/View Type.

А:
- «Просроченные задачи»
- «Мои проекты»

Это Runtime Representations.

---

### Runtime

Runtime — рабочая среда сотрудников.

Runtime предназначен для:
- работы;
- анализа;
- коммуникации;
- выполнения процессов;
- персонализации рабочего пространства.

---

### Designer

Designer — среда моделирования платформы.

Designer предназначен для:
- создания ObjectType;
- настройки Field;
- настройки Relation;
- создания View Template;
- моделирования системы;
- задания ограничений Runtime.

---

### Runtime Personalization Layer

Runtime Personalization Layer отвечает за:
- Personal Representation;
- Team Representation;
- Personal Workspace;
- Team Workspace;
- Runtime Dashboard;
- Runtime Layout;
- Personal Tabs;
- Saved Filters.

Пользователь может настраивать удобство работы, но не должен ломать platform core.

---

### Layout Engine

Layout Engine отвечает только за:
- размещение;
- resize;
- drag/drop;
- spatial layout.

Layout Engine НЕ владеет business data.

---

### Event Engine

Event Engine отвечает за:
- историю;
- timeline;
- audit trail;
- notifications foundation;
- automation foundation.

---

### Relation Engine

Relation Engine отвечает за:
- graph logic;
- dependency analysis;
- impact analysis;
- semantic relations.

---

### AI Context Engine

AI Context Engine отвечает за:
- semantic understanding;
- context graph;
- AI reasoning;
- organizational memory;
- AI recommendations.

---

## Правила разработки

- 1 bug = 1 patch = 1 commit
- Никаких массовых refactor
- Никаких hidden state synchronization
- Никаких implicit UX changes
- Никакого смешения слоёв
- Cursor сначала анализирует, потом предлагает изменения
- **Definition of Done:** см. [YASNOPRO_DEVELOPMENT_LIFECYCLE.md](./YASNOPRO_DEVELOPMENT_LIFECYCLE.md) — этап не `Completed` без Phase 5 (docs + dashboard sync)

---

## Запрещено

Запрещено:
- использовать Table как source of truth;
- смешивать Runtime и Designer;
- смешивать View и Entity;
- смешивать View Template и Runtime Representation;
- смешивать Layout и business logic;
- хранить personal runtime state внутри system views;
- делать global hidden runtime state;
- делать uncontrolled AI refactor;
- silently mutate UX behavior;
- хранить business logic внутри UI.

---

## Перед любыми изменениями

Сначала определить:
- какой слой затрагивается;
- кто owner состояния;
- это Designer Configuration или Runtime Personalization;
- не нарушаются ли platform boundaries;
- не ломается ли Runtime behavior;
- не появляется ли hidden synchronization.

---

## Главная цель разработки

Построить:
- масштабируемую;
- AI-native;
- object-centric;
- модульную;
- объяснимую;
- архитектурно устойчивую платформу.

Не просто набор feature.

А полноценную цифровую операционную систему бизнеса.