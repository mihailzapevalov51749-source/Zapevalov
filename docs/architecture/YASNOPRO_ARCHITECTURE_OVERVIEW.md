# Обзор архитектуры платформы ЯсноПро

```yaml
document: architecture-overview
title: Обзор архитектуры платформы ЯсноПро
version: v1.1
status: Draft
date: 2026-06-20
authority: YASNOPRO Platform Architecture
scope: platform-wide architecture overview
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.2
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md v1.2
source_work_item: WI-ARCH-DOC-003
related_registry: DEV Studio → Архитектура платформы → Обзор
child_documents:
  - YASNOPRO_CORE_ARCHITECTURE.md
  - YASNOPRO_PLATFORM_STANDARDS.md
  - YASNOPRO_PLATFORM_SERVICES.md
  - YASNOPRO_PLATFORM_MODULES.md
  - YASNOPRO_PLATFORM_COMPONENTS.md
  - YASNOPRO_PLATFORM_UI.md
  - YASNOPRO_PLATFORM_DATA.md
  - YASNOPRO_PLATFORM_CONFIGURATION.md
```

---

## 1. Назначение документа

Документ даёт **общее описание архитектуры платформы ЯсноПро** — ответ на вопрос:

> **Как устроена платформа в целом?**

Документ нужен, чтобы:

- связать вкладку **«Обзор»** Architecture Navigator с единым narrative о платформе;
- показать **compositional-структуру** архитектурных реестров и их назначение;
- объяснить **связи между реестрами** без погружения в код и таблицы БД;
- направить архитектора, аналитика и разработчика к специализированным документам каждой категории.

Документ **не дублирует** детальные реестры, ADR и governance.  
Техническая реализация, API, runtime и tenant-данные **не входят** в scope документа.

---

## 2. Что такое платформа ЯсноПро

**ЯсноПро** — платформа-конструктор для проектирования и эксплуатации **цифровых рабочих мест компании**: портал, объекты, процессы, права, модули и интерфейс.

Платформа состоит из:

```text
Архитектурная модель (реестры DEV Studio)
        ↓
Конструктор (Designer / Studio)
        ↓
Публикация DEV → TEMPLATE → CLIENT
        ↓
Runtime компании (Office)
```

**Compositional-классификация** (v1.2) описывает платформу через **логические реестры**, а не через папки в коде. Критерии отнесения — в [Методике классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md).

---

## 3. Architecture Navigator и реестры

В DEV Studio → **Архитектура платформы** пользователь работает с **Architecture Navigator**:

| Вкладка | Документ | Назначение реестра |
|---------|----------|-------------------|
| **Обзор** | Этот документ | Сводка и навигация по архитектуре |
| **Ядро** | [YASNOPRO_CORE_ARCHITECTURE.md](./YASNOPRO_CORE_ARCHITECTURE.md) | Базовые механизмы конструктора (12 элементов) |
| **Службы** | [YASNOPRO_PLATFORM_SERVICES.md](./YASNOPRO_PLATFORM_SERVICES.md) | Инфраструктурные платформенные сервисы (9 элементов) |
| **Модули** | [YASNOPRO_PLATFORM_MODULES.md](./YASNOPRO_PLATFORM_MODULES.md) | Продуктовые возможности платформы (6 элементов) |
| **Данные** | [YASNOPRO_PLATFORM_DATA.md](./YASNOPRO_PLATFORM_DATA.md) | Платформенные и tenant-данные (11 элементов) |
| **Интерфейс** | [YASNOPRO_PLATFORM_UI.md](./YASNOPRO_PLATFORM_UI.md) | Модель экранов и UX-поверхности (20 элементов) |
| **Компоненты** | [YASNOPRO_PLATFORM_COMPONENTS.md](./YASNOPRO_PLATFORM_COMPONENTS.md) | Переиспользуемые UI-блоки (18 элементов) |
| **Конфигурация** | [YASNOPRO_PLATFORM_CONFIGURATION.md](./YASNOPRO_PLATFORM_CONFIGURATION.md) | Опубликованная настройка платформы (36 элементов) |
| **Стандарты** | [YASNOPRO_PLATFORM_STANDARDS.md](./YASNOPRO_PLATFORM_STANDARDS.md) | Нормы проектирования и разработки (35 элементов) |

**Итого active elements (WI-ARCH-FINAL-001):** **147** — `Registry = Constants = Seed = Scanner`, coverage **147 / 147**.

Порядок вкладок совпадает с Architecture Navigator (`ARCHITECTURE_REGISTRY_TABS`, WI-ARCH-NAV-ORDER-001).

Каждая вкладка открывает **свой архитектурный документ** (кнопка «Документ» в тулбаре Navigator).  
Карточки элементов реестра дополняются **динамическими файлами** из Architecture Scanner (WI-ARCH-NAV-UI-001).

---

## 4. Compositional-структура (8 категорий + Обзор)

Порядок compositional-реестров в Navigator (без вкладки «Обзор»):

```text
Платформа ЯсноПро

├─ Ядро              — механизмы конструктора (12)
├─ Службы            — инфраструктура платформы (9)
├─ Модули            — продуктовые capability (6)
├─ Данные            — что хранится и где (11)
├─ Интерфейс         — зоны взаимодействия пользователя (20)
├─ Компоненты        — UI-строительные блоки (18)
├─ Конфигурация      — опубликованная настройка платформы (36)
└─ Стандарты         — правила и конституция (35)
```

**Суммарно:** 147 active elements в Architecture Navigator.

Подробная классификация — [YASNOPRO_ARCHITECTURE_CLASSIFICATION.md](./YASNOPRO_ARCHITECTURE_CLASSIFICATION.md).

**Сняты как compositional primary (v1.2):** Runtime, Публикация, Правила — перенесены в governance и operational слои.

---

## 5. Связи между реестрами

### 5.1 Вертикаль «от механизма к пользователю»

```text
Ядро (механизм)
  → Служба (обеспечение)
    → Модуль (функция для компании)
      → Элемент интерфейса (зона UX)
        → Компонент (виджет)
```

**Пример:** View Engine (ядро) → Search Service (служба) → модуль «Документы» → «Глобальный поиск» (интерфейс) → `SearchInput` (компонент).

### 5.2 Горизонталь «стандарты и данные»

- **Стандарты** задают правила для **всех** категорий (идентификация, modal, accent zones, DEV-only).
- **Данные** описывают хранение: platform catalog, tenant metadata, бизнес-записи — **не** путать с механизмами ядра (`entity-engine`, `event-engine` — механизмы ядра; datastore-элементы — реестр «Данные»).
- **Конфигурация** — **опубликованная настройка платформы:** навигация, страницы, рабочие пространства, размещение объектов, размещение модулей, размещение интерфейса, размещение действий, стартовые роли, стартовая компания, опубликованный каталог. **Не** operational home для релизов и журналов (это governance / службы).

### 5.3 Governance (вне compositional primary)

Конституция, ADR, контур доставки — раздел **Architecture Governance**, не дублируется в compositional-вкладках Navigator v1.2.

---

## 6. Контуры платформы

| Контур | Роль | Связанные реестры |
|--------|------|-------------------|
| **DEV Studio** | Проектирование, аудит, Navigator | Все compositional-реестры |
| **Control Plane** | Управление компаниями и платформой | Службы, Конфигурация |
| **TEMPLATE** | Эталон для публикации | Службы (Publication), Конфигурация |
| **CLIENT Runtime** | Рабочее место компании | Модули, Интерфейс, Данные |

Runtime **не является** отдельным compositional-реестром; он **реализует** опубликованную конфигурацию tenant.

---

## 7. Главные архитектурные принципы

1. **Single Source of Truth** — реестр, документ и Scanner не дублируют бизнес-логику.
2. **Display ≠ id** — `name`, `title`, `label` не используются как технические ключи (см. стандарты).
3. **Compositional, not folder-based** — классификация по роли элемента, не по пути в репозитории.
4. **DEV-only development** — изменения платформы проектируются в DEV, публикуются по контуру DEV → TEMPLATE → CLIENT.
5. **Документ ↔ Navigator ↔ Код** — каждая вкладка имеет документ; карточки показывают файлы из последнего scan.

---

## 8. Как читать архитектуру дальше

| Вопрос | Куда идти |
|--------|-----------|
| Из чего состоит платформа? | [Классификация](./YASNOPRO_ARCHITECTURE_CLASSIFICATION.md) |
| Какие механизмы в ядре? | [Ядро](./YASNOPRO_CORE_ARCHITECTURE.md) |
| Какие правила обязательны? | [Стандарты](./YASNOPRO_PLATFORM_STANDARDS.md) |
| Как устроен UI для пользователя? | [UI платформы](./YASNOPRO_PLATFORM_UI.md) |
| Как управляется архитектура? | [Governance](./YASNOPRO_ARCHITECTURE_GOVERNANCE.md) |

---

## 9. Статус и эволюция

| Поле | Значение |
|------|----------|
| Версия | v1.1 |
| Статус | Draft |
| Work Item | WI-ARCH-DOC-003 |
| Active elements | 147 (Scanner coverage 147/147) |
| Следующий шаг | WI-ARCH-LINKS-001 — очистка legacy-ссылок CATALOG_LINKS |

Документ синхронизирован с вкладкой **«Обзор»** Architecture Navigator, картой `registry_documents.py` и финальным аудитом **WI-ARCH-FINAL-001**.
