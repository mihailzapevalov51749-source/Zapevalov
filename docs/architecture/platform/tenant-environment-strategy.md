# Tenant Environment Strategy and Control Plane

```yaml
slug: tenant-environment-strategy
version: "1.0"
status: accepted
kind: platform-architecture-spec
date: 2026-06-10
authority: YASNOPRO Platform Architecture
related_slugs:
  - yasnopro-scope-tenant-model
  - platform-seed-v1
  - adr-006-platform-seed-v1
  - configuration-and-ui-state-scope-standard
  - template-tenant
  - company-provisioning
  - platform-bootstrap
```

## Статус

```text
ACCEPTED — нормативная стратегия окружений Tenant и контура Control Plane
```

---

## 1. Назначение

Документ фиксирует **целевую архитектуру окружений** платформы ЯсноПро: роль каждого Tenant, границы разработки, источник создания новых компаний, жизненный цикл изменений и правила распространения обновлений.

### Зачем существует разделение Tenant

| Проблема без разделения | Решение |
|-------------------------|---------|
| Разработка в рабочем tenant клиента | Изолированный DEV-контур |
| Clone из «грязного» production tenant | Эталонный TEMPLATE |
| Демо-данные попадают в новые компании | Отдельный DEMO |
| Нет единой точки управления жизненным циклом | Control Plane |

### Какие проблемы решает модель

- предотвращение копирования экспериментов и user content в новые компании;
- предсказуемый pipeline изменений платформы;
- разделение платформенной разработки и эксплуатации клиентских компаний;
- централизованное управление версиями шаблона и обновлениями.

### Почему разработка не выполняется в Template или Client

| Окружение | Причина запрета |
|-----------|-----------------|
| **TEMPLATE** | Золотой эталон; любое прямое изменение нарушает воспроизводимость bootstrap |
| **DEMO** | Демонстрационный контур; допустимы только demo-данные поверх эталона |
| **CLIENT** | Рабочие компании; изменения платформы не должны вноситься ad-hoc в production tenant |

Разработка платформенных возможностей выполняется **только** в DEV.

---

## 2. Общая архитектура

```text
                    Control Plane
                 (управление платформой)
                          │
                          ▼
                   Tenant 1 — DEV
              (разработка платформы)
                          │
                          ▼
                 Tenant 2 — TEMPLATE
            (золотой шаблон платформы)
                        ╱ ╲
                       ╱   ╲
                      ▼     ▼
            Tenant 3 — DEMO   Tenant 4+ — CLIENT
         (демонстрация)      (рабочие компании)
```

### Поток изменений

1. **Control Plane** инициирует операции жизненного цикла (создание tenant, clone, обновление, мониторинг).
2. **DEV** — единственное место разработки и экспериментов платформы.
3. Проверенные изменения переносятся в **TEMPLATE** — эталон структуры.
4. **DEMO** получает структуру из TEMPLATE + демонстрационные данные.
5. **CLIENT** создаётся из TEMPLATE (или обновляется по политике версий).

```text
Control Plane → DEV → TEMPLATE → DEMO → CLIENT
```

> **Control Plane** не является Tenant и не участвует в clone/bootstrap как источник структуры.

---

## 3. Control Plane

### Назначение

**Control Plane** — контур управления платформой и жизненным циклом Tenant.

Control Plane:

- **не является** компанией;
- **не содержит** бизнес-данных пользователей клиентов;
- **не заменяет** Office/Studio внутри tenant;
- доступен операторам платформы (владелец, администраторы инфраструктуры).

В продукте: раздел **«Управление платформой»** (тенанты, клиенты, provisioning, мониторинг).

### Ответственность

| Область | Описание |
|---------|----------|
| **Tenant** | Создание, удаление, привязка к компании, роль окружения |
| **Версии** | `template_version`, совместимость CLIENT с эталоном |
| **Клонирование** | Bootstrap нового tenant из TEMPLATE |
| **Обновления** | Распространение структурных изменений по цепочке окружений |
| **Лицензии** | Учёт и ограничения (planned) |
| **Мониторинг** | Состояние окружений, аудит, Dashboard |
| **Резервное копирование** | Backup/restore tenant (planned) |

### Граница с tenant

```text
Control Plane управляет Tenant.
Tenant содержит бизнес-контур компании.
```

Функции Control Plane **не входят** в [Platform Seed v1.0](../YASNOPRO_PLATFORM_SEED_v1.md) и недоступны обычным клиентским компаниям.

---

## 4. Tenant 1 — DEV

### Назначение

Контур **разработки платформы**: новые engines, Studio capabilities, эксперименты, рефакторинг, интеграционные проверки.

### Допустимые действия

```text
разработка платформенных возможностей
эксперименты и прототипы
рефакторинг и миграции
тестирование (unit, integration, manual)
отладочные и служебные данные
```

### Ограничения

- **не используется** как источник создания новых компаний;
- **не является** эталоном структуры для bootstrap;
- содержимое может быть нестабильным и «грязным» by design.

### Соответствие в системе

| Параметр | Значение |
|----------|----------|
| Роль | `DEV` |
| `tenant_type` | `DEV` |
| Рекомендуемый `tenant_id` | `1` |
| Bootstrap source | — |

---

## 5. Tenant 2 — TEMPLATE

### Назначение

**Золотой шаблон платформы** — единственный нормативный источник структуры для создания новых компаний.

TEMPLATE содержит проверенную конфигурацию после прохождения цепочки DEV → TEMPLATE.

### Содержимое

```text
объекты (Object Types)
поля (Field Definitions)
представления (Views)
страницы (Pages)
действия (Actions)
навигация (Navigation)
workspaces
системные настройки платформы
```

TEMPLATE **не обязан** содержать пользовательские бизнес-записи клиентов; допускается минимальный служебный контент для проверки структуры.

Связь с [Platform Seed v1.0](../YASNOPRO_PLATFORM_SEED_v1.md): Seed определяет **минимальный** обязательный состав; TEMPLATE — **полный эталон** платформенной конфигурации для clone/bootstrap.

### Ограничения

- **нельзя** вести прямую разработку платформы (только приём проверенных изменений из DEV);
- **нельзя** использовать как рабочую компанию;
- изменения только через контролируемый promote pipeline.

### Соответствие в системе

| Параметр | Значение |
|----------|----------|
| Роль | `TEMPLATE` |
| Рекомендуемый `tenant_id` | `2` |
| Bootstrap source | да (default для новых CLIENT) |
| Код | `PLATFORM_TEMPLATE_TENANT_ID = 2` |

---

## 6. Tenant 3 — DEMO

### Назначение

Контур **демонстрации платформы** для презентаций, обучения и sales demo.

### Принцип

```text
DEMO = TEMPLATE + демонстрационные данные
```

- структура (metadata, pages, navigation, views) — из TEMPLATE;
- записи объектов, примеры процессов, демо-контент — добавляются **только** в DEMO;
- демо-данные **не переносятся** в CLIENT при создании компании.

### Ограничения

- **не используется** как источник создания новых компаний;
- допускается периодический reset к состоянию TEMPLATE + demo dataset;
- не является средой разработки.

### Соответствие в системе

| Параметр | Значение |
|----------|----------|
| Роль | `DEMO` |
| Рекомендуемый `tenant_id` | `3` |
| Bootstrap source | нет |

---

## 7. Tenant 4+ — CLIENT

### Назначение

**Рабочие компании** — изолированные tenant с production-данными клиента.

### Особенности

- каждая компания создаётся **из TEMPLATE** (clone structure / bootstrap);
- после создания CLIENT живёт независимо: user content, runtime records, персонализация;
- обновления платформенной структуры — по политике `template_version`, не ad-hoc;
- **компания владельца платформы** (в т.ч. компания Михаила) — обычный CLIENT tenant **без специальной логики** в коде.

### Соответствие в системе

| Параметр | Значение |
|----------|----------|
| Роль | `CLIENT` |
| `tenant_id` | `>= 4` (кроме зарезервированных служебных id) |
| Bootstrap source | нет (является целью bootstrap) |

### Зарезервированные и legacy id

| `tenant_id` | Роль | Примечание |
|-------------|------|------------|
| `13` | `OLD_TEMPLATE` | Legacy template до перехода на tenant 2; не использовать для новых компаний |

---

## 8. Жизненный цикл изменений

Нормативная цепочка распространения платформенных изменений:

```text
DEV
 ↓  promote (после review и verification)
TEMPLATE
 ↓  replicate structure
DEMO
 ↓  optional: refresh demo data
CLIENT
 ↓  controlled update (по template_version)
```

| Этап | Цель |
|------|------|
| **DEV** | Разработка, тесты, эксперименты |
| **TEMPLATE** | Фиксация эталонной версии платформенной структуры |
| **DEMO** | Проверка UX и демонстрация на репрезентативных данных |
| **CLIENT** | Безопасное внедрение в рабочие компании |

### Типы изменений

| Тип | Путь |
|-----|------|
| Платформенный код (backend/frontend) | Deploy приложения; не требует clone |
| Платформенная структура (metadata) | DEV → TEMPLATE → (DEMO) → CLIENT update |
| Пользовательские данные CLIENT | Только внутри CLIENT; не возвращаются в TEMPLATE |

---

## 9. Управление версиями

### Понятие `template_version`

**`template_version`** — семантическая версия эталонной структуры TEMPLATE на момент promote.

Формат: `MAJOR.MINOR.PATCH` (semver).

| Компонент | Смысл |
|-----------|--------|
| MAJOR | Breaking structural changes (миграции, удаление object types) |
| MINOR | Новые платформенные возможности, обратно совместимые |
| PATCH | Исправления, reconcile, system entity recovery |

### Пример состояния окружений

```text
DEV         1.4.0-dev   (активная разработка)
TEMPLATE    1.4.0       (эталон)
DEMO        1.4.0       (структура = TEMPLATE)
CLIENT A    1.3.0       (ожидает обновления)
CLIENT B    1.4.0       (актуальна)
```

### Правила

- TEMPLATE всегда задаёт **максимальную** эталонную версию для новых CLIENT;
- CLIENT может отставать по MINOR/PATCH; MAJOR отставание требует плана миграции;
- DEMO синхронизируется с TEMPLATE по структуре; demo-данные версионируются отдельно;
- `template_version` хранится и отображается в Control Plane (planned: metadata на portal/tenant).

---

## 10. Ключевые архитектурные принципы

1. **Разработка выполняется только в DEV.**
2. **TEMPLATE является эталоном платформы** и единственным источником создания новых компаний.
3. **DEMO используется для демонстраций** (TEMPLATE + demo data).
4. **Клиентские Tenant не участвуют в разработке** платформы.
5. **Источник создания новых компаний — TEMPLATE** (не DEV, не DEMO, не CLIENT).
6. **Управление Tenant выполняется через Control Plane.**
7. **Любое структурное изменение проходит цепочку:**

```text
DEV → TEMPLATE → DEMO → CLIENT
```

8. **Platform Seed** задаёт минимум для новой компании; **TEMPLATE** — полный эталон для clone (см. [Platform Seed v1.0](../YASNOPRO_PLATFORM_SEED_v1.md)).
9. **Control Plane ∉ Tenant** — операции управления вне бизнес-контура компании.

---

## Связанные документы

| Документ | Связь |
|----------|-------|
| [YASNOPRO_SCOPE_TENANT_MODEL.md](../YASNOPRO_SCOPE_TENANT_MODEL.md) | Изоляция tenant, scope, permissions |
| [YASNOPRO_PLATFORM_SEED_v1.md](../YASNOPRO_PLATFORM_SEED_v1.md) | Минимальный состав новой компании |
| [adr/ADR-006-platform-seed-v1.md](../adr/ADR-006-platform-seed-v1.md) | ADR: portal 1 не эталон bootstrap |
| [system-entity-registry.md](../system-entity-registry.md) | Аудит системных сущностей платформы |
| [adr/ADR-007-system-entity-standard.md](../adr/ADR-007-system-entity-standard.md) | Стандарт system entities в TEMPLATE/DEV |
| [configuration-and-ui-state-scope-standard.md](./configuration-and-ui-state-scope-standard.md) | Уровни Configuration и UI State; scoped storage |

### Реализация модели данных (v1)

Поля на таблице `portals`:

| Поле | Назначение |
|------|------------|
| `tenant_type` | DEV / TEMPLATE / DEMO / CLIENT / LEGACY_TEMPLATE |
| `template_version` | Версия эталона |
| `tenant_status` | ACTIVE / DISABLED / ARCHIVED |
| `source_tenant_id` | Источник clone/bootstrap |
| `notes` | Опциональное описание |

API: `GET /portals/{id}/environment` — публично для аутентифицированных пользователей.

Код: `backend/app/modules/tenant_environment/`, `frontend/src/shared/tenantEnvironment/`.

### Planned documents

| Slug | Назначение |
|------|------------|
| `template-system` | Отраслевые шаблоны поверх Seed |
| `template-tenant` | Операционная модель TEMPLATE tenant |
| `company-provisioning` | Создание CLIENT из TEMPLATE |
| `platform-bootstrap` | Сервис `apply_platform_seed` / structural bootstrap |

---

## Ревизии

| Дата | Версия | Изменение |
|------|--------|-----------|
| 2026-06-10 | 1.0 | Принятие стратегии окружений и Control Plane |

---

*Tenant Environment Strategy v1.0 — официальный архитектурный источник истины по управлению окружениями платформы ЯсноПро.*
