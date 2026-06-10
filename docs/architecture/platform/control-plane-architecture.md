# Control Plane — Архитектура управления платформой ЯсноПро

```yaml
slug: control-plane-architecture
version: "1.0"
status: accepted
kind: platform-architecture-spec
date: 2026-06-10
authority: YASNOPRO Platform Architecture
related_slugs:
  - tenant-environment-strategy
  - configuration-and-ui-state-scope-standard
  - yasnopro-scope-tenant-model
  - platform-seed-v1
```

## Статус

```text
ACCEPTED — нормативное описание назначения, состава и границ Control Plane
```

---

## 1. Назначение документа

Документ фиксирует:

- зачем существует **Control Plane**;
- чем он отлишается от **Tenant Administration**;
- какие функции находятся на уровне платформы;
- какие функции находятся на уровне компаний;
- какие разделы входят в Control Plane;
- какие данные и операции должны находиться **только** на уровне платформы.

Связанные документы:

- [tenant-environment-strategy.md](./tenant-environment-strategy.md) — окружения DEV / TEMPLATE / DEMO / CLIENT и жизненный цикл Tenant;
- [configuration-and-ui-state-scope-standard.md](./configuration-and-ui-state-scope-standard.md) — scope UI state и Platform Owner Settings.

---

## 2. Общие принципы

### 2.1. Что такое Control Plane

**Control Plane** — отдельный уровень платформы ЯсноПро.

Control Plane:

- **не является** Tenant;
- **не является** компанией;
- **не является** Workspace;
- **не является** частью клиентской организации.

Назначение:

```text
Управление всей платформой ЯсноПро
и жизненным циклом Tenant.
```

### 2.2. Зона ответственности

Control Plane управляет:

| Объект / процесс | Описание |
|------------------|----------|
| **Tenant** | Создание, клонирование, обновление, мониторинг, архив |
| **Template** | Эталонная структура платформы, версии шаблона |
| **Demo** | Демонстрационные окружения |
| **Client** | Рабочие компании клиентов |
| **Версии** | `template_version`, история публикаций |
| **Обновления** | Распространение изменений из DEV → TEMPLATE → CLIENT |
| **Лицензии** | Тарифы, лимиты, сроки действия |
| **Глобальные политики** | Пароли, безопасность, файлы, хранение данных |
| **Аудит платформы** | События жизненного цикла Tenant и платформенных операций |

### 2.3. Независимость от Tenant

Control Plane:

- открывается по маршруту `/control-plane/*` **без** `tenantId`;
- использует platform-scoped UI storage (`ui:platform:controlPlane:*`);
- не зависит от контекста конкретной компании для своей навигации и shell.

Tenant **не управляет** Control Plane.

---

## 3. Архитектурное разделение

### 3.1. Control Plane — уровень платформы

| Категория | Функции |
|-----------|---------|
| **Provisioning** | Создание компаний, создание Tenant, клонирование Tenant |
| **Template lifecycle** | Управление шаблонами, публикация DEV → TEMPLATE, версии |
| **Distribution** | Обновления клиентов, устаревшие компании |
| **Licensing** | Лицензии, тарифы, лимиты |
| **Operations** | Резервное копирование, восстановление, мониторинг |
| **Governance** | Глобальные политики, аудит платформы |
| **Access** | Пользователи и роли Control Plane |

### 3.2. Tenant Administration — уровень компании

Маршрут:

```text
/designer/tenant/{tenantId}/administration/*
```

Отвечает за:

| Раздел | Содержание |
|--------|------------|
| Пользователи компании | Аккаунты, профили, приглашения **внутри компании** |
| Роли компании | Роли и политики **компании** |
| Настройки компании | Брендинг, локализация, параметры **компании** |
| Модули компании | Подключённые модули **компании** |
| Интеграции компании | Внешние системы **компании** |
| Журнал событий | Аудит действий **внутри компании** |

Tenant Administration **не должен** содержать платформенных функций:

- создание Tenant;
- Tenant Registry;
- публикация шаблонов;
- лицензирование платформы;
- глобальные политики;
- управление другими компаниями.

### 3.3. Сводная модель

```text
Control Plane
=
Управление платформой ЯсноПро
и жизненным циклом Tenant
```

```text
Tenant Administration
=
Управление конкретной компанией
```

```text
Platform users  ≠  Tenant users
Platform roles  ≠  Tenant roles
Platform audit  ≠  Company audit
```

---

## 4. Доступ и UI

### 4.1. Маршруты

| Контур | Базовый маршрут | Название в UI |
|--------|-----------------|---------------|
| Control Plane | `/control-plane/*` | **Управление платформой** |
| Tenant Administration | `/designer/tenant/{id}/administration/*` | **Администрирование** |

### 4.2. Роли доступа (целевая модель)

| Роль | Control Plane | Tenant Administration |
|------|---------------|----------------------|
| Обычный пользователь компании | ❌ | ❌ |
| Tenant admin / Company admin | ❌ | ✅ |
| Platform admin / superadmin | ✅ | ✅ (при необходимости) |

### 4.3. Studio sidebar

При наличии прав в Studio отображаются **разные** пункты:

- **Администрирование** → Tenant Administration текущего tenant;
- **Управление платформой** → Control Plane (`/control-plane`).

---

## 5. Структура Control Plane

Ниже — **целевая** функциональная структура разделов. Статус реализации отмечен отдельно в roadmap; документ описывает архитектурный состав, а не только текущий MVP.

### 5.1. Обзор

**Назначение:** быстрая оценка состояния платформы.

**Маршрут:** `/control-plane`

**Показывает:**

- количество компаний (CLIENT);
- количество Tenant (по типам и статусам);
- состояние платформы;
- последние действия;
- предупреждения;
- статус обновлений.

**Не показывает:** данные конкретной компании как рабочую среду.

---

### 5.2. Раздел «Клиенты ЯсноПро» (Компании)

**Назначение:** управление жизненным циклом Tenant с бизнес-перспективы.

**Базовый маршрут:** `/control-plane/clients/*`

#### 5.2.1. Компании

**Маршрут:** `/control-plane/clients/companies`

Список компаний платформы.

| Поле | Описание |
|------|----------|
| Название | Имя клиентской организации |
| Тип | DEV / TEMPLATE / DEMO / CLIENT |
| Статус | ACTIVE / DISABLED / ARCHIVED |
| Версия | `template_version` |
| Дата создания | Момент provisioning |

**Операции:**

- открыть карточку компании;
- перейти в Studio tenant (контекст компании);
- просмотреть параметры окружения.

#### 5.2.2. Tenant Registry

**Маршрут:** `/control-plane/clients/registry`

Технический read-only реестр Tenant.

| Поле | Описание |
|------|----------|
| Tenant ID | Идентификатор portal/tenant |
| Тип | `tenant_type` |
| Статус | `tenant_status` |
| Source tenant | `source_tenant_id` (для clone) |
| Версия шаблона | `template_version` |
| Системные параметры | notes, metadata |

Используется для **контроля архитектуры платформы**, а не для повседневной работы пользователя компании.

#### 5.2.3. Создание компании

**Статус:** planned / MVP+

Создание нового **CLIENT** Tenant.

**Операции:**

- выбрать шаблон (TEMPLATE);
- указать параметры компании;
- создать Tenant и portal.

#### 5.2.4. Клонирование

**Статус:** MVP (clone tenant structure)

Создание Tenant на основе существующего.

**Сценарии:**

- DEMO из TEMPLATE;
- CLIENT из TEMPLATE;
- резервные тестовые окружения;
- восстановление из эталона.

**Ограничение:** clone **не** выполняется из Control Plane как Tenant; Control Plane **инициирует** операцию над целевым Tenant.

---

### 5.3. Раздел «Шаблоны»

**Назначение:** управление эталонной структурой платформы.

**Статус:** planned (архитектурный раздел)

#### 5.3.1. Версии шаблонов

История версий TEMPLATE.

| Поле | Описание |
|------|----------|
| Версия | Semver / build id |
| Дата публикации | Когда утверждено |
| Автор | Platform Owner / release manager |
| Изменения | Changelog структуры |

#### 5.3.2. Обновления

Управление распространением изменений.

| Показатель | Описание |
|------------|----------|
| Доступные обновления | CLIENT отстаёт от TEMPLATE |
| Применённые | История upgrade |
| Устаревшие компании | Требуют внимания |

#### 5.3.3. Публикация

Перенос утверждённых изменений **DEV → TEMPLATE**.

Создаёт новую версию шаблона. Публикация — платформенная операция; Client Tenant не публикует шаблон.

---

### 5.4. Раздел «Платформа»

**Назначение:** общие настройки и эксплуатация платформы.

**Статус:** частично planned

#### 5.4.1. Лицензии

| Содержание |
|------------|
| Тарифы |
| Ограничения (users, storage, modules) |
| Сроки действия |
| Лимиты по компаниям |

#### 5.4.2. Глобальные политики

| Пример |
|--------|
| Политика паролей |
| Политика безопасности |
| Ограничения файлов |
| Требования к хранению данных |

Применяются ко **всей** платформе или как defaults для новых Tenant.

#### 5.4.3. Мониторинг

| Показатель |
|------------|
| Ошибки сервисов |
| Доступность |
| Производительность |
| Состояние Tenant |

#### 5.4.4. Резервное копирование

| Операция |
|----------|
| Создание backup Tenant |
| Восстановление Tenant |
| История backup |

---

### 5.5. Раздел «Система»

**Назначение:** управление доступом к самому Control Plane.

**Маршруты (текущая реализация UI):**

| Раздел | Маршрут |
|--------|---------|
| Пользователи платформы | `/control-plane/platform-users` |
| Роли платформы | `/control-plane/platform-roles` |
| Настройки платформы | `/control-plane/settings` |
| Модули платформы | `/control-plane/modules` |
| Интеграции платформы | `/control-plane/integrations` |
| Журнал платформы | `/control-plane/audit-log` |

#### 5.5.1. Пользователи платформы

**Не** пользователи компаний.

Примеры ролей:

- Platform Owner;
- Platform Admin;
- Support Admin.

**Операции:**

- выдача доступа к Control Plane;
- блокировка;
- назначение platform-ролей.

> **Технический долг:** на этапе MVP UI может временно использовать общий `/admin/users` API; целевая модель — разделение platform users и tenant users.

#### 5.5.2. Роли платформы

Роли доступа **к Control Plane**.

| Роль | Назначение |
|------|------------|
| Owner | Полный доступ к платформе |
| Administrator | Управление Tenant и настройками |
| Support | Ограниченный операционный доступ |
| Auditor | Read-only аудит |

Определяют полномочия **на уровне платформы**, не внутри компании.

#### 5.5.3. Журнал событий (платформенный аудит)

Глобальный аудит Control Plane.

**Фиксирует:**

- создание Tenant;
- клонирование;
- публикацию шаблонов;
- обновления;
- изменение лицензий;
- изменение глобальных политик;
- операции Platform Admin.

**Не содержит:** события внутри компаний (они — в Tenant Administration → «Журнал событий»).

---

## 6. Данные и операции только platform-level

Следующие сущности и операции **запрещено** размещать в Tenant Administration:

| Сущность / операция | Причина |
|---------------------|---------|
| `customer_companies` (реестр клиентов) | Владелец — платформа |
| Tenant Registry | Технический контур CP |
| Clone / bootstrap tenant | Жизненный цикл Tenant |
| Publish template | Только DEV → TEMPLATE pipeline |
| Global roles (admin, superadmin) | Доступ к CP |
| Platform audit log | Cross-tenant governance |
| License records | Коммерческий контур платформы |

Следующие сущности **запрещено** размещать в Control Plane как substitute for tenant data:

| Сущность | Где должна жить |
|----------|-----------------|
| Пользователи компании | Tenant Administration |
| Роли компании | Tenant Administration |
| Брендинг компании | Tenant Administration |
| Runtime-данные объектов | Tenant DB / Runtime |
| Журнал действий сотрудников | Tenant Administration |

---

## 7. Backend и API (ориентир)

Control Plane API — отдельный контур маршрутов:

```text
/control-plane/*
```

Примеры существующих модулей:

| Модуль | Назначение |
|--------|------------|
| `control_plane/customer_companies` | Клиенты ЯсноПро |
| `portals` CRUD + environment | Tenant lifecycle |
| Tenant Registry endpoints | Read-only реестр |
| Tenant bootstrap / clone | Структурное копирование |

Tenant Administration использует **tenant-scoped** API (целевая модель); смешение с platform API — архитектурный долг MVP.

---

## 8. UI storage scope

| Контур | Prefix |
|--------|--------|
| Control Plane | `ui:platform:controlPlane:*` |
| Tenant Administration | `ui:tenant:{tenantId}:administration:*` |
| Tenant Studio (общий) | `ui:tenant:{tenantId}:*` |

Scopes **не смешиваются**.

---

## 9. Инварианты

1. **Control Plane ∉ Tenant** — CP не имеет `tenantId` в URL и не является portal.
2. **Tenant Administration ⊂ Tenant** — администрирование компании всегда в контексте `{tenantId}`.
3. **Platform operations ≠ Company operations** — разные API, роли, audit trail.
4. **TEMPLATE — единственный источник bootstrap** для новых CLIENT (см. tenant-environment-strategy).
5. **Seed v1.0 ∉ Control Plane UI в tenant** — функции CP не экспонируются клиентским компаниям через их seed.
6. **Независимый shell** — Control Plane использует `ControlPlaneShell`, не `DesignerShell` tenant context.

---

## 10. Roadmap vs текущее состояние (справочно)

| Раздел CP | Статус (2026-06-10) |
|-----------|---------------------|
| Независимый `/control-plane/*` shell | ✅ реализовано |
| Клиенты / Компании / Tenant Registry | ✅ MVP |
| Tenant clone / delete | ✅ MVP |
| Platform users / roles UI | ✅ UI (shared API, долг) |
| Шаблоны / Публикация / Обновления | 📋 planned |
| Лицензии / Мониторинг / Backup | 📋 planned |
| Platform audit log | 📋 planned |
| Notification deep-link в CP | 📋 planned |

---

## 11. История изменений

| Дата | Версия | Изменение |
|------|--------|-----------|
| 2026-06-10 | 1.0 | Первая нормативная версия: состав CP, разделение с Tenant Administration, структура разделов |
