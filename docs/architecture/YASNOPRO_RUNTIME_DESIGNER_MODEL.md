# YASNOPRO Runtime Designer Model

## 1. Назначение документа

Документ описывает разделение платформы ЯсноПро на Runtime и Designer.

### Цель документа

- разделить работу сотрудников и моделирование платформы;
- устранить смешение runtime logic и configuration logic;
- определить роли пользователей;
- создать фундамент для масштабируемой платформы;
- подготовить платформу к AI-native architecture.

### Простыми словами

Документ отвечает на вопрос:

> Кто работает внутри системы, а кто строит саму систему?

---

## 2. Главная проблема текущего состояния

Сейчас в ЯсноПро могут смешиваться:

- рабочее пространство сотрудников;
- настройка платформы;
- редактирование схемы данных;
- настройка отображения;
- проектирование объектов;
- временное пользовательское состояние;
- сохранённые пользовательские настройки.

Из-за этого:

- интерфейс становится перегруженным;
- растёт complexity;
- появляются giant controllers;
- ломается state architecture;
- появляются hidden dependencies;
- сложно масштабировать платформу.

---

## 3. Главная идея разделения

ЯсноПро состоит из двух больших режимов:

1. Runtime
2. Designer

---

## 4. Что такое Runtime

### Технически

Runtime — рабочая среда пользователей.

### По-человечески

Runtime — место, где сотрудники выполняют свою работу.

Например:

- работают с задачами;
- открывают проекты;
- пишут комментарии;
- согласуют документы;
- работают с данными;
- используют AI;
- создают личные и командные рабочие настройки внутри разрешённых рамок.

---

## 5. Runtime НЕ занимается моделированием платформы

Runtime НЕ должен:

- создавать ObjectType;
- менять schema;
- менять platform rules;
- настраивать Relation Definition;
- проектировать архитектуру платформы;
- менять published ViewTemplate;
- менять system permissions.

Runtime может создавать только пользовательские и командные настройки внутри разрешённых Designer-рамок.

---

## 6. Что такое Designer

### Технически

Designer — среда моделирования платформы.

### По-человечески

Designer — место, где аналитик или архитектор компании строит цифровую модель бизнеса.

Например:

- создаёт ObjectType;
- настраивает поля;
- создаёт связи;
- проектирует workflow;
- настраивает AI context;
- создаёт ViewTemplate;
- задаёт ограничения Runtime;
- определяет права доступа.

---

## 7. Главная идея Designer

Designer — это не «админка».

Designer — это среда цифрового моделирования компании.

---

## 8. Runtime Users

Runtime Users:

- сотрудники;
- исполнители;
- менеджеры;
- руководители;
- пользователи системы.

---

## 9. Что делает Runtime User

Runtime User:

- работает с объектами;
- меняет статусы;
- читает данные;
- выполняет задачи;
- использует AI;
- работает с документами;
- создаёт RuntimeRepresentation;
- сохраняет фильтры;
- настраивает личный или командный workspace;
- меняет RuntimeLayoutDelta в пределах разрешённых правил.

---

## 10. Designer Users

Designer Users:

- бизнес-аналитики;
- архитекторы процессов;
- администраторы платформы;
- системные аналитики;
- владельцы цифровой модели компании.

---

## 11. Что делает Designer User

Designer User:

- создаёт ObjectType;
- проектирует структуру данных;
- создаёт Relation Definition;
- определяет permissions;
- создаёт ViewTemplate;
- проектирует LayoutTemplate;
- настраивает workflow;
- настраивает AI behavior;
- задаёт Runtime restrictions.

Designer User НЕ создаёт RuntimeRepresentation как пользовательскую рабочую настройку.

---

## 12. Runtime UI

Runtime UI должен быть:

- простым;
- быстрым;
- рабочим;
- понятным;
- не перегруженным техническими настройками.

---

## 13. Runtime UI примеры

Runtime UI:

- таблица задач;
- карточка проекта;
- comments;
- kanban;
- dashboard;
- календарь;
- file viewer;
- personal workspace;
- saved filters;
- personal views.

---

## 14. Designer UI

Designer UI — профессиональная среда моделирования.

Designer UI может быть сложнее Runtime UI, потому что он используется:

- аналитиками;
- архитекторами;
- администраторами.

---

## 15. Designer UI примеры

Designer UI:

- редактор ObjectType;
- редактор Field Definition;
- редактор Relation Definition;
- настройка AI context;
- редактор ViewTemplate;
- настройка permissions;
- настройка workflow;
- настройка LayoutTemplate.

---

## 16. Runtime Blocks

Runtime Blocks:

- таблица;
- comments;
- dashboard;
- kanban;
- календарь;
- entity card;
- AI insights;
- timeline.

---

## 17. Designer Blocks

Designer Blocks:

- schema editor;
- relation editor;
- field editor;
- object designer;
- workflow editor;
- AI behavior editor;
- ViewTemplate editor;
- LayoutTemplate editor.

---

## 18. Runtime Permissions

Runtime Permissions отвечают:

- какие данные видит сотрудник;
- что он может изменять;
- какие действия доступны;
- может ли он создавать RuntimeRepresentation;
- может ли он создавать Team Workspace;
- может ли он делиться своими настройками.

---

## 19. Designer Permissions

Designer Permissions отвечают:

- кто может менять schema;
- кто может создавать ObjectType;
- кто может менять Relation Definition;
- кто может изменять platform core;
- кто может создавать ViewTemplate;
- кто может публиковать изменения модели.

---

## 20. Главный принцип безопасности

Не каждый пользователь платформы должен быть архитектором платформы.

---

## 21. Runtime State

Runtime State:

- рабочее состояние пользователя;
- открытые объекты;
- temporary filters;
- selection;
- active ViewTemplate;
- active RuntimeRepresentation;
- comments;
- temporary changes;
- ViewSession;
- RuntimeLayoutDelta.

Runtime State НЕ должен становиться Designer Configuration.

---

## 22. Designer State

Designer State:

- schema editing;
- relation editing;
- field editing;
- workflow editing;
- LayoutTemplate editing;
- ViewTemplate editing;
- permissions editing;
- draft/published model state.

Designer State НЕ должен хранить личные пользовательские Runtime-настройки.

---

## 23. Почему Runtime и Designer нельзя смешивать

Если Runtime и Designer смешаны:

- пользователь перегружается;
- растёт хаос state;
- растёт complexity;
- появляются hidden dependencies;
- ломается UX;
- Runtime начинает менять platform core;
- Designer начинает хранить персональные пользовательские настройки.

---

## 24. Пример правильного разделения

### Runtime

Сотрудник:

- открыл задачу;
- поменял статус;
- написал комментарий;
- применил фильтр;
- сохранил RuntimeRepresentation «Мои задачи».

Он не видит:

- Relation Editor;
- schema;
- field settings;
- ViewTemplate Editor.

### Designer

Аналитик:

- создаёт новый ObjectType;
- добавляет Relation Definition;
- создаёт ViewTemplate;
- задаёт Runtime restrictions;
- создаёт workflow.

Он не создаёт личные пользовательские RuntimeRepresentation за пользователя.

---

## 25. Runtime AI

Runtime AI помогает сотруднику:

- искать информацию;
- анализировать данные;
- подсказывать действия;
- выявлять риски;
- помогать работать;
- предлагать RuntimeRepresentation;
- предлагать workspace composition.

---

## 26. Designer AI

Designer AI помогает архитектору платформы:

- проектировать schema;
- выявлять слабые связи;
- предлагать ObjectType;
- оптимизировать Relation Definition;
- анализировать complexity;
- проверять архитектурные нарушения;
- предлагать ViewTemplate.

---

## 27. Runtime Navigation

Runtime navigation:

- простая;
- бизнес-ориентированная;
- рабочая.

Пользователь должен думать о своей работе, а не о платформе.

---

## 28. Designer Navigation

Designer navigation:

- архитектурная;
- системная;
- ориентированная на моделирование.

---

## 29. Runtime View Engine

Runtime использует опубликованные ViewTemplate:

- Table;
- Kanban;
- Calendar;
- Dashboard;
- Entity Card;
- Gantt;
- Timeline.

Runtime User может создавать RuntimeRepresentation поверх ViewTemplate.

---

## 30. Designer View Engine

Designer создаёт:

- ViewTemplate;
- allowed ViewType;
- default configuration;
- default fields;
- default filters;
- default sorting;
- runtime restrictions;
- publish rules.

Designer НЕ создаёт пользовательские RuntimeRepresentation как замену Runtime personalization.

---

## 31. ViewTemplate vs RuntimeRepresentation

### ViewTemplate

ViewTemplate создаётся в Designer.

Это официальная модель отображения ObjectType.

Примеры:

- Таблица проектов;
- Канбан проектов;
- Календарь проектов;
- Гант проектов.

### RuntimeRepresentation

RuntimeRepresentation создаётся в Runtime.

Это пользовательская или командная настройка ViewTemplate.

Примеры:

- Мои проекты;
- Просроченные проекты;
- Проекты отдела;
- Проекты на согласовании.

---

## 32. Главный принцип View Layer

```text
ViewTemplate != RuntimeRepresentation
```

Designer создаёт ViewTemplate.

Runtime users создают RuntimeRepresentation.

---

## 33. Composite Runtime

Composite Runtime — составное рабочее пространство.

Например:

- слева задачи;
- справа карточка;
- снизу comments.

Это рабочая среда сотрудника.

---

## 34. Composite Designer

Composite Designer — среда проектирования интерфейсов.

Например:

- настройка LayoutTemplate;
- настройка composition rules;
- настройка embedded ViewTemplate;
- настройка allowed block types.

---

## 35. Runtime Data Ownership

Runtime не владеет schema.

Runtime работает только с:

- Entity;
- ViewTemplate;
- RuntimeRepresentation;
- workflow actions;
- RuntimeWorkspace;
- RuntimeLayoutDelta.

---

## 36. Designer Data Ownership

Designer владеет:

- ObjectType;
- Field Definition;
- Relation Definition;
- ViewTemplate;
- LayoutTemplate;
- workflow configuration;
- permissions;
- AI configuration.

Designer НЕ владеет личным ViewSession пользователя.

---

## 37. Runtime и Designer как разные режимы платформы

ЯсноПро должна понимать:

Сейчас пользователь:

- работает в компании; или
- моделирует компанию?

Это два разных контекста.

---

## 38. Почему это важно для AI-native платформы

AI должен понимать:

- пользователь выполняет работу; или
- пользователь проектирует систему.

Контекст AI в этих режимах полностью разный.

---

## 39. Главный принцип Runtime

Runtime должен быть:

- простым;
- понятным;
- быстрым;
- стабильным;
- self-service в рамках разрешённых правил.

---

## 40. Главный принцип Designer

Designer должен быть:

- системным;
- архитектурным;
- мощным;
- расширяемым;
- безопасным для platform core.

---

## 41. Что нельзя делать

Запрещено:

- смешивать Runtime и Designer state;
- смешивать Runtime и Designer permissions;
- показывать schema Runtime users без прав Designer;
- делать Runtime зависимым от UI Designer;
- хранить platform rules в Runtime Layer;
- хранить RuntimeRepresentation внутри ViewTemplate;
- хранить ViewSession внутри Designer State;
- называть ViewTemplate просто representation;
- использовать слово representation без уточнения.

---

## 42. Финальная формула

Runtime — цифровая работа компании.

Designer — цифровое моделирование компании.

Designer создаёт рамки, структуру и правила.

Runtime users создают рабочую среду внутри этих рамок.

Если эти слои смешаны — платформа становится нестабильной и перегруженной.