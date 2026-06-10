# Configuration and UI State Scope Standard

```yaml
slug: configuration-and-ui-state-scope-standard
version: "1.0"
status: accepted
kind: platform-architecture-spec
date: 2026-06-10
authority: YASNOPRO Platform Architecture
related_slugs:
  - tenant-environment-strategy
  - adr-007-system-entity-standard
  - yasnopro-scope-tenant-model
  - tenant-environment-model
```

## Статус

```text
ACCEPTED — нормативный стандарт уровней Configuration и UI State
```

---

## 1. Назначение

В ЯсноПро одновременно существуют **конфигурация** (долгоживущие настройки, влияющие на поведение компании) и **UI State** (эфемерное или персональное состояние интерфейса). Без явного разделения возникают:

| Проблема | Последствие |
|----------|-------------|
| UI State хранится глобально (`localStorage` без scope) | Утечка состояния между Tenant (DEV ↔ CLIENT) |
| Configuration смешивается с UI prefs | Невозможно синхронизировать настройки компании между пользователями |
| Нет владельца данных | Дублирование в БД, localStorage и URL |
| Разные команды используют разные ключи | Несовместимость при смене tenant / workspace / view |

### Configuration vs UI State

| Аспект | Configuration | UI State |
|--------|---------------|----------|
| **Смысл** | Как устроена и работает компания | Как пользователь видит интерфейс сейчас |
| **Жизненный цикл** | Долгий; администрируется | Короткий; персональный или сессионный |
| **Видимость** | Общая для tenant (или роли) | Обычно per-user |
| **Источник истины** | БД tenant / Control Plane | localStorage / sessionStorage / server prefs API |
| **Пример** | Часовой пояс компании | Свернуто левое меню |

**Configuration и UI State должны храниться раздельно**, с явным уровнем scope и единым naming convention для ключей.

---

## 2. Общая модель уровней

```text
Platform Owner Settings
        │
        ▼
Tenant Configuration
        │
        ▼
Tenant UI State
        │
        ▼
Workspace State
        │
        ▼
Object / View State
```

| Уровень | Ответственность | Типичный владелец | Источник истины |
|---------|-----------------|-------------------|-----------------|
| **Platform Owner Settings** | Глобальные правила платформы | Platform Owner | Control Plane |
| **Tenant Configuration** | Настройки компании (бренд, locale, security) | Tenant Administrator | БД tenant (`portals`, company settings) |
| **Tenant UI State** | Shell и навигация внутри компании | User (в scope tenant) | Scoped browser storage / server user prefs |
| **Workspace State** | Layout и вкладки workspace | User (в scope workspace) | Scoped storage / `user_workspace_tabs` |
| **Object / View State** | Таблицы, план, канбан, фильтры | User (в scope object type + view) | Scoped storage / `runtime_office_user_table_views` |

Правило наследования: нижний уровень **не переопределяет** Configuration верхнего без явного API. UI State **не записывается** в таблицы Configuration.

---

## 3. Platform Owner Settings

### Назначение

Глобальные настройки платформы ЯсноПро. Задаются владельцем платформы, не относятся к одной компании-клиенту.

### Примеры

```text
Лицензирование
Лимиты тарифов
Доступные модули
Глобальные политики безопасности
Типы Tenant (DEV / TEMPLATE / DEMO / CLIENT)
Системные ограничения
Параметры bootstrap и Platform Seed
template_version эталона
```

### Владелец

```text
Platform Owner
```

### Источник истины

```text
Control Plane
```

Хранение: таблицы и сервисы control plane; не `localStorage` клиента.

См. [tenant-environment-strategy.md](./tenant-environment-strategy.md) — роли окружений и жизненный цикл.

---

## 4. Tenant Configuration

### Назначение

Настройки **конкретной компании** (tenant), влияющие на всех пользователей компании или на политики по умолчанию.

### Примеры

```text
Название компании
Логотип
Брендинг
Цветовая схема (корпоративная палитра)
Часовой пояс
Язык по умолчанию
Формат даты
Формат времени
Первый день недели
Политика хранения файлов
Настройки безопасности
2FA (политика tenant)
Настройки уведомлений компании
tenant_type, tenant_status (метаданные окружения)
```

### Владелец

```text
Tenant Administrator
```

### Источник истины

```text
База данных Tenant
```

Примеры persistence: `portals`, будущие `tenant_settings`, designer publish catalog (структура, не user prefs).

### Важно

**Tenant Configuration ≠ UI State.**

| Tenant Configuration | Не является (это UI State) |
|---------------------|----------------------------|
| Часовой пояс компании | Свернуто меню |
| Язык по умолчанию для tenant | Последний открытый раздел |
| Корпоративный primary color | Ширина колонки в таблице |
| Логотип на портале | Позиция модалки |

Персональная тема интерфейса (light/dark) пользователя — **User Global UI preference** (см. §5, исключение для cross-tenant user comfort), не Tenant Configuration, если не задана политикой tenant.

---

## 5. Tenant UI State

### Назначение

Состояние **оболочки приложения** (shell) внутри конкретного tenant: навигация, sidebar, последние маршруты, bounds модалок на уровне tenant.

### Примеры

```text
Свернуто левое меню (sidebar collapsed)
Масштаб / ширина меню (leftMenuScale)
Последний маршрут Office / Studio (lastPath)
Положение и размер модалок (modal bounds) — tenant+user scope
Состояние раскрытия секций навигации (menu section collapse)
Кастомизация system menu items (icon/title visibility) в runtime
```

### Scope

```text
Tenant + User
```

Обязательный компонент ключа: `tenantId`. Рекомендуется также `userId` для персональных prefs.

### Пример ключей

```text
ui:tenant:{tenantId}:user:{userId}:sidebarCollapsed
ui:tenant:{tenantId}:user:{userId}:leftMenuScale
ui:tenant:{tenantId}:user:{userId}:lastRuntimePath
ui:tenant:{tenantId}:user:{userId}:lastDesignerPath
ui:tenant:{tenantId}:user:{userId}:modal:{modalKey}
ui:tenant:{tenantId}:user:{userId}:menuCollapsed
```

### Известный анти-паттерн (legacy)

Глобальный ключ `yasnopro-sidebar-collapsed` без `tenantId` — **нарушение** настоящего стандарта; подлежит миграции на scoped keys.

### Источник истины

- **Browser:** `localStorage` / `sessionStorage` через единый scoped API (planned: `uiPreferencesStorage`).
- **Server (optional):** API user prefs с полем `tenant_id` для cross-device sync.

---

## 6. Workspace State

### Назначение

Состояние **конкретного Workspace** внутри tenant: вкладки, split panels, layout рабочей области.

### Примеры

```text
Активная вкладка workspace
Ширина панелей (split view)
Положение split view
Layout workspace
Состояние workspace navigation placements (user-visible)
Последний открытый workspace
```

### Scope

```text
Tenant + Workspace + User
```

`workspace` идентифицируется стабильным ключом: `workspaceSlug` или `workspaceId`.

### Пример ключей

```text
ui:tenant:{tenantId}:ws:{workspaceSlug}:user:{userId}:panelWidth
ui:tenant:{tenantId}:ws:{workspaceSlug}:user:{userId}:activeTab
ui:tenant:{tenantId}:ws:{workspaceSlug}:user:{userId}:splitLayout
```

### Источник истины

- **Server:** `user_workspace_tabs` (`tenant_id`, `user_id`, `route`) — эталон для cross-device workspace tabs.
- **Browser:** scoped localStorage для layout до полной server sync.

Designer object-type tabs split (`yasnopro-object-settings-layout::{tenant}::{objectType}::{tab}`) — граница **Workspace/Object design surface**; scope tenant+objectType+tab, см. также §7.

---

## 7. Object / View State

### Назначение

Состояние **представлений данных**: таблица, план, канбан, карточка, фильтры, сортировка.

### Примеры

```text
Ширина колонок
Фильтры и quick filters
Сортировка
Раскрытые строки иерархии
Порядок полей / колонок
Выбранное представление (pinned/hidden views)
Настройки Plan (ширина tree panel)
Настройки Kanban (будущее)
Сохранённые user views
```

### Scope

```text
Tenant + ObjectType + View + User
```

`view` — `viewKey` / contract key (`default_table`, `plan`, …).

### Пример ключей

```text
ui:tenant:{tenantId}:ot:{objectTypeKey}:view:{viewKey}:user:{userId}:columnWidths
ui:tenant:{tenantId}:ot:{objectTypeKey}:view:{viewKey}:user:{userId}:filters
ui:tenant:{tenantId}:ot:{objectTypeKey}:view:{viewKey}:user:{userId}:hierarchyExpanded
ui:tenant:{tenantId}:ot:{objectTypeKey}:view:{viewKey}:user:{userId}:pinnedViews
```

### Эталонная реализация (текущий код)

Object Table уже использует tenant-scoped ключи:

```text
objectTableColumnWidths:{tenantId}:{objectTypeKey}:{viewKey}:{userId}
yasnopro-object-table-user-views-v1::{tenant}::{user}::{objectType}
```

Новые представления обязаны следовать тому же принципу, даже если префикс ключа отличается.

### Источник истины

- **Server:** `runtime_office_user_table_views` и publish catalog для shared view definitions.
- **Browser:** scoped localStorage как cache / offline-first layer.

---

## 8. Правила хранения

### Запрещено

Создавать новые **глобальные** ключи без scope для Tenant UI State, Workspace State и Object/View State:

```javascript
// ЗАПРЕЩЕНО для tenant/workspace/view prefs
localStorage.setItem("sidebarCollapsed", …)
localStorage.setItem("panelWidth", …)
localStorage.setItem("filters", …)
localStorage.setItem("yasnopro-sidebar-collapsed", …)  // legacy, не расширять
```

Запрещено записывать UI State в таблицы Tenant Configuration.

Запрещено использовать `tenant_id` из URL как единственную защиту без scoped key — ключ storage обязан содержать `tenantId`.

### Разрешено

Только **scoped storage** через единый helper (нормативный контракт):

```text
ui:global:{userId}:{key}                              — user-global (theme, …)
ui:tenant:{tenantId}:user:{userId}:{key}              — Tenant UI State
ui:tenant:{tenantId}:ws:{workspaceKey}:user:{userId}:{key}  — Workspace State
ui:tenant:{tenantId}:ot:{objectTypeKey}:view:{viewKey}:user:{userId}:{key} — Object/View State
```

Допускается сокращённая форма без `user:{userId}` только если pref явно общий для всех пользователей tenant (редкий случай, требует ADR).

### Configuration в БД

| Уровень | Хранение |
|---------|----------|
| Platform Owner | Control Plane tables / config service |
| Tenant Configuration | `portals`, dedicated settings tables |
| System entities | ADR-007 structural keys, не UI prefs |

---

## 9. Правила для новых разработок

Каждая новая настройка или UI pref **обязана** пройти checklist:

### 1. Уровень

Определить один уровень:

```text
Platform Owner Settings
Tenant Configuration
Tenant UI State
Workspace State
Object / View State
User Global (исключение: theme, auth session)
```

### 2. Владелец

Кто может читать/писать: Platform Owner, Tenant Admin, User, System.

### 3. Источник истины

```text
Control Plane | Tenant DB | Scoped localStorage | Server user prefs API
```

Один primary SoT; остальные — cache.

### 4. Scope

Формальная строка scope, например:

```text
tenant:14 + user:42 + objectType:task + view:default_table
```

### 5. Code review gate

PR с новым `localStorage.setItem` без scoped key — **отклоняется**, если не User Global.

---

## 10. Связь с другими документами

| Документ | Связь |
|----------|-------|
| [tenant-environment-strategy.md](./tenant-environment-strategy.md) | Роли DEV/TEMPLATE/DEMO/CLIENT; изоляция окружений; Control Plane как владелец Platform Settings |
| [ADR-007 System Entity Standard](../adr/ADR-007-system-entity-standard.md) | System entities — structural configuration, не UI State |
| [system-entity-registry.md](../system-entity-registry.md) | Аудит system entities; не смешивать с user prefs |
| [YASNOPRO_SCOPE_TENANT_MODEL.md](../YASNOPRO_SCOPE_TENANT_MODEL.md) | Tenant boundary; AI context и permissions isolation |
| Tenant Environment Model (код) | `portals.tenant_type`, `template_version` — Platform/Tenant metadata, не sidebar state |

### Разграничение с Tenant Environment Model

| Поле / концепция | Уровень по настоящему стандарту |
|------------------|--------------------------------|
| `tenant_type`, `tenant_status` | Platform Owner metadata + Tenant Configuration |
| `template_version` | Platform Owner / Tenant Configuration |
| `source_tenant_id` | Tenant Configuration (provenance) |
| Sidebar collapsed | Tenant UI State |

---

## Матрица: примеры из аудита (2026-06-10)

| Данные | Уровень | Текущий scope | Целевой scope |
|--------|---------|---------------|---------------|
| Часовой пояс компании | Tenant Configuration | БД (planned) | Tenant DB |
| `themeMode` | User Global | Global localStorage | `ui:global:user:{id}:theme` |
| `yasnopro-sidebar-collapsed` | Tenant UI State | **Global** | `ui:tenant:{id}:user:{id}:sidebarCollapsed` |
| `leftMenuScale` | Tenant UI State | **Global** | `ui:tenant:{id}:…:leftMenuScale` |
| Object table column widths | Object/View State | Tenant+OT+view ✓ | Без изменений |
| Modal bounds | Tenant UI State | **Global** | `ui:tenant:{id}:user:{id}:modal:{key}` |
| `user_workspace_tabs` | Workspace State | Server tenant+user ✓ | Без изменений |

---

## Ревизии

| Дата | Версия | Изменение |
|------|--------|-----------|
| 2026-06-10 | 1.0 | Принятие стандарта Configuration and UI State Scope |

---

*Configuration and UI State Scope Standard v1.0 — официальный источник истины по уровням хранения настроек и UI State в ЯсноПро.*
