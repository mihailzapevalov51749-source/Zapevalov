# YASNOPRO Runtime Personalization Model

## Главная цель

Определить архитектурную модель персонализации Runtime-среды в YASNOPRO.

Зафиксировать разделение между:
- Designer Layer;
- Runtime Layer;
- Platform Core;
- User Personalization Layer.

---

# Главный принцип

Designer создаёт:
- структуру;
- ограничения;
- правила;
- object model;
- governance.

Runtime users создают:
- рабочую среду;
- representations;
- dashboards;
- compositions;
- personal workspace.

---

# Ключевая идея

YASNOPRO НЕ должен превращаться в:
- жёсткую BPM-систему;
- платформу, где аналитик создаёт всё;
- систему, в которой пользователи только вводят данные.

Runtime должен быть:
- живым;
- адаптивным;
- composable;
- user-driven;
- AI-assisted.

---

# Архитектурная модель

Платформа разделяется на:

| Layer | Ответственность |
|---|---|
| Platform Core | базовые движки платформы |
| Designer Layer | моделирование системы |
| Runtime Layer | рабочая среда |
| Runtime Personalization Layer | персонализация Runtime |

---

# Runtime Personalization Layer

Runtime Personalization Layer отвечает за:
- пользовательские representations;
- пользовательские workspace;
- dashboard;
- personal layout;
- personal tabs;
- runtime composition.

---

# Что создаёт аналитик

Аналитик создаёт:

| Сущность | Назначение |
|---|---|
| ObjectType | тип объекта |
| Field Definitions | структура данных |
| Relation Definitions | связи |
| View Templates | официальные представления |
| Runtime Rules | ограничения runtime |
| Permissions | права доступа |
| Workflow | бизнес-процессы |
| Layout Templates | шаблоны layout |

---

# Что создаёт пользователь

Пользователь Runtime создаёт:

| Сущность | Назначение |
|---|---|
| Personal Representation | личный вид данных |
| Team Representation | вид команды |
| Personal Workspace | личное рабочее пространство |
| Dashboard | личная аналитика |
| Runtime Layout | расположение блоков |
| Personal Tabs | пользовательские вкладки |
| Saved Filters | сохранённые фильтры |

---

# Главный принцип Runtime

Runtime НЕ должен требовать аналитика для:
- каждого фильтра;
- каждого dashboard;
- каждого workspace;
- каждого представления;
- каждого layout.

---

# View Template vs Representation

## View Template

View Template создаётся аналитиком.

Это:
- официальный тип отображения;
- часть модели платформы;
- platform-level configuration.

Примеры:
- Таблица проектов
- Канбан проектов
- Гант проектов
- Календарь проектов

---

## Representation

Representation создаётся пользователем Runtime.

Это:
- персональная настройка View Template;
- runtime-level configuration;
- пользовательский рабочий вид.

Примеры:
- Мои проекты
- Просроченные проекты
- Проекты отдела
- Проекты на согласовании

---

# Главный принцип

Representation != View Template

---

# Workspace Model

## Workspace

Workspace — композиция Runtime-среды пользователя или команды.

Workspace может включать:
- views;
- widgets;
- dashboards;
- AI blocks;
- analytics;
- timeline;
- tasks.

---

# Scope Model

Все Runtime-сущности должны иметь scope.

---

## Scope Types

| Scope | Описание |
|---|---|
| Personal | только пользователь |
| Team | команда |
| Department | подразделение |
| Company | вся компания |
| Global | системный уровень |

---

# Ownership Model

Все Runtime personalization сущности должны иметь ownership.

---

## Ownership Fields

| Поле | Назначение |
|---|---|
| created_by | кто создал |
| owner_id | владелец |
| scope | область видимости |
| shared_with | с кем поделились |
| visibility | уровень доступа |

---

# Runtime Composition

Runtime должен поддерживать:
- drag/drop;
- resize;
- widget composition;
- personal layout;
- tab composition.

---

# Важный принцип

Layout НЕ является business logic.

Layout хранит:
- spatial configuration;
- visual composition;
- UI structure.

---

# Runtime Restrictions

Пользователь Runtime НЕ должен:
- изменять ObjectType;
- изменять Relation Definitions;
- изменять system permissions;
- изменять platform core;
- изменять published schema.

---

# Runtime Allowed Actions

Пользователь Runtime может:
- создавать representations;
- сохранять фильтры;
- создавать dashboards;
- собирать workspace;
- создавать personal tabs;
- изменять personal layout;
- создавать AI views.

---

# AI Personalization

AI должен помогать пользователю:
- создавать workspace;
- формировать representations;
- находить оптимальные layouts;
- рекомендовать dashboards;
- анализировать usage patterns.

---

# Runtime Publish Model

Designer changes:
- создаются как draft;
- публикуются отдельно;
- не должны мгновенно ломать Runtime.

Runtime personalization:
- сохраняется сразу;
- принадлежит пользователю или команде;
- не изменяет platform schema.

---

# Runtime Persistence

Runtime personalization должна храниться отдельно от:
- Entity Layer;
- View Templates;
- Platform Configuration.

---

# Рекомендуемые сущности

## RuntimeRepresentation

Хранит:
- filters;
- sorting;
- hidden fields;
- grouping;
- runtime settings.

---

## RuntimeWorkspace

Хранит:
- composition;
- layout;
- widgets;
- tabs;
- dashboard structure.

---

## RuntimeLayout

Хранит:
- block positions;
- resize state;
- visual layout.

---

# Development Rules

При разработке Runtime personalization запрещено:
- смешивать View Template и Representation;
- хранить runtime state внутри schema;
- хранить personal state внутри system views;
- делать global hidden synchronization;
- смешивать Runtime и Designer.

---

# Архитектурные принципы

- Runtime должен быть self-service
- Runtime должен быть composable
- Runtime должен быть user-driven
- Runtime должен быть AI-assisted
- Platform Core должен оставаться стабильным

---

# Главная цель

Построить Runtime-среду, в которой:
- аналитик задаёт рамки;
- пользователи свободно организуют работу внутри рамок;
- AI помогает адаптировать среду под реальные процессы;
- platform core остаётся архитектурно чистым и стабильным.