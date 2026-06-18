# Release Package Registry Design Audit

**Дата:** 2026-06-16  
**Тип:** read-only архитектурный аудит (без реализации кода/БД/API/UI)

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

### Каноническое назначение Release Package

**Release Package** в ЯсноПро — это **blessed immutable единица поставки кода**, созданная из конкретного `platform_code_builds` и готовая к ручному применению в Template/Client (в будущих этапах через Deployment Registry).

Release Package:

- **ссылается** на Build (`build_id`);
- **несёт** публичную версию (`platform_version`);
- **фиксирует** состав поставки (schema + BOM + artifact digests);
- **не является** deployment-событием и не хранит environment state.

### Отличие от соседних сущностей

| Сущность | Что это |
|---|---|
| **Build** | технический результат сборки (может не стать релизом) |
| **Release Package** | утверждённая поставка из build для распространения |
| **Deployment** | факт применения package к slot/tenant |
| **Version Registry** | текущая установленная версия по средам + история |

---

## Задача 1 — каноническое назначение Release Package

```text
Code
  ↓
Build (platform_code_builds)
  ↓
Release Package (immutable blessed unit)
  ↓
Deployment (future)
  ↓
Environment Version / History (existing)
```

Release Package — это **граница между фабрикой сборки и поставкой**.

---

## Задача 2 — содержимое Release Package (варианты)

### Вариант А: только `build_id`

- Плюсы: минимализм
- Минусы: слабая трассируемость в read-моделях, зависимость от join на build
- Вердикт: недостаточно

### Вариант Б: `build_id` + metadata

- Плюсы: нормальный audit/read, денормализация commit/schema/digests
- Минусы: требуется дисциплина immutable-копии metadata
- Вердикт: **канонический MVP**

### Вариант В: полный snapshot с дублированием всего

- Плюсы: автономность
- Минусы: риск избыточности и дублирования registry-уровней
- Вердикт: избыточно для MVP

### Канон

**Вариант Б**: `build reference + release metadata + immutable copy BOM`.

---

## Задача 3 — связь Build ↔ Release Package

Рекомендуемая кардинальность:

```text
1 Build
  ↓
0..N Release Packages
```

Обоснование:

- один и тот же успешный build может получить разные package-сущности (например, повторная упаковка метаданных, security label, региональная политика) без пересборки;
- при этом в MVP policy по умолчанию может быть `0..1` как operational guideline, но модель должна допускать `N`.

**Итог:** физическая модель `0..N`, operational policy MVP — «обычно 0..1».

---

## Задача 4 — момент присвоения `platform_version`

Варианты:

- во время Build — нет (build технический, без публичного semver);
- во время Package — **да** (канон);
- во время Deployment — поздно, теряется release identity;
- во время Registry Update — это уже post-deploy read-state.

**Каноническое решение:** `platform_version` присваивается при создании/утверждении Release Package.

---

## Задача 5 — lifecycle Release Package

Рекомендуемый набор статусов:

- `draft`
- `ready`
- `published`
- `deprecated`
- `cancelled`

Рекомендуемый переход:

```text
draft -> ready -> published -> deprecated
draft -> cancelled
ready -> cancelled
```

`published` и `deprecated` считаются immutable-состояниями по payload.

---

## Задача 6 — структура будущего реестра (без реализации)

Рекомендуемая таблица: `platform_release_packages`

Минимальные поля:

- `id`
- `package_key` (technical unique key)
- `build_id` (FK -> `platform_code_builds.id`)
- `platform_version` (SemVer)
- `status`
- `commit_sha` (денормализация из build)
- `backend_digest` (денормализация)
- `frontend_digest` (денормализация)
- `schema_revision` (денормализация)
- `module_bom_json` (immutable copy из build manifest)
- `release_notes`
- `release_type` (`standard`/`hotfix`/`security`)
- `published_at`
- `created_at`
- `created_by`
- `published_by`
- `governance_release_id` (nullable FK -> `platform_releases.id`, optional link)

Опциональная связующая таблица (для аналитики/фильтрации):

- `platform_release_package_modules`
  - `release_package_id`
  - `module_key`
  - `module_version`
  - `manifest_version`

MVP-допустимо начать с `module_bom_json` и добавить row-table позже.

---

## Задача 7 — совместимость с модульной стратегией

| Проверка | Результат |
|---|---|
| Platform-wide build в MVP | совместим (временный этап) |
| Module BOM внутри package | совместим, сохраняет модульную семантику |
| Переход к Module Code Release позже | **не блокируется** при `module_bom_json`/module table |
| Module Publications (config) | ортогонально, не конфликтует |

**Вывод:** выбранная модель Release Package не закрывает дорогу к будущему `Module Build/Module Release`.

---

## Задача 8 — карта будущих связей

```text
Code
  ↓
Build (platform_code_builds)
  ↓
Release Package (platform_release_packages)
  ↓
Deployment (future code_deployments)
  ↓
Environment Version (platform_environment_versions)
  ↓
Version History (platform_version_history)
```

Корректность цепочки: **подтверждена**.

---

## Architecture Audit

| Проверка | Итог |
|---|---|
| Нет дублирования Build Registry | PASS (`build_id` как anchor, package ≠ build) |
| Нет дублирования Version Registry | PASS (package хранит release identity, не runtime state) |
| Нет дублирования Environment Registry | PASS (environment state остаётся в `platform_environment_versions`) |
| Нет конфликта с Publication Packages | PASS (в проекте отдельного документа/контура Publication Package не найдено; есть Module Publications для config) |

---

## Data Impact Audit (design-only)

Потенциально потребуются (в будущей реализации):

- `platform_release_packages` (новая таблица)
- индексы: `package_key`, `build_id`, `platform_version`, `status`, `schema_revision`, `published_at`
- FK: `build_id -> platform_code_builds.id`
- optional FK: `governance_release_id -> platform_releases.id`
- optional table: `platform_release_package_modules`

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

## Итоговое архитектурное решение

1. Release Package — отдельная immutable сущность между Build и Deployment.
2. Канон содержимого — `build_id + package metadata + immutable BOM copy`.
3. `platform_version` присваивается на этапе Package.
4. Кардинальность Build→Package: модель `0..N`, operational policy MVP «обычно 0..1».
5. Lifecycle: `draft -> ready -> published -> deprecated` (+ `cancelled`).

**Вердикт:** можно переходить к следующему WI реализации `Release Package Registry` без изменения Build Registry Phase 1.
