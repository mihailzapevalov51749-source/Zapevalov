# YASNOPRO EVENT ENGINE MODEL

## 1. Назначение документа

Документ описывает Event Engine платформы ЯсноПро.

### Цель документа

- определить модель событий платформы;
- создать основу истории изменений;
- подготовить фундамент для AI reasoning;
- обеспечить audit trail;
- создать основу автоматизаций и уведомлений.

### Простыми словами

Документ отвечает на вопрос:

> «Как ЯсноПро понимает, что произошло внутри компании?»

---

# 2. Главная идея Event Engine

AI Context Engine — это движок событий платформы.

## По-человечески

Event Engine фиксирует:

- кто что сделал;
- когда это произошло;
- с каким объектом;
- к чему это привело.

---

# 3. Почему Event Engine важен

## Без Event Engine

- платформа видит только текущее состояние;
- нет истории;
- AI не понимает причины;
- невозможно анализировать изменения.

## С Event Engine

- появляется timeline компании;
- можно видеть последовательность действий;
- AI понимает причинно-следственные связи;
- появляются автоматизации.

---

# 4. Что такое Event

## Технически

Event — зафиксированный факт изменения или действия.

## По-человечески

Event — это запись:

> «Что-то произошло.»

---

# 5. Примеры Event

| Event | Простое объяснение |
|---|---|
| entity.created | создан объект |
| entity.updated | объект изменён |
| relation.created | создана связь |
| status.changed | изменён статус |
| comment.created | добавлен комментарий |
| file.uploaded | загружен файл |
| document.approved | документ согласован |
| task.completed | задача завершена |

---

# 6. Главный принцип Event

Event — это факт.

Event НЕ должен:

- хранить бизнес-логику;
- быть источником данных;
- silently mutate state.

Event только сообщает:

> «Это произошло.»

---

# 7. Event и State

## State показывает

- как система выглядит сейчас.

## Event показывает

- как система пришла к текущему состоянию.

---

# 8. Event и History

History строится из Event.

## Например

### Проект

- создан;
- назначен подрядчик;
- изменён статус;
- добавлен риск;
- согласован документ.

Это цепочка событий.

---

# 9. Event Timeline

## Технически

Timeline — последовательность событий.

## По-человечески

Timeline показывает историю жизни объекта.

## Например

### Проект

- создан 1 марта;
- подрядчик назначен 3 марта;
- срок изменён 12 марта;
- возник риск 18 марта.

---

# 10. Event Source

Каждое событие должно иметь источник.

## Например

- пользователь;
- AI;
- automation;
- workflow;
- integration.

---

# 11. Event Actor

Actor — тот, кто вызвал событие.

## Примеры

- сотрудник;
- AI-agent;
- system;
- integration service.

---

# 12. Event Target

Target — объект, к которому относится событие.

## Например

- проект;
- задача;
- договор;
- документ.

---

# 13. Минимальная структура Event

Event должен содержать:

- id;
- type;
- actor;
- target;
- timestamp;
- payload;
- metadata.

---

# 14. Event Type

Event Type определяет:

> «Что именно произошло?»

---

# 15. Основные категории Event

| Категория | Примеры |
|---|---|
| Entity Events | entity.created |
| Relation Events | relation.created |
| Workflow Events | workflow.started |
| Comment Events | comment.created |
| File Events | file.uploaded |
| Permission Events | permission.changed |
| View Events | representation.saved |
| AI Events | ai.suggestion.generated |

---

# 16. Entity Events

Entity Events связаны с объектами.

## Примеры

- entity.created;
- entity.updated;
- entity.deleted;
- entity.archived.

---

# 17. Relation Events

Relation Events связаны со связями.

## Примеры

- relation.created;
- relation.updated;
- relation.deleted.

---

# 18. Workflow Events

Workflow Events связаны с процессами.

## Примеры

- workflow.started;
- task.assigned;
- status.changed;
- approval.completed.

---

# 19. Comment Events

Comment Events:

- comment.created;
- comment.edited;
- mention.created;
- reaction.added.

---

# 20. File Events

File Events:

- file.uploaded;
- file.deleted;
- file.updated;
- document.approved.

---

# 21. View Events

View Events связаны с отображением.

## Примеры

- representation.created;
- representation.updated;
- representation.deleted.

---

# 22. Runtime Events

Runtime Events возникают во время работы сотрудников.

## Например

- изменение статуса;
- комментарий;
- загрузка файла;
- создание задачи.

---

# 23. Designer Events

Designer Events возникают при моделировании платформы.

## Например

- создан ObjectType;
- добавлен Field;
- изменён Relation Type;
- обновлён Layout.

---

# 24. Event Payload

## Технически

Payload — данные события.

## По-человечески

Payload содержит:

- что изменилось;
- старое значение;
- новое значение;
- дополнительные детали.

---

# 25. Пример Payload

## Event

status.changed

## Payload

- old_status = "В работе"
- new_status = "Просрочено"
- reason = "Нет согласования"

---

# 26. Event Metadata

Metadata содержит техническую информацию.

## Например

- device;
- IP;
- source;
- integration id;
- runtime context.

---

# 27. Event Bus

## Технически

Event Bus — система передачи событий.

## По-человечески

Event Bus — механизм, через который платформа сообщает:

> «Произошло событие.»

---

# 28. Event Subscribers

Subscribers — части платформы, которые реагируют на события.

## Например

- notifications;
- AI;
- automation;
- audit log;
- workflow engine.

---

# 29. Пример Event Flow

Пользователь изменил статус задачи.

status.changed → notification engine → AI context update → workflow engine → audit history

---

# 30. Event и Notifications

Notifications должны строиться на Event.

## Например

Event: comment.created  
Notification: «Вас упомянули в комментарии.»

---

# 31. Event и Automation

Automation должна запускаться через Event.

## Например

Если:

status.changed → «Просрочено»

Тогда:

- уведомить руководителя;
- создать риск;
- обновить dashboard.

---

# 32. Event и AI

AI использует Event для понимания:

- истории;
- причин;
- динамики;
- последовательности действий.

---

# 33. AI Reasoning через Event

AI должен понимать:

Не просто:

> «Проект просрочен.»

А:

- документ ушёл на согласование;
- 5 дней не было ответа;
- после этого монтаж не стартовал;
- возникла просрочка.

Это возможно только через Event Timeline.

---

# 34. Event и Audit Trail

## Технически

Audit Trail — журнал изменений.

## По-человечески

Audit Trail отвечает:

> «Кто что изменил и когда?»

---

# 35. Event Retention

Платформа должна понимать:

- какие события хранить постоянно;
- какие можно архивировать;
- какие события критичны для AI context.

---

# 36. Event Priority

Event может иметь priority.

## Например

- info;
- warning;
- critical.

---

# 37. Event Correlation

## Технически

Correlation — связь событий между собой.

## По-человечески

Correlation позволяет понимать:

> «Какие события относятся к одной ситуации?»

---

# 38. Пример Correlation

Одно событие:

> согласование задержано.

## Связанные события

- просрочка задачи;
- перенос срока проекта;
- уведомление руководителя.

---

# 39. Что нельзя делать

Запрещено:

- хранить события только в UI;
- silently mutate state без event;
- делать automation без event source;
- терять history;
- использовать хаотичные CustomEvent как platform event architecture.

---

# 40. Минимальная Event Architecture

Platform Event Architecture должна содержать:

- Event Producer;
- Event Bus;
- Event Store;
- Event Subscribers;
- Event Timeline;
- Audit History.

---

# 41. Runtime Event Engine

Runtime Event Engine отвечает за:

- действия сотрудников;
- изменения данных;
- workflow;
- notifications.

---

# 42. Designer Event Engine

Designer Event Engine отвечает за:

- изменение schema;
- изменение relations;
- изменение views;
- изменение platform configuration.

---

# 43. Главный принцип Event Architecture

Event Architecture должна быть:

- прозрачной;
- наблюдаемой;
- объяснимой;
- воспроизводимой.

Платформа должна понимать:

- что произошло;
- почему произошло;
- что это вызвало.

---

# 44. Event Engine как память платформы

- Entity Layer — хранит объекты.
- Relation Engine — хранит связи.
- Event Engine — хранит историю жизни платформы.

---

# 45. Финальная формула

State показывает: как выглядит система сейчас.

Event показывает: как система пришла к текущему состоянию.

Event Engine превращает ЯсноПро из статической системы в живую цифровую модель компании.