# Методика классификации архитектурных элементов ЯсноПро

```yaml
document: architecture-classification-methodology
title: Методика классификации архитектурных элементов ЯсноПро
version: v1.2
status: Draft
date: 2026-06-19
authority: YASNOPRO Platform Architecture
scope: classification rules only
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.2
  - YASNOPRO_ARCHITECTURE_GOVERNANCE.md v1.0
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
source_audits:
  - WI-ARCH-PUB-000
  - WI-ARCH-RULES-000
  - WI-ARCH-GOV-002A
  - WI-ARCH-METH-001
related_registry:
  - DEV Studio → Архитектура платформы
  - DEV Studio → Архитектурное управление
```

---

## 1. Назначение документа

Документ является **единственным источником правил** отнесения архитектурных элементов платформы ЯсноПро к категориям и слоям, определённым в [Архитектурной классификации v1.2](./YASNOPRO_ARCHITECTURE_CLASSIFICATION.md) и [Архитектурном управлении](./YASNOPRO_ARCHITECTURE_GOVERNANCE.md).

Методика нужна, чтобы:

- единообразно принимать решения при наполнении compositional-реестров «Архитектура платформы»;
- корректно связывать элементы с governance-слоем и operational-разделами без dual SoT;
- исключить произвольное дублирование элементов между реестрами;
- обеспечить трассируемость состава релизов и архитектурного аудита;
- снизить споры при классификации новых модулей, служб, компонентов и release-артефактов.

Методика решает проблемы:

- неоднозначного отнесения элемента к нескольким реестрам;
- смешения normative rules, исполняемых служб, release CRUD и UI-компонентов;
- включения tenant-данных и runtime-записей клиентов в compositional-реестры;
- классификации «по расположению в коде» вместо «по архитектурной роли»;
- устаревшего использования **Runtime**, **Публикация**, **Правила и запреты** как primary-категорий (сняты в v1.2).

Методика применяется при:

- добавлении и ревизии записей в реестрах DEV Studio;
- подготовке ADR и архитектурных спецификаций;
- формировании Release Scope и состава релизов;
- архитектурном аудите и gap-анализе.

Документ **не** описывает реализацию элементов, состав реестров и файловую структуру проекта.

---

## 2. Модель классификации v1.2

### Три слоя платформы

```text
ЯсноПро
│
├─ Архитектура платформы          ← compositional (8 категорий)
│     Ядро | Стандарты | Службы | Модули | Данные
│     | Элементы интерфейса | Компоненты | Конфигурация
│
├─ Архитектурное управление       ← governance (не compositional)
│     Конституция | ADR | Контур доставки изменений
│
├─ Релизы платформы               ← operational SoT
│
└─ Журнал событий                 ← audit / development journal SoT
```

| Слой | Главный вопрос | Primary home элементов |
|------|----------------|------------------------|
| **Архитектура платформы** | *Из чего состоит платформа?* | Один из **8 compositional-категорий** |
| **Архитектурное управление** | *Как контролируется развитие?* | GOVERNANCE.md + projections (не второй реестр) |
| **Релизы / Журнал** | *Как исполняется и фиксируется?* | Operational API / journal tables |

### Снятые primary-категории (legacy)

С v1.2 **не являются** compositional primary-категориями:

| Legacy-категория | Новое место |
|------------------|-------------|
| **Runtime** | ADR + [Службы](./YASNOPRO_PLATFORM_SERVICES.md); conceptual link «среда DEV/TEMPLATE/CLIENT» |
| **Публикация** | [Governance: Контур доставки](./YASNOPRO_ARCHITECTURE_GOVERNANCE.md) + **Релизы** + Службы + Данные + Стандарты §8 |
| **Правила и запреты** | [Governance: Конституция](./YASNOPRO_ARCHITECTURE_GOVERNANCE.md); SoT — [STANDARDS §3](./YASNOPRO_PLATFORM_STANDARDS.md); derived index запретов |

---

## 3. Общий принцип классификации

```text
Каждый compositional-элемент имеет одну основную категорию (из 8).

Допускаются связи с другими compositional-категориями.

Допускаются governance- и operational-связи без второй primary-категории.

Элемент не должен одновременно иметь несколько основных compositional-категорий.
```

### Определения

| Термин | Значение |
|--------|----------|
| **Архитектурный элемент** | Именованная часть платформы с устойчивой ролью, подлежащая учёту в реестре или operational-разделе |
| **Основная compositional-категория** | Единственная из 8 категорий «Архитектура платформы», где элемент ведётся как первичный |
| **Связанные compositional-категории** | Дополнительные категории из 8, с которыми элемент связан, но не дублируется |
| **Governance-связь** | Ссылка на norm # конституции, ADR или фазу контура доставки — **не** primary-категория |
| **Operational home** | «Релизы платформы» или «Журнал событий» — **не** compositional-категория |

Сквозные темы (безопасность, аудит, provenance) отражаются через **Стандарты** (конституция), **Службы**, **Данные**, **Governance (ADR)** — без введения новых compositional-категорий.

### Архитектурная конституция и запреты

**Конституция** задаёт **ограничения** (SoT: STANDARDS §3).  
**Основная compositional-категория** определяется по **природе сущности**, а не по тому, что элемент «запрещает» что-то.

Mandatory prohibitions — **derived index** на карточке norm; **не** отдельный compositional-реестр.

### Пример

```text
Session Bridge

Основная compositional-категория:
Службы

Связанные compositional-категории:
Ядро (аспект Доступ; ADR-SEC-001)

Governance-связь:
Конституция п.8–9 (изоляция сред)

Operational home:
— (не релизный артефакт)
```

---

## 4. Алгоритм классификации

Единый порядок принятия решения — последовательные вопросы.

### Шаг 0. Определить слой элемента

**Вопрос:** элемент — compositional, governance или operational?

| Если элемент — … | Действие |
|------------------|----------|
| Release Package / Scope / Candidate / release CRUD | **Operational home: Релизы платформы** — не compositional primary |
| ADR как документ | **Governance: ADR** — SoT `docs/architecture/adr/` |
| Reference-модель lifecycle (контур доставки) | **Governance: Контур** — не compositional registry |
| Norm / prohibition | **Стандарты** (конституция §3) + governance projection |
| Запись журнала | **Operational home: Журнал событий** |
| Механизм / служба / модуль / UI / data type | → Шаг 1 (compositional) |

---

### Шаг 1. Определить назначение элемента

**Вопрос:** какую архитектурную задачу решает элемент для платформы в целом?

Если элемент описывает только данные конкретной компании или пользователя — это **не** compositional-элемент реестра.

---

### Шаг 2. Определить основной результат работы элемента

**Вопрос:** что является главным результатом работы элемента?

| Если главный результат — … | Перейти к проверке категории … |
|-----------------------------|--------------------------------|
| Базовый механизм конструктора | Ядро |
| Нормативное правило или соглашение | Стандарты |
| Сервис для других частей платформы | Службы |
| Бизнес-функция для пользователя tenant | Модули |
| Хранение или тип данных | Данные |
| UI-зона или экранная область | Элементы интерфейса |
| Переиспользуемый UI-блок | Компоненты |
| Published snapshot / placement для tenant | Конфигурация |
| Release artifact / workflow record | **Релизы платформы** (operational) |
| Архитектурное решение (ADR) | **Governance: ADR** |
| Lifecycle reference (фазы, маршрут) | **Governance: Контур доставки** |

**Не использовать:** Runtime, Публикация, Правила и запреты как primary.

---

### Шаг 3. Определить уровень ответственности

| Уровень | Типичная compositional-категория |
|---------|----------------------------------|
| Фундамент конструктора | Ядро |
| Norm «как должно быть» | Стандарты |
| Инфраструктурный сервис | Службы |
| Продуктовая функция | Модули |
| Контур данных | Данные |
| UX-зона / навигация | Элементы интерфейса |
| Reusable UI block | Компоненты |
| Publish snapshot tenant UX | Конфигурация |
| Release workflow / package | **Релизы платформы** |
| Audit / dev journal entry | **Журнал событий** |

Среда DEV / TEMPLATE / CLIENT — **conceptual** (ADR-RT-001); не compositional-категория. Связь указывается как governance/ADR link.

---

### Шаг 4. Определить основную compositional-категорию

Применить критерии раздела 5.  
Выбрать **одну** категорию из **8** по правилам раздела 6.

Если элемент — operational (Release Package, journal entry) — compositional primary **не назначается**.

---

### Шаг 5. Определить связанные категории и links

- **Связанные compositional-категории** — только из 8.
- **Governance-связи** — norm #, ADR slug, фаза контура (без второй primary).
- **Operational home** — если применимо (Релизы / Журнал).

---

## 5. Правила определения compositional-категорий

### Ядро

#### Критерий включения

Базовый механизм платформы-конструктора: объекты, связи, доступ, действия, отображения независимо от конкретного tenant.

#### Критерий исключения

- Бизнес-модуль → **Модули**
- UI-зона / виджет → **Элементы интерфейса** / **Компоненты**
- Инфраструктурный сервис → **Службы**
- Тип данных → **Данные**
- Published placement → **Конфигурация**

#### Контрольные вопросы

- Без элемента платформа перестаёт быть **конструктором**?
- Элемент — **базовый механизм**, на котором строятся модули?
- Меняет ли элемент **модель сущностей, связей или прав**?

---

### Стандарты

#### Критерий включения

Обязательные или рекомендуемые **правила** оформления, API, UX, журналирования, публикации — без самостоятельного исполнения бизнес- или инфраструктурной работы. Включает **архитектурную конституцию** (12 норм, STANDARDS §3).

#### Критерий исключения

- Элемент **выполняет работу** → **Службы** / **Модули**
- UI-компонент → **Компоненты**
- Critical prohibition как **отдельная primary-запись** → **запрещено**; norm живёт здесь, index — в governance

#### Контрольные вопросы

- Определяет ли элемент **обязательные правила**?
- Выполняет ли элемент **runtime-работу** сам?
- Это **норма**, а не исполняемая подсистема?

---

### Службы

#### Критерий включения

Сервис для других частей платформы: provisioning, publication, deployment execution, session bridge, orchestration — используется **несколькими подсистемами**.

#### Критерий исключения

- User-facing feature → **Модули**
- Только norm → **Стандарты**
- Release artifact (package, scope) → **Релизы платформы** (operational)
- Операция как **фаза lifecycle** без отдельного сервиса → governance link + возможная запись в Службах (Publication / Deployment Service)

#### Контрольные вопросы

- Оказывает ли элемент **сервис** другим подсистемам?
- Используется **несколькими** подсистемами?
- Это **исполняемая инфраструктура**, не norm?

---

### Модули

#### Критерий включения

Бизнес-функциональность пользователю tenant; может быть **отключена** без разрушения конструктора.

#### Критерий исключения

- Без элемента нет конструктора → **Ядро**
- Платформенный сервис → **Службы**
- UI-компонент → **Компоненты**

---

### Данные

#### Критерий включения

Контур, тип или класс данных: метаданные, настройки, платформенные записи, **данные публикации и эксплуатации** (version pin, release metadata contour).

#### Критерий исключения

- Механизм работы с данными → **Службы** / **Ядро**
- Записи компании / пользователя → **не compositional-реестр**
- Release CRUD → **Релизы платформы**

---

### Элементы интерфейса

#### Критерий включения

Страница, зона, область UI с самостоятельным местом в навигации или композиции экрана.

#### Критерий исключения

- Reusable widget → **Компоненты**
- Norm → **Стандарты**
- Module с backend → **Модули**

---

### Компоненты

#### Критерий включения

Переиспользуемый UI-блок (PlatformModal, PlatformTable), встраиваемый в разные экраны.

#### Критерий исключения

- Целая страница / навигационная зона → **Элементы интерфейса**
- Standard → **Стандарты**
- Backend-only → не Компоненты

---

### Конфигурация

#### Критерий включения

**Published snapshot** того, как элементы собраны для tenant: навигация, страницы, placement объектов/модулей/UI, стартовые роли, опубликованный каталог.

**Главный вопрос:** *Как пользователь видит и использует платформу?*

#### Критерий исключения

- Механизм ядра / модуль / компонент как such → соответствующая compositional-категория
- Designer **draft** → не конфигурация; runtime читает **published** snapshot
- Release workflow → **Релизы платформы**

#### Контрольные вопросы

- Элемент описывает **размещение и publish snapshot**, а не механизм?
- Это **tenant-visible configuration**, а не platform code?
- Связано с цепочкой DEV → TEMPLATE → COMPANY через **контур доставки** (governance link)?

---

## 6. Governance и operational элементы

Эти элементы **не получают** compositional primary из 8 категорий.

### Архитектурная конституция

| Аспект | Правило |
|--------|---------|
| **SoT** | [YASNOPRO_PLATFORM_STANDARDS.md](./YASNOPRO_PLATFORM_STANDARDS.md) §3 |
| **Compositional primary** | **Стандарты** (12 norms как записи стандартов) |
| **Governance UI** | Projection + derived index «Связанные запреты» |
| **Классификация norm** | Не создавать duplicate primary в «Правилах» |

### ADR

| Аспект | Правило |
|--------|---------|
| **SoT** | `docs/architecture/adr/*.md` |
| **Compositional primary** | **не назначается** |
| **Governance UI** | Catalog Accepted / Draft / Archived |
| **Связь с norm** | ADR **ссылается** на norm #; norm **ссылается** на ADR |

### Контур доставки изменений

| Аспект | Правило |
|--------|---------|
| **Тип** | Reference-модель (маршрут, фазы, policies) |
| **Compositional primary** | **не назначается** для модели целиком |
| **Фазы Materialize / Verify / Activate** | Primary → **Службы**; описание фазы → governance link |
| **Маршрут DEV → TEMPLATE → COMPANY** | Governance + конституция п.7 |

### Релизы платформы

| Элемент | Primary home |
|---------|--------------|
| Release Package | **Релизы платформы** |
| Release Scope | **Релизы платформы** |
| Release Candidate | **Релизы платформы** |
| Release CRUD / review / activate | **Релизы платформы** |

Связанные compositional: **Данные** (metadata contour), **Стандарты** §8 (norms), **Службы** (execution).

### Журнал событий

| Элемент | Primary home |
|---------|--------------|
| DEV development journal entry | **Журнал событий** (DEV tenant scope) |
| Platform audit event | **Журнал событий** / CP audit views |

---

## 7. Разрешение конфликтов классификации

**Конституция задаёт ограничения.** Основная compositional-категория определяется по **природе сущности**.

Если элемент подходит под несколько compositional-категорий, применяется порядок приоритета:

```text
1. Ядро                    — если без элемента нет конструктора
2. Службы                  — если прежде всего инфраструктурный сервис
3. Модули                  — если прежде всего user-facing feature
4. Данные                  — если прежде всего тип/контур данных
5. Конфигурация            — если прежде всего published tenant snapshot
6. Элементы интерфейса     — если прежде всего UI-зона/навигация
7. Компоненты              — if прежде всего reusable UI block
8. Стандарты               — если прежде всего normative rule без исполнения
```

**Не участвуют в priority list:** Runtime, Публикация, Правила и запреты.

### Operational vs compositional

Если элемент — **release artifact** или **journal entry** → **operational home**, compositional priority **не применяется**.

### Процедура

1. Шаг 0: определить слой (compositional / governance / operational).
2. Для compositional: список кандидатов из 8 категорий.
3. Применить таблицу приоритета — **одна** primary.
4. Governance- и operational-links — отдельно, без второй primary.
5. При неразрешимом споре — эскалация архитектору; фиксация в ADR.

### Пример

```text
Publication Service

Кандидаты compositional: Службы, Стандарты

Operational / governance: Контур доставки (link), ADR-TPL-001

Основная compositional-категория:
Службы

Governance-связь:
Конституция п.7; Контур: Materialize phase

Operational home:
—
```

---

## 8. Примеры классификации

### Объект

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | Ядро |
| **Связанные compositional-категории** | Данные, Стандарты |
| **Governance / operational** | — |
| **Обоснование** | Базовый механизм конструктора: виды сущностей (Клиенты, Проекты, Задачи). Registry: `object-types-engine`. |

---

### Экземпляры объектов

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | Ядро |
| **Связанные compositional-категории** | Данные |
| **Governance / operational** | — |
| **Обоснование** | Конкретные записи (ООО Ромашка, Задача №123). Registry: `entity-engine`. |

---

### Session Bridge

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | Службы |
| **Связанные compositional-категории** | Ядро (Доступ) |
| **Governance-связь** | Конституция п.8–9; ADR-SEC-001 |
| **Обоснование** | Инфраструктурный сервис маршрутизации сессий |

---

### Publication Service

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | Службы |
| **Связанные compositional-категории** | Данные, Стандарты §8 |
| **Governance-связь** | Контур доставки (Materialize); ADR-TPL-001 |
| **Обоснование** | Исполняемый сервис публикации; не «категория Публикация» |

---

### Release Package

| Поле | Значение |
|------|----------|
| **Compositional primary** | **не назначается** |
| **Operational home** | **Релизы платформы** |
| **Связанные compositional** | Данные (metadata), Стандарты §8 |
| **Governance-связь** | ADR-REL-001; Контур: Scope → Candidate |
| **Обоснование** | Operational release artifact, не building block платформы |

---

### Release Scope

| Поле | Значение |
|------|----------|
| **Operational home** | **Релизы платформы** |
| **Связанные compositional** | Данные, Стандарты §8 |
| **Governance-связь** | ADR-REL-001; Контур: Scope phase |
| **Обоснование** | Состав конкретного релиза; SoT — Releases API |

---

### Release Candidate

| Поле | Значение |
|------|----------|
| **Operational home** | **Релизы платформы** |
| **Governance-связь** | Контур: Candidate gate |
| **Обоснование** | Статус workflow релиза |

---

### Materialize / Verify / Activate / Rollback

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | **Службы** (Publication / Deployment Execution) |
| **Governance-связь** | Контур доставки (фаза); ADR-DEP-001 |
| **Operational home** | Исполнение через Релизы + CP |
| **Обоснование** | Исполняемые операции служб; lifecycle — governance model |

---

### Version Pin

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | **Данные** (Release & Operations) |
| **Governance-связь** | Контур: политика apply; ADR-UPD-001 |
| **Operational home** | Состояние среды / компании в runtime |
| **Обоснование** | Операционное состояние, не UX snapshot |

---

### Dirty DEV Check

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | **Стандарты** §8 |
| **Governance-связь** | Контур: gate; Конституция п.7 |
| **Обоснование** | Norm «контроль состава изменений», не служба |

---

### DEV-only development / No direct CLIENT

| Поле | Значение |
|------|----------|
| **Compositional primary** | **Стандарты** (конституция п.7–8) |
| **Governance** | Derived index «Связанные запреты» |
| **Обоснование** | Mandate, не compositional building block; не duplicate в «Правилах» |

---

### Display ≠ ID (norm)

| Поле | Значение |
|------|----------|
| **Compositional primary** | **Стандарты** (конституция п.4) |
| **Governance** | Конституция projection |
| **Обоснование** | Critical invariant; ADR-SEC-001 — evidence |

---

### ADR-RT-001 (документ)

| Поле | Значение |
|------|----------|
| **Compositional primary** | **не назначается** |
| **Governance home** | **ADR** (Accepted) |
| **Связанные compositional** | Службы (Provisioning), Данные |
| **Governance-связь** | Implements norms п.8–9 |
| **Обоснование** | ADR = «почему»; per-company runtime — norm + decision |

---

### Контур доставки изменений (модель)

| Поле | Значение |
|------|----------|
| **Compositional primary** | **не назначается** |
| **Governance home** | **Контур доставки** (reference model) |
| **Обоснование** | Diagram + links; не реестр Release Package |

---

### DEV / TEMPLATE / CLIENT (среда)

| Поле | Значение |
|------|----------|
| **Compositional primary** | **не назначается** |
| **Governance / ADR** | ADR-RT-001, ADR-RUN-001 |
| **Conceptual link** | Конституция п.7–9; Контур доставки |
| **Обоснование** | Среда исполнения ≠ compositional category (WI-ARCH-CLASS-001) |

---

### PlatformModal

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | Компоненты |
| **Связанные compositional** | Стандарты (Modal Standard), Элементы интерфейса |
| **Обоснование** | Reusable UI block |

---

### Опубликованная навигация tenant

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | **Конфигурация** |
| **Связанные compositional** | Элементы интерфейса, Ядро (Navigation Engine) |
| **Governance-связь** | Контур доставки; Конституция п.7 |
| **Обоснование** | Published snapshot для пользователя |

---

### Чат / Календарь

| Поле | Значение |
|------|----------|
| **Основная compositional-категория** | Модули |
| **Связанные compositional** | Данные, Элементы интерфейса, Службы |
| **Обоснование** | User-facing; отключаем без разрушения ядра |

---

## 9. Использование методики

Методика обязательна для:

| Область | Применение |
|---------|------------|
| **Архитектура платформы** | Compositional primary = одна из 8 категорий |
| **Архитектурное управление** | Projections и links; не duplicate primary |
| **Релизы / Журнал** | Operational home для release и journal entities |
| **ADR и спецификации** | Категория + governance links + обоснование |
| **Release Scope** | Группировка по compositional + operational artifacts |
| **Аудит архитектуры** | Проверка отсутствия legacy primary (Runtime, Публикация, Правила) |

**Запрещено:**

- назначать **Runtime**, **Публикация**, **Правила и запреты** как compositional primary;
- создавать **dual SoT** для одной norm (конституция + отдельный реестр запретов);
- вести Release Package как compositional-запись «Архитектуры платформы».

---

## 10. Миграция v1.0 → v1.2

| Было (v1.0) | Стало (v1.2) |
|-------------|--------------|
| Publication Pipeline → Публикация | Publication Service → **Службы** |
| Release Scope → Публикация | Release Scope → **Релизы платформы** |
| Release Package → Публикация | Release Package → **Релизы платформы** |
| Version Pin → Публикация | Version Pin → **Данные** |
| DEV Runtime → Runtime | DEV environment → **ADR link**, не compositional |
| No direct CLIENT → Правила | No direct CLIENT → **Стандарты §3 п.7** + governance index |
| Conflict priority: Правила #1 | **Конституция ограничивает**; priority по природе сущности |
| 10 compositional categories | **8 compositional** + governance + operational |

---

## История версий

| Версия | Статус | Дата | Описание |
|--------|--------|------|----------|
| v1.0 | Draft | 2026-06-19 | Первоначальная методика (WI-ARCH-DOC-002); 10 compositional categories |
| v1.2 | Draft | 2026-06-19 | Синхронизация с Architecture v1.2: 8 compositional, governance layer, operational sections; сняты Runtime, Публикация, Правила как primary (WI-ARCH-METH-001) |
