# Перенос раздела «Версии» в «Компании»
# Устранение дублирования в Control Plane

**Дата:** 2026-06-16  
**Тип:** навигация + UI consolidation (frontend only)  
**Ограничения:** API, БД, SoT, данные — **не изменялись**

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

Раздел **Версии** перенесён из **Релизы** в **Компании** как вкладка. Содержимое (DEV, Template, клиентский флот, история) сохранено через общий компонент `PlatformVersionsContent`. Пункт меню **Релизы → Версии** удалён; **Релизы** стал плоским пунктом (проверка релизов). Legacy URL `/releases/versions` редиректит на `/companies/versions`.

---

## Задача 1. Вкладка «Версии»

**Маршрут:** `/control-plane/companies/versions`

**Вкладки Компании:**

```text
Клиенты | Лицензии | Версии
```

**Файлы:** `companiesWorkspaceConfig.js`, `CompaniesWorkspaceTabs.jsx`, `CompaniesWorkspacePage.jsx`, `CompaniesVersionsTab.jsx`

---

## Задача 2. Перенос содержимого

| Блок | Статус |
|------|--------|
| Карточка DEV | ✅ |
| Карточка Template | ✅ |
| Таблица клиентских компаний | ✅ |
| История версий | ✅ |

**Реализация:** `PlatformVersionsContent.jsx` (shared) + `CompaniesVersionsTab` с `embedded` режимом (без дублирующего H1).

---

## Задача 3. Удаление пункта меню

| Действие | Деталь |
|----------|--------|
| Удалён | `cp-releases-versions` из `CONTROL_PLANE_NAV_ITEMS` |
| Сохранён | API `/platform/version-registry/*` |
| Сохранён | `platform_environment_versions`, `platform_version_history` |
| Legacy URL | `releases/versions` → redirect `companies/versions` |

**Миграция localStorage:** `cp-releases-versions` → `cp-group-companies` в `controlPlaneNavMenuSettingsMigration.js`

---

## Задача 4. Навигационная логика

| Раздел | Ответственность |
|--------|-----------------|
| **Компании** | Клиенты, лицензии, **версии** (установленные у компаний и контуры DEV/Template) |
| **Релизы** | Проверка релизов, публикации, пакеты, согласование, откаты поставки (release workflow) |

Версии компаний больше не дублируются в двух разделах бокового меню.

---

## Задача 5. Рекомендация: карточка компании

**Вопрос:** нужна ли вкладка «Версия и обновления» в карточке компании?

**Рекомендация: да, в будущем — для CLIENT-tenant.**

| Уровень | Что показывать |
|---------|----------------|
| **Компании → Версии** | Обзор всего флота + контуры DEV/Template |
| **Карточка компании → Версия и обновления** | Версия одной компании, история, доступные обновления, отставание от эталона, действия rollout |

Не дублировать полный обзор DEV/Template в карточке — только контекст конкретной компании.

**Статус:** не реализовано (по задаче).

---

## Задача 6. UI-консистентность

- Вкладки: тот же `workspace-runtime-tabs` / `CompaniesWorkspaceTabs`
- Контент версий: существующие стили `platformVersionsPage.css` + `--embedded`
- Прокрутка: `companies-workspace__versions-tab` с `overflow-y: auto`
- Новый визуальный стиль не создавался

---

## Что увидит владелец продукта

**Почему отдельный раздел «Версии» больше не нужен:** версия — это свойство компании и её жизненного цикла, а не отдельный процесс вроде публикации релиза.

**Почему теперь внутри «Компании»:** всё про компании — список, лицензии и установленные версии — в одном месте.

**Как упрощается навигация:** не нужно выбирать между «Компании» и «Версии» в боковом меню; «Релизы» остаётся для проверки и поставки изменений.

---

## Architecture Audit

| Вопрос | Pass / Fail |
|--------|-------------|
| SoT не изменён | **Pass** |
| Дублирование логики API | **Pass** — один `PlatformVersionsContent` |
| Display vs technical | **Pass** |
| Разделение Companies / Releases | **Pass** |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Таблицы БД | не изменялись |
| Данные платформы | не изменялись |
| Изменения | frontend routes, nav, UI composition |

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

## Tests

```text
node --test controlPlaneNavMenuSettingsMigration.test.js → pass
controlPlaneNavigation.test.js → не загружается в node:test (transitive import env; pre-existing)
```

---

## Manual Smoke

**NOT PERFORMED** — рекомендуется:

1. Control Plane → Компании → вкладка **Версии**
2. Проверить DEV/Template/таблица/история
3. Убедиться, что в меню нет **Релизы → Версии**
4. Открыть `/control-plane/releases/versions` → редирект на `/companies/versions`

---

## Changed Files

- `frontend/src/modules/controlPlane/companies/companiesWorkspaceConfig.js`
- `frontend/src/modules/controlPlane/companies/CompaniesVersionsTab.jsx` (new)
- `frontend/src/modules/controlPlane/pages/CompaniesWorkspacePage.jsx`
- `frontend/src/modules/controlPlane/companies/companiesWorkspacePage.css`
- `frontend/src/modules/platformReleases/components/PlatformVersionsContent.jsx` (new)
- `frontend/src/modules/platformReleases/pages/PlatformVersionsPage.jsx`
- `frontend/src/modules/platformReleases/styles/platformVersionsPage.css`
- `frontend/src/modules/controlPlane/layout/ControlPlaneLayout.jsx`
- `frontend/src/modules/controlPlane/config/controlPlaneNavigation.js`
- `frontend/src/modules/controlPlane/config/controlPlaneNavigation.test.js`
- `frontend/src/modules/controlPlane/shell/createControlPlaneSidebarContract.js`
- `frontend/src/shared/uiStorage/controlPlaneNavMenuSettingsMigration.js`

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Вкладка Версии в Компаниях | ✅ |
| Контент перенесён | ✅ |
| Пункт меню удалён | ✅ |
| Навигация упрощена | ✅ |
| SoT не изменён | ✅ |
| Нет тестового мусора | ✅ |
| Аудиты | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**
