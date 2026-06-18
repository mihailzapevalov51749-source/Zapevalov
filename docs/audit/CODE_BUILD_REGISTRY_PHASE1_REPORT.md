# Code Build Registry Phase 1 — Report

**Дата:** 2026-06-16  
**Тип:** implementation (Build Registry foundation only)

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

## Задача 1 — аудит переиспользования существующих сущностей

| Сущность | Роль | Переиспользование в Build Registry |
|---|---|---|
| `platform_environment_versions` | текущая установленная версия per environment slot | не переиспользуется как Build (это deployment state) |
| `platform_version_history` | история установок и замен версий | не переиспользуется как Build (это installation audit) |
| `platform_version_schema_catalog` | канон `platform_version -> schema_revision` | переиспользуется концептуально: `schema_revision` фиксируется в Build |
| `platform_module_manifests` / `platform_module_versions` | описание модулей и BOM-паттерн | переиспользуется как источник `build_manifest_json.modules[]` |

**Вывод:** отдельная таблица `platform_code_builds` необходима, потому что существующие реестры не хранят `commit_sha`, digest артефактов и lifecycle сборки.

---

## Задача 2 — каноническая модель Build (реализовано)

Новая ORM-сущность: `PlatformCodeBuild` (`backend/app/modules/platform_build_registry/models.py`)

Поля:

- `id`
- `build_key` (unique, indexed)
- `commit_sha` (indexed)
- `status` (indexed)
- `backend_digest`
- `frontend_digest`
- `schema_revision` (indexed)
- `build_manifest_json` (JSONB snapshot BOM)
- `created_at` (indexed)
- `started_at`
- `finished_at`
- `created_by` (FK `users.id`, indexed)
- `failure_reason`

---

## Задача 3 — lifecycle Build

Финальный набор статусов (реализован в `PlatformBuildStatus`):

- `pending`
- `running`
- `succeeded`
- `failed`
- `cancelled`

---

## Задача 4 — формат `build_key`

Принят формат:

```text
BLD-YYYYMMDD-NNNN
```

Паттерн: `^BLD-\d{8}-\d{4}$` (`BUILD_KEY_PATTERN`).

Причина: читаемо, стабильно, масштабируется без привязки к display-name.

---

## Задача 5 — связь Build ↔ Schema

Поле `schema_revision` добавлено в Build.

Совместимость:

- Migration Rollback Foundation не изменяется
- `platform_version_schema_catalog` остается каноном version↔schema
- Build фиксирует фактический schema head на момент сборки

---

## Задача 6 — связь Build ↔ BOM

Решение Phase 1:

- хранить BOM snapshot в `build_manifest_json` (JSONB)
- **без отдельной таблицы** на этом этапе

Обоснование:

- быстрее внедрить foundation
- соответствует `BUILD_DEFINITION_AUDIT`
- отдельная таблица возможна позднее при аналитических требованиях

---

## Задача 7 — будущие связи (зафиксировано, не реализовано)

```text
Build (platform_code_builds)
  ↓
Release Package (future)
  ↓
Deployment (future)
  ↓
Environment Version Registry (existing)
```

---

## Задача 8 — инфраструктурная реализация (без API/UI)

Добавлено:

- модуль `backend/app/modules/platform_build_registry/`
  - `__init__.py`
  - `constants.py`
  - `models.py`
- миграция `backend/alembic/versions/20260616_0070_platform_code_build_registry.py`

Создана таблица:

- `platform_code_builds`

Индексы:

- `ix_platform_code_builds_id`
- `ix_platform_code_builds_build_key`
- `ix_platform_code_builds_commit_sha`
- `ix_platform_code_builds_status`
- `ix_platform_code_builds_schema_revision`
- `ix_platform_code_builds_created_at`
- `ix_platform_code_builds_created_by`

Constraint:

- `uq_platform_code_builds_build_key`

---

## Architecture Audit

| Проверка | Результат |
|---|---|
| Нет дублирования Version Registry | PASS |
| Нет дублирования Environment Registry | PASS |
| Нет дублирования Schema Catalog | PASS |
| Соответствие `BUILD_DEFINITION_AUDIT` | PASS |

---

## Data Impact Audit

Новые объекты БД:

- таблица `platform_code_builds`
- 7 индексов
- 1 unique constraint
- FK `created_by -> users.id (SET NULL)`

Влияние на tenant data:

- отсутствует
- изменения только в platform metadata registry

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

## Tests

```text
python -m compileall backend/app/modules/platform_build_registry
PASS
```

---

## Success Criteria

| Критерий | Статус |
|---|---|
| Проверены существующие сущности | ✅ |
| Определена каноническая Build модель | ✅ |
| Lifecycle зафиксирован | ✅ |
| Build key зафиксирован | ✅ |
| Build ↔ Schema учтена | ✅ |
| Build ↔ BOM учтена | ✅ |
| Реализована инфраструктура Build Registry | ✅ |
| Без API/UI/deploy/release package | ✅ |
| Нет изменений tenant data | ✅ |

**Вердикт: DONE**
