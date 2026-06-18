# Release Versions Page Fix — Report

**Дата:** 2026-06-15  
**WI:** Исправление раздела «Релизы → Версии»  
**Статус:** **DONE**

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

---

## Executive Summary

Исправлены три проблемы из `RELEASE_VERSIONS_PAGE_AUDIT.md`:

1. **Not authenticated** — API переведён на `platformApiClient` с Bearer-токеном.
2. **Dual SoT** — колонка «Версия» в «Компании» читает `platform_version` из `platform_environment_versions`.
3. **Сброс меню** — миграция `cp-releases` → `cp-group-releases` в `systemMenuSettings`.

Страница «Версии» сохранена; реестр не затронут.

---

## Задача 1 — Not authenticated

**Было:** `platformVersionRegistryApi.js` → `apiClient` (без auth).

**Стало:** `platformApiClient` (как `platformReleasesApi.js`).

---

## Задача 2 — Единый Source of Truth

| Слой | Изменение |
|------|-----------|
| **Канон** | `platform_environment_versions` |
| **Tenant Registry API** | поле `platform_version` из registry |
| **Portals API** | поле `platform_version` из registry |
| **Frontend** | `resolveTenantPlatformVersion()` — display helper |
| **Legacy** | `portals.template_version` остаётся в БД, не используется для UI |

---

## Задача 3 — Миграция меню

- `controlPlaneNavMenuSettingsMigration.js` — `cp-releases` → `cp-group-releases`
- Автоприменение в `readControlPlaneSystemMenuSettings()`
- `navigationMenuBlocks.js` — default block для `cp-group-releases`

---

## Задача 4 — Проверка страницы «Версии»

| Проверка | Статус |
|----------|--------|
| Текущие версии | ✅ API с auth |
| История | ✅ API с auth |
| 401 / Not authenticated | ✅ исправлено в коде |
| Единый источник с Компаниями | ✅ |

**Manual smoke UI:** NOT PERFORMED — проверено pytest + static tests.

---

## Задача 5 — Архитектура

| Экран | Роль |
|-------|------|
| **Компании** | Операционный список tenant (CRUD, лицензии, детали) |
| **Версии** | Реестр установок по средам + **история** (релизный контур) |

Страница «Версии» **не дублирует** «Компании»: общая только текущая версия (один SoT); уникальны срез по контурам и история.

---

## Что увидит владелец продукта

**Что было не так:** раздел «Версии» не открывался; версия в двух местах могла разойтись; меню сбрасывалось после обновления.

**Что исправлено:** авторизация API; одна версия для «Компании» и «Версии»; настройки меню «Релизы» переносятся автоматически.

**Что теперь работает:** Platform Owner видит текущие версии и историю; в списке компаний та же версия, что в реестре.

---

## Architecture Audit

| Вопрос | Pass |
|--------|------|
| SoT = `platform_environment_versions` | Pass |
| Display не использует `template_version` | Pass |
| Реестр не удалён | Pass |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Tables altered | **0** |
| Rows updated | **0** |
| Schema/API changes | `platform_version` в ответах tenant registry и portals |
| Runtime data migration | нет |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Test tenants/companies created | 0 |
| Test data removed | n/a |
| Remaining leaks | 0 |

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
pytest test_tenant_registry_platform_version.py + test_platform_version_registry_phase1.py → 6 passed
node --test controlPlaneNavMenuSettingsMigration.test.js controlPlaneUiStorage.test.js → 7 passed
```

---

## DEV Journal

| Поле | Значение |
|------|----------|
| id | **972** |
| slug | `release-versions-page-fix` |

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Not authenticated исправлен | ✅ |
| Единый SoT | ✅ |
| Миграция меню | ✅ |
| Страница открывается (код) | ✅ |
| Компании + Версии — один источник | ✅ |
| Нет тестового мусора | ✅ |
| Аудиты + DEV Journal | ✅ |

**Вердикт: DONE**
