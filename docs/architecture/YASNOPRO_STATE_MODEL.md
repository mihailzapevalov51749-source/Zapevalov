# YASNOPRO STATE MODEL

## 1. Назначение документа

Документ описывает модель состояния платформы ЯсноПро.

### Цель документа

- определить как данные изменяются внутри платформы;
- определить источник истины состояния;
- устранить hidden synchronization;
- исключить хаотичное хранение state;
- создать предсказуемую архитектуру изменений.

### Простыми словами

Документ отвечает на вопрос:

«Как платформа понимает, что изменилось, что сохранено, а что нет?»

## 2. Главная проблема текущего состояния

Текущие проблемы платформы:

- duplicated state;
- hidden state mutation;
- race conditions;
- uncontrolled globals;
- implicit synchronization;
- giant controllers;
- непонятный save flow.

Из-за этого:

- ломается reorder columns;
- ломается dirty state;
- ломается save представлений;
- возникают regressions;
- UI ведёт себя непредсказуемо.

## 3. Что такое State

### Технически

State — текущее состояние системы.

### По-человечески

State — это то, что платформа сейчас знает о данных и интерфейсе.

Например:

- какие колонки скрыты;
- какой фильтр включён;
- какая строка выбрана;
- какой блок открыт;
- что изменено, но не сохранено.

## 4. Главный принцип State Architecture

Один scope — один source of truth.

### Запрещено

- хранить одинаковый state в нескольких местах;
- скрыто синхронизировать state;
- использовать хаотичные global variables.

## 5. Source of Truth

### Главный принцип

Каждый state должен иметь одного владельца.

### Пример плохого состояния

Одна и та же информация хранится:

- в component state;
- в global window;
- в representation;
- в local cache;
- в table state.

Это создаёт:

- рассинхрон;
- баги;
- unpredictable behavior.

### Пример правильного состояния

Hidden columns принадлежат:

Representation State.

Только он имеет право:

- изменять hidden columns;
- сохранять hidden columns;
- отдавать hidden columns UI.

## 6. Scope State

State всегда существует внутри scope.

### Примеры scope

- application;
- page;
- session;
- view;
- entity;
- block.

## 7. Что такое Session

### Технически

Session — временное рабочее состояние пользователя.

### По-человечески

Session — это то, с чем пользователь работает прямо сейчас.

Например:

- открыл таблицу;
- изменил колонки;
- применил фильтр;
- но ещё не сохранил.

Это session state.

## 8. Session State

Session state:

- временный;
- изменяемый;
- может быть dirty;
- существует только во время работы пользователя.

## 9. Saved State

Saved state:

- сохранён в платформе;
- считается официальным состоянием;
- доступен после reload/F5;
- используется другими пользователями.

## 10. Runtime State vs Saved State

### Runtime State

То, что пользователь меняет прямо сейчас.

Например:

- двигает колонки;
- скрывает столбцы;
- меняет размер блоков.

### Saved State

То, что уже сохранено платформой.

Например:

- сохранённое representation;
- layout страницы;
- сохранённый фильтр.

## 11. Что такое Dirty State

### Технически

Dirty state — состояние, которое изменено, но не сохранено.

### По-человечески

Dirty state означает:

«Пользователь что-то изменил, но платформа ещё это не сохранила.»

## 12. Примеры Dirty State

| Действие | Dirty? |
|---|---|
| Скрыть колонку | Да |
| Изменить фильтр | Да |
| Изменить сортировку | Да |
| Передвинуть колонку | Да |
| Сохранить representation | Нет |

## 13. Главный принцип Dirty State

Dirty state должен быть:

- явным;
- локальным;
- контролируемым.

### Запрещено

- hidden dirty state;
- implicit dirty reset;
- global dirty flags.

## 14. Save Flow

### Правильный flow

User Action → Runtime State Changed → Dirty = true → User Save Action → Validation → Persist → Dirty = false → UI Updated

## 15. Неправильный Save Flow

### Запрещено

- автоматическое скрытое сохранение;
- hidden synchronization;
- save через unrelated component;
- implicit reset dirty state.

## 16. ViewSession State

### Назначение

ViewSession State — временное runtime-состояние View Engine.

---

### ViewSession State отвечает за

- temporary filters;
- temporary sorting;
- temporary grouping;
- temporary selection;
- active tab;
- pagination;
- temporary resize;
- drag state;
- open groups;
- current UI interaction state.

---

### Важно

ViewSession State:

- временный;
- session-scoped;
- НЕ является persisted configuration;
- НЕ является RuntimeRepresentation.

---

### Owner

```text
Runtime Engine
```

---

### Persistence

```text
temporary/session
```

---

## 17. RuntimeRepresentation State

### Назначение

RuntimeRepresentation State — сохранённая personalization-конфигурация отображения.

---

### RuntimeRepresentation State отвечает за

- saved filters;
- saved sorting;
- saved grouping;
- hidden columns;
- column order;
- pinned columns;
- saved widths;
- representation preferences.

---

### Важно

RuntimeRepresentation State:

- persisted;
- personalization-oriented;
- НЕ является temporary runtime interaction;
- НЕ является ViewSession.

---

### Owner

```text
Runtime Personalization Layer
```

---

### Persistence

```text
persisted
```

---

## 18. Главный принцип разделения

```text
ViewSession != RuntimeRepresentation
```

---

### ViewSession

Отвечает за:

- текущее runtime-состояние;
- временные изменения;
- temporary interaction.

---

### RuntimeRepresentation

Отвечает за:

- сохранённую personalization-конфигурацию;
- user/team preferences;
- persisted runtime setup.

---

## 19. Пример правильного разделения

### Пользователь изменил фильтр

До сохранения:

```text
owner = ViewSession
```

После сохранения Representation:

```text
owner = RuntimeRepresentation
```

---

## 20. Запрещённое смешение

### Плохо

```text
filters:
- component state
- representation
- window.__state
- local cache
```

---

### Хорошо

```text
temporary filters:
owner = ViewSession

saved filters:
owner = RuntimeRepresentation
```

---

## 21. Layout State

Layout State отвечает за:

- размеры блоков;
- положение блоков;
- размеры секций;
- runtime composition;
- canvas layout.

---

### Owner

```text
Layout Engine
```

---

## 22. Entity State

Entity State отвечает за:

- field values;
- relations;
- attachments;
- comments;
- lifecycle state.

---

### Owner

```text
Entity Layer
```

---

## 23. Event State

Event State отвечает за:

- canonical history;
- audit trail;
- event timeline.

---

### Owner

```text
Event Engine
```

---

## 24. AI Context State

AI Context State отвечает за:

- semantic graph;
- AI memory;
- recommendations;
- context projections.

---

### Owner

```text
AI Context Engine
```

---

## 25. Block State

Block State отвечает только за:

- UI behavior;
- opened/collapsed state;
- local interaction state.

---

### Важно

Block State НЕ хранит:

- business data;
- canonical entity state;
- persisted personalization.

---

### Owner

```text
Block Runtime Layer
```

---

## 26. State Ownership Matrix

| State | Owner | Persistence | Scope |
|---|---|---|---|
| Entity State | Entity Layer | persisted | tenant |
| Relation Graph | Relation Engine | persisted | tenant |
| ViewSession | Runtime Engine | temporary | session |
| RuntimeRepresentation | Runtime Personalization Layer | persisted | personal/team |
| Layout State | Layout Engine | temporary/persisted | personal/team |
| Event State | Event Engine | persisted | tenant |
| AI Context State | AI Context Engine | optional | runtime |
| Block State | Block Runtime Layer | temporary | local |

---

## 27. Главный ownership принцип

Каждый state:

- имеет одного owner;
- хранится в одном layer;
- изменяется только своим owner;
- имеет explicit lifecycle.

---

## 28. Запрещено

Запрещено:

- split-brain state;
- hidden synchronization;
- implicit ownership;
- global runtime state;
- state duplication между layers.


## 29. Regression Discipline

После каждого patch проверяется regression checklist.

### TABLE

- reorder columns
- hide/show columns
- save representation
- filters
- sorting

### CANVAS

- drag block
- resize block
- embedded table

### ENTITY

- open card
- comments
- attachments

## 30. Главный принцип разработки

1 bug  
1 patch  
1 commit

Никаких массовых refactor.

## 31. Как должна выглядеть зрелая State Architecture

Зрелая архитектура состояния:

- предсказуемая;
- scoped;
- explicit;
- reversible;
- observable;
- testable.

## 32. Финальная формула

State Architecture ЯсноПро должна отвечать на 4 вопроса:

1. Кто владеет состоянием?
2. Где хранится состояние?
3. Когда состояние считается сохранённым?
4. Кто имеет право изменять состояние?

Если на эти вопросы нет ответа — архитектура считается нестабильной.