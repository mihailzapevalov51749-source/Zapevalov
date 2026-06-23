# Службы платформы ЯсноПро

```yaml
document: platform-services
title: Службы платформы ЯсноПро
version: v1.1
status: Draft
date: 2026-06-19
authority: YASNOPRO Platform Architecture
scope: services registry definition
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.0
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md v1.0
  - YASNOPRO_CORE_ARCHITECTURE.md v1.0
source_audit: WI-ARCH-SERVICES-001
registry_normalization: WI-ARCH-REG-SERV-002
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
related_registry: DEV Studio → Архитектура платформы → Службы
```

---

## 1. Назначение документа

Документ фиксирует **состав, назначение и границы служб** платформы ЯсноПро — категории «Службы» из [Архитектурной классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION.md).

Документ нужен, чтобы:

- иметь единый источник истины для реестра «Службы платформы» в DEV Studio;
- отделить инфраструктурные сервисы от [ядра](./YASNOPRO_CORE_ARCHITECTURE.md), модулей, runtime и публикации;
- классифицировать новые элементы по [Методике классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md);
- проектировать сквозные платформенные возможности и формировать Release Scope.

Документ основан на аудите **WI-ARCH-SERVICES-001** и описывает **предварительно утверждённый** состав служб v1.0.  
Техническая реализация, API, код и таблицы БД **не входят** в scope документа.

---

## 2. Что такое служба платформы

**Служба платформы** — это инфраструктурный сервис, который используется **несколькими подсистемами** платформы и обеспечивает **сквозную возможность**.

Служба **не является**:

- **ядром** — базовым механизмом конструктора (объекты, связи, доступ);
- **бизнес-модулем** — user-facing функцией (чат, календарь);
- **runtime-средой** — DEV, TEMPLATE, CLIENT;
- **визуальным компонентом** — PlatformModal, PlatformTable;
- **данными** — типом или контуром хранения.

### Различие категорий

| Категория | Вопрос, на который отвечает | Пример |
|-----------|----------------------------|--------|
| **Ядро** | *Как устроена компания как система?* | Объекты, связи, доступ, процессы |
| **Службы** | *Как платформа технически это обеспечивает?* | Session Bridge, Provisioning, Publication |
| **Модули** | *Какую бизнес-функцию получает пользователь?* | Чат, документы, календарь |
| **Runtime** | *Где исполняется платформа?* | DEV, TEMPLATE, CLIENT |

### Главный вопрос служб

> Какие платформенные сервисы обеспечивают работу ядра, модулей, публикации, runtime и данных?

---

## 3. Критерии включения в службы

Элемент включается в службы v1.0, если выполняются **все** условия:

1. **Обслуживает несколько подсистем** — ядро, модули, Studio, Office, Control Plane или runtime.
2. **Предоставляет сквозную возможность** — идентичность, файлы, поиск, публикация, контекст ИИ.
3. **Используется ядром, модулями или runtime** — не существует в изоляции одного экрана.
4. **Не является бизнес-функцией** — можно отключить без разрушения конструктора как such (хотя эксплуатация деградирует).
5. **Не является исключительно пользовательским интерфейсом** — UI потребляет службу, но не заменяет её.

Критерии согласованы с разделом «Службы» в [Методике классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md).

---

## 4. Состав служб платформы v1.0

Ниже — **9 служб** предварительно утверждённого состава.

---

### Platform Identity Service

**Назначение**  
Управляет **глобальной идентичностью** платформы: platform owner, глобальные пользователи, вход на уровне платформы до выбора компании.

**Ответственность**  
Идентификация на platform-scope; разделение platform-level и tenant-level пользователей; точка входа владельца платформы.

**Кого обслуживает**  
Control Plane, Session Bridge, cross-contour login, платформенное администрирование.

**Что произойдёт при отсутствии**  
Нет единого входа владельца платформы; смешиваются глобальные и tenant-пользователи; нарушается модель изоляции.

**Основные потребители:** Control Plane, Session Bridge, Studio (platform admin), Runtime (все контуры)

**Основные зависимости:** нет upstream-служб; downstream → Session Bridge

**Основная категория:** Службы  
**Связанные категории:** Ядро (Доступ), Runtime  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Session Bridge

**Назначение**  
Связывает **идентичность пользователя** с **рабочей средой компании** без смешения контуров DEV, TEMPLATE и CLIENT.

**Ответственность**  
Безопасная авторизация между контурами; маршрутизация сессии в tenant runtime; enforcement границ доступа на входе.

**Кого обслуживает**  
Office, Studio, Control Plane, все модули, runtime frontend/backend.

**Что произойдёт при отсутствии**  
Пользователь не может безопасно работать в своей компании; нарушается изоляция сред (ADR-SEC-001).

**Основные потребители:** Ядро (Доступ), Модули, Runtime, Studio, Office

**Основные зависимости:** Platform Identity Service → Session Bridge → Runtime

**Основная категория:** Службы  
**Связанные категории:** Ядро (Доступ), Runtime, Правила и запреты  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Company Provisioning

**Назначение**  
**Создаёт новую клиентскую компанию**: изолированная база, tenant, первый администратор, baseline версии — по оркестрации Control Plane.

**Ответственность**  
Атомарный lifecycle создания CLIENT-компании из TEMPLATE; compensating rollback при сбое (ADR-PROV-001).

**Кого обслуживает**  
Control Plane, TEMPLATE (источник), CLIENT (результат), Publication (baseline package).

**Что произойдёт при отсутствии**  
Невозможно создавать новые компании; платформа остаётся одной demo-средой.

**Основные потребители:** Control Plane, Runtime (CLIENT), Публикация

**Основные зависимости:** Publication Service (baseline) → Company Provisioning → CLIENT Runtime

**Основная категория:** Службы  
**Связанные категории:** Runtime, Публикация, Данные, Правила и запреты  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Publication Service

**Назначение**  
**Исполняет перенос** спроектированной структуры между средами: DEV → TEMPLATE → CLIENT — materialize метаданных и конфигурации.

**Ответственность**  
Исполнение конвейера публикации; не владение артефактами Release Package / Scope (категория Публикация).

**Кого обслуживает**  
Control Plane, Studio, TEMPLATE runtime, CLIENT update flow.

**Что произойдёт при отсутствии**  
Изменения в DEV не доходят до компаний; конструктор и runtime разъединены.

**Основные потребители:** Control Plane, Studio, Runtime (TEMPLATE, CLIENT)

**Основные зависимости:** Studio / DEV design → Publication Service → TEMPLATE Runtime → (через offer/apply) CLIENT Runtime

**Основная категория:** Службы  
**Связанные категории:** Публикация, Runtime, Правила и запреты  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Deployment Execution Service

**Назначение**  
**Выполняет фазы развёртывания** пакета: verify, activate, rollback на уровне runtime — оркестрация исполнения, не registry-запись.

**Ответственность**  
Physical/runtime apply изменений; связь registry rows с materialization (ADR-DEP-001).

**Кого обслуживает**  
Control Plane, Publication Service, CLIENT и TEMPLATE runtime.

**Что произойдёт при отсутствии**  
Обновления остаются «на бумаге» в registry без физического apply.

**Основные потребители:** Control Plane, Publication Service, Runtime

**Основные зависимости:** Publication Service → Deployment Execution Service → Runtime

**Основная категория:** Службы  
**Связанные категории:** Публикация, Runtime  
**Статус:** Draft  
**Уверенность:** Средняя

---

### File Service

**Назначение**  
**Хранение и выдача файлов**: вложения к объектам, аватары, медиа модулей — единая инфраструктура загрузки.

**Ответственность**  
Единая политика хранения и доступа к бинарным артефактам; не документооборот как бизнес-процесс.

**Кого обслуживает**  
Модули (Документы, Чат), ядро (объекты с вложениями), элементы интерфейса (аватар).

**Что произойдёт при отсутствии**  
Каждый модуль изобретает своё хранилище; нет согласованной безопасности файлов.

**Основные потребители:** Ядро (Объекты), Модули, Элементы интерфейса

**Основные зависимости:** Session Bridge (access) → File Service ← потребители из ядра и модулей

**Основная категория:** Службы  
**Связанные категории:** Данные, Ядро (Доступ)  
**Статус:** Draft  
**Уверенность:** Средняя

---

### Search Service

**Назначение**  
**Сквозной поиск** по объектам, навигации, записям платформы — единая точка discovery.

**Ответственность**  
Индексация и выдача результатов; UI поля поиска — элемент интерфейса, не служба.

**Кого обслуживает**  
Office, Studio, модули, Control Plane, host surfaces для ЯСИИ.

**Что произойдёт при отсутствии**  
Поиск фрагментируется по модулям; ухудшается UX и контекст для ИИ.

**Основные потребители:** Ядро (Объекты, Навигация), Модули, Studio, Office, AI Context Service

**Основные зависимости:** Ядро (данные объектов) → Search Service → UI / AI Context Service

**Основная категория:** Службы  
**Связанные категории:** Элементы интерфейса (Поиск), Данные  
**Статус:** Draft  
**Уверенность:** Средняя

---

### Notification Dispatch Service

**Назначение**  
**Доставляет уведомления** пользователям: in-app, email, push — транспорт и маршрутизация.

**Ответственность**  
Канал доставки; не «центр уведомлений» как продуктовый модуль.

**Кого обслуживает**  
Process Engine (ядро), модули, платформенные события.

**Что произойдёт при отсутствии**  
Процессы и модули не могут информировать пользователей через единый канал.

**Основные потребители:** Ядро (Процессы, События), Модули

**Основные зависимости:** Ядро (События) / Модули → Notification Dispatch Service → пользователи

**Основная категория:** Службы  
**Связанные категории:** Модули (Уведомления — UI и настройки)  
**Статус:** Draft  
**Уверенность:** Средняя

---

### AI Context Service

**Назначение**  
**Собирает и нормализует контекст** для ЯСИИ: где пользователь, какие объекты в scope, граница прав — без reasoning.

**Ответственность**  
ContextSnapshot, PermissionBoundary, HostContext normalization; handoff в YASII Runtime (ADR YASII / ACE boundary).

**Кого обслуживает**  
Dashboard, Designer, Object Card, Process, Registry, YASII.

**Что произойдёт при отсутствии**  
ЯСИИ теряет безопасный единый вход; AI-native платформа деградирует.

**Основные потребители:** Ядро (Доступ), Studio, Office, YASII

**Основные зависимости:** Session Bridge → AI Context Service → Search Service (optional) → YASII

**Основная категория:** Службы  
**Связанные категории:** Ядро (Доступ), Стандарты (Host Integration Contract)  
**Статус:** Draft  
**Уверенность:** Средняя

---

## 5. Матрица взаимодействия служб

Человекочитаемая карта основных потоков:

```text
Слой идентичности и доступа
────────────────────────────
Platform Identity Service
  → Session Bridge
    → Runtime (DEV / TEMPLATE / CLIENT)
    → AI Context Service
      → Search Service (контекст discovery)
      → ЯСИИ

Слой lifecycle компаний и доставки изменений
────────────────────────────────────────────
Studio / DEV (проектирование)
  → Publication Service
    → TEMPLATE Runtime
    → Deployment Execution Service
      → CLIENT Runtime

Company Provisioning
  ← TEMPLATE (golden reference)
  → CLIENT Runtime (новая компания)
  ← Publication Service (baseline package)

Слой общих возможностей
───────────────────────
File Service          ← Ядро, Модули, UI
Search Service        ← Office, Studio, AI Context Service
Notification Dispatch ← Процессы, Модули, События
```

### Порядок критичности для эксплуатации

```text
1. Platform Identity Service
2. Session Bridge
3. Company Provisioning
4. Publication Service
5. Deployment Execution Service
6. File Service
7. Search Service
8. Notification Dispatch Service
9. AI Context Service
```

---

## 6. Границы служб

### Что не относится к службам

Службы **обслуживают** другие категории, но не заменяют их. Исключение из реестра «Службы» не означает второстепенность.

### Ядро

Не является службой:

- Объекты
- Поля
- Связи
- Доступ
- Действия
- Отображения объектов
- Процессы
- События
- Навигация
- Композиция портала

Ядро **потребляет** Session Bridge, File Service, Search Service, AI Context Service, Notification Dispatch.

### Модули

Не являются службами:

- Чат
- Календарь
- Документы
- Уведомления (продуктовый модуль и UI)
- BPMN (редактор; исполнение — ядро «Процессы»)

### Runtime

Не являются службами:

- DEV
- TEMPLATE
- CLIENT

Runtime **размещает** службы, но сам является средой исполнения.

### Публикация

Не являются службами (артефакты и gates):

- Release Package
- Release Scope
- Release Candidate
- Dirty DEV Check

Исполнение связано с **Publication Service** и **Deployment Execution Service**.

### Компоненты

Не являются службами:

- PlatformModal
- PlatformTable
- PlatformTabs
- PlatformButton

---

## 7. Спорные элементы

Элементы ниже **не включены** в состав служб v1.0.

---

### Authorization Service

**За включение:** исполняет проверку токенов, сессий, enforcement — инфраструктура для всех подсистем.  
**Против включения:** модель прав и Permission Boundary — **Ядро (Доступ)**; пересечение с Session Bridge.  
**Предварительное решение:** не отдельная запись v1.0; покрывается **Session Bridge + Ядро (Доступ)**.  
**Следующее действие:** при выделении отдельного enforcement-layer — ADR и ревизия v1.1.

---

### Audit Service

**За включение:** маршрутизация записей в platform/tenant journals, dual-write (ADR-AUD-001).  
**Против включения:** **События** — элемент ядра; journals — **Данные**; стандарты — **Стандарты**.  
**Предварительное решение:** **Ядро (События) + Данные (Journals)**; отдельная Audit Service — отложить.  
**Следующее действие:** документ «Данные платформы» + ADR-AUD-001 mapping.

---

### Configuration Service

**За включение:** чтение/запись tenant и platform configuration для модулей.  
**Против включения:** Configuration — **Данные**; логика настроек — **Модули + Ядро**.  
**Предварительное решение:** **Данные (Configuration)**; службу не выделять в v1.0.  
**Следующее действие:** проверить при появлении shared config API contour.

---

### Runtime Service

**За включение:** materialization per-company runtime slot (ADR-RUN-001, ADR-RT-001).  
**Против включения:** DEV/TEMPLATE/CLIENT — **Runtime**; materialization — часть Provisioning/Deployment.  
**Предварительное решение:** **не служба**; связь Provisioning / Deployment ↔ Runtime.  
**Следующее действие:** документ «Runtime платформы ЯсноПро».

---

### Release Governance Service

**За включение:** pipeline пакетов, review, orchestration CP.  
**Против включения:** Release Package/Scope/Candidate — **Публикация**; CP — контур, не одна служба.  
**Предварительное решение:** **Publication Service + Deployment Execution**; governance UI/registry — CP + Публикация.  
**Следующее действие:** документ «Публикация платформы ЯсноПро».

---

### Control Plane Orchestration

**За включение:** координирует publish, provision, apply — «главный оркестратор».  
**Против включения:** CP — **контур управления** (UI + registry + orchestrator), шире категории «Служба».  
**Предварительное решение:** CP — отдельный контур; в реестр «Службы» — **исполнители**, не CP целиком.  
**Следующее действие:** ADR-CP-001 implementation gap closure plan.

---

## 8. Соответствие реестру DEV Studio

Реестр **Архитектура платформы → Службы** синхронизирован с документом в **WI-ARCH-REG-SERV-002**.

| component_key | Служба (документ) | technical_name |
|---------------|-------------------|----------------|
| `platform-identity` | Platform Identity Service | Platform Identity Service |
| `session-bridge` | Session Bridge | Session Bridge |
| `company-provisioning` | Company Provisioning | Company Provisioning |
| `publication-service` | Publication Service | Publication Service |
| `deployment-execution` | Deployment Execution Service | Deployment Execution Service |
| `file-service` | File Service | File Service |
| `search-service` | Search Service | Search Service |
| `notification-dispatch` | Notification Dispatch Service | Notification Dispatch Service |
| `ai-context-engine` | AI Context Service | AI Context Service |

### Legacy keys (не отображаются во вкладке «Службы»)

| component_key | Судьба |
|---------------|--------|
| `publication-pipeline` | Переименован в `publication-service` |
| `materialize`, `verify`, `activate`, `rollback` | Архивированы; дочерние операции `deployment-execution` |
| `dirty-dev-check` | Перенесён в **Конфигурация** (publication gate) |

### Стабильные alias-ключи

- `ai-context-engine` — стабильный ключ в коде (`modules/ai_context/`); display name **AI Context Service**.
- `publication-service` — канонический ключ вместо legacy `publication-pipeline`.

---

## 9. Использование документа

Документ используется для:

- **наполнения реестра «Службы»** в DEV Studio (после утверждения Draft);
- **классификации новых элементов** по методике;
- **архитектурного аудита** — «это служба или модуль?»;
- **проектирования новых платформенных возможностей** — куда встраивать сквозную функцию;
- **формирования Release Scope** — изменения служб затрагивают все потребители;
- **проверки архитектурных изменений** — cross-subsystem impact.

---

## 10. История версий

| Версия | Статус | Дата | Описание |
|--------|--------|------|----------|
| v1.0 | Draft | 2026-06-19 | Первоначальный состав служб на основе WI-ARCH-SERVICES-001 (WI-ARCH-SERVICES-002) |
| v1.1 | Draft | 2026-06-19 | Синхронизация component_key с реестром DEV Studio (WI-ARCH-REG-SERV-002) |
