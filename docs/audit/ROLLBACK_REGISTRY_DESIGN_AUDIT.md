# Rollback Registry Design Audit

**Дата:** 2026-06-16  
**Тип:** read-only архитектурный аудит (без реализации кода, БД, API, UI)

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

Завершены foundation-этапы Build / Release Package / Deployment и design-аудит синхронизации Environment Version.

Текущая цепочка:

```text
Code
↓
Build
↓
Release Package
↓
Deployment
↓
Environment Version
↓
Version History
```

В `platform_deployments` уже есть rollback-полезные поля:

- `previous_platform_version`
- `previous_release_package_id`
- `target_platform_version`
- `target_schema_revision`

Но каноническая rollback-архитектура пока не зафиксирована.

---

## Goal

Зафиксировать каноническую модель Rollback Registry, его связь с Deployment и правила отражения rollback в `platform_environment_versions` и `platform_version_history`, без реализации runtime-механизма.

---

## Current State

- Отдельной rollback-сущности пока нет.
- Deployment lifecycle уже включает `rolled_back`, но без rollback engine.
- Version Registry хранит текущий state и историю, но не содержит явной ссылочности на rollback-события.
- Publication Guard не нарушен: code delivery отделен от module publication flows.

---

## Required Changes (design decisions only)

## Задача 1 — каноническое назначение Rollback

**Rollback в ЯсноПро** — это управляемая операция возврата environment slot к предыдущему корректному release-состоянию после проблемного deployment.

Отличия:

- **не Build**: ничего не компилирует;
- **не Release Package**: не создаёт новую единицу поставки;
- **не обычный Deployment**: инициируется как компенсационная операция с явной причиной возврата;
- **не Environment Version**: не хранит текущий state, только управляет переходом;
- **не Version History**: не является журналом сам по себе, но обязан порождать корректный исторический след.

---

## Задача 2 — базовая модель (A/B/В)

Рекомендация: **Вариант В (гибрид)**.

```text
Rollback Registry (управление rollback intent/lifecycle/audit)
  +
Rollback Deployment (фактическое применение target release)
```

Почему не A:

- отдельный rollback без deployment-события ломает единый operational контур применения версии.

Почему не B:

- rollback как "просто deployment mode" теряет явный компенсационный контекст (кто/почему/из какого source deployment откатил).

Гибрид сохраняет единый execution-path (через deployment), но добавляет прозрачный rollback audit-trace.

---

## Задача 3 — rollback target (канон)

Канон: **комбинированный target**.

1. Первичный reference: `source_deployment_id` (что откатываем).
2. Фактическая цель отката: `target_release_package_id`.
3. Денормализованные контрольные поля: `target_platform_version`, `target_schema_revision`.

Это безопаснее, чем только "предыдущая версия":

- rollback опирается на реальный package (immutability + provenance),
- версия/schema сверяются как guard.

---

## Задача 4 — связь Rollback ↔ Deployment

Каноническая связь:

```text
source deployment (problematic)
        ↓
      rollback
        ↓
rollback deployment (restore apply)
```

Хранить обязательно:

- `source_deployment_id` — deployment, который признаётся источником rollback,
- `rollback_deployment_id` — deployment-запись фактического возврата.

Трассировка строится цепочкой:

`source_deployment_id -> rollback.id -> rollback_deployment_id -> environment/history changes`.

---

## Задача 5 — влияние на Environment Version

После **успешного rollback**:

1. `platform_environment_versions` должен быть обновлён на восстановленную целевую версию.
2. Не нужен отдельный "rollback status" в `platform_environment_versions` как постоянный state.
3. rollback-природа операции фиксируется в истории и rollback registry, а current state остаётся нейтральным (`active` для текущей установленной версии).

Итог: current state отражает "что сейчас установлено", а не "каким типом операции это достигнуто".

---

## Задача 6 — влияние на Version History

Рекомендация: **Вариант В (обе записи, но семантически разделённые)**.

- Запись факта установки восстановленной версии в `platform_version_history` обязательна.
- Дополнительно rollback metadata хранится в Rollback Registry и может ссылаться на history entry (опционально).

Почему:

- `platform_version_history` остаётся единым журналом установок;
- Rollback Registry хранит компенсационный контекст;
- аудит читается без дублирования бизнес-смысла.

---

## Задача 7 — минимальный состав Rollback Registry

Предлагаемый минимум:

- `id`
- `rollback_key` (unique)
- `source_deployment_id` (FK -> `platform_deployments.id`)
- `rollback_deployment_id` (FK -> `platform_deployments.id`, nullable до запуска)
- `target_release_package_id` (FK -> `platform_release_packages.id`)
- `target_platform_version`
- `target_schema_revision`
- `status`
- `rollback_manifest_json`
- `created_at`
- `started_at`
- `finished_at`
- `created_by` (FK -> `users.id`, nullable)
- `failure_reason`

Опционально (рекомендуемо):

- `reason_code`
- `approved_by`
- `source_environment_snapshot_json`

---

## Задача 8 — жизненный цикл Rollback

Финальная статусная модель:

- `planned`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Переходы:

```text
planned -> running -> succeeded
planned -> running -> failed
planned -> cancelled
running -> cancelled
```

Статус `rolled_back` остаётся атрибутом исходного deployment (если policy так определяет), но не заменяет lifecycle rollback-сущности.

---

## Задача 9 — ограничения безопасности rollback policy

Policy:

1. `published package` — **разрешено** как rollback target.
2. `deprecated package` — **разрешено условно**, если policy explicitly allows legacy restore (например, emergency режим).
3. `cancelled package` — **запрещено** как rollback target.

Дополнительные guard-правила:

- target package обязан принадлежать валидной build-chain;
- rollback в protected tenant не должен обходить platform guardrails;
- rollback не должен обходить проверку совместимости schema revision.

---

## Задача 10 — совместимость с модульной стратегией

Модель не блокирует будущий `module rollback`, если сразу закладывать scope:

- текущий scope: `platform`;
- будущий scope: `module`.

Рекомендация:

- добавить в rollback/deployment manifests extensible scope metadata (`target_scope`, `target_module_keys`), без изменения текущего platform-wide канона.

---

## Задача 11 — каноническая диаграмма

```text
Release Package
      ↓
  Deployment (forward)
      ↓
Environment Version (new state)

Failure / regression detected
      ↓
Rollback Registry (planned/running/...)
      ↓
Deployment (rollback apply)
      ↓
Environment Version (restored state)
      ↓
Version History (append-only restore event)
```

---

## Задача 12 — итоговый вывод

Каноническая архитектура: **гибрид Rollback Registry + rollback deployment execution path**.

Это:

- не дублирует Deployment Registry;
- сохраняет единый путь применения версии;
- добавляет audit-прозрачность компенсационной операции;
- совместимо с будущим deployment engine и module rollout/rollback.

---

## Constraints

В рамках аудита:

- код не изменялся;
- миграции не создавались;
- API/UI не создавались;
- rollback engine не реализовывался.

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Нет дублирования Deployment Registry | PASS |
| Нет дублирования Version Registry | PASS |
| Нет конфликта с Environment Version | PASS |
| Нет обхода Release Package | PASS |
| Нет обхода Publication Guard | PASS |
| Совместимость с будущим Deployment Engine сохраняется | PASS |

---

## Data Impact Audit (design-only)

```text
Потенциальные таблицы:
  - platform_rollbacks

Потенциальные индексы:
  - rollback_key (unique)
  - source_deployment_id
  - rollback_deployment_id
  - target_release_package_id
  - status
  - created_at

Потенциальные FK:
  - source_deployment_id -> platform_deployments.id
  - rollback_deployment_id -> platform_deployments.id
  - target_release_package_id -> platform_release_packages.id
  - created_by -> users.id

Потенциальные constraints:
  - unique(rollback_key)
  - check(status in planned,running,succeeded,failed,cancelled)
  - check(source_deployment_id <> rollback_deployment_id) where rollback_deployment_id is not null

Влияние на tenant data:
  - отсутствует (metadata/control-plane контур версий платформы)
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

## Tests

```text
Автотесты: NOT RUN (design-only audit, без изменения кода)
```

---

## Manual Smoke

```text
NOT PERFORMED — design-only audit, runtime/UI behavior unchanged
```

---

## Success Criteria

| Критерий | Статус |
|---|---|
| Каноническое назначение Rollback определено | ✅ |
| Выбран и обоснован базовый вариант модели | ✅ |
| Определён rollback target | ✅ |
| Зафиксирована трассировка Rollback ↔ Deployment | ✅ |
| Определено поведение Environment Version после rollback | ✅ |
| Определено поведение Version History после rollback | ✅ |
| Сформирован минимальный состав Rollback Registry | ✅ |
| Зафиксирован lifecycle rollback | ✅ |
| Определена безопасность по package status policy | ✅ |
| Подтверждена модульная совместимость | ✅ |
| Подготовлена каноническая диаграмма | ✅ |
| Подготовлен итоговый audit report файл | ✅ |

**Вердикт:** DONE (design-only)

