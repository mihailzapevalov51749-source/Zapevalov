# Build Runtime Readiness Audit

**Дата:** 2026-06-16  
**Тип:** read-only фактический аудит (без изменений кода, БД, API, UI)

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- Publication Guard Rules
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

---

## Задача 1 — что есть в `platform_code_builds` и связанном коде

### Модель

`backend/app/modules/platform_build_registry/models.py` — `PlatformCodeBuild`

Поля:

- `id`, `build_key` (unique)
- `commit_sha`, `status`
- `backend_digest`, `frontend_digest`, `schema_revision`
- `build_manifest_json` (JSONB)
- `created_at`, `started_at`, `finished_at`, `created_by`, `failure_reason`

### Константы

`backend/app/modules/platform_build_registry/constants.py`

- `PlatformBuildStatus`: `pending`, `running`, `succeeded`, `failed`, `cancelled`
- `BUILD_KEY_PATTERN`: `^BLD-\d{8}-\d{4}$`
- `COMMIT_SHA_PATTERN`: `^[0-9a-f]{40}$` (определён, но нигде не используется в runtime)

### Миграция

`backend/alembic/versions/20260616_0070_platform_code_build_registry.py`

- создаёт таблицу `platform_code_builds`
- индексы и `uq_platform_code_builds_build_key`

### Сервисы Build

**Отсутствуют.**

В модуле `platform_build_registry` нет:

- `service.py`
- `router.py`
- `schemas.py`
- `test_*.py`

### API Build

**Отсутствует.**

В `backend/app/main.py` нет подключения build-router.

Нет endpoints вида:

- `GET /platform/builds`
- `POST /platform/builds`
- lifecycle transitions

### Сценарии использования Build (фактические)

| Сценарий | Статус |
|---|---|
| Создать Build через API | Не реализовано |
| Прочитать Build через API | Не реализовано |
| Перевести Build по lifecycle | Не реализовано |
| Создать Release Package с `build_id` | Реализовано (если build-запись уже существует в БД) |
| Проверить согласованность package manifest с build metadata | Реализовано в `mark_ready` release package service |
| UI для Build | Не реализовано |
| Frontend references | Не найдено |

---

## Задача 2 — что означает Build сегодня

```text
Build сегодня =
immutable metadata-запись в platform_code_builds
о попытке/результате сборки платформы
(commit_sha + digests + schema_revision + build_manifest_json + lifecycle status),
без runtime service/API и без build engine.
```

Build сейчас — **registry storage**, не operational runtime.

---

## Задача 3 — сценарий DEV -> Build -> Release Package без доп. кода

```text
изменение в DEV
↓
создание Build
↓
создание Release Package
```

**Нельзя выполнить end-to-end через продуктовый API.**

Причина:

- шаг «создание Build» не имеет service/API;
- Release Package API (`POST /platform/release-packages`) требует существующий `build_id`, но не умеет создать build.

Технический обход (не продуктовый путь): вручную вставить строку в `platform_code_builds`, затем вызвать Release Package API.

---

## Задача 4 — что конкретно отсутствует

| Компонент | Статус |
|---|---|
| `platform_build_registry/service.py` | Отсутствует |
| `platform_build_registry/router.py` | Отсутствует |
| `platform_build_registry/schemas.py` | Отсутствует |
| `platform_build_registry/test_service.py` | Отсутствует |
| `platform_build_registry/test_router.py` | Отсутствует |
| Подключение router в `main.py` | Отсутствует |
| Операция `create_build` | Отсутствует |
| Операция `list_builds` / `get_build` | Отсутствует |
| Lifecycle `start_build` / `mark_succeeded` / `mark_failed` / `cancel_build` | Отсутствует |
| Build engine (реальная сборка артефактов) | Отсутствует |
| UI/Control Plane экран Build | Отсутствует |

---

## Задача 5 — связь Build -> Release Package (фактическая)

Реализовано:

- FK `platform_release_packages.build_id -> platform_code_builds.id` (`RESTRICT`)
- `create_release_package(...)` проверяет, что build существует (`_get_build_or_400`)
- `mark_ready(...)` проверяет согласованность `package_manifest_json` с build metadata (`build_id`, `commit_sha`, `schema_revision`)

Не реализовано:

- проверка `build.status == succeeded` при создании/готовности package
- автоматическое создание build из DEV-изменения
- единый orchestrated flow «создай build и сразу package»

Итог связи: **односторонняя ссылка package -> build**, без operational build-layer.

---

## Задача 6 — готовность Build

**Статус: Частично готов.**

Обоснование:

- **Готов как registry foundation:** таблица, модель, ключевые поля, lifecycle-константы, FK downstream.
- **Не готов как runtime слой:** нет service/API/lifecycle operations/tests/UI.
- **Не готов как обязательный шаг канонической цепочки в продукте:** нельзя пройти «создать build» штатным API.

---

## Задача 7 — точный список оставшихся работ (если нужен operational Build)

| Компонент | Зачем нужен | Критичность |
|---|---|---|
| `platform_build_registry/service.py` | create/list/get + lifecycle transitions | Критично |
| `platform_build_registry/router.py` + `schemas.py` | доступ из Control Plane/API | Критично |
| Подключение router в `main.py` | сделать build endpoints доступными | Критично |
| `test_service.py` + `test_router.py` | зафиксировать lifecycle и guards | Важно |
| Проверка `build.status=succeeded` в release package flow | не допускать package из failed build | Важно |
| Build engine (CI/artifact build runner) | реальная сборка backend/frontend digest | Можно позже |
| UI Build в Control Plane | операционное управление без raw API | Можно позже |

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Фактическая реализация проверена по коду | PASS |
| Новая архитектура не проектировалась | PASS |
| Новые реестры не предлагались | PASS |
| Build не дублирует Release Package/Deployment | PASS |

---

## Data Impact Audit

В рамках аудита изменений БД не выполнялось.

Выявленный operational gap: отсутствует runtime-слой над уже существующей таблицей `platform_code_builds`.

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
Build test records: not created

Cleanup status: PASSED
```

---

## Success Criteria

| Критерий | Статус |
|---|---|
| Проверен `platform_code_builds` и связанный код | ✅ |
| Определено, что Build означает сегодня | ✅ |
| Проверен сценарий DEV -> Build -> Release Package | ✅ |
| Зафиксированы отсутствующие service/API/операции | ✅ |
| Проверена фактическая связь Build -> Release Package | ✅ |
| Определён статус готовности Build | ✅ |
| Подготовлен точный список оставшихся работ | ✅ |

**Вердикт:** PARTIAL READY (registry-only)
