# Компоненты платформы ЯсноПро

```yaml
document: platform-components
title: Компоненты платформы ЯсноПро
version: v1.1
status: Draft
date: 2026-06-20
authority: YASNOPRO Platform Architecture
scope: components registry definition
parent_documents:
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION.md v1.0
  - YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md v1.0
  - YASNOPRO_CORE_ARCHITECTURE.md v1.0
  - YASNOPRO_PLATFORM_SERVICES.md v1.0
  - YASNOPRO_PLATFORM_MODULES.md v1.0
  - YASNOPRO_PLATFORM_DATA.md v1.0
  - YASNOPRO_INTERFACE_ELEMENTS.md v1.1
source_audits:
  - WI-ARCH-COMP-001
  - WI-ARCH-COMP-001A
  - WI-ARCH-REG-COMP-001
  - WI-ARCH-REG-COMP-001A
  - WI-ARCH-REG-COMP-002
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
related_registry: DEV Studio → Архитектура платформы → Компоненты
related_standards:
  - YASNOPRO_PLATFORM_MODAL_STANDARD.md
  - YASNOPRO_VIEW_ENGINE_MODEL.md
```

---

## 1. Назначение документа

Документ фиксирует **состав, назначение и границы архитектурных компонентов** платформы ЯсноПро — категории «Компоненты» из [Архитектурной классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION.md).

Документ нужен, чтобы:

- иметь единый источник истины для реестра «Компоненты платформы» в DEV Studio;
- отделить **архитектурные компоненты** от [элементов интерфейса](./YASNOPRO_INTERFACE_ELEMENTS.md), [ядра](./YASNOPRO_CORE_ARCHITECTURE.md), [модулей](./YASNOPRO_PLATFORM_MODULES.md) и **UI-библиотеки**;
- классифицировать новые строительные блоки по [Методике классификации](./YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md);
- проектировать интерфейсы, модули, публикации, релизы и UI-стандарты.

Документ основан на аудитах **WI-ARCH-COMP-001**, **WI-ARCH-REG-COMP-001/001A** и нормализации **WI-ARCH-REG-COMP-002** (**18 архитектурных компонентов** в реестре Navigator).  
Код, React, CSS, файлы реализации и библиотеки **не входят** в scope документа.

### Реестр v1.1 — component_key

| component_key | technical_name | element_status | Связанные элементы интерфейса |
|---------------|----------------|----------------|------------------------------|
| `platform-page` | PlatformPage | active | — |
| `platform-modal` | PlatformModal | active | `modal-zone` |
| `platform-table` | PlatformTable | active | `view-surface`, `picker-panel` |
| `platform-form` | PlatformForm | active | `quick-create` |
| `platform-tree` | PlatformTree | active | `view-surface`, `side-navigation` |
| `platform-card` | PlatformCard | active | `entity-card`, `view-surface` |
| `platform-tabs` | PlatformTabs | active | `workspace-tabs` |
| `platform-drawer` | PlatformDrawer | active | `side-panel` |
| `platform-toolbar` | PlatformToolbar | active | `action-panel` |
| `platform-notification` | PlatformNotification | active | `notification-center` |
| `platform-sidebar` | PlatformSidebar | active | `side-navigation` |
| `platform-breadcrumbs` | PlatformBreadcrumbs | active | `breadcrumbs` |
| `platform-context-menu` | PlatformContextMenu | partial | `context-menu` |
| `user-picker` | UserPicker | active | `picker-panel` |
| `object-picker` | ObjectPicker | partial | `picker-panel` |
| `file-picker` | FilePicker | partial | `picker-panel` |
| `platform-kanban` | PlatformKanban | planned | `view-surface` |
| `platform-calendar` | PlatformCalendar | planned | `view-surface` |

Legacy implementation names (не использовать в реестре): `ObjectTable` → `platform-table`, `Modal` → `platform-modal`, `NavigationTree` → `platform-tree`.

**Не входят в реестр «Компоненты»:** EmptyState, ErrorState — см. раздел [UX Patterns](#ux-patterns).

---

## 2. Что такое компонент платформы

**Компонент платформы** — это **переиспользуемый строительный блок**, из которого собираются [элементы интерфейса](./YASNOPRO_INTERFACE_ELEMENTS.md), страницы, рабочие области и экраны [модулей](./YASNOPRO_PLATFORM_MODULES.md).

### Принцип трёх уровней

```text
Элемент интерфейса  =  что видит пользователь
Компонент платформы =  из чего это собрано
UI-библиотека       =  как это реализовано
```

| Уровень | Вопрос | Пример |
|---------|--------|--------|
| **Элемент интерфейса** | *Что воспринимает пользователь?* | Карточка объекта, модальная зона |
| **Компонент платформы** | *Из каких блоков собрано?* | PlatformCard, PlatformModal |
| **UI-библиотека** | *Какими controls реализовано?* | Button, Input, Checkbox |

### Примеры цепочек

```text
Боковое меню
  → PlatformSidebar
    → Navigation Item / Button (UI-библиотека)

Карточка объекта
  → PlatformCard
    → Field Presentation Layer
      → Input / Select / Checkbox (UI-библиотека)

Модальная зона
  → PlatformModal
    → Dialog controls (UI-библиотека)

Поверхность представления
  → View Type Renderer Family
    ├─ PlatformTable
    ├─ PlatformTree
    ├─ PlatformKanban
    └─ PlatformCalendar
```

### Компонент платформы не является

- **элементом интерфейса** — целой UX-зоной;
- **модулем** — продуктовой capability;
- **ядром** — engine платформы;
- **UI-библиотекой** — атомарным visual control;
- **данными** или **службой**.

### Отличие от UI-библиотеки

| Критерий | Архитектурный компонент | UI-библиотека |
|----------|-------------------------|---------------|
| Переписать фронтенд | **Роль сохраняется** | Можно заменить полностью |
| Связь с ядром | Часто (view types, поля, объекты) | Нет |
| Платформенный контракт | Да (Page, Modal Standard) | Нет |
| В реестре «Компоненты» | **Да** | **Нет** |

---

## 3. Общая структура реестра v1.1

```text
Компоненты платформы (18)

├─ Группа 1. Каркас платформы
│  ├─ platform-page (PlatformPage)
│  ├─ platform-form (PlatformForm)
│  ├─ platform-card (PlatformCard)
│  └─ platform-toolbar (PlatformToolbar)
│
├─ Группа 2. Диалоговые компоненты
│  ├─ platform-modal (PlatformModal)
│  ├─ platform-drawer (PlatformDrawer)
│  └─ platform-context-menu (PlatformContextMenu)
│
├─ Группа 3. Навигационные компоненты
│  ├─ platform-tabs (PlatformTabs)
│  ├─ platform-sidebar (PlatformSidebar)
│  └─ platform-breadcrumbs (PlatformBreadcrumbs)
│
├─ Группа 4. View Type Renderer Family
│  ├─ platform-table (PlatformTable)
│  ├─ platform-tree (PlatformTree)
│  ├─ platform-kanban (PlatformKanban) — planned
│  └─ platform-calendar (PlatformCalendar) — planned
│
├─ Группа 5. Компоненты выбора
│  ├─ user-picker (UserPicker)
│  ├─ object-picker (ObjectPicker)
│  └─ file-picker (FilePicker)
│
└─ Группа 6. Системные компоненты
   └─ platform-notification (PlatformNotification)
```

---

## 4. Состав компонентов v1.1

Ниже — narrative-карточки компонентов. Канонический состав, `component_key` и `element_status` — таблица в §1.

---

### Группа 1. Каркас платформы

---

#### platform-page (PlatformPage)

**Назначение**  
Единый каркас страницы платформы: header, toolbar, body, зоны контента.

**Что делает**  
Задаёт структуру экранов Office, Studio и Control Plane; обеспечивает предсказуемый layout.

**Кто использует**  
Все контуры платформы; модули встраиваются в body страницы.

**Почему архитектурный компонент**  
Без него каждый раздел — свой layout; нарушается целостность продукта.

**Что произойдёт при отсутствии**  
Хаос экранных структур; сложнее публикации и UX-стандарты.

**Собирает элемент интерфейса:** рабочая область, страницы модулей  
**Связанные категории:** Элементы интерфейса, Стандарты UI  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformForm

**Назначение**  
Стандартная форма создания и редактирования записей и настроек.

**Что делает**  
Организует поля, валидацию, submit/cancel; используется в modal, drawer, inline.

**Кто использует**  
Office (create/edit), Studio (object settings), Control Plane (admin forms).

**Почему архитектурный компонент**  
Единый паттерн ввода данных платформы; связан с ядром «Поля».

**Что произойдёт при отсутствии**  
Ad-hoc формы в каждом модуле.

**Собирает элемент интерфейса:** быстрое создание, формы в модальной зоне  
**Связанные категории:** Ядро (Поля), Field Presentation Layer, PlatformModal  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformCard

**Назначение**  
Контейнер детальной работы с одной записью: секции, поля, вкладки.

**Что делает**  
Показывает hero, атрибуты, related data, comments; host для tabs внутри карточки.

**Кто использует**  
Office, Studio preview, модули с entity-centric UX.

**Почему архитектурный компонент**  
Собирает элемент «Карточка объекта»; не atomic UI container.

**Что произойдёт при отсутствии**  
Нет стандартного экрана записи.

**Собирает элемент интерфейса:** карточка объекта  
**Связанные категории:** Ядро (Объекты, Отображения), PlatformTabs  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformToolbar

**Назначение**  
Полоса действий и инструментов на уровне страницы, списка или карточки.

**Что делает**  
Размещает primary/secondary actions, фильтры, bulk operations, view controls.

**Кто использует**  
Office, Studio, Control Plane, view renderers.

**Почему архитектурный компонент**  
Собирает элемент «Панель действий»; платформенный контракт команд.

**Что произойдёт при отсутствии**  
Действия спрятаны; ниже discoverability.

**Собирает элемент интерфейса:** панель действий  
**Связанные категории:** Ядро (Действия), View Type Renderer Family  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Группа 2. Диалоговые компоненты

---

#### PlatformModal

**Назначение**  
Модальное окно платформы: overlay, фокус, drag, resize, persist bounds.

**Что делает**  
Host для форм, настроек, мастеров, подтверждений; реализует Platform Modal Standard.

**Кто использует**  
Office, Studio, Control Plane, все модули.

**Почему архитектурный компонент**  
Собирает элемент «Модальная зона»; нормативный стандарт платформы.

**Что произойдёт при отсутствии**  
Несогласованные диалоги; регрессии UX настроек.

**Собирает элемент интерфейса:** модальная зона, панель выбора (частично)  
**Связанные категории:** Стандарты, PlatformForm  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformDrawer

**Назначение**  
Боковая выезжающая панель для деталей, фильтров, вторичных задач.

**Что делает**  
Открывается сбоку без полной смены страницы; альтернатива modal для контекстных задач.

**Кто использует**  
Office (фильтры, свойства), Studio.

**Почему архитектурный компонент**  
Собирает элемент «Боковая панель»; отличный UX-контракт от modal.

**Что произойдёт при отсутствии**  
Всё через modal или отдельные страницы.

**Собирает элемент интерфейса:** боковая панель  
**Связанные категории:** PlatformModal (соседний паттерн)  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformContextMenu

**Назначение**  
Контекстное меню команд для выделенного объекта, строки или зоны.

**Что делает**  
Показывает доступные действия по контексту (правый клик, «⋯»).

**Кто использует**  
Office, Studio, таблицы, деревья, карточки.

**Почему архитектурный компонент**  
Собирает элемент «Контекстное меню»; связан с ядром «Действия».

**Что произойдёт при отсутствии**  
Действия только в toolbar.

**Собирает элемент интерфейса:** контекстное menu  
**Связанные категории:** Ядро (Действия), PlatformToolbar  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Группа 3. Навигационные компоненты

---

#### PlatformTabs

**Назначение**  
Вкладки **внутри страницы или карточки** для переключения представлений и секций.

**Что делает**  
Переключает views, object settings tabs, card sections.

**Кто использует**  
Office, Studio, PlatformCard.

**Почему архитектурный компонент**  
Отличен от «Вкладок рабочей области» (элемент интерфейса App Shell).

**Что произойдёт при отсутствии**  
Нет стандартного in-page tab UX.

**Собирает:** вкладки внутри карточки/страницы (не workspace tabs)  
**Связанные категории:** Элементы интерфейса (различать уровни)  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformSidebar

**Назначение**  
Боковая навигационная колонка: дерево разделов, пункты меню tenant.

**Что делает**  
Host для navigation tree; поддерживает collapse, favorites hooks.

**Кто использует**  
Office, Studio (App Shell).

**Почему архитектурный компонент**  
Строительный блок элемента «Боковое меню».

**Что произойдёт при отсутствии**  
Нет единой primary navigation surface.

**Собирает элемент интерфейса:** боковое меню  
**Связанные категории:** Ядро (Навигация), PlatformTree (nav tree use case)  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformBreadcrumbs

**Назначение**  
Цепочка ориентации «где я» в иерархии разделов.

**Что делает**  
Показывает путь от корня; позволяет подняться на уровень выше.

**Кто использует**  
Office, Studio, глубокая навигация.

**Почему архитектурный компонент**  
Строительный блок элемента «Хлебные крошки».

**Что произойдёт при отсутствии**  
Пользователь теряется в глубоких разделах.

**Собирает элемент интерфейса:** хлебные крошки  
**Связанные категории:** Ядро (Навигация)  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Группа 4. View Type Renderer Family

#### Концепция семейства

**View Type Renderer Family** — не четыре независимых архитектурных столпа, а **семейство компонентов отображения данных**, реализующих view types [View Engine](./YASNOPRO_VIEW_ENGINE_MODEL.md).

| Уровень | Роль |
|---------|------|
| **Ядро** | View Engine — view type, representation, session |
| **Элемент интерфейса** | Поверхность представления — одна для всех view types |
| **Компоненты** | PlatformTable / Tree / Kanban / Calendar — **члены семейства** |

```text
View Type Renderer Family
├─ PlatformTable    — view type: Table
├─ PlatformTree     — view type: Tree
├─ PlatformKanban   — view type: Kanban
└─ PlatformCalendar — view type: Calendar
```

---

#### PlatformTable

**Назначение**  
Табличное отображение набора записей объекта.

**Что делает**  
Колонки, сортировка, фильтры, selection, pagination; host для toolbar и context menu.

**Кто использует**  
Office (основной реестр), Studio preview, Control Plane lists.

**Почему архитектурный компонент**  
**Член семейства View Type Renderer**; главная data surface платформы.

**Что произойдёт при отсутствии**  
Нет universal table; платформа теряет object-centric lists.

**Собирает элемент интерфейса:** поверхность представления (вид: таблица)  
**Связанные категории:** Ядро (Отображения), PlatformToolbar  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformTree

**Назначение**  
Древовидное отображение иерархии записей или навигации.

**Что делает**  
Expand/collapse, nested rows, plan/tree views, sidebar nav tree.

**Кто использует**  
Office (plan view, hierarchies), Studio, PlatformSidebar.

**Почему архитектурный компонент**  
**Член семейства View Type Renderer**; два контекста: data tree и nav tree.

**Что произойдёт при отсутствии**  
Нет стандартного hierarchy UX.

**Собирает элемент интерфейса:** поверхность представления (вид: дерево)  
**Связанные категории:** Ядро (Отображения), PlatformSidebar  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### PlatformKanban

**Назначение**  
Канбан-отображение записей по статусам или колонкам.

**Что делает**  
Drag между колонками, swimlanes, card tiles в доске.

**Кто использует**  
Office (roadmap views), процессные сценарии.

**Почему архитектурный компонент**  
**Член семейства View Type Renderer**; зрелость ниже Table (Draft).

**Что произойдёт при отсутствии**  
Status-board UX только через custom modules.

**Собирает элемент интерфейса:** поверхность представления (вид: доска)  
**Связанные категории:** Ядро (Отображения, Действия)  
**Статус:** Draft  
**Уверенность:** Средняя

---

#### PlatformCalendar

**Назначение**  
Календарное отображение записей и событий по датам.

**Что делает**  
Month/week/day views; placement записей на timeline.

**Кто использует**  
Office, модуль «Календарь» (module screen uses platform renderer).

**Почему архитектурный компонент**  
**Член семейства View Type Renderer**; модуль ≠ renderer.

**Что произойдёт при отсутствии**  
Calendar UX не унифицирован с View Engine.

**Собирает элемент интерфейса:** поверхность представления (вид: календарь)  
**Связанные категории:** Ядро (Отображения), Модули (Календарь)  
**Статус:** Draft  
**Уверенность:** Средняя

---

### Группа 5. Компоненты выбора

---

#### UserPicker

**Назначение**  
Выбор пользователя tenant: поля user, участники, assignee.

**Что делает**  
Поиск, список, подтверждение; привязка к identity/membership платформы.

**Кто использует**  
Office forms, Studio field settings, модуль «Чат», процессы.

**Почему архитектурный компонент**  
Domain picker, не generic select; связан с моделью пользователей.

**Что произойдёт при отсутствии**  
Ad-hoc user selection в каждой форме.

**Собирает элемент интерфейса:** панель выбора  
**Связанные категории:** Данные (Identity), Ядро (Поля)  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### ObjectPicker

**Назначение**  
Выбор связанной записи объекта (lookup, relation).

**Что делает**  
Поиск по object type, preview, confirm selection.

**Кто использует**  
Office, Studio, формы связей, BPMN.

**Почему архитектурный компонент**  
Привязан к ядру «Объекты» и «Связи»; не generic dropdown.

**Что произойдёт при отсутствии**  
Несогласованный lookup UX.

**Собирает элемент интерфейса:** панель выбора  
**Связанные категории:** Ядро (Связи, Объекты)  
**Статус:** Draft  
**Уверенность:** Высокая

---

#### FilePicker

**Назначение**  
Выбор файла и вложения для полей file/attachment.

**Что делает**  
Upload, browse, preview attachment; интеграция с file storage платформы.

**Кто использует**  
Office, Studio, импорт, документы.

**Почему архитектурный компонент**  
Платформенная модель файлов; не generic file input.

**Что произойдёт при отсутствии**  
Разные attachment UX в модулях.

**Собирает элемент интерфейса:** панель выбора (файлы)  
**Связанные категории:** Данные, Модули (Документы)  
**Статус:** Draft  
**Уверенность:** Высокая

---

### Группа 6. Системные компоненты

---

#### platform-notification (PlatformNotification)

**Назначение**  
Toast и inline-уведомления о результате действия пользователя.

**Что делает**  
Success/warning/error feedback; auto-dismiss; не путать с модулем «Уведомления».

**Кто использует**  
Office, Studio, Control Plane, все модули.

**Почему архитектурный компонент**  
Платформенный feedback channel; отличен от «Центра уведомлений» (элемент интерфейса).

**Что произойдёт при отсутствии**  
Нет единой обратной связи после save/delete.

**Собирает:** transient feedback (≠ центр уведомлений)  
**Связанные категории:** Модули (Уведомления — другой уровень)  
**Статус:** Draft  
**Уверенность:** Высокая

---

## 5. Архитектурный фундамент интерфейса

**Минимальный набор (15 компонентов)**, без которых переписанный фронтend **не сохранит архитектуру ЯсноПро**:

| # | Компонент | Роль |
|---|-----------|------|
| 1 | **PlatformPage** | Каркас всех экранов |
| 2 | **PlatformModal** | Диалоги и настройки (Modal Standard) |
| 3 | **PlatformForm** | Create/edit записей |
| 4 | **PlatformCard** | Карточка объекта |
| 5 | **PlatformTable** | Основная data surface |
| 6 | **PlatformToolbar** | Панель действий |
| 7 | **PlatformSidebar** | Primary navigation |
| 8 | **PlatformTabs** | In-page/card tabs |
| 9 | **PlatformDrawer** | Боковые панели |
| 10 | **PlatformContextMenu** | Контекстные команды |
| 11 | **UserPicker** | Поля user / участники |
| 12 | **ObjectPicker** | Связи и lookup |
| 13 | **PlatformSidebar** | Primary navigation |
| 14 | **PlatformBreadcrumbs** | Orientation chain |
| 15 | **PlatformNotification** | Action feedback |

**Расширение до полного v1.1 (+3 active, +2 planned, +3 partial):** PlatformContextMenu, UserPicker, ObjectPicker, FilePicker, PlatformKanban (planned), PlatformCalendar (planned).

**Вне реестра, но обязательно в архитектуре:** Field Presentation Layer (см. раздел 6).

---

## UX Patterns

Следующие элементы **не являются** архитектурными компонентами реестра «Компоненты». Это **UX-паттерны и состояния отображения** внутри PlatformPage, PlatformCard, PlatformTable и других поверхностей.

### EmptyState (display state)

Стандартное пустое состояние списка, раздела или вкладки: message, CTA «создать», onboarding guidance.  
Реализация: `ViewEngineTableState`, `ObjectSettingsEmptyState`, `PlanViewEmptyState` и локальные variants.

### ErrorState (display state)

Стандартное состояние ошибки загрузки, доступа или операции: message, retry path.  
Реализация: error-ветки `ViewEngineTableState`, inline `loadError` в forms/pickers.

---

## 6. Пограничные элементы

Не включены в реестр v1.0.

---

### Field Presentation Layer

**Элементы:** FieldEditor, FieldValueRenderer

**Вывод аудита WI-ARCH-COMP-001A:**

- **Не являются** компонентами платформы (реестр «Компоненты»).
- **Не являются** UI-библиотекой.
- **Представляют пограничный слой** между **Ядром (Поля)** и **Интерфейсом**.

| Аспект | Роль |
|--------|------|
| **Ядро** | Типы полей, метаданные, validation rules |
| **Field Presentation Layer** | Контракт «тип поля → editor / renderer» |
| **UI-библиотека** | Input, Select, Checkbox внутри editor |

**Следующее действие:** описать контракт в документе ядра «Поля» или отдельной спецификации Field Presentation (вне реестра Компонентов).

---

### PlatformPanel

**Статус:** требует дополнительной классификации.

**Контекст:** generic panel container vs «Панель свойств» (элемент интерфейса).  
Если panel = properties side zone → возможно архитектурный компонент v1.1; если visual wrapper → UI-библиотека.

---

### PlatformMenu

**Статус:** требует дополнительной классификации.

**Контекст:** dropdown menu primitive vs user menu shell.  
Вероятно — **UI-библиотека** или часть PlatformSidebar; отдельная запись реестра не нужна до решения.

---

### Avatar

**Статус:** требует дополнительной классификации.

**Контекст:** элемент интерфейса «Аватар пользователя» vs avatar widget.  
Widget → UI-библиотека; identity contract → **Стандарты UI**.

---

## 7. Не входят в реестр компонентов

### UI-библиотека

Следующие элементы **не являются** архитектурными компонентами платформы.  
Они относятся к **design system / UI-библиотеке** и реализуют архитектурные компоненты «изнутри».

```text
Базовые controls:
  PlatformButton, PlatformInput, PlatformTextarea,
  PlatformCheckbox, PlatformRadio, PlatformSelect, PlatformSwitch

Контейнеры/layout:
  PlatformSection, PlatformLayout

Диалоговые primitives:
  PlatformConfirmModal (паттерн поверх PlatformModal),
  PlatformPopover, PlatformTooltip

Навигация:
  PlatformNavigation

Pickers (generic):
  DatePicker, ColorPicker

Системные widgets:
  NotificationBadge, SearchInput, LoadingOverlay
```

**Почему не в реестре:** при полной перезаписи фронтend их можно заменить без изменения архитектуры платформы — меняется только реализация, не продуктовая модель.

---

## 8. Границы категории

### Что не является компонентами платформы

#### Ядро

Объекты, Поля, Связи, Действия, Процессы, События — **engines**; UI проявляется через компоненты и Field Presentation Layer.

#### Службы

Session Bridge, Provisioning, Publication Service, Search Service, AI Context Service — **backend/infra**.

#### Модули

Чат, Календарь, Документы, Уведомления, BPMN, ЯСИИ — **продуктовые capability**; ChatMessage и аналоги — компоненты **модуля**, не платформенного реестра.

#### Данные

Метаданные, Записи, Настройки, Каталоги, Журналы — **не UI**.

#### Элементы интерфейса

| Элемент | Почему не компонент |
|---------|---------------------|
| Боковое меню | Целая UX-зона; собирается из PlatformSidebar + nav data |
| Карточка объекта | Экран; собирается из PlatformCard + Form + tabs |
| Панель действий | UX-контур; собирается из PlatformToolbar |
| Глобальный поиск | Продуктовый discovery contour; SearchInput — UI-библиотека |
| Центр уведомлений | Агрегированный overlay; ≠ PlatformNotification (toast) |

---

## 9. Карта зависимостей

```text
Карточка объекта (элемент интерфейса)
  ↓
PlatformCard
  ↓
PlatformTabs + PlatformForm
  ↓
Field Presentation Layer
  ↓
UI-библиотека (Input / Select / Checkbox)

Поверхность представления (элемент интерфейса)
  ↓
View Type Renderer Family
  ├─ PlatformTable
  ├─ PlatformTree
  ├─ PlatformKanban
  └─ PlatformCalendar
  ↓
PlatformToolbar + PlatformContextMenu
  ↓
UI-библиотека

Модальная зона (элемент интерфейса)
  ↓
PlatformModal
  ↓
PlatformForm / UserPicker / ObjectPicker
  ↓
UI-библиотека

Боковое меню (элемент интерфейса)
  ↓
PlatformSidebar
  ↓
PlatformTree (nav use case) + PlatformNavigation items
  ↓
UI-библиотека

Панель действий (элемент интерфейса)
  ↓
PlatformToolbar
  ↓
PlatformButton (UI-библиотека)

Глобальный поиск (элемент интерфейса)
  ↓
SearchInput (UI) + Search Service (служба)
  ↓
PlatformTable / PlatformCard (результаты)
```

---

## 10. Использование документа

Документ используется для:

- **наполнения реестра «Компоненты»** в DEV Studio (после утверждения Draft);
- **классификации новых компонентов** — архитектурный vs UI-библиотека vs пограничный;
- **проектирования интерфейсов** — связь с [элементами интерфейса](./YASNOPRO_INTERFACE_ELEMENTS.md);
- **проектирования модулей** — какие platform components обязательны для module screens;
- **проектирования публикаций и релизов** — scope UI changes по категории «Компоненты»;
- **проектирования UI-стандартов** — Modal Standard, empty/error patterns, view renderers.

---

## 11. История версий

| Версия | Статус | Дата | Описание |
|--------|--------|------|----------|
| v1.1 | Draft | 2026-06-20 | 18 компонентов в реестре; UX Patterns (EmptyState/ErrorState); WI-ARCH-REG-COMP-002 |
| v1.0 | Draft | 2026-06-19 | 20 архитектурных компонентов; WI-ARCH-COMP-001, WI-ARCH-COMP-001A, WI-ARCH-COMP-002 |
