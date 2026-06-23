# Стандарты платформы ЯсноПро

```yaml
document: platform-standards
title: Стандарты платформы ЯсноПро
version: v1.1
status: Draft
date: 2026-06-20
authority: YASNOPRO Platform Architecture
scope: standards registry definition
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.0
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md v1.2
  - YASNOPRO_CORE_ARCHITECTURE.md v1.0
  - YASNOPRO_PLATFORM_SERVICES.md v1.0
  - YASNOPRO_PLATFORM_MODULES.md v1.0
  - YASNOPRO_PLATFORM_DATA.md v1.0
  - YASNOPRO_INTERFACE_ELEMENTS.md v1.0
  - YASNOPRO_PLATFORM_COMPONENTS.md v1.0
source_audits:
  - WI-ARCH-STD-001
  - WI-ARCH-STD-001A
  - WI-ARCH-STD-MODEL-001
  - WI-ARCH-REG-STD-002
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
related_registry: DEV Studio → Архитектура платформы → Стандарты
```

---

## 1. Назначение документа

Документ является **единым справочником стандартов** платформы ЯсноПро — категории «Стандарты» из [Архитектурной классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION.md).

Документ нужен, чтобы:

- зафиксировать **обязательные правила** проектирования, разработки, документирования, публикации и сопровождения платформы;
- отделить **стандарты** от [ядра](./YASNOPRO_CORE_ARCHITECTURE.md), [служб](./YASNOPRO_PLATFORM_SERVICES.md), [модулей](./YASNOPRO_PLATFORM_MODULES.md), [компонентов](./YASNOPRO_PLATFORM_COMPONENTS.md) и категории **«Правила и запреты»**;
- использовать при подготовке задач, релизов, аудитов, архитектурных реестров и онбординга;
- обеспечить единообразие платформы для владельца продукта, архитектора, аналитика и разработчика.

Документ основан на аудитах **WI-ARCH-STD-001** и нормализации **WI-ARCH-STD-001A** (**32 стандарта** в пяти группах + **архитектурная конституция**).  
Код, API, таблицы БД и реализация **не входят** в scope документа.

**Где применяется:** архитектура, разработка (включая Cursor), Control Plane, публикации DEV → Эталон → Компания, UX/UI, данные, качество, документация.

---

## 2. Что такое стандарт платформы

**Стандарт платформы** — это **обязательное правило, норма, соглашение или ограничение**, которое должно соблюдаться при проектировании, разработке, документировании, публикации и сопровождении платформы.

### Стандарт не является

- **исполняемой службой** (provisioning, publication service);
- **механизмом ядра** (объекты, поля, view engine);
- **компонентом или элементом интерфейса**;
- **записью данных** tenant;
- **ADR как артефактом** — ADR фиксирует решение; **нормы из ADR** входят в реестр стандартов.

### Отличие от «Правил и запретов»

| Стандарты | Правила и запреты |
|-----------|-------------------|
| *Как должно быть устроено и делаться* | *Что категорически нельзя* |
| Модальные окна, классификация, релиз | Прямые правки CLIENT без конвейера |

Стандарты и правила **дополняют** друг друга; при конфликте приоритет у **безопасности данных и изоляции сред**.

---

## 3. Архитектурная конституция ЯсноПро

**Архитектурная конституция** — двенадцать **критических** норм, обязательных при **любой** доработке платформы. Нарушение любой из них ведёт к архитектурной деградации.

---

### 1. Десять архитектурных категорий

**Назначение**  
Единая модель состава платформы для реестров, ADR и релизов.

**Что регулирует**  
Ядро, Стандарты, Службы, Модули, Данные, Элементы интерфейса, Компоненты, Runtime, Публикация, Правила и запреты.

**Почему важно**  
Без общей таксономии невозможны реестры DEV Studio и трассировка изменений.

**При нарушении**  
Дублирование элементов, хаос в release scope, споры о классификации.

**Критичность:** Критический  
**Связанные категории:** все 10 категорий классификации

---

### 2. Один элемент — одна основная категория

**Назначение**  
У каждого архитектурного элемента — **одна** primary-категория в реестре.

**Что регулирует**  
Допустимы связанные категории; запрещены две основные.

**Почему важно**  
Исключает дубли записей и противоречия в Dashboard.

**При нарушении**  
Один модуль в реестре «Ядро» и «Модули» одновременно.

**Критичность:** Критический  
**Связанные категории:** Методика классификации

---

### 3. Методика архитектурной классификации

**Назначение**  
Единый алгоритм отнесения новых элементов к категориям.

**Что регулирует**  
Критерии включения/исключения, порядок разрешения конфликтов.

**Почему важно**  
Source of truth для всех архитектурных реестров.

**При нарушении**  
Произвольная классификация «по папке в коде».

**Критичность:** Критический  
**Связанные категории:** Архитектурная классификация, все реестры

---

### 4. Отображаемое название не является идентификатором

**Назначение**  
Защита, routing и идентификация только по **техническим** полям.

**Что регулирует**  
Запрет использовать `name`, `title`, `short_name`, `label` как id, key, marker защиты.

**Почему важно**  
Display-поля редактируются в UI; demo tenant нельзя защищать по названию.

**При нарушении**  
Сломанная защита Розетки, routing по переименованию, утечки в cleanup.

**Критичность:** Критический  
**Связанные категории:** Ядро (Доступ), Данные, Правила и запреты

---

### 5. Единый источник истины

**Назначение**  
На каждый домен — **один** authoritative слой данных и логики.

**Что регулирует**  
Service layer как SoT; UI и скрипты не дублируют бизнес-правила.

**Почему важно**  
Dual SoT — главный источник регрессий Entity/View/Release.

**При нарушении**  
Таблица и карточка показывают разное; governance и runtime расходятся.

**Критичность:** Критический  
**Связанные категории:** Ядро, Данные, Компоненты

---

### 6. Разделение платформы и компаний

**Назначение**  
Чёткая граница platform scope и tenant scope.

**Что регулирует**  
Платформенные реестры ≠ записи объектов компании; CP ≠ Office data.

**Почему важно**  
Смешение ведёт к утечкам config в runtime и наоборот.

**При нарушении**  
Тестовые компании в architecture seed; правки demo через platform API.

**Критичность:** Критический  
**Связанные категории:** Runtime, Данные, Службы (Provisioning)

---

### 7. Разработка → Эталон → Компания

**Назначение**  
Канонический маршрут доставки изменений между средами.

**Что регулирует**  
DEV → TEMPLATE (Эталон) → CLIENT (Компания); без обходных прямых правок.

**Почему важно**  
Governance, provenance, rollback опираются на этот маршрут.

**При нарушении**  
Несогласованные версии, невозможность audit trail.

**Критичность:** Критический  
**Связанные категории:** Публикация, Runtime, Правила и запреты

---

### 8. Изоляция сред

**Назначение**  
Среды DEV, Эталон и Компания не смешиваются.

**Что регулирует**  
Отдельные контуры данных, конфигурации, политики доступа.

**Почему важно**  
Cross-env corruption — blocker для enterprise.

**При нарушении**  
Test junk в Эталоне; production writes из DEV.

**Критичность:** Критический  
**Связанные категории:** Runtime, Правила и запреты (ADR-SEC)

---

### 9. Изолированная среда компании

**Назначение**  
У каждой компании — собственный runtime-контур (БД, backend, frontend slot).

**Что регулирует**  
Per-company materialization; update/rollback на уровне компании.

**Почему важно**  
Multi-tenant isolation — базовое обещание платформы.

**При нарушении**  
Shared DB leaks; update одной компании ломает другую.

**Критичность:** Критический  
**Связанные категории:** Runtime, Службы, Публикация

---

### 10. Отсутствие дублирования логики

**Назначение**  
Бизнес-правила живут в **одном** слое (service/backend), не в UI и скриптах.

**Что регулирует**  
Запрет параллельных catalog/registry без синхронизации.

**Почему важно**  
Модульная архитектура без copy-paste.

**При нарушении**  
Три определения «готовности релиза»; расхождение Dashboard и runtime.

**Критичность:** Высокий  
**Связанные категории:** Ядро, Модули, Стандарты разработки

---

### 11. Стандарт системных сущностей

**Назначение**  
Платформенные singleton-записи идентифицируются **структурным ключом**, не title.

**Что регулирует**  
Ensure/reconcile/recovery для navigation, workspace, plan anchor и аналогов.

**Почему важно**  
Дубли system entities ломают Plan View, home, navigation.

**При нарушении**  
Циклы в дереве, несколько «корней», orphan FK.

**Критичность:** Высокий  
**Связанные категории:** Ядро, Данные (ADR-007)

---

### 12. Контракт идентичности сущностей

**Назначение**  
Единый canonical формат identity для записей, комментариев, связей, AI context.

**Что регулирует**  
Runtime Entity как business SoT; legacy formats — только read compat.

**Почему важно**  
Сквозная навигация и интеграции без orphan links.

**При нарушении**  
Комментарии на `universal_table:{id}` вместо business entity.

**Критичность:** Высокий  
**Связанные категории:** Ядро (Объекты), Данные

---

## 4. Архитектурные стандарты

Раздел **4** не дублирует карточки конституции (раздел 3). Конституция — **ядро** группы «Архитектурные стандарты»; ниже — **взаимосвязи** и применение.

```text
Архитектурная конституция (12 норм)
        │
        ├── Классификация (1–3) ──► все реестры DEV Studio
        ├── Identity & SoT (4–5, 11–12) ──► Backend, CP, Entity layer
        ├── Scope & Runtime (6–9) ──► Provisioning, Update, CP
        └── Модульность (10) ──► Backend / Frontend boundaries
```

| Блок конституции | Связанные документы | Связанные ADR |
|-----------------|---------------------|---------------|
| Классификация | YASNOPRO_ARCHITECTURE_CLASSIFICATION*, методика | — |
| Identity & SoT | Entity Identity Contract, Entity Model | ADR-SEC, ADR-007 |
| Scope & Runtime | Tenant strategy, Runtime foundation | ADR-RT, ADR-TPL, ADR-PROV |
| Модульность | Architecture Rules, Core Architecture | — |

**Применение:** любой новый модуль, служба, реестр или ADR **обязан** пройти проверку по конституции до merge и публикации.

### 4.1. Реестр Architecture Navigator (`registry_key=standards`)

Иерархия seed: **6 групп** × **35** `component_key` (WI-ARCH-REG-STD-002).  
Legacy `standard-object`, `standard-field`, `standard-api`, `standard-journal`, `standard-publication`, `standard-modules` **не входят** в active registry.  
ADR (`ADR-*`) — отдельный governance-контур; контракты и конвенции — **связанные документы**, не строки реестра.

#### Группа 1. Конституция (12)

| component_key | Название | related_adrs | related_contracts |
|---------------|----------|--------------|-------------------|
| `constitution-norm-ten-categories` | Десять архитектурных категорий | — | YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md |
| `constitution-norm-one-primary-category` | Один элемент — одна основная категория | — | YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md |
| `constitution-norm-classification-methodology` | Методика архитектурной классификации | — | YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md |
| `constitution-norm-display-not-id` | Отображаемое название не является идентификатором | ADR-SEC-001, ADR-007 | YASNOPRO_ENTITY_IDENTITY_CONTRACT.md |
| `constitution-norm-single-sot` | Единый источник истины | — | — |
| `constitution-norm-platform-tenant-separation` | Разделение платформы и компаний | ADR-CP-001 | — |
| `constitution-norm-dev-template-company` | Разработка → Эталон → Компания | ADR-TPL-001, ADR-UPD-001, ADR-REL-001 | — |
| `constitution-norm-environment-isolation` | Изоляция сред | ADR-SEC-001 | — |
| `constitution-norm-company-isolated-runtime` | Изолированная среда компании | ADR-RT-001, ADR-SEC-001, ADR-PROV-001 | — |
| `constitution-norm-no-logic-duplication` | Отсутствие дублирования логики | — | — |
| `constitution-norm-system-entity-standard` | Стандарт системных сущностей | ADR-007 | — |
| `constitution-norm-entity-identity-contract` | Контракт идентичности сущностей | — | YASNOPRO_ENTITY_IDENTITY_CONTRACT.md |

#### Группа 2. Архитектурные принципы (3)

| component_key | Название | related_adrs |
|---------------|----------|--------------|
| `decision-control-plane-not-tenant` | Control Plane ≠ Tenant | ADR-CP-001 |
| `decision-platform-owner-not-tenant-user` | Platform Owner ≠ Tenant User | ADR-009, ADR-010 |
| `decision-entity-sot` | Entity — источник истины данных | ADR-001 |

#### Группа 3. Стандарты разработки (10)

| component_key | Название | cursor_rules |
|---------------|----------|--------------|
| `standard-dev-prompt-preparation` | Стандарт подготовки задач | 02_PROMPT_STANDARD.mdc |
| `standard-dev-journal` | Журнал разработки | dev-journal-mandatory.mdc |
| `standard-dev-doc-sync` | Синхронизация документации | yasii-dashboard-gate.mdc |
| `standard-dev-architecture-audit` | Архитектурный аудит | 03_QUALITY_CONTROL.mdc, 01_ARCHITECTURE_RULES.mdc |
| `standard-dev-test-data-control` | Контроль тестовых данных | 03_QUALITY_CONTROL.mdc, platform-data-safety.mdc |
| `standard-dev-cleanup-control` | Контроль очистки | 03_QUALITY_CONTROL.mdc, task-local-test-data-ownership.mdc |
| `standard-dev-data-impact` | Проверка влияния на данные | platform-data-safety.mdc, 03_QUALITY_CONTROL.mdc |
| `standard-dev-demo-readiness` | Проверка готовности демонстрации | 03_QUALITY_CONTROL.mdc |
| `standard-dev-manual-smoke` | Ручная проверка | 02_PROMPT_STANDARD.mdc, 03_QUALITY_CONTROL.mdc |
| `standard-dev-test-data-ownership` | Владение тестовыми данными задачи | task-local-test-data-ownership.mdc |

#### Группа 4. Стандарты интерфейса (5)

| component_key | Название | related_contracts |
|---------------|----------|-------------------|
| `standard-ui-modal` | Стандарт модальных окон | YASNOPRO_PLATFORM_MODAL_STANDARD.md |
| `standard-ui-color-zones` | Цветовые зоны платформы | — |
| `standard-ui-three-level-model` | Трёхуровневая модель интерфейса | — |
| `standard-ui-card-structure` | Единая структура карточек | OBJECT_VIEW_CONTRACT.md |
| `standard-ui-navigation-shell` | Стандарт навигационной оболочки | — |

#### Группа 5. Стандарты данных (2)

| component_key | Название | related_adrs | related_contracts |
|---------------|----------|--------------|-------------------|
| `standard-data-identifiers` | Технические идентификаторы и ключи | ADR-SEC-001 | YASNOPRO_ENTITY_IDENTITY_CONTRACT.md |
| `standard-data-event-journal` | Модель журналов событий | ADR-AUD-001 | — |

#### Группа 6. Стандарты публикации (3)

| component_key | Название | related_adrs |
|---------------|----------|--------------|
| `standard-pub-release-package` | Единый пакет релиза | ADR-REL-001 |
| `standard-pub-release-scope` | Область и состав релиза | ADR-REL-001, ADR-PROVENANCE-001 |
| `standard-pub-governance-discipline` | Управление публикацией и дисциплина релиза | ADR-UPD-001, ADR-TPL-001, ADR-CP-001, ADR-PROVENANCE-001 |

**Scanner coverage (target):** 35 / 35 — `STANDARDS_REGISTRY_COMPONENT_KEYS` + `STANDARDS_SCAN_SCOPES`.

---

## 5. Стандарты разработки

Нормы создания и сопровождения платформы. Обязательны для агентов Cursor, разработчиков и ревьюеров.

---

### Стандарт подготовки задач

**Что регулирует**  
Полная структура промта: Context, Goal, Current State, Required Changes, Constraints, Tests, Manual Smoke, Report, DEV Journal, Success Criteria.

**Когда применяется**  
Каждый значимый WI, feature, fix, audit.

**Почему обязателен**  
Неполные задачи → пропуск QC, потеря контекста, невоспроизводимые отчёты.

---

### Журнал разработки

**Что регулирует**  
Обязательная запись в DEV tenant journal после значимого WI: slug, summary, changed_files, tests, manual_smoke.

**Когда применяется**  
После каждого завершённого WI с изменением кода или архитектурного артефакта.

**Почему обязателен**  
Traceability для владельца платформы и DEV Studio; idempotency по slug.

---

### Синхронизация документации

**Что регулирует**  
Phase 5 Development Lifecycle: обновление architecture status, Dashboard sources, Completion Summary после кода.

**Когда применяется**  
Завершение этапов Runtime, Designer, Platform, YASII track.

**Почему обязателен**  
Исключает «код done — Dashboard stale».

---

### Архитектурный аудит

**Что регулирует**  
Pass/Fail по SoT, дублированию, tenant architecture, display vs technical id перед статусом DONE.

**Когда применяется**  
Каждая значимая задача; обязательная секция финального отчёта.

**Почему обязателен**  
Раннее обнаружение архитектурного drift.

---

### Контроль тестовых данных

**Что регулирует**  
Формат Created/Deleted/Verification; запрет DONE при leak в demo.

**Когда применяется**  
Любая задача, создававшая tenant, user, release, package, записи объектов.

**Почему обязателен**  
Demo readiness; защита DEV, Розетки, Platform Template.

---

### Контроль очистки

**Что регулирует**  
Cleanup status = PASSED только при 0 remaining test records и no UI visibility.

**Когда применяется**  
После тестов и скриптов с данными; финальный gate задачи.

**Почему обязателен**  
Архивирование ≠ очистка; Test* в Control Plane недопустимы.

---

### Проверка влияния на данные

**Что регулирует**  
Data Impact Audit: tables, rows before/after, dry-run перед destructive ops.

**Когда применяется**  
Миграции, cleanup scripts, restore, seed writes.

**Почему обязателен**  
Предотвращает silent data loss; обязателен при touch данных.

---

### Проверка готовности демонстрации

**Что регулирует**  
Вопрос: «Будет ли профессионально через неделю на демо?»

**Когда применяется**  
Перед закрытием задач, затрагивающих UI, CP, demo tenant.

**Почему обязателен**  
Отсеивает мусорные компании, битый UX, leak users.

---

### Ручная проверка

**Что регулирует**  
Manual Smoke в отчёте: шаги UI/CLI или NOT PERFORMED + reason.

**Когда применяется**  
Feature WI, UX changes, publication flows.

**Почему обязателен**  
Автотесты не покрывают весь product UX.

---

### Владение тестовыми данными задачи

**Что регулирует**  
Создал → зафиксировал id → удалил по id → подтвердил отсутствие.

**Когда применяется**  
Любые task-local test entities; stricter than generic cleanup scripts.

**Почему обязателен**  
Cleanup по шаблону имени не заменяет удаление по id.

---

## 6. Стандарты интерфейса

Нормы проектирования пользовательского опыта платформы.

---

### Стандарт модальных окон

**Что регулирует**  
Единые модальные окна: drag, resize, persist bounds, footer layout, запрет custom fixed popover для настроек.

**Почему обязателен**  
Собирает элемент «Модальная зона»; регрессии настроек таблиц и Studio.

**Связь:** [Компонент PlatformModal](./YASNOPRO_PLATFORM_COMPONENTS.md), Platform Modal Standard (технический doc).

---

### Цветовые зоны платформы

**Что регулирует**  
Studio — фиолетовый акцент; Office — синий; наследование через data-platform-zone.

**Почему обязателен**  
Визуальное различие режимов проектирования и работы.

---

### Трёхуровневая модель интерфейса

**Что регулирует**  
Разделение уровней:

| Уровень | Вопрос | Пример |
|---------|--------|--------|
| **Элемент интерфейса** | Что видит пользователь? | Карточка объекта, боковое меню |
| **Компонент платформы** | Из чего собрано? | PlatformCard, PlatformSidebar |
| **UI-библиотека** | Как реализовано? | Кнопка, поле ввода, checkbox |

**Почему обязателен**  
Предотвращает pollution реестра «Компоненты» atomic controls.

---

### Единая структура карточек

**Что регулирует**  
Hero, секции, вкладки, поля, related data — единый card pattern Office/Studio.

**Почему обязателен**  
Элемент «Карточка объекта» узнаваем пользователем.

---

### Стандарт навигационной оболочки платформы

**Что регулирует**  
App Shell: sidebar, header, workspace tabs, breadcrumbs — единый контракт Office/Studio/CP.

**Почему обязателен**  
Собирает элементы глобальной оболочки из [реестра UI](./YASNOPRO_INTERFACE_ELEMENTS.md).

---

## 7. Стандарты данных

Нормы проектирования и использования данных платформы.

---

### Технические идентификаторы и ключи

**Что регулирует**  
Стабильные `id`, `key`, `code`, `slug`; генерация key из name — с collision handling; не редактировать key через display forms.

**Почему обязателен**  
Ссылки, release scope, navigation, protection опираются на technical keys.

**Связь с конституцией:** дополняет норму «Отображаемое название не является идентификатором».

---

### Модель журналов событий

**Что регулирует**  
Scope (platform/tenant), journal_kind, audit fields; display title в событии **не** protection key.

**Почему обязателен**  
DEV journal, platform audit, provenance, compliance.

**Связь:** ADR-AUD-001, DEV Journal standard.

---

### Почему display-названия нельзя использовать как идентификаторы

1. **Редактируемость** — пользователь меняет название компании, объекта, раздела в UI.  
2. **Локализация** — одна сущность, разные подписи.  
3. **Защита demo** — «ООО Розетка» может быть переименована; защита только через `is_protected`, `environment_role`, `id`.  
4. **Routing** — deep links и API стабильны только на technical id/key.  
5. **Cleanup** — удаление по name/code ловит wrong tenant.

Норма зафиксирована в **конституции (п. 4)** и **Architecture Rules**; стандарт данных **уточняет применение к ключам и журналам**.

---

## 8. Стандарты публикации

Нормы поставки изменений между средами.

---

### Единый пакет релиза

**Что регулирует**  
Каноническое определение релиза: immutable Unified Release Package с code artifacts и governance metadata.

**Почему обязателен**  
Устраняет три параллельных «релиза» (physical, governance, module-only).

**Связь:** ADR-REL-001.

---

### Область и состав релиза

**Что регулирует**  
Release Scope: что входит в пакет — модули, компоненты, migrations, config snapshots.

**Почему обязателен**  
Verify и activate проверяют **заявленный** состав.

**Связь:** Release Scope service, ADR-REL.

---

### Управление публикацией и дисциплина релиза

**Что регулирует**  
Совокупность норм публикационного конвейера:

| Под-норма | Содержание |
|-----------|------------|
| **Подтверждение происхождения изменений** | Provenance: откуда artifact, кто approved (ADR-PROVENANCE) |
| **Контроль состава изменений** | Dirty DEV check, review → candidate |
| **Управление версиями** | Version pin при apply к компании |
| **Откат изменений** | Rollback discipline: archive/soft before hard; confirm + flags |

**Почему обязателен**  
Governance Control Plane; безопасный путь DEV → Эталон → Компания.

**Связь:** ADR-UPD, ADR-TPL, ADR-CP, категория **Публикация** (исполняемые механизмы).

---

## 9. Карта стандартов платформы

```text
Стандарты платформы v1.1

├─ Архитектурная конституция (12) — component_key constitution-norm-*
├─ Архитектурные принципы (3) — decision-*
├─ Стандарты разработки (10) — standard-dev-*
├─ Стандарты интерфейса (5) — standard-ui-*
├─ Стандарты данных (2) — standard-data-*
└─ Стандарты публикации (3) — standard-pub-*
```

**Итого реестра v1.1:** **35** canonical `component_key` (§4.1). Конституция numerically overlaps v1.0 «32 + principles» — v1.1 явно включает 3 архитектурных принципа как отдельную группу.

---

## 10. Взаимосвязь стандартов

```text
Архитектурная конституция
  ↓ задаёт рамки
Архитектурные стандарты (классификация, SoT, runtime)
  ↓ реализуются через
Стандарты разработки (prompt, journal, audits)
  ↓ выпускают изменения по
Стандарты публикации (package, scope, governance)
  ↓ материализуются в
Runtime компании (Изолированная среда)
  ↓ показываются через
Стандарты интерфейса + Стандарты данных
  ↓ собираются из
Компоненты + Элементы интерфейса (см. sibling docs)
```

**Пример сквозной цепочки:**

```text
Норма «Разработка → Эталон → Компания»
  → Release Scope фиксирует состав
  → Verify проверяет package
  → Apply в изолированной среде компании
  → Manual Smoke + Cleanup Audit подтверждают demo-ready
```

---

## 11. Использование документа

Документ применяется для:

- **архитектуры** — проверка ADR и новых реестров по конституции;
- **разработки** — Prompt Standard, audits, journal;
- **подготовки задач** — Constraints и Success Criteria в Cursor;
- **подготовки релизов** — publication standards + scope;
- **аудитов** — Architecture, Test Data, Cleanup, Data Impact;
- **документации** — единая терминология стандартов;
- **онбординга** — входной справочник для архитектора, аналитика, разработчика.

**Связанные артефакты вне реестра v1.0 (v1.1):** Field Presentation Layer, YASII Dashboard Gate, отдельная запись «Защита данных платформы» (норма покрыта конституцией + контроль тестовых данных + Rules).

---

## 12. История версий

| Версия | Статус | Дата | Описание |
|--------|--------|------|----------|
| v1.1 | Draft | 2026-06-20 | 35 component_key, иерархия 6 групп, ADR/contract links; WI-ARCH-REG-STD-002 |
| v1.0 | Draft | 2026-06-19 | 32 стандарта, конституция 12; WI-ARCH-STD-001, WI-ARCH-STD-001A |
