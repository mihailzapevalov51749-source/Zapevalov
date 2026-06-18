# DEV -> Control Plane -> Template -> Client Readiness Audit

**Дата:** 2026-06-16  
**Тип:** factual readiness audit (read-only, без изменений кода/БД/API/UI)

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules
- Publication Guard Rules

---

## Context

Проверялся фактический runtime-контур по коду и подключенным роутам:

- backend модели/сервисы/роутеры;
- frontend страницы/API clients;
- guards и tenant policy.

Аудит выполнен только по реализации в коде. Если компонента нет в коде, она отмечена как отсутствующая.

---

## Goal

Определить реальную готовность платформы к процессу:

```text
DEV
↓
Control Plane
↓
Template
↓
Client
```

---

## Current State (фактические наблюдения)

### DEV guard и tenant policy

- Централизованный policy существует: `backend/app/modules/tenant_management/tenant_write_policy.py`.
- DEV-only для direct structure writes enforced через:
  - `assert_tenant_allows_direct_structure_write`,
  - `enforce_dev_direct_structure_write_for_mutating_requests`,
  - `guard_direct_structure_write`.
- Publication policy разделяет контуры:
  - source publish: DEV,
  - target publish: TEMPLATE,
  - apply/rollback target: CLIENT.

### Control Plane review/publish контур

- Реализованы backend API и UI для review lifecycle:
  - `platform_release` router/service,
  - `platform_module_publications` router/service,
  - Control Plane страницы review и публикации.

### Новые реестры code delivery

- `platform_release_packages`: есть только модель/миграция, нет API/service/UI.
- `platform_deployments`: есть только модель/миграция, нет API/service/UI.

### Tenant updates

- В `platform_release` ветке есть:
  - offer to tenants,
  - apply update,
  - skip (отложить).
- В module-update ветке:
  - offers/previews/read + apply/rollback конфигурации,
  - явных действий accept/reject для offers нет.

---

## Задача 1 — DEV-контур (фактическая проверка)

### tenant isolation

**Статус: Частично**

- Есть сервисные policy-guards по `tenant_type`/`environment_role`/`is_protected`.
- Нет явного DB-level enforcement, который сам по себе блокирует non-DEV мутации.

### publication guard

**Статус: Реализовано**

- Проверки source=DEV, target=TEMPLATE, apply target=CLIENT присутствуют в backend policy/service.

### запрет прямых изменений в Template

**Статус: Частично**

- На сервисном слое direct structure write ограничен DEV-only.
- На уровне БД строгого запрета нет.

### запрет прямых изменений в Client

**Статус: Частично**

- Direct structure write ограничен DEV-only.
- При этом клиентский apply update осознанно разрешен как отдельный pipeline.

---

## Задача 2 — передача изменений DEV -> Control Plane

### Что реально есть

- Создание и submit на review для `platform_releases`.
- Создание и submit на review для `platform_module_publications`.
- Review queue / review actions в Control Plane.

### Что отсутствует

- Creation flow для `platform_release_packages` отсутствует (только registry model).
- `review_request` и `approval_request` как отдельные сущности отсутствуют (используются status transitions в release/publication сущностях).

**Вердикт:** **Частично реализовано**.

---

## Задача 3 — Control Plane: увидеть / проверить / одобрить / отклонить

**Статус: Реализовано (для текущих release/publication контуров)**

- Увидеть изменения: review queues/list endpoints и соответствующие UI страницы есть.
- Проверить: detail/diff/snapshot чтение есть.
- Одобрить: approve endpoints есть.
- Отклонить:
  - `request-changes` (releases),
  - `reject` (module publications).

Ограничение: это работает в текущем контуре `platform_release` / `platform_module_publications`, а не через `platform_release_packages`/`platform_deployments`.

---

## Задача 4 — публикация Control Plane -> Template

**Статус: Реализовано (для текущего workflow)**

- `publish_release_to_template` существует и вызывается через API/UI.
- `publish_publication_to_template` для module publication также реализован.

Ограничение: публикация не использует новый deployment registry execution path.

---

## Задача 5 — публикация Template -> Client

**Статус: Частично**

- Предложения обновлений: есть (`offer_to_tenants` и module offers generation).
- Принятие/применение:
  - в `platform_release` ветке есть `apply` и `skip`;
  - в module branch есть `apply`/`rollback` для конфигураций.
- Отклонение:
  - явный отдельный reject endpoint для tenant platform update offers не найден (есть `skip`/postpone в platform release flow).

---

## Задача 6 — полный сценарий (где работает, где стоп)

Сценарий:

```text
1. Изменили код в DEV
2. Проверили в DEV
3. Передали в Control Plane
4. Одобрили
5. Опубликовали в Template
6. Предложили клиенту
7. Клиент обновился
```

### Где реально работает

- Шаги 3-7 работают в текущем release/publication контуре на уровне API/UI и статусов.

### Где процесс останавливается как "полный code delivery по новой цепочке"

- Останавливается на переходе к execution через новые реестры:
  - нет service/API/UI для `platform_release_packages`,
  - нет service/API/UI/engine для `platform_deployments`,
  - фактическое применение кода как deployment engine отсутствует.

Итог: operational процесс **частично рабочий**, но не завершен как canonical code pipeline через новые registry layers.

---

## Задача 7 — сводная таблица готовности

| Этап | Реализовано | Частично | Отсутствует | Комментарий |
|---|---|---|---|---|
| DEV |  | ✅ |  | Сервисные guards есть, DB-level enforcement не полный |
| DEV -> Control Plane |  | ✅ |  | Review flow есть, release package creation как отдельный контур отсутствует |
| Control Plane Review | ✅ |  |  | View/check/approve/reject есть для release/publication |
| Control Plane -> Template | ✅ |  |  | Publish workflows есть в текущем контуре |
| Template -> Client |  | ✅ |  | Offers/apply есть, reject как отдельное действие не везде |
| Client Update Apply |  | ✅ |  | Есть apply (и rollback для module config), но нет code deployment engine |

---

## Задача 8 — критические блокеры

### Блокер №1

**Что отсутствует:** execution-layer для `platform_release_packages` (service/API/UI).  
**Почему критично:** без этого новый registry остается пассивным хранилищем и не участвует в реальном цикле публикации.

### Блокер №2

**Что отсутствует:** execution-layer для `platform_deployments` (service/API/UI + state transitions).  
**Почему критично:** без deployment orchestration невозможно формально и технически провести canonical rollout по новой цепочке.

### Блокер №3

**Что отсутствует:** фактический code deployment engine (Template/Client apply path через deployment).  
**Почему критично:** текущие update workflows обновляют метаданные/конфигурацию, но не дают полноценно завершить code-delivery цикл через Build->Package->Deployment.

---

## Задача 9 — дорожная карта завершения (только отсутствующее)

### Критично

1. Реализовать service/API lifecycle для `platform_release_packages`.
2. Реализовать service/API lifecycle для `platform_deployments`.
3. Связать publish/apply поток с deployment execution path и фиксацией результата.

### Важно

1. Выравнять tenant offer actions (единая семантика apply/skip/reject по всем update веткам).
2. Усилить технические anti-bypass guards там, где пока только сервисный enforcement.

### Можно позже

1. Унификация UX между release offers и module offers.
2. Расширенный forensic trace по всем переходам pipeline в UI.

---

## Executive Summary

## Что уже реально работает

- Control Plane review workflow (увидеть, проверить, одобрить, отправить на доработку/отклонить) для текущих release/publication контуров.
- Публикация в Template в текущем release/publication flow.
- Формирование предложений клиентам и действия apply/skip в tenant update flow.
- Модульный apply/rollback конфигураций с snapshot/diff.

---

## Что работает частично

- DEV-only enforcement: хорошо покрыт сервисными guard-ами, но не полностью закрыт DB-уровнем.
- Template -> Client часть: есть offers и apply, но действия reject/accept унифицированы не везде.
- Client update apply: работает для текущих контуров, но не как canonical code deployment engine.

---

## Что вообще не реализовано

- Runtime lifecycle для `platform_release_packages` (кроме таблицы/ORM).
- Runtime lifecycle для `platform_deployments` (кроме таблицы/ORM).
- Полноценный execution engine, который проводит code deployment по новой канонической цепочке.

---

## Могу ли я уже работать по схеме

```text
DEV
↓
Control Plane
↓
Template
↓
Client
```

**Ответ: Нет (не полностью по новой канонической цепочке).**

---

## Если нет

Отсутствует operational execution слой для `platform_release_packages` и `platform_deployments`, поэтому новая code-delivery цепочка не доведена до фактического выполнения.

---

## Сколько шагов осталось до первого рабочего цикла публикации

1. Включить lifecycle/API для release package registry.
2. Включить lifecycle/API для deployment registry.
3. Подключить фактическое deployment-применение и фиксацию результата в этом контуре.
4. Замкнуть клиентский apply на новый deployment path (вместо разрозненных веток).

---

## Следующий конкретный шаг

Реализовать backend service + router для `platform_release_packages` (минимум: create/list/get/status transitions), чтобы начать фактический переход из registry-only в operational pipeline.

---

## Architecture Audit (factual)

| Проверка | Результат |
|---|---|
| Нет дублирования Deployment Registry | PASS (реестр существует, но execution пока вне его) |
| Нет дублирования Version Registry | PASS |
| Нет конфликта с Environment Version | PASS |
| Нет обхода Release Package | PARTIAL (часть работающего потока идет мимо нового package registry) |
| Нет обхода Publication Guard | PASS (policy checks в коде присутствуют) |
| Совместимость с будущим deployment engine | PASS |

---

## Data Impact Audit

```text
Потенциально отсутствующие компоненты (runtime layer):
  - service/router для platform_release_packages
  - service/router для platform_deployments
  - execution orchestration между publish/apply и deployment outcomes

Новые таблицы/миграции в рамках этого аудита:
  - не предлагались

Влияние на tenant data:
  - не выполнялось (аудит read-only)
```

---

## Test Data Audit

```text
Создано: 0
Удалено: 0
Осталось: 0
Видно в UI: no
```

---

## Cleanup Audit

```text
Test*: not created
Module offers*: not created
Module previews*: not created
Publication*: not created

Remaining test records: 0
Visible in UI: no
Cleanup status: PASSED
```

---

## Success Criteria

| Критерий | Статус |
|---|---|
| Фактическая проверка DEV-контура выполнена | ✅ |
| Фактическая проверка DEV -> Control Plane выполнена | ✅ |
| Фактическая проверка Control Plane review выполнена | ✅ |
| Фактическая проверка Control Plane -> Template выполнена | ✅ |
| Фактическая проверка Template -> Client выполнена | ✅ |
| Определена реальная точка остановки полного процесса | ✅ |
| Подготовлена таблица готовности | ✅ |
| Выделены критические блокеры | ✅ |
| Подготовлена дорожная карта по отсутствующим элементам | ✅ |

**Вердикт:** PARTIAL READINESS

