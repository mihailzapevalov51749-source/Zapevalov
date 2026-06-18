# Deployment Registry Design Audit

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

## Executive Summary

**Deployment в ЯсноПро** — это **операция применения конкретного Release Package к целевой code-среде** (Template или конкретный Client tenant), с фиксированным статусом исполнения и audit-следом.

Deployment:

- **не Build** (не собирает код),
- **не Release Package** (не описывает единицу поставки),
- **не Environment Version** (не хранит итоговый state),
- **не Version History** (не является установочной витриной),
- **не Rollback** (но хранит достаточно данных для будущего rollback).

Канонический принцип:

```text
Package -> Deployment -> (on success) Environment Version + Version History
```

---

## Задача 1 — каноническое назначение Deployment

### Определение

Deployment Registry хранит факт и результат попытки применить `platform_release_packages` к target environment.

### Отличие сущностей

| Сущность | Роль |
|---|---|
| `platform_code_builds` | техническая сборка (commit + digests + BOM) |
| `platform_release_packages` | blessed immutable единица поставки |
| **Deployment (future)** | операция применения package |
| `platform_environment_versions` | текущая установленная версия (SoT runtime version state) |
| `platform_version_history` | append-only история установок |
| Rollback (future) | отдельная операция возврата к предыдущему deployment |

---

## Задача 2 — целевые среды Deployment

Рекомендуемая модель:

- `template` (эталонный code slot)
- `client` (конкретный tenant)
- `dev` (опционально, не основной поток)

### Правила потока

1. Основной MVP-поток: сначала Template, затем Clients.
2. `dev`-deployment допускается только для технических операций/проверок, не как основной канал доставки.
3. Для `client` обязателен `target_tenant_id`.
4. Отличение template/client выполняется через `target_environment_type` + `target_tenant_id`.

---

## Задача 3 — связь Release Package -> Deployment

Кардинальность:

```text
1 Release Package -> N Deployments
```

Обоснование:

- один package применяется сначала в Template,
- затем в нескольких Client,
- возможны повторные deployments (retry/reapply) с audit trail.

---

## Задача 4 — связь Deployment ↔ Environment Version

Каноническое правило:

- `succeeded` deployment **обновляет** `platform_environment_versions`;
- `failed` / `cancelled` deployment **не обновляет** текущую версию;
- при `succeeded` добавляется запись в `platform_version_history`.

Это сохраняет SoT:

- текущий state — `platform_environment_versions`,
- история — `platform_version_history`,
- операция — deployment registry.

---

## Задача 5 — lifecycle Deployment

Финальный набор статусов:

- `planned`
- `running`
- `succeeded`
- `failed`
- `cancelled`
- `rolled_back` (после будущей rollback-операции)

Рекомендуемые переходы:

```text
planned -> running -> succeeded
planned -> running -> failed
planned -> cancelled
running -> cancelled
succeeded -> rolled_back (future rollback flow)
```

---

## Задача 6 — минимальные поля Deployment Registry (design)

Рекомендуемая сущность: `platform_code_deployments`

Поля:

- `id`
- `deployment_key`
- `release_package_id`
- `target_environment_type` (`dev`/`template`/`client`)
- `target_tenant_id` (nullable for template/dev, required for client)
- `status`
- `started_at`
- `finished_at`
- `created_at`
- `created_by`
- `failure_reason`
- `deployment_manifest_json` (копия package snapshot на момент deploy)

Рекомендуемые денормализации для rollback/read-model:

- `target_platform_version`
- `target_schema_revision`
- `target_build_id`
- `previous_platform_version` (nullable)
- `previous_release_package_id` (nullable)

---

## Задача 7 — защита Template и Client

Принцип сохраняется:

```text
Template и Client не меняются напрямую.
Только через Package -> Deployment.
```

Совместимость с Publication Guard:

- Publication Guard защищает structure/config write paths;
- Deployment Registry — отдельный code-delivery metadata contour;
- конфликтов нет, обхода guard нет.

---

## Задача 8 — данные для будущего Rollback Registry

Deployment должен хранить минимум:

- `release_package_id` (что применяли)
- `target_platform_version`
- `target_schema_revision`
- `previous_platform_version`
- `previous_release_package_id`
- `status` и timestamps

### Ответы на вопросы

- хранить `previous_environment_version` — **да** (денормализация для быстрого rollback planning)
- хранить `target_version` — **да**
- хранить `applied_schema_revision` — **да**

---

## Задача 9 — совместимость с модульной стратегией

Текущий deployment platform-wide:

- совместим с MVP (монорепо + единый runtime),
- не блокирует переход к Module Code Deployment позже.

Чтобы не блокировать будущее:

- оставить `deployment_manifest_json` расширяемым,
- поддерживать `target_scope` (future: `platform`/`module`) на следующем этапе,
- не смешивать module config deployment (publication/apply) с code deployment.

---

## Задача 10 — итоговый вывод

Deployment Registry нужно проектировать как **операционный слой применения package**, отдельный от Build/Package/Version registries.

Канонический путь:

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

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Нет дублирования Release Package Registry | PASS |
| Нет дублирования Version Registry | PASS |
| Нет дублирования Environment Registry | PASS |
| Нет конфликта с Module Publications | PASS |
| Нет обхода Publication Guard | PASS |
| Сохраняется путь к Rollback Registry | PASS |

---

## Data Impact Audit (design-only)

```text
Потенциальные таблицы:
  - platform_code_deployments

Потенциальные индексы:
  - deployment_key (unique)
  - release_package_id
  - target_environment_type
  - target_tenant_id
  - status
  - created_at

Потенциальные FK:
  - release_package_id -> platform_release_packages.id
  - created_by -> users.id
  - target_tenant_id -> portals.id (nullable)
  - previous_release_package_id -> platform_release_packages.id (nullable, optional)

Потенциальное влияние на tenant data:
  - отсутствует (metadata registry layer)
```

На текущем этапе:

```text
Изменений БД: нет
Изменений данных: нет
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
visible_test_records_count = 0
remaining_test_records_count = 0
Cleanup status: PASSED
```

---

## Success Criteria

| Критерий | Статус |
|---|---|
| Каноническое назначение Deployment определено | ✅ |
| Среды и поток определены | ✅ |
| Связь Package→Deployment определена | ✅ |
| Связь Deployment→Version/History определена | ✅ |
| Lifecycle определён | ✅ |
| Минимальная модель полей определена | ✅ |
| Совместимость с Publication Guard подтверждена | ✅ |
| Rollback-ready данные определены | ✅ |
| Совместимость с модульной стратегией подтверждена | ✅ |

**Вердикт: DONE**
