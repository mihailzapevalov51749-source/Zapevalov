# Release Package Lifecycle Audit

**Дата:** 2026-06-16  
**Тип:** read-only архитектурный аудит state machine (без реализации кода/БД/API/UI)

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

Для `platform_release_packages` принят канонический lifecycle:

```text
draft -> ready -> published -> deprecated
draft -> cancelled
ready -> cancelled
```

Ключевой принцип:

- `ready/published/deprecated` — immutable payload states;
- `cancelled` — terminal для непубликованных пакетов;
- `published -> cancelled` запрещён;
- deployment разрешается только из `published`.

---

## Задача 1 — полный жизненный цикл и переходы

### Допустимые переходы

| From | To | Разрешено |
|---|---|---|
| `draft` | `ready` | да |
| `draft` | `cancelled` | да |
| `ready` | `published` | да |
| `ready` | `cancelled` | да |
| `published` | `deprecated` | да |

### Запрещённые переходы

| From | To | Причина |
|---|---|---|
| `published` | `cancelled` | опубликованный пакет уже часть поставочного контура |
| `deprecated` | любой другой | terminal/архивный статус |
| `cancelled` | любой другой | terminal/отменён |
| `ready` | `draft` | недопустимый rollback состояния без пересоздания package |
| `published` | `ready`/`draft` | нарушение audit trail |

---

## Задача 2 — момент создания Package

Варианты:

- автоматически после Build — слишком рано, нет осознанного release decision;
- вручную из Build — управляемо и прозрачно;
- смешанная модель — лучше как future-опция.

### Рекомендация

**MVP: вручную из Build** (operator/reviewer action).  
Future: автоматизация допустима, но должна всё равно попадать в `draft` и проходить state machine.

---

## Задача 3 — момент перехода в `ready`

Перед `ready` должны быть выполнены проверки:

1. `build_id` существует и указывает на валидный build record.
2. `platform_version` задана и уникальна.
3. `package_manifest_json` и `module_bom_json` не пустые по структуре.
4. `schema_revision` в package согласован с данными build.
5. Базовая целостность metadata пройдена (required fields, format checks).

`ready` = пакет структурно и аудиторно готов к публикации, но ещё не доступен для deployment.

---

## Задача 4 — момент перехода в `published`

`published` означает:

- package утверждён как допустимый источник deployment;
- deployment из него разрешён по policy;
- автоматический deployment **не выполняется**.

### Канонический смысл

`published` = готовность к deployment, не запуск deployment.

---

## Задача 5 — immutable policy

Иммутабельность критичных полей:

- `build_id`
- `platform_version`
- `module_bom_json`
- `package_manifest_json`

### Канон

Изменение этих полей запрещено после достижения `ready` и выше (`published`, `deprecated`).

На Phase 1 это архитектурное правило (в модели уже зафиксировано комментарием); enforcement-движок — следующий этап.

---

## Задача 6 — правила отмены

| Переход | Решение |
|---|---|
| `draft -> cancelled` | разрешить |
| `ready -> cancelled` | разрешить |
| `published -> cancelled` | **запретить** |

Обоснование: отмена допустима только до публикации. После публикации используется `deprecated` + deployment/rollback контур.

---

## Задача 7 — связь с Deployment Registry

Deployment разрешается только для пакетов в статусе:

- `published`

Для статусов:

- `draft`, `ready`, `deprecated`, `cancelled` — deployment запрещён.

---

## Задача 8 — связь с Rollback Registry

### Может ли `deprecated` package использоваться для rollback?

**Да.**  
`deprecated` означает «не для новых rollout», но может быть валиден как target rollback, если соблюдена compatibility policy (schema/version constraints).

Для этого deployment/rollback контуру нужны:

- `release_package_id`
- `platform_version`
- `schema_revision`
- связка с previous deployment chain

---

## Задача 9 — каноническая state machine

```text
           +----------------+
           |     draft      |
           +----------------+
             |          |
             |          +----------------------+
             v                                 v
     +----------------+               +----------------+
     |     ready      |               |   cancelled    |
     +----------------+               +----------------+
        |         |
        |         +----------------------+
        v                                |
 +----------------+                      |
 |   published    |                      |
 +----------------+                      |
        |                                |
        v                                |
 +----------------+                      |
 |   deprecated   |<---------------------+
 +----------------+

Terminal: cancelled, deprecated
Deployment allowed: published only
Rollback target allowed: published, deprecated (policy-checked)
```

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Совместимость с Build Registry | PASS |
| Совместимость с Deployment Registry Design | PASS |
| Совместимость с Version Registry | PASS |
| Совместимость с будущим Rollback Registry | PASS |

Обоснование:

- lifecycle отделяет «подготовка package» от «операции deploy»;
- не дублирует runtime-state таблицы;
- поддерживает rollback без ломки immutable принципа.

---

## Data Impact Audit (design-only)

Потенциально могут понадобиться позже:

- `ready_by`
- `published_by`
- `deprecated_by`
- `status_reason`
- `status_changed_at`

(для расширенного audit trail state transitions)

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

## Итоговые правила lifecycle (канон)

1. Package создаётся вручную из Build в `draft`.
2. `ready` — пройдены структурные и целостностные проверки.
3. `published` — разрешение на deployment, без автодеплоя.
4. `deprecated` — запрет новых rollout, но допустимость rollback target по policy.
5. `cancelled` — только до публикации.
6. Critical payload immutable начиная с `ready`.

**Вердикт:** lifecycle канонизирован, готов к следующему WI с enforcement и API.
