# YASNOPRO Scope Tenant Model

## Назначение документа

Документ определяет:

- tenant architecture;
- scope model;
- boundaries между компаниями;
- ownership visibility;
- runtime isolation;
- AI context isolation;
- permissions boundaries.

Главная цель:

создать безопасную multi-tenant AI-native platform architecture.

---

# Главный принцип

```text
Tenant определяет границу компании.

Scope определяет область видимости внутри компании.
```

---

# Tenant

## Определение

Tenant — изолированный цифровой контур компании внутри платформы.

---

## Tenant содержит

- пользователей;
- ObjectType;
- Entity;
- Relations;
- Views;
- Runtime Workspace;
- AI Context;
- Permissions;
- Runtime Personalization;
- Event History.

---

## Примеры Tenant

- ООО СтройПроект
- ГК Альфа
- Холдинг Север
- Demo Tenant

---

# Главный принцип Tenant

```text
Tenant = boundary of trust
```

---

# Tenant Isolation

Tenant isolation обязательна для:

- данных;
- runtime personalization;
- AI context;
- permissions;
- event history;
- workflow;
- relation graph.

---

# Tenant НЕ должен видеть

- Entity другого tenant;
- RuntimeWorkspace другого tenant;
- AI Context другого tenant;
- RuntimeRepresentation другого tenant;
- Event History другого tenant.

---

# Главный принцип безопасности

```text
Cross-tenant leakage запрещён.
```

---

# Scope

## Определение

Scope — область видимости внутри Tenant.

---

## Scope определяет

- кто видит объект;
- кто видит representation;
- кто видит workspace;
- кто может изменять configuration;
- кто может использовать personalization.

---

# Scope Types

| Scope | Назначение |
|---|---|
| personal | только пользователь |
| team | команда |
| department | подразделение |
| company | весь tenant |
| global | platform-level |

---

# Personal Scope

## Назначение

Личное пространство пользователя.

---

## Примеры

- personal dashboard;
- personal filters;
- personal RuntimeRepresentation;
- personal layout;
- personal notes.

---

## Visibility

Видит только владелец.

---

# Team Scope

## Назначение

Общие runtime-настройки команды.

---

## Примеры

- team dashboard;
- team workspace;
- team RuntimeRepresentation;
- team widgets.

---

## Visibility

Видит только команда.

---

# Department Scope

## Назначение

Runtime-среда подразделения.

---

## Примеры

- PMO workspace;
- HR analytics;
- Finance dashboard.

---

## Visibility

Видит подразделение.

---

# Company Scope

## Назначение

Общие ресурсы tenant.

---

## Примеры

- corporate dashboard;
- company knowledge base;
- published ViewTemplate;
- company analytics.

---

## Visibility

Видит весь tenant.

---

# Global Scope

## Назначение

Platform-level configuration.

---

## Примеры

- platform primitives;
- ViewType;
- system modules;
- platform AI models.

---

## Важно

Global scope НЕ должен содержать tenant business data.

---

# Ownership Model

Каждая runtime-сущность должна иметь:

- owner_id;
- scope;
- tenant_id;
- visibility policy.

---

# Ownership Fields

| Field | Назначение |
|---|---|
| tenant_id | tenant boundary |
| owner_id | владелец |
| scope | область видимости |
| created_by | кто создал |
| visibility | policy доступа |

---

# Runtime Personalization Boundaries

Runtime personalization должна быть tenant-scoped.

---

## Runtime Personalization включает

- RuntimeRepresentation;
- RuntimeWorkspace;
- RuntimeLayoutDelta;
- DashboardInstance;
- saved filters;
- personal tabs.

---

# Главный принцип

```text
Runtime personalization не должна выходить за tenant boundary.
```

---

# AI Context Isolation

AI Context Engine обязан быть tenant-aware.

---

## AI НЕ должен

- смешивать контекст компаний;
- анализировать Entity другого tenant;
- использовать чужую историю;
- использовать чужие RuntimeWorkspace;
- смешивать relation graph разных tenant.

---

# Главный принцип AI безопасности

```text
AI Context = tenant isolated semantic graph
```

---

# Relation Isolation

Relation Engine НЕ должен:

- строить relation graph между tenant;
- создавать cross-tenant relation;
- смешивать dependency graph компаний.

---

# Event Isolation

Event Engine должен хранить:

- tenant_id;
- scope;
- actor;
- source.

---

# Event Leakage запрещён

События одного tenant не должны быть доступны другому tenant.

---

# Workspace Isolation

RuntimeWorkspace обязан быть tenant-scoped.

---

## Workspace содержит

- runtime pages;
- runtime layout;
- widgets;
- RuntimeRepresentation;
- dashboard composition.

---

# RuntimeRepresentation Isolation

RuntimeRepresentation должен иметь:

- tenant_id;
- owner_id;
- scope.

---

# Пример

```text
Representation:
"Мои проекты"

tenant_id = STROYPROEKT
owner_id = user_145
scope = personal
```

---

# ViewTemplate Scope

ViewTemplate обычно имеет:

```text
scope = company
```

или:

```text
scope = global
```

---

# ViewTemplate НЕ является

- personal state;
- RuntimeRepresentation;
- runtime personalization.

---

# Layout Scope

LayoutTemplate:
- designer-level;
- company/global scope.

---

# RuntimeLayoutDelta

RuntimeLayoutDelta:
- personal/team scope;
- runtime personalization layer.

---

# Permissions Scope

Permissions обязаны учитывать:

- tenant;
- scope;
- role;
- ownership.

---

# Permissions Formula

```text
Can User Access Resource?
=
Tenant Match
+
Scope Visibility
+
Role Permission
+
Ownership Rules
```

---

# Multi-Tenant Principle

Платформа должна поддерживать:

- много компаний;
- изоляцию данных;
- изоляцию AI;
- изоляцию personalization;
- изоляцию event history.

---

# Cross-Tenant Access

## По умолчанию

```text
Запрещён
```

---

## Возможные исключения

Только через explicit federation model.

---

# Federation Model

Будущая enterprise-возможность.

Позволяет:

- controlled collaboration;
- shared workspace;
- inter-company visibility.

---

# Важно

Federation НЕ должна ломать tenant isolation.

---

# Tenant-aware Runtime

Runtime обязан учитывать:

- tenant context;
- scope visibility;
- personalization scope;
- runtime permissions.

---

# Tenant-aware AI

AI обязан учитывать:

- tenant boundary;
- role;
- permissions;
- scope;
- allowed context.

---

# Scope-aware Runtime

Runtime должен понимать:

- personal state;
- shared state;
- company state;
- platform state.

---

# Scope-aware Personalization

Разные personalization levels:

| Type | Scope |
|---|---|
| personal filter | personal |
| team dashboard | team |
| PMO analytics | department |
| company dashboard | company |

---

# Главный принцип personalization

```text
Personalization НЕ должна становиться global configuration.
```

---

# Tenant-aware Storage

Все persisted runtime entities обязаны содержать:

- tenant_id;
- scope;
- ownership metadata.

---

# Обязательные tenant-scoped сущности

- Entity
- Relation
- RuntimeRepresentation
- RuntimeWorkspace
- DashboardInstance
- Event History
- AI Context
- Attachments
- Comments
- Notifications

---

# Global Platform Layer

Global layer содержит:

- platform primitives;
- ViewType;
- system metadata;
- platform engines.

---

# Global layer НЕ содержит

- tenant Entity;
- tenant AI context;
- tenant RuntimeWorkspace;
- tenant business data.

---

# Scope Matrix

| Resource | Tenant Scoped | Scope-aware |
|---|---|---|
| Entity | yes | yes |
| RuntimeRepresentation | yes | yes |
| RuntimeWorkspace | yes | yes |
| DashboardInstance | yes | yes |
| AI Context | yes | yes |
| Event History | yes | yes |
| ViewTemplate | yes/global | yes |
| ViewType | no | no |

---

# Главный принцип ownership

```text
Каждый runtime resource обязан иметь:

- tenant boundary;
- scope;
- owner.
```

---

# Запрещено

Запрещено:

- global runtime personalization;
- cross-tenant AI context;
- cross-tenant relation graph;
- cross-tenant event leakage;
- shared global runtime state;
- tenant-unaware personalization.

---

# Development Rules

Перед созданием runtime-сущности определить:

1. Tenant boundary?
2. Scope?
3. Owner?
4. Personalization или global configuration?
5. Runtime или Designer?
6. Может ли AI видеть этот resource?
7. Может ли resource быть shared?

---

# Главная цель

Построить:

- безопасную multi-tenant architecture;
- AI-safe architecture;
- scope-aware runtime;
- tenant-aware personalization;
- масштабируемую enterprise platform;
- устойчивую SaaS architecture.