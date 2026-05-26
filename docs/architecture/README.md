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

- PLATFORM_CORE — фундамент платформы
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

- Universal Table = View Engine
- Entity Layer = source of truth
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

### Universal Table

Universal Table — это движок отображения данных.

Таблица НЕ является:
- источником истины;
- бизнес-моделью;
- хранилищем логики.

Таблица отвечает только за:
- отображение;
- сортировку;
- фильтрацию;
- inline editing;
- selection;
- virtualization.

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