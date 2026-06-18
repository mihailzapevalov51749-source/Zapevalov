# ADR-009. Platform Identity Layer

## Статус

Accepted

## Дата

2026-06-17

## Slug

`adr-009-platform-identity-layer`

## Связанные документы

- [ADR-010 Platform Identity Store](./ADR-010-platform-identity-store.md) (Accepted)
- Step 18.12.5.10 — Platform Owner Entry (аудит)
- Step 18.12.5.11 — Platform Identity Design (проектирование)

---

## Context

ЯсноПро развивается как платформа-конструктор компаний с физически изолированными средами:

```text
DEV
TEMPLATE
CLIENT
```

Каждая среда имеет:

```text
Собственный frontend
Собственный backend
Собственную БД
```

Пример:

```text
DEV
Frontend: 5173
Backend: 8010
Database: yasnopro_dev

CLIENT
Frontend: 5175
Backend: 8012
Database: yasnopro_client
```

Текущая модель авторизации построена вокруг сущности:

```text
User
```

и механизма:

```text
get_current_user()
↓
JWT.sub
↓
users.id
```

Данная модель хорошо работает для пользователей компаний, но приводит к архитектурной проблеме для владельца платформы.

### Проблема

Владелец платформы:

```text
Platform Owner
```

не является:

```text
Tenant User
Company Owner
Superadmin
Admin
Employee
```

Однако текущая архитектура вынуждает представлять его как обычного пользователя.

Это приводит к появлению двух конкурирующих подходов.

#### Подход A

Создавать Platform Owner в каждой клиентской БД:

```text
yasnopro_dev.users
yasnopro_template.users
yasnopro_client.users
...
```

При росте платформы:

```text
10 компаний
100 компаний
1000 компаний
10000 компаний
```

возникает необходимость поддерживать тысячи копий одной и той же идентичности.

#### Последствия подхода A

```text
Дублирование идентичности
Сложность сопровождения
Передача владения платформой
Миграции
Восстановление
Аудит
Синхронизация
Безопасность
```

Кроме того нарушается концептуальное разделение:

```text
Платформа
≠
Компания
```

---

## Decision

Принято решение разделить уровни идентичности.

### Platform Identity Layer

Отдельный слой идентичности платформы.

Содержит:

```text
Platform Owner
Platform User
```

### Tenant Identity Layer

Отдельный слой идентичности компании.

Содержит:

```text
Company Owner
Superadmin
Admin
User
```

### Архитектурные инварианты

```text
Platform Owner не создаётся в users клиентских БД.
Platform Owner не является Tenant User.
Platform Owner не является Company Owner.
Platform Owner не является Superadmin компании.
```

Идентификация и маршрутизация — только по техническим полям:

```text
platform_identity_id
portal_id
database_name
code
tenant_type
environment_role
principal_type
```

Display name, title, name не используются как ключи auth/routing.

### Principal Model

Целевая модель авторизации:

```text
Было: get_current_user()
Стало: get_current_principal()
```

Principal может быть:

```text
PlatformOwnerPrincipal
PlatformUserPrincipal
TenantUserPrincipal
```

### Session Bridge

Доступ владельца платформы в компанию реализуется через:

```text
Platform Owner Session Bridge
```

Схема:

```text
Control Plane
↓
Signed Entry Ticket
↓
Client Backend
↓
Bridge Session
↓
Platform Principal
↓
Portal
```

При этом:

```text
users не создаются
memberships не создаются
superadmin не назначается
```

### Source of Truth

Platform Identity живёт в Control Plane database (сейчас `yasnopro_dev`, эволюция → `platform_core`).

Client и Template БД не являются SoT для platform identity.

---

## Consequences

### Положительные

**Чистое разделение ответственности** — платформа отдельно, компании отдельно.

**Масштабируемость** — `1 Platform Owner` при `N` компаниях без `N` копий в tenant БД.

**Простота передачи владения** — смена owner в одном месте.

**Упрощение аудита** — разделение Platform Activity и Tenant Activity.

**Подготовка к мультиплатформенности** — Platform Support, Auditor, Integrator независимо от tenant users.

### Отрицательные

Потребуется:

```text
Новый слой principal
Новый механизм авторизации
Новый Session Bridge
```

Дополнительная архитектурная сложность по сравнению с текущей моделью `get_current_user()`.

---

## Alternatives Considered

### Вариант A — Platform Owner как пользователь каждой БД

```text
Platform Owner → users → каждая БД
```

| | |
|--|--|
| Преимущества | Простая реализация; использует существующий код |
| Недостатки | Нарушает разделение; синхронизация; дублирование; плохая масштабируемость |
| **Решение** | **Отклонено** |

### Вариант B — Platform Identity Layer

```text
Platform Identity → Platform Principal → Session Bridge
```

| | |
|--|--|
| Преимущества | Чистая архитектура; масштабируемость; изоляция; будущие platform roles |
| Недостатки | Новый слой авторизации |
| **Решение** | **Принято** |

---

## Impact Analysis

| Область | Влияние |
|---------|---------|
| Auth | Поэтапный переход `get_current_user()` → `get_current_principal()` |
| Session Bridge | Platform Principal |
| Platform Owner | Отдельная сущность платформы |
| Platform Users | Platform Identity Layer |
| Companies | Не изменяются |
| Tenant Users | Не изменяются |
| Release System | Не изменяется |
| Environment Guard | Не изменяется (дополнение: `aud` ticket = `database_name`) |
| Tenant Isolation | Сохраняется |
| Database Isolation | Сохраняется |
| Cross Database Access | Не требуется |

---

## Migration Notes

| Phase | Содержание |
|-------|------------|
| **Phase 1** | Принять Platform Identity Layer как архитектурный стандарт (этот ADR) |
| **Phase 2** | Platform Identity Store (CP DB) |
| **Phase 3** | Principal Layer |
| **Phase 4** | Session Bridge |
| **Phase 5** | Постепенная миграция auth на Principal Model |

---

## Open Questions

Требуют отдельного проектирования / реализации:

```text
Platform Identity Store (schema)
Platform Principal Claims (JWT registry)
Entry Ticket Format
Bridge Session Lifetime
Audit Integration (actor_principal_type / actor_principal_id)
Support Roles
Platform Scopes (access_scope)
```

Детальное проектирование: Step 18.12.5.11 — Platform Identity Design.

---

## Final Decision

ЯсноПро принимает архитектурную модель **Platform Identity Layer** как отдельный слой системы.

Инвариант:

```text
Platform Owner не создаётся в users клиентских БД.
```

Доступ владельца платформы к компаниям реализуется через **Platform Principal + Session Bridge** без создания пользователей компании и без назначения ролей tenant уровня.
