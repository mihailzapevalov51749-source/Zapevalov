# Platform Versions Page A+ — отчёт о реализации

**Дата:** 2026-06-16  
**Тип:** UI-приведение к канонической модели A+  
**Основание:** `docs/audit/PLATFORM_VERSIONS_PAGE_CONCEPT_AUDIT.md`  
**Ограничения соблюдены:** SoT, API, БД, `platform_environment_versions`, `platform_version_history` — **не изменялись**

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

Страница **Control Plane → Релизы → Версии** переведена на модель **A+**:

1. **Контуры платформы** — две карточки: DEV и Template (без клиентской компании наравне с ними).
2. **Клиентские компании** — отдельная таблица флота Client.
3. **История версий** — сохранена, расширена колонкой «Событие» (установка / обновление / откат).
4. **Rollout-ready** — зарезервированы колонки в `PlatformClientVersionsTable` (`CLIENT_ROLLOUT_RESERVED_COLUMNS`, флаг `CLIENT_ROLLOUT_COLUMNS_ENABLED`).

Изменения **только во frontend** (view-model поверх существующего API `/platform/version-registry/summary`).

---

## Задача 1. Верхняя часть — контуры DEV и Template

| Было | Стало |
|------|-------|
| 3 карточки: DEV, Template, Розетка | 2 карточки: DEV, Template |
| Название компании на карточке | Только название среды |
| — | Версия, статус, дата, автор установки |

**Файлы:** `PlatformVersionsPage.jsx`, `PlatformEnvironmentVersionCard.jsx`, `platformVersionsPage.css`

---

## Задача 2. Блок «Клиентские компании»

Новый компонент `PlatformClientVersionsTable.jsx`:

| Колонка | Источник |
|---------|----------|
| Компания | `tenant_name` / `tenant_code` |
| Версия | `platform_version` |
| Дата установки | `installed_at` |
| Статус | `status` |

Данные: все строки `current_versions` с `environment_key=CLIENT`, сортировка по названию.

---

## Задача 3. Готовность к Rollout

```javascript
// PlatformClientVersionsTable.jsx
export const CLIENT_ROLLOUT_COLUMNS_ENABLED = false;
export const CLIENT_ROLLOUT_RESERVED_COLUMNS = [
  { key: "update_available", label: "Доступно обновление" },
  { key: "behind_template", label: "Отстаёт от эталона" },
  { key: "template_version", label: "Версия эталона" },
  { key: "last_updated_at", label: "Дата обновления" },
];
```

Включение: `CLIENT_ROLLOUT_COLUMNS_ENABLED = true` после появления данных в API. `templateVersion` уже передаётся из partition view-model.

---

## Задача 4. История версий

- Раздел сохранён.
- Добавлена колонка **Событие** (`resolveVersionHistoryEventType.js`): Установка / Обновление / Откат.
- Подсказка секции: журнал установок, обновлений и откатов.
- Таблица готова к росту записей (scroll, sticky header).

---

## Задача 5. Разделение ответственности

| Компании | Версии |
|----------|--------|
| Создание, карточки, типы, статусы, лицензии, настройки | DEV / Template контуры |
| Колонка «Версия» (read-only) | Client Rollout (таблица) |
| — | История установок / обновлений / откатов |

Подтверждено: страница «Версии» больше не дублирует операционный реестр компаний.

---

## Задача 6. UI-аудит

| Критерий | Результат |
|----------|-----------|
| Светлый Control Plane стиль | ✅ существующие токены `#0f172a`, `#64748b`, `#e2e8f0` |
| Карточки | ✅ переиспользован `PlatformEnvironmentVersionCard` |
| Таблицы | ✅ паттерн как у history-panel / Companies list |
| TenantEnvironmentBadge | ✅ на карточках контуров |
| PlatformVersionStatusBadge | ✅ без изменений |
| Новый визуальный стиль | ❌ не создавался |

---

## Что увидит владелец продукта

**Что было неправильно:** Розетка стояла в одном ряду с DEV и Template — как будто это третий этап выпуска, а не клиентская компания.

**Что изменилось:** Сверху — только два этапа контура (разработка и эталон). Ниже — отдельный список клиентов с их версиями. История показывает, что происходило: установка, обновление или откат.

**Почему теперь масштабируется:** при появлении СДС, Газпрома и других клиентов они добавляются строками в таблицу, а не новыми «карточками сред». Контур DEV/Template остаётся неизменным.

---

## Architecture Audit

| Вопрос | Pass / Fail |
|--------|-------------|
| Source of Truth сохранён | **Pass** — `platform_environment_versions` |
| API не дублирован | **Pass** |
| Display vs technical key | **Pass** — partition по `environment_key` |
| View-model отделён от storage | **Pass** — `partitionVersionRegistryRows.js` |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Таблицы БД | **не изменялись** |
| Данные платформы | **не изменялись** |
| Изменён только frontend view | **да** |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Созданные тестовые данные | **0** |
| Удалённые | **0** |
| Оставшиеся | **0** |

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
node --test src/modules/platformReleases/utils/partitionVersionRegistryRows.test.js
→ 2 passed
```

---

## Manual Smoke

**NOT PERFORMED** — UI smoke в браузере не выполнялся в этой сессии. Рекомендуется: открыть `/control-plane/releases/versions`, проверить 2 карточки + таблица Розетка + история.

---

## Changed Files

- `frontend/src/modules/platformReleases/pages/PlatformVersionsPage.jsx`
- `frontend/src/modules/platformReleases/components/PlatformEnvironmentVersionCard.jsx`
- `frontend/src/modules/platformReleases/components/PlatformClientVersionsTable.jsx` (new)
- `frontend/src/modules/platformReleases/utils/partitionVersionRegistryRows.js` (new)
- `frontend/src/modules/platformReleases/utils/partitionVersionRegistryRows.test.js` (new)
- `frontend/src/modules/platformReleases/utils/resolveVersionHistoryEventType.js` (new)
- `frontend/src/modules/platformReleases/styles/platformVersionsPage.css`

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| DEV — отдельная карточка | ✅ |
| Template — отдельная карточка | ✅ |
| Client — блок компаний | ✅ |
| История сохранена | ✅ |
| SoT не изменён | ✅ |
| Rollout-ready | ✅ |
| Нет тестового мусора | ✅ |
| Аудиты | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**
