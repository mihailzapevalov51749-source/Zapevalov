# Code Release Foundation Phase 1 — Report

**Дата:** 2026-06-15  
**WI:** Code Release Foundation Phase 1 — Реестр версий платформы  
**Статус:** **DONE**

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- Publication Guard (без изменений guards)
- DEV Journal
- Test Data / Cleanup Audit

---

## 1. Executive Summary

Реализован **реестр версий платформы** (Phase 1): текущая версия по средам DEV / Template / Client и история установок. Без deploy, build, rollback и CI/CD.

После миграции и seed:

| Среда | Компания | Версия |
|-------|----------|--------|
| DEV | Корпоративный портал (id=1) | `1.0.0-dev` |
| Template | Эталон (id=2) | `1.0.0` |
| Client | ООО Розетка (id=21) | `1.0.0` |

UI: **Control Plane → Релизы → Версии** (`/control-plane/releases/versions`) — read-only.

---

## 2. Архитектурное решение (Задача 1)

### Анализ существующих сущностей

| Сущность | Роль | Переиспользование Phase 1 |
|----------|------|---------------------------|
| `platform_releases` | governance workflow, changelog | **Не используется** (Phase 2+ link) |
| `release_changes` | changelog items | **Не используется** |
| `platform_module_versions` | module semver registry | **Не используется** |
| `tenant_versions` | label для platform_release offers | **Не дублируется** — параллельный контур |
| `tenant_update_offers` | client update offers | **Не используется** |

### Новая модель (без дублирования)

| Таблица | Назначение |
|---------|------------|
| `platform_environment_versions` | **текущая** версия per portal (`tenant_id` unique) |
| `platform_version_history` | **история** установок (append-only) |

**Source of Truth текущей версии:** `platform_environment_versions` where `status=active`.

Привязка к portal через `tenant_id` (technical id); `environment_key` (`DEV`/`TEMPLATE`/`CLIENT`) денормализуется из `portals.tenant_type`.

---

## 3. Version Registry (Задача 2)

### Поля текущей версии

| Поле | Описание |
|------|----------|
| `tenant_id` | portal id |
| `environment_key` | DEV / TEMPLATE / CLIENT |
| `platform_version` | SemVer (+ `-dev` для DEV) |
| `status` | active / superseded / planned |
| `installed_at` | дата установки |
| `installed_by_id` | кто установил |
| `notes` | заметки |
| `change_description` | что изменилось (ручное) |

### Как определяется текущая версия среды

```text
GET /platform/version-registry/current
→ platform_environment_versions (status=active)
→ join portals для display name
```

Один portal = один слот. DEV и Template — singleton portals; Client — per client tenant (MVP: ООО Розетка).

---

## 4. Версионирование (Задача 3)

- **SemVer:** `MAJOR.MINOR.PATCH`
- **DEV:** обязательный суффикс `-dev` (например `1.0.0-dev`)
- **Template/Client:** без `-dev`
- Валидация: `PLATFORM_VERSION_PATTERN` в `constants.py`

---

## 5. История версий (Задача 4)

Таблица `platform_version_history` хранит каждую установку и supersede-событие.

При смене версии через `record_environment_version()`:
1. предыдущая active → history row `superseded`
2. current row обновляется
3. новая history row `active`

Описание изменений — ручное поле `change_description` (автогенерация не требуется).

---

## 6. Экран контроля версий (Задача 5)

| Компонент | Путь |
|-----------|------|
| API summary | `GET /platform/version-registry/summary` |
| UI page | `frontend/.../PlatformVersionsPage.jsx` |
| Route | `/control-plane/releases/versions` |
| Nav | Релизы → Версии |

**Только просмотр.** POST deploy/rollback отсутствуют.

---

## 7. Совместимость (Задача 6)

| Система | Статус |
|---------|--------|
| Publication Guard | **Не затронут** |
| Module Publications | **Не затронут** |
| Platform Releases | **Параллельно** — optional link позже |
| DEV Journal | **Запись создана** |
| Event Journal | **Не используется** в Phase 1 |

---

## 8. Архитектурные вопросы

### Вопрос 1 — фундамент для Build / Release Package / Deployment / Rollback?

**Да.** `platform_environment_versions` станет target state для `CodeDeployment`; `platform_version_history` — audit trail для rollback registry.

### Вопрос 2 — переход DEV → Release → Template → Client без переделки?

**Да.** Phase 1 фиксирует **куда** установлена версия; Phase 2+ добавит `ReleasePackage` и запись через `record_environment_version()` при deploy.

---

## 9. Реализованные артефакты

### Backend

- `backend/app/modules/platform_version_registry/` — models, service, router, seed
- `backend/alembic/versions/20260615_0068_platform_version_registry.py`
- `backend/tests/test_platform_version_registry_phase1.py`

### Frontend

- `PlatformVersionsPage.jsx`
- `platformVersionRegistryApi.js`
- Navigation: `cp-group-releases` → Проверка / Версии

### API

- `GET /platform/version-registry/current`
- `GET /platform/version-registry/history`
- `GET /platform/version-registry/summary`

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Tables created | `platform_environment_versions`, `platform_version_history` |
| Tables altered | **0** |
| Rows created (seed) | 3 current + 3 history (DEV, Template, Розетка) |
| Rows updated | **0** (existing tables) |
| Rows deleted | **0** |
| Protected tenants touched | id=1, 2, 21 (seed only, `is_protected` preserved) |
| Destructive operation | **none** |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Test tenants created | **0** (service tests rollback) |
| Test users created | **0** (API test uses platform owner) |
| Test data removed | n/a |
| Remaining test leaks | **0** (`visible_test_companies_count=0`) |

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
pytest tests/test_platform_version_registry_phase1.py -q → 5 passed
alembic upgrade head → 20260615_0068
```

---

## Architecture Audit

| Вопрос | Pass |
|--------|------|
| Source of Truth — отдельный registry, не дубль tenant_versions | Pass |
| Technical keys (`tenant_id`, `environment_key`) | Pass |
| Publication Guard не затронут | Pass |
| Scope Phase 1 — без deploy/build | Pass |

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Модель версий определена | ✅ |
| Реестр реализован | ✅ |
| Текущая версия среды | ✅ |
| История версий | ✅ |
| Экран контроля (read-only) | ✅ |
| Нет дублирования | ✅ |
| Data / Test / Cleanup audits | ✅ |
| DEV Journal | ✅ |

---

## Следующий этап (вне Phase 1)

- Migration Rollback Foundation (`schema_revision` binding)
- CodeBuild / ReleasePackage registry
- `record_environment_version()` из deploy pipeline
