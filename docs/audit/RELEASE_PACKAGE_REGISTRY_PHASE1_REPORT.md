# Release Package Registry Phase 1 — Report

**Дата:** 2026-06-16  
**Тип:** implementation (registry foundation only)

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

## Что создано

### Новый модуль

`backend/app/modules/platform_release_package_registry/`

- `__init__.py`
- `constants.py`
- `models.py`

### Новая миграция

- `backend/alembic/versions/20260616_0071_platform_release_package_registry.py`

### Новая таблица

- `platform_release_packages`

---

## Реализованная модель Phase 1

Поля:

- `id`
- `package_key`
- `platform_version`
- `build_id`
- `status`
- `package_manifest_json`
- `module_bom_json`
- `release_notes`
- `created_at`
- `ready_at`
- `published_at`
- `deprecated_at`
- `cancelled_at`
- `created_by`
- `cancelled_by`
- `cancellation_reason`

---

## Ограничения и связи

### FK

- `platform_release_packages.build_id -> platform_code_builds.id` (`RESTRICT`)
- `created_by -> users.id` (`SET NULL`)
- `cancelled_by -> users.id` (`SET NULL`)

### Unique constraints

- `uq_platform_release_packages_package_key`
- `uq_platform_release_packages_platform_version`

### Check constraint

- `ck_platform_release_packages_status`:
  - `draft`
  - `ready`
  - `published`
  - `deprecated`
  - `cancelled`

### Индексы

- `ix_platform_release_packages_id`
- `ix_platform_release_packages_package_key`
- `ix_platform_release_packages_platform_version`
- `ix_platform_release_packages_build_id`
- `ix_platform_release_packages_status`
- `ix_platform_release_packages_created_at`
- `ix_platform_release_packages_created_by`
- `ix_platform_release_packages_cancelled_by`

---

## Формат `package_key`

Принят:

```text
PKG-YYYYMMDD-NNNN
```

Паттерн:

```text
^PKG-\d{8}-\d{4}$
```

(зафиксирован в `constants.py` как `PACKAGE_KEY_PATTERN`)

---

## Immutable-принцип (архитектурно зафиксирован)

В `models.py` в docstring закреплено:

после перехода в `ready`/`published` нельзя изменять:

- `build_id`
- `platform_version`
- `package_manifest_json`
- `module_bom_json`

На Phase 1 enforcement-движок сознательно не реализован.

---

## Почему это не дублирует существующие реестры

| Реестр | Роль | Почему не дублируется |
|---|---|---|
| `platform_code_builds` | техническая сборка | Package — слой релизной поставки, с lifecycle и `platform_version` |
| `platform_environment_versions` | текущее установленное состояние | Package не хранит environment state |
| `platform_version_history` | история установок | Package не хранит deployment события |
| `platform_version_schema_catalog` | version↔schema канон | Package хранит release snapshot, не канонический каталог |

---

## Что сознательно НЕ реализовано на Phase 1

- API endpoints
- UI
- Deployment Registry
- Rollback Registry
- Release Package service/use-cases
- автоматическая публикация/оркестрация
- enforcement immutable на уровне бизнес-логики

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Нет дублирования Build Registry | PASS |
| Нет дублирования Version Registry | PASS |
| Нет дублирования Environment Registry | PASS |
| Нет конфликта с Module Publications | PASS |
| Сохранён путь к Module Code Release | PASS (через `module_bom_json`) |

---

## Data Impact Audit

```text
Новые таблицы:
  - platform_release_packages

Новые индексы:
  - 8 (см. раздел выше)

Новые constraints:
  - unique(package_key)
  - unique(platform_version)
  - check(status in draft/ready/published/deprecated/cancelled)

Новые FK:
  - build_id -> platform_code_builds.id
  - created_by -> users.id
  - cancelled_by -> users.id

Влияние на tenant data:
  - отсутствует
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
| Создан модуль registry | ✅ |
| Создана ORM модель | ✅ |
| Создана миграция | ✅ |
| Настроен FK на Build Registry | ✅ |
| Добавлены базовые ограничения | ✅ |
| Не затронуты запрещённые контуры | ✅ |
| Без API/UI/deploy/rollback | ✅ |

**Вердикт: DONE**
