# Environment Version Synchronization Design Audit

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

Ранее реализованы foundation-слои:

- Code Build Registry Phase 1
- Release Package Registry Phase 1
- Deployment Registry Phase 1

И уже зафиксирована цепочка:

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

Текущий пробел Phase 1: `platform_deployments` пока не синхронизирует `platform_environment_versions` и `platform_version_history`.

---

## Goal

Определить канонический design синхронизации version state после deployment, не внедряя runtime-логику на этом этапе.

---

## Current State (audit baseline)

### `platform_environment_versions`

Есть:

- `tenant_id` (FK `portals.id`, unique) + `environment_key`
- `platform_version`, `status`, `installed_at`, `installed_by_id`
- `notes`, `change_description`, `updated_at`

Ограничения:

- unique только по `tenant_id`
- нет связи с конкретным deployment/package/build

### `platform_version_history`

Есть:

- `tenant_id`, `environment_key`, `platform_version`, `status`
- `installed_at`, `installed_by_id`, `notes`, `change_description`
- `recorded_at`, `superseded_at`

Ограничения:

- append-only лог по модели использования
- нет FK на deployment/package/build
- нет явного idempotency ключа события

### `platform_release_packages`

Есть:

- `platform_version` (unique), `build_id` (FK)
- `package_manifest_json`, `module_bom_json`
- lifecycle timestamps и status

Вывод:

- пакет содержит канонические release-данные для target version
- подходит как upstream source для immutable release context

### `platform_deployments`

Есть:

- `release_package_id` (FK), `status`, `deployment_key` (unique)
- `target_environment_type`, `target_tenant_id`
- `target_platform_version`, `target_schema_revision`
- `previous_platform_version`, `previous_release_package_id`
- `deployment_manifest_json`, `started_at`, `finished_at`

Вывод:

- в модели достаточно данных для синхронизации текущей версии и истории
- для rollback-ready full context не хватает `previous_schema_revision`

---

## Required Changes (design decisions only)

## Задача 1 — аудит достаточности данных и связей

### Что уже достаточно

- Для обновления current-version state: `target_tenant_id`, `target_environment_type`, `target_platform_version`.
- Для истории: `finished_at`, `created_by`/actor context, `previous_platform_version`, `release_package_id`.
- Для release provenance: `release_package_id -> platform_release_packages (platform_version, build_id, manifests)`.

### Что отсутствует как строгая связь

- В `platform_environment_versions` нет reference на deployment, package, build.
- В `platform_version_history` нет reference на deployment/package/build.
- Нет технического запрета на двойную обработку одного `deployment_key` в history.

### Вердикт по достаточности

- Для MVP-синхронизации данных **достаточно**.
- Для строгой трассировки и anti-desync в production рекомендуется добавить link-поля (см. Задача 8).

---

## Задача 2 — каноническое событие синхронизации

Канон:

```text
Единственное событие, которое меняет platform_environment_versions:
deployment.status = succeeded
```

Подтверждение:

- `planned`, `running` — это intent/процесс, не факт установки;
- `failed`, `cancelled` — попытка без успешного применения;
- `rolled_back` — отдельный сценарий возврата, не успех исходного deployment.

Корректировка не требуется.

---

## Задача 3 — правила по статусам Deployment

| Статус deployment | Обновление `platform_environment_versions` | Запись в `platform_version_history` | Комментарий |
|---|---|---|---|
| `planned` | нет | нет | только планирование |
| `running` | нет | нет | выполнение ещё не завершено |
| `succeeded` | да | да | каноническая фиксация новой версии |
| `failed` | нет | нет | успех не достигнут |
| `cancelled` | нет | нет | операция прервана |
| `rolled_back` | нет (для исходного события) | зависит от rollback policy | rollback должен иметь отдельный канон записи |

Ключевой принцип: **version state обновляется только по подтверждённому success-событию**.

---

## Задача 4 — финальная карта источников данных

### Из `platform_release_packages`

- `platform_version` — canonical label релиза
- `build_id` — связь с build provenance
- `module_bom_json` — состав модулей релиза
- `package_manifest_json` — release snapshot/meta

### Из `platform_deployments`

- `target_environment_type` — тип слота (`template` / `client` / `dev`)
- `target_tenant_id` — конкретный tenant для environment state
- `target_platform_version` — версия, которую применяли
- `target_schema_revision` — schema target
- `previous_platform_version` — для delta/rollback context
- `previous_release_package_id` — previous package linkage
- `deployment_manifest_json` — runtime deployment snapshot
- `finished_at` — фактическое время установки (на success)
- `created_by` — actor (если используется как installed_by_id)

### Правило приоритетов

Если `target_platform_version` расходится с `release_package.platform_version`, источник истины для write-path должен быть заранее валидирован как согласованный; при расхождении deployment не должен переходить в `succeeded` (policy-level guard).

---

## Задача 5 — порядок операции successful deployment

Ожидаемая последовательность корректна, с уточнением транзакционной границы:

```text
1) Deployment -> running
2) Внешнее применение package (engine later)
3) Deployment -> succeeded (business success confirmed)
4) В той же транзакции:
   4.1 upsert/update platform_environment_versions
   4.2 insert platform_version_history
5) commit
```

Критично: шаги `4.1` и `4.2` должны быть атомарны с финализацией success-state.

---

## Задача 6 — защита от рассинхронизации (рекомендации)

1. **Transaction boundary**  
   `deployment.status=succeeded` + update current state + history insert в одной DB транзакции.

2. **Idempotency**  
   Повторная обработка того же `deployment_key` не должна создавать дубликат history-entry и не должна ломать current state.

3. **Unique/guard constraints (рекомендуемые)**  
   - уникальность history на `deployment_id` (или `deployment_key`, если без FK),  
   - дополнительный optimistic guard при update current state (по `tenant_id` + ожидаемой previous version при необходимости строгого CAS-подхода).

4. **Повторное применение одного deployment**  
   Запрещать перевод уже terminal-status deployment в `succeeded` повторно; повтор — только новым deployment record.

5. **Race conditions**  
   Для одного tenant/environment исключить параллельные `running` deployment с конфликтующим target; минимум — policy lock, лучше DB-level serialization/locking на environment slot.

---

## Задача 7 — влияние на rollback

До изменения current version должны быть зафиксированы:

- `previous_platform_version` (уже есть),
- `previous_release_package_id` (уже есть),
- `previous_schema_revision` (в текущей модели отсутствует — рекомендуется добавить),
- timestamp и actor success-события.

Вердикт: текущая модель почти достаточна для rollback planning, но без `previous_schema_revision` rollback-риск выше при schema-sensitive сценариях.

---

## Задача 8 — рекомендации по доработкам таблиц (без реализации)

Минимально рекомендуемые поля:

1. В `platform_deployments`:
   - `previous_schema_revision` (`String(64)`, nullable на первых установках)

2. В `platform_environment_versions`:
   - `current_deployment_id` (FK -> `platform_deployments.id`, nullable)
   - `current_release_package_id` (FK -> `platform_release_packages.id`, nullable)
   - опционально `current_build_id` (FK -> `platform_code_builds.id`, nullable)

3. В `platform_version_history`:
   - `deployment_id` (FK -> `platform_deployments.id`, nullable=False для новых записей)
   - `release_package_id` (FK -> `platform_release_packages.id`, nullable=True)
   - `build_id` (FK -> `platform_code_builds.id`, nullable=True)

4. Опциональные snapshot-поля (если нужна forensic трассировка):
   - `environment_version_before_json`
   - `environment_version_after_json`
   - вместо `history_entry_id` в deployment — предпочтительнее иметь `deployment_id` в history и получать обратную связь join-ом.

---

## Задача 9 — итоговый канон синхронизации

Каноническое правило:

```text
Deployment — это операционный журнал.
Environment Version — это текущий SoT state.
Version History — это append-only след факта установки.

Обновление state/history инициируется только deployment.status=succeeded.
```

Этот канон не дублирует Release Package Registry и не обходит Publication Guard.

---

## Constraints

В рамках этого аудита:

- код не изменялся;
- миграции не создавались;
- API/UI не создавались;
- engine rollback/deployment не реализовывался.

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Нет дублирования Deployment Registry | PASS |
| Нет дублирования Version Registry | PASS |
| Нет обхода Release Package | PASS |
| Нет обхода Publication Guard | PASS |
| Сохраняется путь к Rollback Registry | PASS |

---

## Data Impact Audit (design-only)

```text
Потенциальные изменения таблиц:
  - platform_deployments (add previous_schema_revision)
  - platform_environment_versions (add references to current deployment/package/build)
  - platform_version_history (add references to deployment/package/build)

Потенциальные индексы:
  - platform_version_history.deployment_id (unique или unique partial по policy)
  - platform_environment_versions.current_deployment_id
  - platform_environment_versions.current_release_package_id
  - platform_version_history.release_package_id

Потенциальные FK:
  - platform_environment_versions.current_deployment_id -> platform_deployments.id
  - platform_environment_versions.current_release_package_id -> platform_release_packages.id
  - platform_version_history.deployment_id -> platform_deployments.id
  - platform_version_history.release_package_id -> platform_release_packages.id
  - platform_version_history.build_id -> platform_code_builds.id

Влияние на tenant data:
  - direct tenant business data impact: none
  - только metadata/versioning контур платформы
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
NOT PERFORMED — design-only audit, runtime/UI behavior intentionally unchanged
```

---

## Success Criteria

| Критерий | Статус |
|---|---|
| Определено событие синхронизации | ✅ |
| Зафиксирован канон по всем deployment status | ✅ |
| Подготовлена финальная карта источников данных | ✅ |
| Подтверждён и уточнён порядок successful deployment | ✅ |
| Подготовлены anti-desync рекомендации | ✅ |
| Оценена rollback-ready полнота модели | ✅ |
| Подготовлены рекомендации по полям без реализации | ✅ |
| Подготовлен целевой audit report файл | ✅ |

**Вердикт:** DONE (design-only)

