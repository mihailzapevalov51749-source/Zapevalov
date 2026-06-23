# Политика владения кодом архитектурных элементов ЯсноПро

```yaml
document: code-ownership-policy
title: Политика Primary Owner для архитектурных элементов
version: v1.0
status: Draft
date: 2026-06-20
authority: YASNOPRO Platform Architecture
scope: file → architecture element attribution (Primary Owner / Related Elements)
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.2
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md v1.2
  - YASNOPRO_CORE_ARCHITECTURE.md v1.0
  - YASNOPRO_ARCHITECTURE_GOVERNANCE.md v1.0
source_audits:
  - WI-ARCH-COVERAGE-002
  - WI-ARCH-OWNERSHIP-001
  - WI-ARCH-OWNERSHIP-002
related_registry: DEV Studio → Архитектура платформы → Architecture Navigator
implementation_status: policy only — scanner/registry not changed in WI-ARCH-OWNERSHIP-002
```

---

## 1. Назначение

Документ является **единым источником истины** для правил:

```text
Файл платформы
  → Primary Owner (единственный владелец реализации)
  → Related Elements (дополнительные архитектурные связи)
```

Политика устраняет системную ошибку, выявленную в WI-ARCH-OWNERSHIP-001: **агрегаторы данных**, **UI-контуры** и **configuration groups** ошибочно становятся Primary Owner там, где реализацию ведут **engines**, **components**, **services** или **modules**.

Код, scanner, registry и БД **не изменяются** данным WI — документ задаёт целевую модель для последующего WI внедрения.

---

## 2. Определения

### 2.1 Primary Owner

**Primary Owner** — единственный архитектурный элемент, которому **принадлежит реализация файла**: ответственность за поведение, API, lifecycle и эволюцию кода.

Инварианты:

| Инвариант | Правило |
|-----------|---------|
| Единственность | У каждого файла платформы ровно **один** Primary Owner |
| Обязательность | У каждого файла платформы Primary Owner **обязан** существовать |
| Реализация | Primary Owner отвечает за **код**, а не за мета-описание или потребление |
| Идентификация | Primary Owner определяется по `component_key`, не по display name |

### 2.2 Related Element

**Related Element** — архитектурный элемент, который:

- **использует** файл (consumer / contour / configuration surface);
- **регулирует** файл (norm / standard / decision);
- **агрегирует** данные или UI-паттерн, реализованный другим элементом;
- **связан** через architecture_links или пересекающийся scan scope.

Related Element **не заменяет** Primary Owner.

### 2.3 CODE_OWNER

Элемент **обязан** иметь Primary-файлы в scope своей реализации. Отсутствие Primary-файлов при наличии кода в scope — **дефект атрибуции**, а не «концептуальность».

### 2.4 AGGREGATOR

Элемент описывает **совокупность** других элементов (data rollups, interface contours). **Не может** быть Primary Owner файлов реализации дочерних элементов.

### 2.5 CONCEPTUAL

Элемент описывает **принцип, норму, стандарт или решение** без обязательной собственной реализации. Primary-файлы **не обязательны**. Допускается **reference implementation** (см. §8.4).

### 2.6 REFERENCE_IMPLEMENTATION

Узкий подмножество файлов, явно помеченных как эталонная реализация norm/standard (например guard в `backend/app/core/`). Primary Owner = norm-element **только** для этих путей; не распространяется на весь репозиторий.

---

## 3. Главный принцип

```text
Каждый файл платформы имеет Primary Owner.

Primary Owner = владелец реализации, а не:
  • агрегатор данных;
  • UI-контур;
  • configuration group;
  • архитектурный принцип (кроме reference implementation).
```

---

## 4. Кто имеет право быть Primary Owner

| Tier | Registry key | Может быть Primary Owner | Условие |
|------|--------------|--------------------------|---------|
| 1 | `core` | **Да** | Engine / company-model — владелец runtime и designer механизма |
| 2 | `services` | **Да** | Platform service — владелец orchestration/API/identity |
| 3 | `modules` | **Да** | Domain module — владелец feature-модуля |
| 4 | `components` | **Да** | Platform component — владелец переиспользуемого UI/API-компонента |
| 5 | `configuration` | **Частично** | Только designer/config surfaces; не runtime engine code |
| 6 | `data` | **Крайне ограниченно** | Только persistence-only слой без engine (см. §6.6) |
| 7 | `interface` | **Нет** (default) | Только UI-contour markers без собственной библиотеки |
| 8 | `standards` | **Нет** (default) | Кроме REFERENCE_IMPLEMENTATION (§8.4) |

---

## 5. Кто никогда не должен быть Primary Owner

Следующие классы **запрещено** назначать Primary Owner, если в scope match участвует элемент tier 1–4:

| Класс | Примеры | Почему |
|-------|---------|--------|
| Data aggregators | `business-records-data`, `users-access-data`, `structure-metadata-data` | Агрегируют stores engines/modules |
| Interface contours | `modal-zone`, `view-surface`, `side-navigation`, `context-menu`, `user-menu` | Описывают зону UI, не библиотеку |
| Configuration groups | `config-group-navigation`, `config-group-pages`, `config-pages-composition` | Группируют настройки; runtime ведут engines |
| Conceptual norms (широкий scope) | `constitution-norm-platform-tenant-separation`, `decision-control-plane-not-tenant` | Принципы, не реализация |
| Publication standards | `standard-pub-release-package`, `standard-pub-governance-discipline` | Governance rules |
| Dev process standards | `standard-dev-journal`, `standard-dev-prompt-preparation` | Process / Cursor rules |

**Исключение:** элемент tier 5–8 может стать Primary Owner **только если** нет match tier 1–4 и файл явно принадлежит только этому tier (§7).

---

## 6. Статус по категориям реестра

### 6.1 CORE (12 элементов)

**Ответ: Да, CORE engines — главные кандидаты Primary Owner.**

| Элемент | Primary Owner | Related |
|---------|---------------|---------|
| `entity-engine` | **Да** | `business-records-data`, `platform-card`, `config-group-published-catalog` |
| `object-types-engine` | **Да** | `structure-metadata-data`, `config-group-object-placement` |
| `fields-engine` | **Да** | `platform-form`, `structure-metadata-data` |
| `relation-engine` | **Да** | `relation-instances-data` |
| `view-engine` | **Да** | `platform-table`, `view-surface`, `config-group-object-placement` |
| `navigation-engine` | **Да** | `config-group-navigation`, `platform-tree`, `side-navigation` |
| `action-engine` | **Да** | `platform-toolbar`, `config-group-action-placement` |
| `process-engine` | **Да*** | `action-engine`, `module-bpmn` (* см. §10 MISCLASSIFIED) |
| `event-engine` | **Да** | `journals-data`, `standard-data-event-journal` |
| `permission-engine` | **Да** | `users-access-data`, `decision-platform-owner-not-tenant-user` |
| `portal-composition-engine` | **Да** | `config-group-pages`, `config-pages-composition`, `platform-page` |
| `company-model` | **Да** | `tenant-configuration-data`, `company-provisioning` |

### 6.2 SERVICES (9 элементов)

**Ответ: Да, services — Primary Owner orchestration и platform APIs.**

| Элемент | Primary Owner |
|---------|---------------|
| `platform-identity` | **Да** — CP identity, не `decision-platform-owner-not-tenant-user` |
| `session-bridge` | **Да** — `session_bridge/`, не `context-switcher` |
| `publication-service` | **Да** |
| `deployment-execution` | **Да*** (* граница с publication-service, §10) |
| `file-service` | **Да** — не `file-metadata-data` |
| `search-service` | **Да** |
| `notification-dispatch` | **Да*** (* граница с notifications-module, §10) |
| `ai-context-engine` | **Да** |
| `company-provisioning` | **Да** |

### 6.3 MODULES (6 элементов)

**Ответ: Да, modules — Primary Owner domain feature code.**

Все `*-module`, `module-yasii`, `module-bpmn` — **Primary Owner** своих `modules/<name>/` paths. Не делегировать Primary `module-domain-data`.

### 6.4 COMPONENTS (18 элементов)

**Ответ: Да, components — Primary Owner shared UI libraries.**

| Пример | Primary Owner | Не Primary |
|--------|---------------|------------|
| `platform-modal` | `shared/platformModal/` | `modal-zone`, `standard-ui-modal` |
| `platform-tree` | navigation + plan tree UI | `context-menu`, `config-group-navigation` |
| `platform-sidebar` | `shared/shell/sidebar/` | `side-navigation` |
| `platform-toolbar` | toolbar components | `action-panel`, `config-card-actions` |
| `platform-card` | entity card shell | `entity-card` (interface) |
| `platform-context-menu` | context menu lib | `context-menu` (interface) |

`platform-kanban`, `platform-calendar` — **Primary Owner** (status planned — scope может быть partial).

### 6.5 CONFIGURATION (38 элементов)

**Ответ: Configuration — владелец настройки (designer surfaces), не runtime engine.**

| Тип | Primary Owner | Related |
|-----|---------------|---------|
| `config-group-*` | Designer grouping / admin pages | Связанный engine |
| `config-pages-composition` | Designer page composition UI | `portal-composition-engine` |
| `config-group-navigation` | Menu settings designer | `navigation-engine` |
| `config-nav-*` | Конкретная настройка nav | `navigation-engine` |

**Правило конфликта:** если файл в `modules/platform/runtime/` или engine service layer — Primary **не** configuration, даже при scope match.

Configuration **Primary Owner** для:

- `modules/designer/**` (designer UI конфигурации);
- `modules/platform/designer/**` (designer backend);
- узких config-only paths без engine overlap.

### 6.6 DATA (11 элементов)

**Ответ: DATA — агрегаторы; не владельцы реализации по умолчанию.**

| Элемент | Статус | Primary-файлы |
|---------|--------|-----------------|
| `module-domain-data` | AGGREGATOR | Нет |
| `structure-metadata-data` | AGGREGATOR | Нет |
| `relation-instances-data` | AGGREGATOR | Нет |
| `users-access-data` | AGGREGATOR | Нет |
| `tenant-configuration-data` | AGGREGATOR | Нет |
| `user-settings-data` | AGGREGATOR | Нет |
| `journals-data` | AGGREGATOR | Нет |
| `release-operations-data` | AGGREGATOR | Нет |
| `business-records-data` | AGGREGATOR | **Нет** — не перехватывать `entity-engine` |
| `platform-catalog-data` | AGGREGATOR / narrow store | Только catalog persistence без engine |
| `file-metadata-data` | AGGREGATOR | **Нет** — не перехватывать `file-service` |

### 6.7 INTERFACE (20 элементов)

**Ответ: INTERFACE — UI-контуры; не Primary Owner библиотек.**

Все interface elements — **Related only**, кроме файлов без match tier 1–4 (редко).

| Contour | Related к |
|---------|-----------|
| `modal-zone` | `platform-modal` |
| `view-surface` | `view-engine`, `entity-card` |
| `side-navigation` | `navigation-engine`, `platform-sidebar` |
| `workspace-tabs` | `platform-tabs` |
| `notification-center` | `notifications-module` |
| `user-menu` | `users-access-data`, `avatar` |
| `entity-card` | `platform-card` |
| `context-menu` | `platform-context-menu` |

### 6.8 STANDARDS / DECISIONS / CONSTITUTION (33 элемента)

**Ответ: CONCEPTUAL — Primary-файлы не обязательны.**

| Подкласс | Primary-файлы | Исключение |
|----------|---------------|------------|
| `constitution-norm-*` (большинство) | Нет | REFERENCE_IMPLEMENTATION: `environment-isolation`, `company-isolated-runtime`, `display-not-id`, `entity-identity-contract` |
| `decision-*` | Нет | `decision-platform-owner-not-tenant-user` — Related к auth, не Primary CP |
| `standard-pub-*` | Нет | — |
| `standard-dev-journal`, `prompt`, `demo`, `test-data-ownership` | Нет | Process rules |
| `standard-ui-modal` | Нет | Реализация = `platform-modal` |
| `standard-data-event-journal` | Нет | Реализация = `event-engine` |
| `standard-dev-architecture-audit` | REFERENCE_IMPLEMENTATION | Architecture Navigator scanner |
| `standard-dev-doc-sync` | REFERENCE_IMPLEMENTATION | Platform Dashboard sync |
| `standard-ui-three-level-model`, `navigation-shell`, `color-zones` | REFERENCE_IMPLEMENTATION | Shared UI shell paths |

---

## 7. Порядок приоритетов (Tier Priority)

### 7.1 Официальный порядок

```text
1. Core
2. Services
3. Modules
4. Components
5. Configuration
6. Data
7. Interface
8. Standards
```

### 7.2 Обоснование

| Tier | Обоснование |
|------|-------------|
| **1 Core** | Engines — первичный механизм платформы; runtime behavior originates here |
| **2 Services** | Orchestration поверх engines; identity, publication, search |
| **3 Modules** | Domain features потребляют engines/services |
| **4 Components** | Переиспользуемые UI/API building blocks |
| **5 Configuration** | Designer/admin **настройка** механизмов tier 1–4 |
| **6 Data** | Persistence aggregators; не пов поведения |
| **7 Interface** | UX contours / slots; не libraries |
| **8 Standards** | Norms и rules; optional reference code |

### 7.3 Алгоритм выбора Primary Owner

```text
INPUT: file_path, scope_matches[]

1. Отфильтровать matches только ACTIVE registry elements
2. Если match tier 1–4 и tier 5–8 — удалить tier 5–8 из candidacy Primary
3. Если несколько tier 1–4:
     a. Выбрать наиболее специфичный prefix (longest wins)
     b. При равной длине — меньший tier number wins
     c. При равенстве — lexicographic tie-break (stable, documented)
4. Если остался один candidate — Primary Owner
5. Все остальные scope matches → Related Elements
6. CONCEPTUAL elements → Related только (never Primary unless REFERENCE_IMPLEMENTATION flag on path)
```

### 7.4 Запрет duplicate scope

Один filesystem prefix **не может** быть одинаково приписан двум CODE_OWNER на tier 1–4.

Известные дубликаты (устранить при внедрении):

| Prefix | Единственный Primary | Бывший ошибочный |
|--------|---------------------|------------------|
| `modules/platform/runtime/entities/` | `entity-engine` | `business-records-data` |
| `modules/files/` (service layer) | `file-service` | `file-metadata-data` |
| `modules/platform/action_engine/` + `runtime/actions/` | `action-engine` | `process-engine` (partial) |
| `shared/platformModal/` | `platform-modal` | `modal-zone` |
| `modules/navigation/` (engine) | `navigation-engine` | `config-group-navigation`, `platform-tree` |

---

## 8. Обработка конфликтов и multi-owner

### 8.1 Multi-owner в scan DB

Текущий scanner записывает **все** scope matches как owners (1792 файла multi-owner). Это **неверно**.

Целевая модель:

| Поле | Cardinality |
|------|-------------|
| Primary Owner | 1 |
| Related Elements | 0..N |

### 8.2 Конфликт engine vs configuration

```text
portal-composition-engine  vs  config-pages-composition
navigation-engine        vs  config-group-navigation
view-engine                vs  config-group-object-placement
```

**Resolution:** runtime/service paths → engine Primary; designer-only config paths → configuration Primary.

Heuristic path markers:

- `modules/platform/runtime/` → tier 1
- `modules/platform/designer/` → tier 1 или tier 5 (по подсистеме: object_types → engine; pages admin → config)
- `modules/designer/` (frontend) → tier 5

### 8.3 Конфликт component vs interface

```text
platform-modal  vs  modal-zone
platform-tree   vs  context-menu
```

**Resolution:** component library path → component Primary; interface = Related.

### 8.4 Reference implementation (standards)

Norm/standard получает Primary **только** если:

1. Path явно в `REFERENCE_IMPLEMENTATION_SCOPES` (будущий registry extension);
2. Tier 1–4 не match;
3. Scope **узкий** (не весь репозиторий).

Пример: `constitution-norm-environment-isolation` → Primary для `backend/app/core/environment_guard.py`, не для всех 147 файлов platform.

---

## 9. Итоговая матрица категорий

| Категория | Может быть Primary Owner | Может быть Related | Обоснование |
|-----------|--------------------------|--------------------|-------------|
| Core | **Да** (default) | Да | Engines владеют механизмами |
| Services | **Да** (default) | Да | Platform services |
| Modules | **Да** (default) | Да | Domain features |
| Components | **Да** (default) | Да | Shared libraries |
| Configuration | **Частично** | Да | Designer/config surfaces only |
| Data | **Нет** (default) | Да | Aggregators |
| Interface | **Нет** (default) | Да | UI contours |
| Standards | **Нет** (default) | Да | Norms; optional reference impl |

---

## 10. Классификация 43 спорных элементов (WI-ARCH-OWNERSHIP-001)

| Элемент | Статус | Primary-файлы после политики | Примечание |
|---------|--------|------------------------------|------------|
| `entity-engine` | CODE_OWNER | **Да** | 21 scope file |
| `object-types-engine` | CODE_OWNER | **Да** | |
| `navigation-engine` | CODE_OWNER | **Да** | 51 scope file |
| `view-engine` | CODE_OWNER | **Да** | |
| `portal-composition-engine` | CODE_OWNER | **Да** | |
| `process-engine` | MISCLASSIFIED | **Да*** | Scope dedup с action-engine |
| `platform-modal` | CODE_OWNER | **Да** | |
| `platform-tree` | CODE_OWNER | **Да** | |
| `platform-sidebar` | CODE_OWNER | **Да** | |
| `platform-toolbar` | CODE_OWNER | **Да** | |
| `platform-page` | CODE_OWNER | **Да** | |
| `platform-card` | CODE_OWNER | **Да** | |
| `platform-context-menu` | CODE_OWNER | **Да** | |
| `platform-kanban` | CODE_OWNER | **Да** (partial) | planned |
| `platform-identity` | CODE_OWNER | **Да** | |
| `session-bridge` | CODE_OWNER | **Да** | |
| `file-service` | CODE_OWNER | **Да** | |
| `deployment-execution` | MISCLASSIFIED | **Да*** | Split с publication-service |
| `notifications-module` | CODE_OWNER | **Да** | |
| `notification-dispatch` | MISCLASSIFIED | **Да*** | Triple split |
| `module-bpmn` | CODE_OWNER | **Да** | |
| `module-yasii` | CODE_OWNER | **Да** | |
| `config-module-tenant-settings` | CODE_OWNER | **Да** | designer/bootstrap paths |
| `relation-instances-data` | AGGREGATOR | **Нет** | Related к relation-engine |
| `structure-metadata-data` | AGGREGATOR | **Нет** | |
| `tenant-configuration-data` | AGGREGATOR | **Нет** | |
| `users-access-data` | AGGREGATOR | **Нет** | |
| `user-settings-data` | AGGREGATOR | **Нет** | |
| `view-surface` | AGGREGATOR | **Нет** | |
| `side-navigation` | AGGREGATOR | **Нет** | |
| `top-navigation` | AGGREGATOR | **Нет** | |
| `side-panel` | AGGREGATOR | **Нет** | |
| `workspace-tabs` | AGGREGATOR | **Нет** | |
| `notification-center` | AGGREGATOR | **Нет** | |
| `user-menu` | AGGREGATOR | **Нет** | |
| `constitution-norm-no-logic-duplication` | CONCEPTUAL | **Нет** | |
| `constitution-norm-platform-tenant-separation` | CONCEPTUAL | **Нет** | scope too broad |
| `constitution-norm-single-sot` | CONCEPTUAL | **Нет** | |
| `constitution-norm-system-entity-standard` | CONCEPTUAL | **Нет** | |
| `decision-control-plane-not-tenant` | CONCEPTUAL | **Нет** | |
| `decision-entity-sot` | CONCEPTUAL | **Нет** | |
| `standard-ui-modal` | CONCEPTUAL | **Нет** | → platform-modal |
| `standard-data-event-journal` | CONCEPTUAL | **Нет** | → event-engine |
| `standard-dev-journal` | CONCEPTUAL | **Нет** | |
| `standard-dev-prompt-preparation` | CONCEPTUAL | **Нет** | |
| `standard-dev-demo-readiness` | CONCEPTUAL | **Нет** | |
| `standard-dev-test-data-ownership` | CONCEPTUAL | **Нет** | |
| `standard-pub-governance-discipline` | CONCEPTUAL | **Нет** | |
| `standard-pub-release-package` | CONCEPTUAL | **Нет** | |
| `standard-pub-release-scope` | CONCEPTUAL | **Нет** | |

---

## 11. Ожидаемый эффект внедрения

### 11.1 Устранение проблемы 43 элементов без Primary

**Да.** После tier-priority:

- **25 CODE_OWNER** получат Primary-файлы (сейчас 0 ideal primary);
- **18 AGGREGATOR + CONCEPTUAL** корректно останутся без обязательных Primary;
- метрика «элемент без Primary-файлов» перестанет трактоваться как дефект для AGGREGATOR/CONCEPTUAL.

### 11.2 Элементы — владельцы реализации после внедрения

```text
entity-engine, object-types-engine, navigation-engine, view-engine,
portal-composition-engine, platform-modal, platform-tree, platform-sidebar,
platform-toolbar, platform-page, platform-card, platform-context-menu,
platform-identity, session-bridge, file-service, notifications-module,
module-bpmn, module-yasii, config-module-tenant-settings, …
(+ все configuration config-* на designer paths)
```

---

## 12. Связь с Architecture Navigator

| Компонент | Изменение (будущий WI) |
|-----------|------------------------|
| `component_scan_scopes.py` | Dedup scopes; split designer vs runtime |
| `scanner.py` | Tier-priority Primary; Related list |
| `architecture_findings` | `primary_owner` + `related_elements` |
| Registry metadata | `ownership_class`: CODE_OWNER / AGGREGATOR / CONCEPTUAL |

---

## 13. Критерии приёмки политики

- [x] Определены Primary Owner и Related Element
- [x] Определены tier priorities 1–8
- [x] CLASSIFICATION 43 disputed elements
- [x] Запрет Primary для aggregators и interface contours
- [x] Алгоритм conflict resolution
- [ ] Scanner implementation (out of scope WI-ARCH-OWNERSHIP-002)

---

## 14. Следующие WI (рекомендация)

| WI | Scope |
|----|-------|
| WI-ARCH-OWNERSHIP-003 | Dedup `COMPONENT_SCAN_SCOPES` |
| WI-ARCH-OWNERSHIP-004 | Scanner tier-priority + Related |
| WI-ARCH-OWNERSHIP-005 | Registry `ownership_class` metadata |

---

## Appendix A — Примеры до/после

| Файл | Было (wrong Primary) | Станет (policy) | Related |
|------|----------------------|-----------------|---------|
| `runtime/entities/service.py` | `business-records-data` | `entity-engine` | `business-records-data` |
| `modules/navigation/router.py` | `config-group-navigation` | `navigation-engine` | `config-group-navigation`, `breadcrumbs` |
| `shared/platformModal/PlatformModal.jsx` | `modal-zone` | `platform-modal` | `modal-zone`, `standard-ui-modal` |
| `modules/pages/service.py` | `config-pages-composition` | `portal-composition-engine` | `config-group-pages` |
