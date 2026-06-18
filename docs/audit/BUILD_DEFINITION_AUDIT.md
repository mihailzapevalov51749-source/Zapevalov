# Build Definition Audit
# Определение канонического понятия Build в ЯсноПро

**Дата:** 2026-06-16  
**Тип:** read-only архитектурный аудит и ADR (без изменений кода, БД, API, UI)  
**Предшественники:**
- `CODE_BUILD_REGISTRY_READINESS_AUDIT.md`
- `RELEASE_PACKAGE_DESIGN_AUDIT.md`
- `CODE_RELEASE_FOUNDATION_MVP.md`
- `CODE_RELEASE_PIPELINE_READINESS_AUDIT.md`

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- Publication Guard Rules (`publication_guard`, P0/P1)
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

---

## Executive Summary

### Главный ответ

**Build в ЯсноПро** — это **зафиксированный результат сборки платформы из одного git-коммита**: immutable snapshot состава продукта (backend + frontend + schema revision + module BOM) с audit-метаданными и (MVP: placeholder) digest артефактов.

**Build ≠ Release Package ≠ Deployment ≠ Version label.**

**Канонический вариант:** **Г (полный продукт)**, с обязательной привязкой к `commit_sha` как источнику истины кода.

---

## Задача 1. Текущая архитектура

### Факты монорепозитория

| Компонент | Путь | Роль в «сборке» |
|-----------|------|-----------------|
| Backend | `backend/app/` | Единый FastAPI-процесс, все runtime modules в одном tree |
| Frontend | `frontend/src/` | Единый Vite bundle |
| Schema | `backend/alembic/versions/` | Общая схема БД для всех tenant |
| Runtime modules | `backend/app/modules/{calendar,chats,...}/` | Код внутри backend, не отдельные deployable bundles |
| Module registry | `platform_modules`, `platform_module_manifests` | Метаданные и BOM, не артефакты |
| Publication pipeline | `platform_module_publications` | **Tenant config** DEV→Template, не code |
| Version registry | `platform_environment_versions` | **Установленная** SemVer per portal, без commit |

### Логическая единица сборки платформы

С учётом одного runtime и одного deployable unit на MVP:

```text
Одна логическая сборка = весь продукт ЯсноПро
  (backend tree + frontend bundle + Alembic head + module BOM)
  из одного commit_sha
```

Отдельные module builds как независимые артефакты **не соответствуют** текущей физической архитектуре.

---

## Задача 2. Варианты

### Вариант А — Build = Git Commit

| | |
|--|--|
| **Плюсы** | Просто; однозначная привязка к исходникам |
| **Минусы** | Commit ≠ результат сборки; один commit можно собрать многократно с разным исходом; нет статуса failed/succeeded, нет digest, нет schema/BOM snapshot |
| **Риски** | Путаница «закоммитили» = «собрали»; невозможен audit failed build |

### Вариант Б — Build = Snapshot репозитория

| | |
|--|--|
| **Плюсы** | Фиксирует состояние кода |
| **Минусы** | Неопределённо (tarball? commit? branch tip?); не включает результат компиляции и schema head |
| **Риски** | Дублирование git; нет operational semantics |

### Вариант В — Build = Backend + Frontend Package

| | |
|--|--|
| **Плюсы** | Ближе к deployable artifacts |
| **Минусы** | Игнорирует schema revision и module BOM; ломает Migration Rollback Foundation и Release Package design |
| **Риски** | Deploy без согласованной схемы БД |

### Вариант Г — Build = полный продукт (Backend + Frontend + Schema + Module BOM)

| | |
|--|--|
| **Плюсы** | Соответствует монорепо; стыкуется с `platform_version_schema_catalog`, manifests, Release Package; один deployable unit |
| **Минусы** | Богаче модель; нужен manifest snapshot |
| **Риски** | Scope creep в manifest — mitigated: MVP BOM только runtime modules с registry |

---

## Задача 3. Канонический вариант

### Выбор: **Вариант Г**

**Почему подходит ЯсноПро:**

1. **Монорепо + один uvicorn + один Vite** — атомарная поставка платформы.
2. **Migration Rollback Foundation** требует `schema_revision` вместе с code.
3. **Release Package Design** уже определяет Build как создателя manifest + digests.
4. **Publication Guard** защищает tenant data отдельно — Build не должен содержать tenant snapshots.

**Почему остальные хуже:**

- **А** — commit необходим, но **недостаточен** как Build.
- **Б** — слишком абстрактен, не operational.
- **В** — неполный продукт, риск schema/code drift.

**Уточнение канона:** Build **якорится** на `commit_sha` (из варианта А), но **определяется** как результат процесса сборки полного продукта (вариант Г).

---

## Задача 4. Совместимость

| Система | Совместимость | Комментарий |
|---------|---------------|-------------|
| **Version Registry** | **Совместим** | Build не заменяет `platform_environment_versions`; version label присваивается на этапе Release Package / Deployment |
| **Schema Catalog** | **Совместим** | `schema_revision` в build manifest; сверка с `platform_version_schema_catalog` при release |
| **Migration Rollback Foundation** | **Совместим** | Rollback target = предыдущий **deployed package** с известным `schema_revision` |
| **Release Package Design** | **Совместим** | Build → input; Package blesses one succeeded Build |
| **Publication Guard** | **Совместим** | Ортогонален; Build не пишет tenant structure |
| **DEV → Template → Client** | **Совместим** | DEV производит builds; Template/Client получают **deployed** release derived from build |

---

## Задача 5. Обязательные поля Build (проектируемый `code_builds`)

### Идентификация (technical keys)

| Поле | Обязательное | Описание |
|------|--------------|----------|
| `id` | да | PK |
| `build_key` | да | Стабильный technical id (`build-YYYYMMDD-HHMMSS-{short_sha}`) |
| `commit_sha` | да | Git SHA источника (40 hex) |

### Процесс и audit

| Поле | Обязательное | Описание |
|------|--------------|----------|
| `build_status` | да | `pending` \| `running` \| `succeeded` \| `failed` |
| `build_started_at` | да | |
| `build_completed_at` | нет | до завершения |
| `created_by` / `built_by` | нет | user_id или `system:cli` |

### Состав продукта

| Поле | Обязательное | Описание |
|------|--------------|----------|
| `schema_revision` | да | Alembic head на момент сборки |
| `backend_artifact_digest` | да (MVP placeholder) | Hash backend artifact |
| `frontend_artifact_digest` | да (MVP placeholder) | Hash frontend bundle |
| `build_manifest_json` | да | BOM modules, tool versions, core_platform flags |

### Контекст (рекомендуемые)

| Поле | Описание |
|------|----------|
| `branch` | Git branch при сборке |
| `build_source` | `local_cli` \| `ci` (future) |
| `failure_reason` | при `failed` |
| `pytest_summary` | optional gate metadata |

### Не в Build (см. задачу 6)

`platform_version` — **не обязательное поле Build**; присваивается Release Package. Build может существовать без публичной версии.

---

## Задача 6. Что НЕ хранить в Build

| Категория | Примеры | Почему |
|-----------|---------|--------|
| **Tenant data** | portal records, entities, config snapshots | Publication Guard / module publications |
| **Runtime operational data** | notifications, chats, calendar events | Runtime, не build |
| **Offers / previews** | `tenant_update_offers`, `tenant_module_update_previews` | Rollout workflow |
| **Deployments** | `code_deployments`, installed_at per client | Отдельный registry |
| **Rollback records** | deployment rollbacks | Audit apply operations |
| **Governance changelog** | `release_changes`, review comments | `platform_releases` contour |
| **Display labels** | title, marketing release notes | Release Package / governance |
| **Environment slots** | DEV/Template/Client state | Deployment + version registry |

**Правило:** Build Registry = **immutable factory output**, не operational state окружений.

---

## Задача 7. Build и Release Package

### Это **разные** сущности

| | Build | Release Package |
|--|-------|-----------------|
| **Вопрос** | «Что собрали из git?» | «Что разрешено поставлять клиентам?» |
| **Immutable** | Да (после succeeded) | Да (после released) |
| **SemVer** | Нет (или draft only) | Да (`platform_version`) |
| **Может не стать релизом** | Да (failed QA) | — |

### Цепочка

```text
Code (git monorepo)
    ↓
Build (code_builds: commit + artifacts + schema + BOM)
    ↓
Release Package (blessed build + platform_version + release notes)
    ↓
Deployment (apply package to Template / Client slot)
    ↓
Version Registry update (platform_environment_versions)
```

---

## Задача 8. Build и Version

### Рекомендуемая модель

```text
Один commit_sha  →  много Build (пересборки, retry, CI reruns)
Один succeeded Build  →  0..1 Release Package (обычно 0 или 1)
Один Release Package  →  одна platform_version (SemVer)
Одна platform_version  →  много Deployment (Template + N clients)
```

**Ответ:** одна **публичная версия** не равна одному Build. Версия — label **релизного пакета**; Build — техническая сборка, из которой пакет может быть создан (или отклонена).

---

## Задача 9. Что увидит владелец продукта

**Что такое Build**  
Это «паспорт сборки»: из какого коммита, когда и кем собран продукт, что вошло (код, интерфейс, схема БД, модули), успешна ли сборка.

**Зачем нужен**  
Сейчас изменение файлов в репозитории сразу меняет поведение DEV, эталона и клиентов. Build фиксирует **конкретный снимок**, который можно проверить, утвердить и только потом поставить.

**Что даст лично**  
Прозрачность: «версия 1.0.0 — это не просто цифра, а конкретная проверенная сборка». Можно отказать в поставке бракованной сборки, не трогая клиентов.

**Приближение к DEV → Template → Client**  
В разработке собираем и проверяем → утверждаем пакет → ставим на эталон → контролируемо раздаём клиентам. Build — первый честный шаг этой лестницы.

---

## Задача 10. BUILD_DEFINITION_DECISION

```text
BUILD_DEFINITION_DECISION

Каноническое определение Build:
  Зафиксированный результат сборки полной платформы ЯсноПро
  из одного git commit_sha, включающий:
    - backend artifact (digest)
    - frontend artifact (digest)
    - schema_revision (Alembic head)
    - module BOM (из platform_module_manifests / versions)
  с audit-статусом процесса сборки.

Место в архитектуре:
  Слой code delivery между git (Code) и Release Package.
  Параллельный контур code_*; не смешивать с platform_releases
  и publication_guard.

Связь с Version:
  Build НЕ содержит публичную platform_version как SoT.
  platform_version присваивается Release Package.
  platform_environment_versions обновляется после Deployment.

Связь с Release Package:
  Release Package ссылается на один succeeded Build (FK build_id).
  Не каждый Build становится Package.

Связь с Deployment:
  Deployment ссылается на Release Package (не напрямую на Build).
  Build → Package → Deployment → Version Registry.
```

---

## Архитектурный аудит

| Вопрос | Ответ |
|--------|-------|
| Риск дублирования | **Средний**, если хранить build в `platform_releases` или смешать с `platform_environment_versions` |
| Риск лишних сущностей | **Низкий** при одной таблице `code_builds` + manifest JSONB |
| Переиспользовать | `platform_module_manifests`, `platform_module_versions`, `platform_version_schema_catalog`, apply/rollback patterns, SemVer validation |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Изменения БД | **Нет** |
| Изменения данных | **Нет** |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Создано | 0 |
| Удалено | 0 |
| Осталось | 0 |

---

## Cleanup Audit

```text
visible_test_records_count = 0
remaining_test_records_count = 0
Cleanup status: PASSED
```

---

## Manual Smoke

**NOT PERFORMED** — design-only audit.

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Каноническое понятие Build | ✅ |
| Выбран один вариант (Г) | ✅ |
| Связь с Version | ✅ |
| Связь с Release Package | ✅ |
| Связь с Deployment | ✅ |
| Код / БД не менялись | ✅ |
| Нет тестового мусора | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**

---

## Следующий WI (вне scope)

`Code Build Registry` — реализация `code_builds` по данному BUILD_DEFINITION_DECISION.
