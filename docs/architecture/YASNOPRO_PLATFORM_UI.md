# Пользовательский интерфейс платформы ЯсноПро

```yaml
document: platform-ui
title: Пользовательский интерфейс платформы ЯсноПро
version: v1.1
status: Draft
date: 2026-06-20
authority: YASNOPRO Platform Architecture
scope: platform UI architecture (screens, navigation, workspaces)
parent_documents:
  - YASNOPRO_ARCHITECTURE_OVERVIEW.md v1.0
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.2
  - YASNOPRO_CORE_ARCHITECTURE.md v1.1
  - YASNOPRO_PLATFORM_COMPONENTS.md v1.0
source_work_item: WI-ARCH-DOC-002
related_documents:
  - YASNOPRO_INTERFACE_ELEMENTS.md v1.1
  - YASNOPRO_PLATFORM_MODAL_STANDARD.md
  - YASNOPRO_PLATFORM_ACCENT_ZONES.md
related_registry: DEV Studio → Архитектура платформы → Интерфейс
```

---

## 1. Назначение документа

Документ описывает **архитектуру пользовательского интерфейса** платформы ЯсноПро — ответ на вопрос:

> **Как пользователь взаимодействует с платформой?**

Документ нужен, чтобы:

- связать вкладку **«Интерфейс»** Architecture Navigator с UX-моделью платформы;
- описать **экраны, навигацию, рабочие пространства** и типовые поверхности (карточки, таблицы, панели, модалки);
- отделить **UI-архитектуру** от [компонентов](./YASNOPRO_PLATFORM_COMPONENTS.md) и [элементов интерфейса](./YASNOPRO_INTERFACE_ELEMENTS.md);
- задать **общие UI-принципы** для Studio, Office и Control Plane.

Код, маршруты React, CSS-токены и API **не входят** в scope документа.  
Детальный реестр **20 элементов интерфейса** — в [YASNOPRO_INTERFACE_ELEMENTS.md](./YASNOPRO_INTERFACE_ELEMENTS.md).

---

## 2. Уровни UI-модели

```text
UI платформы

├─ Контур приложения     — Studio / Office / Control Plane
├─ App Shell             — оболочка экрана
├─ Навигация             — меню, вкладки, контекст
├─ Рабочее пространство  — canvas страницы
├─ Представления         — таблица, план, карточка, …
├─ Панели и модалки      — настройки, создание, подтверждение
└─ Компоненты            — PlatformModal, PlatformMenu, …
```

| Уровень | Вопрос | Пример |
|---------|--------|--------|
| **Контур** | *Где работает пользователь?* | Designer Studio, Office Runtime |
| **App Shell** | *Как устроен экран?* | Header, sidebar, tabs bar |
| **Навигация** | *Куда перейти?* | Боковое меню, breadcrumbs |
| **Workspace** | *Где основная работа?* | Страница объекта, модуль «Чат» |
| **Представление** | *Как видеть данные?* | Object Table View, Plan View |
| **Панель / модалка** | *Как настроить или создать?* | Platform Modal Standard |
| **Компонент** | *Из чего собрано?* | `designer-btn`, `PlatformCard` |

---

## 3. Архитектура экранов

### 3.1 Три основных контура

| Контур | Пользователь | Назначение |
|--------|--------------|------------|
| **DEV Studio** | Архитектор, разработчик, аналитик платформы | Конструктор, Architecture Navigator, Dashboard |
| **Office Runtime** | Сотрудник компании | Работа с объектами, модулями, процессами |
| **Control Plane** | Администратор платформы | Компании, пользователи, роли, provisioning |

Каждый контур использует **общую модель App Shell**, но с разными accent zones и набором разделов (см. [Accent Zones](./YASNOPRO_PLATFORM_ACCENT_ZONES.md)).

### 3.2 Типовая компоновка экрана

```text
┌─────────────────────────────────────────────────────────┐
│ App Header (toolbar zone, поиск, профиль, уведомления)  │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │ Runtime tabs / section tabs                  │
│ (menu)   ├──────────────────────────────────────────────┤
│          │ Page canvas (workspace content)              │
│          │  ├─ списки / таблицы                         │
│          │  ├─ карточки объектов                        │
│          │  └─ модульные поверхности                    │
└──────────┴──────────────────────────────────────────────┘
```

**Page Layout Contract** задаёт тип страницы (`STUDIO_SECTION`, `RUNTIME_PAGE`, …) и зону toolbar — единый источник для минимизации/раскладки.

---

## 4. Навигационная модель

### 4.1 Уровни навигации

1. **Глобальная** — переключение контура (Studio ↔ Office), Control Plane.
2. **Tenant** — выбор компании, контекст membership.
3. **Раздел** — пункт бокового меню (объект, модуль, системный раздел).
4. **Страница / вкладка** — runtime tabs внутри раздела.
5. **Сущность** — карточка экземпляра объекта, документ, задача.

### 4.2 Принципы

- Навигация **не дублирует** business id display-полями; маршруты строятся по **техническим ключам**.
- **Избранное и недавние** — производные индексы, не SoT.
- **Deep links** — поддерживаются для библиотек документов, уведомлений, object views.

### 4.3 Architecture Navigator (Studio)

Вкладки реестров — **workspace-runtime-tabs**: горизонтальная полоса с активной вкладкой и actions справа (кнопки «Документ», «Запустить сканирование»).

---

## 5. Рабочие пространства

**Рабочее пространство (workspace)** — область canvas, где пользователь выполняет основную задачу раздела.

| Тип workspace | Примеры | Характеристика |
|---------------|---------|----------------|
| **Конструктор** | Designer: объекты, поля, страницы | Режим редактирования метamodel |
| **Runtime list** | Таблица экземпляров | Object Table View |
| **Runtime detail** | Карточка сущности | Entity card + relations |
| **Module surface** | Чат, Календарь, Документы | Модульная UX-оболочка |
| **Platform section** | Architecture Navigator, Dashboard | Studio-only разделы |

Workspace **не смешивает** draft designer state с опубликованным runtime без явного shadow/parity контура.

---

## 6. Карточки

**Карточка** — primary surface для просмотра и редактирования **одной сущности** (экземпляр объекта, элемент реестра, профиль).

### 6.1 Типы карточек

| Карточка | Контекст | Содержание |
|----------|----------|------------|
| **Entity card** | Office | Поля объекта, связи, вкладки |
| **Architecture component card** | Navigator | Описание, назначение, файлы scan |
| **Platform card** | Control Plane | Компания, пользователь, роль |

### 6.2 Принципы карточек

- Заголовок — **display name**; идентификация и API — по `id` / `key`.
- Секции группируются по смыслу (описание, связи, audit).
- **Последняя проверка** / metadata — read-only projection из Scanner или audit.

---

## 7. Таблицы и представления

**Object views** — семейство представлений над коллекцией экземпляров:

| View | Назначение |
|------|------------|
| **Table View** | Табличный список, фильтры, колонки |
| **Plan View** | Иерархия / план по связям |
| *(другие)* | По контракту View Engine |

Таблица = **поверхность данных**, не отдельный модуль. Настройки представления (колонки, фильтры) — через **Platform Modal Standard**.

---

## 8. Панели

**Панель** — боковая или inline-зона для вторичных действий без блокировки canvas.

| Панель | Пример |
|--------|--------|
| **Properties panel** | Свойства поля в Designer |
| **Actions panel** | Действия над выделением |
| **Settings panel** | Настройки view (через modal/panel standard) |

**Запрещено** для новых settings panels: кастомные `position: fixed` popover вместо [Platform Modal Standard](./YASNOPRO_PLATFORM_MODAL_STANDARD.md).

---

## 9. Модальные окна

Все рабочие модалки и панели настроек используют **Platform Modal Standard**:

- `PlatformModal` + `usePlatformModalLayout`
- drag по header, resize, persist bounds в `localStorage`
- уникальный `modalKey` на панель

Подтверждения, создание сущностей, rename view — через тот же стек (`designer-btn`, footer actions).

---

## 10. Общие UI-принципы

1. **Единая оболочка** — App Shell + accent zones по контуру.
2. **Предсказуемая навигация** — sidebar + tabs + breadcrumbs; без скрытых route.
3. **Modal standard** — одна модель для всех settings/dialog panels.
4. **Read-only architecture** — Navigator и Governance показывают projection, не редактируют SoT документов из UI.
5. **Accessibility baseline** — focus-visible, aria-label на tabs и modals.
6. **Responsive degradation** — toolbar actions переносятся на узких экранах (Navigator tabs).

---

## 11. Связь с другими документами

| Документ | Связь |
|----------|-------|
| [Элементы интерфейса](./YASNOPRO_INTERFACE_ELEMENTS.md) | Реестр 20 UX-зон |
| [Компоненты](./YASNOPRO_PLATFORM_COMPONENTS.md) | UI-блоки (`PlatformModal`, …) |
| [Стандарты](./YASNOPRO_PLATFORM_STANDARDS.md) | UX/UI standards, modal checklist |
| [Ядро](./YASNOPRO_CORE_ARCHITECTURE.md) | View Engine, Navigation Engine |
| [Обзор](./YASNOPRO_ARCHITECTURE_OVERVIEW.md) | Место UI в compositional-модели |

---

## 12. Статус

| Поле | Значение |
|------|----------|
| Версия | v1.1 |
| Статус | Draft |
| Work Item | WI-ARCH-DOC-002, WI-ARCH-REG-UI-002 |
| Navigator | DEV Studio → Архитектура платформы → Интерфейс |

Документ является SoT для вкладки **«Интерфейс»**; детальный перечень **20 элементов** с `component_key` — в `YASNOPRO_INTERFACE_ELEMENTS.md` (синхронизирован с Registry Seed в WI-ARCH-REG-UI-002).
