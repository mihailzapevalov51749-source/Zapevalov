# Архитектурное управление ЯсноПро

```yaml
document: architecture-governance
title: Архитектурное управление ЯсноПро
version: v1.0
status: Draft
date: 2026-06-19
authority: YASNOPRO Platform Architecture
scope: governance layer definition
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.2
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md v1.0
  - YASNOPRO_PLATFORM_STANDARDS.md v1.0
  - YASNOPRO_PLATFORM_CONFIGURATION.md v1.0
source_audits:
  - WI-ARCH-PUB-000
  - WI-ARCH-RULES-000
  - WI-ARCH-GOV-001
  - WI-ARCH-GOV-001A
  - WI-ARCH-GOV-002
related_adrs:
  - ADR-REL-001-unified-release-package
  - ADR-CP-001-control-plane-orchestration-model
  - ADR-TPL-001-template-governance-model
  - ADR-PROV-001-company-provisioning-model
  - ADR-RT-001-per-company-runtime
  - ADR-UPD-001-company-update-and-rollback-model
  - ADR-RUN-001-runtime-materialization-model
  - ADR-DEP-001-deployment-execution-model
  - ADR-AUD-001-audit-and-event-journal-model
  - ADR-SEC-001-security-and-isolation-model
  - ADR-PROVENANCE-001-release-provenance-model
  - ADR-007-system-entity-standard
related_registry: DEV Studio → Архитектурное управление
```

---

## 1. Назначение

Документ является **единым источником истины** для раздела DEV Studio **«Архитектурное управление»**.

Раздел нужен, чтобы:

- зафиксировать **нормы, решения и контур доставки изменений**, управляющие развитием платформы;
- отделить **governance-слой** от compositional-реестра «Архитектура платформы»;
- обеспечить **единственный источник истины** для каждого типа архитектурной информации;
- дать владельцу платформы, архитектору и разработчику общую модель ограничений и lifecycle.

### Чем отличается от «Архитектуры платформы»

| «Архитектура платформы» | «Архитектурное управление» |
|-------------------------|----------------------------|
| Отвечает: *из чего состоит платформа?* | Отвечает: *как платформа развивается и контролируется?* |
| Compositional-реестр (8 категорий) | Governance-слой (нормы, ADR, lifecycle) |
| Ядро, Модули, Службы, Конфигурация… | Конституция, ADR, контур доставки |
| Описывает **элементы состава** | Описывает **ограничения и процесс изменений** |
| Primary home для 32 стандартов | Primary home для critical norms (projection) |

Категории **«Публикация»** и **«Правила и запреты»** не входят в compositional-состав платформы (см. WI-ARCH-PUB-000, WI-ARCH-RULES-000). Их содержание распределено по governance-слою, [Стандартам](./YASNOPRO_PLATFORM_STANDARDS.md), [Службам](./YASNOPRO_PLATFORM_SERVICES.md), [Данным](./YASNOPRO_PLATFORM_DATA.md) и разделу **«Релизы платформы»**.

Код, API, таблицы БД и реализация UI **не входят** в scope документа.

---

## 2. Что такое архитектурное управление

**Архитектурное управление ЯсноПро** — это governance-слой платформы: совокупность **критических норм**, **принятых архитектурных решений** и **reference-модели доставки изменений**, которые определяют, как платформа может и должна развиваться без архитектурной деградации.

```text
Архитектура платформы
=
из чего состоит платформа
(механизмы, службы, модули, данные, UI, конфигурация)

Архитектурное управление
=
как развивается и контролируется платформа
(нормы, решения, маршрут и фазы доставки)
```

Архитектурное управление **не является**:

- compositional-реестром элементов платформы;
- operational CRUD-контуром релизов;
- журналом событий или audit trail;
- дублирующим хранилищем текста ADR или конституции.

---

## 3. Общая структура

Раздел DEV Studio **«Архитектурное управление»** v1.0:

```text
Архитектурное управление
├─ Обзор
├─ Архитектурная конституция
├─ Архитектурные решения (ADR)
└─ Контур доставки изменений
```

Соседние разделы DEV Studio (отдельные пункты меню, собственный SoT):

```text
Архитектура платформы     ← compositional (8 категорий + Обзор)
Релизы платформы          ← operational release workflow
Журнал событий            ← audit / development journal
```

---

## 4. Архитектурная конституция

### Назначение

**Архитектурная конституция** — двенадцать **критических** норм, обязательных при любой доработке платформы. Нарушение любой из них ведёт к архитектурной деградации.

### Роль в governance

- задаёт **инварианты**, которые нельзя нарушать;
- является **primary SoT для критических ограничений**;
- служит **checklist** для ADR, релизов и архитектурных аудитов;
- в DEV Studio отображается как **read-only projection**, а не как отдельный реестр в БД.

### Источник истины

```text
Источник истины:

YASNOPRO_PLATFORM_STANDARDS.md
раздел «Архитектурная конституция ЯсноПро» (§3)
```

Вкладка «Архитектурная конституция» в DEV Studio **не дублирует** текст норм — она **проецирует** §3 с навигацией, связями и derived index запретов.

### Состав: 12 норм

Полный текст каждой нормы — только в [YASNOPRO_PLATFORM_STANDARDS.md](./YASNOPRO_PLATFORM_STANDARDS.md) §3. Ниже — **список и назначение** без дублирования текста.

| # | Норма | Назначение |
|---|-------|------------|
| 1 | Десять архитектурных категорий | Единая таксономия состава и реестров платформы |
| 2 | Один элемент — одна основная категория | Исключение dual primary в архитектурных реестрах |
| 3 | Методика архитектурной классификации | Алгоритм отнесения новых элементов к категориям |
| 4 | Отображаемое название не является идентификатором | Защита, routing и идентификация только по technical fields |
| 5 | Единый источник истины | Один authoritative слой на домен; service layer как SoT |
| 6 | Разделение платформы и компаний | Граница platform scope и tenant scope |
| 7 | Разработка → Эталон → Компания | Канонический маршрут доставки изменений между средами |
| 8 | Изоляция сред | DEV, Эталон и Компания не смешиваются |
| 9 | Изолированная среда компании | Per-company runtime-контур (БД, backend, frontend slot) |
| 10 | Отсутствие дублирования логики | Бизнес-правила в одном слое; запрет параллельных catalog |
| 11 | Стандарт системных сущностей | System entities по structural key, не по title |
| 12 | Контракт идентичности сущностей | Canonical identity для записей, связей, AI context |

### Связанные запреты

Бывшая категория **«Правила и запреты»** (7 элементов реестра) **не является** отдельным Source of Truth.

```text
Связанные запреты
=
Derived Index
(производное представление на карточке нормы)

а не отдельный реестр
```

Каждый mandatory prohibition **ссылается** на пункт конституции (и при необходимости — на ADR), но **не хранится** как самостоятельная primary-запись.

| Prohibition (index) | Primary norm |
|---------------------|--------------|
| DEV-only development | п.7, п.8 |
| No direct TEMPLATE modifications | п.7 |
| No direct CLIENT modifications | п.7 |
| No tenant bypass | п.8, п.9 |
| No tenant data in Control Plane | п.6 |
| No display name as identifier | п.4 |
| Runtime ≠ designer draft | п.7 + [Конфигурация](./YASNOPRO_PLATFORM_CONFIGURATION.md) |

---

## 5. Архитектурные решения (ADR)

### Назначение

**ADR (Architecture Decision Record)** фиксирует **принятое архитектурное решение**: контекст, альтернативы, последствия и invariants. ADR отвечает на вопрос *«почему принято такое решение?»*, а не *«какая норма обязательна?»*.

### Роль в governance

- хранит **историю и обоснование** решений;
- связывает compositional-элементы с lifecycle и security-моделью;
- служит **checklist** при проектировании новых WI и релизов;
- в DEV Studio — **catalog reader** по markdown-файлам, без редактирования в v1.0.

### Источник истины

```text
docs/architecture/adr/*.md
```

### Структура каталога ADR в DEV Studio

```text
ADR
├─ Принятые      (Accepted)
├─ В работе      (Draft / Proposed)
└─ Архивные      (Superseded / Retired)
```

### ADR — источник «почему», не «что нельзя»

| Тип информации | SoT | Пример |
|----------------|-----|--------|
| **Норма (что обязательно)** | Конституция (STANDARDS §3) | Display ≠ ID |
| **Решение (почему так)** | ADR | ADR-RT-001: per-company runtime |
| **Invariants из ADR** | ADR → **ссылка** на norm # | ADR-SEC-001 → norm п.8–9 |
| **Prescriptive «как делать»** | [Стандарты](./YASNOPRO_PLATFORM_STANDARDS.md) §4–8 | Prompt Standard, Modal Standard |

**Запрещено** дублировать текст ADR-invariant как отдельную запись конституции. ADR **ссылается** на norm; norm **ссылается** на ADR как evidence.

### ADR v1.0 (каталог для отображения)

| Slug | Тема |
|------|------|
| ADR-REL-001 | Unified Release Package |
| ADR-CP-001 | Control Plane orchestration |
| ADR-TPL-001 | Template governance |
| ADR-PROV-001 | Company provisioning |
| ADR-RT-001 | Per-company runtime |
| ADR-UPD-001 | Company update & rollback |
| ADR-RUN-001 | Runtime materialization |
| ADR-DEP-001 | Deployment execution |
| ADR-SEC-001 | Security & isolation |
| ADR-AUD-001 | Audit & event journal |
| ADR-PROVENANCE-001 | Release provenance |
| ADR-007 | System entity standard |
| ADR-001, ADR-006, ADR-008, ADR-009, ADR-010 | Legacy / domain-specific (по статусу) |

Поля карточки ADR в DEV Studio (projection): slug, title, status, date, summary, related_adrs, related_categories, related_services, invariants, document_path, optional linked_journal_entries.

---

## 6. Контур доставки изменений

### Назначение

**Контур доставки изменений** описывает **reference-модель lifecycle** платформы: как изменения проходят от DEV через Эталон к компаниям, какие gates обязательны и как связаны architecture, configuration, release и apply.

### Роль в governance

- даёт **единую схему** delivery для архитектора и владельца платформы;
- **не заменяет** operational-раздел «Релизы платформы»;
- **не дублирует** compositional-реестры и CRUD release artifacts.

### Границы

```text
Контур доставки изменений
=
reference-модель

а не реестр
```

### Маршрут изменений

```text
DEV
 ↓  (разработка, Designer, governance review)
TEMPLATE (Эталон)
 ↓  (materialize, verify, activate)
COMPANY (CLIENT)
 ↓  (offer-gated update, version pin, rollback)
```

Соответствует конституции **п.7–9** и ADR-REL, ADR-TPL, ADR-UPD, ADR-DEP.

### Слои доставки (conceptual)

```text
Архитектура + Конфигурация
        ↓
   Release Package (→ см. Релизы платформы)
        ↓
   Materialize → Verify → Activate
        ↓
   Runtime компании
```

Связь с [Конфигурацией](./YASNOPRO_PLATFORM_CONFIGURATION.md): конвейер доставляет **опубликованные snapshots конфигурации** вместе с изменениями других категорий.

### Основные фазы

```text
Scope       — фиксация состава изменений (Release Scope)
Candidate   — gate review / readiness
Materialize — DEV → TEMPLATE (Publication Service)
Verify      — проверка package и runtime (Deployment Execution)
Activate    — применение к целевой среде
Rollback    — дисциплина отката (archive/soft before hard)
```

Normative details gates — в [Стандартах публикации](./YASNOPRO_PLATFORM_STANDARDS.md) §8 и ADR-PROVENANCE-001.

### Что содержит контур

| Содержимое | Тип |
|------------|-----|
| Маршрут DEV → TEMPLATE → COMPANY | Модель |
| Слои Architecture + Configuration → Release → Apply | Модель |
| Фазы Scope … Rollback | Модель |
| Политики offer-gated update, version pin, rollback | Policy summary |
| Ссылки на Publication Service, Deployment Service | Links → [Службы](./YASNOPRO_PLATFORM_SERVICES.md) |
| Ссылки на активный релиз | Links → Релизы платформы |
| Ссылки на Dirty DEV Check, Release Scope norm | Links → [Стандарты](./YASNOPRO_PLATFORM_STANDARDS.md) §8 |

### Что контур НЕ содержит

```text
Release Package      ← SoT: Релизы платформы
Release Scope        ← SoT: Релизы платформы
Release Candidate    ← SoT: Релизы платформы
Release CRUD         ← SoT: Релизы платформы
Version Pin records  ← SoT: Данные (Release & Operations)
Audit entries        ← SoT: Журнал событий
```

---

## 7. Связь с другими разделами

```text
                    ┌─────────────────────────────┐
                    │   Архитектурное управление   │
                    │  Обзор | Конституция | ADR  │
                    │      Контур доставки         │
                    └───────────┬─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Архитектура   │     │ Релизы          │     │ Журнал          │
│ платформы     │     │ платформы       │     │ событий         │
│ (composition) │     │ (operational)   │     │ (audit trail)   │
└───────┬───────┘     └────────┬────────┘     └────────┬────────┘
        │                      │                       │
        │ 32 standards         │ Release Package       │ DEV journal
        │ 8 categories         │ Scope, Candidate      │ Platform audit
        │ Services link        │ Activate, Deploy      │ Cross-links on ADR
        └──────────────────────┴───────────────────────┘
                                │
                    Конституция ← STANDARDS §3
                    ADR ← docs/architecture/adr/
                    Delivery model ← этот документ + ADR
```

| Раздел | Связь с governance | Направление |
|--------|-------------------|-------------|
| **Архитектура платформы** | Compositional elements проверяются по конституции; ADR links на карточках | Governance → Architecture (constraints) |
| **Стандарты** (в Architecture) | Полный реестр 32; конституция = подмножество §3 | STANDARDS.md → Constitution projection |
| **Релизы платформы** | Active release badge, deep link из Обзора и Контура | Governance → Releases (link only) |
| **Журнал событий** | Cross-links на ADR cards, release events | Governance → Journal (link only) |
| **ADR** | Catalog в governance; файлы — SoT | ADR ↔ Constitution (cross-ref) |
| **Конфигурация** | Published snapshot в delivery chain | CONFIG §3 ↔ Delivery contour |

---

## 8. Единый источник истины

| Тип информации | Источник истины | Роль governance UI |
|----------------|-----------------|-------------------|
| **Критические нормы (конституция)** | [YASNOPRO_PLATFORM_STANDARDS.md](./YASNOPRO_PLATFORM_STANDARDS.md) §3 | Read-only projection |
| **Все стандарты (32)** | [YASNOPRO_PLATFORM_STANDARDS.md](./YASNOPRO_PLATFORM_STANDARDS.md) | Architecture → Стандарты (primary registry) |
| **Связанные запреты** | Derived index → norm # в §3 | Подраздел конституции, не реестр |
| **ADR** | `docs/architecture/adr/*.md` | Catalog reader |
| **Контур доставки** | Этот документ + ADR + STANDARDS §8 + CONFIG §3 | Reference diagram + links |
| **Release Package / Scope / Candidate** | API «Релизы платформы» | Link + badge |
| **Materialize / Verify / Activate / Rollback** | [Службы](./YASNOPRO_PLATFORM_SERVICES.md) + ADR-DEP | Link из контура |
| **Version Pin** | [Данные](./YASNOPRO_PLATFORM_DATA.md) (Release & Operations) | Link из контура |
| **Dirty DEV Check** | STANDARDS §8 | Link из контура |
| **DEV development journal** | DEV tenant journal (`platform_event_journal`) | Журнал событий |
| **Platform audit journal** | Platform event journal (ADR-AUD-001) | Control Plane / audit views |

**Принцип:** одна норма — один primary SoT. Governance UI показывает **projections и links**, не **copies**.

---

## 9. Границы раздела

К **архитектурному управлению** **не относятся** compositional-элементы платформы:

```text
Ядро
Стандарты (полный реестр 32 — в «Архитектуре платформы»)
Службы
Модули
Данные
Элементы интерфейса
Компоненты
Конфигурация
```

Также **не входят** в governance как primary home:

```text
Operational CRUD релизов          → Релизы платформы
Записи журналов                   → Журнал событий
Tenant-данные и объекты компаний  → Office runtime
Исполняемый код и таблицы БД    → Backend / migrations
YASII work items и Dashboard      → Отдельный track (см. YASII docs)
```

Governance **может ссылаться** на эти разделы, но **не дублирует** их содержимое.

---

## 10. Использование

### Владелец платформы

- **Обзор** — health governance: активный релиз, статус ADR, соответствие конституции.
- **Конституция** — что нельзя нарушать при приоритизации и demo readiness.
- **Контур доставки** — как изменения доходят до компаний; куда смотреть при блокерах release.
- **Релизы / Журнал** — operational actions через отдельные разделы меню.

### Архитектор

- Новый элемент → проверка по **12 нормам** до merge.
- Новое решение → ADR в `docs/architecture/adr/`; norm cross-ref, не duplicate text.
- Delivery design → контур + ADR-REL/TPL/UPD/DEP; Release Scope — в «Релизах».
- Классификация → [Методика](./YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md); compositional — 8 категорий.

### Разработчик

- Задача / WI → Constraints из конституции (DEV-only, no direct CLIENT, Display ≠ ID).
- Реализация → связанный ADR; service layer как SoT (norm п.5).
- Публикация → STANDARDS §8 + ссылка на «Релизы платформы»; не обходить Publication Guard.
- Отчёт WI → Architecture Audit, DEV Journal (отдельный SoT в «Журнале событий»).

---

## 11. История версий

| Версия | Статус | Дата | Описание |
|--------|--------|------|----------|
| v1.0 | Draft | 2026-06-19 | Первоначальная фиксация governance-слоя; WI-ARCH-PUB-000, WI-ARCH-RULES-000, WI-ARCH-GOV-001, WI-ARCH-GOV-001A, WI-ARCH-GOV-002 |

---

*Архитектурное управление ЯсноПро v1.0 — официальный архитектурный источник истины для раздела DEV Studio «Архитектурное управление».*
