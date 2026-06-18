# Аудит раздела «Релизы → Версии» и логики Control Plane

**Дата:** 2026-06-15  
**Тип:** read-only аудит (без изменений кода, БД, маршрутов, меню)  
**Контекст:** Code Release Foundation Phase 1 — страница `/control-plane/releases/versions`

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

| Находка | Критичность |
|---------|-------------|
| `Not authenticated` на странице «Версии» | **Blocker** — страница не работает |
| Дублирование текущей версии с «Компании» | **Средняя** — два источника данных |
| Сброс меню Control Plane | **Средняя** — смена id/структуры пункта «Релизы» |
| История версий уникальна для страницы «Версии» | **Низкая** — продуктовая ценность есть |

**Вердикт по странице:** продуктовая идея **нужна**, текущая реализация **частично избыточна** и **сломана** (auth). Рекомендация: **Вариант В** (объединить текущие версии с «Компании», оставить отдельный экран истории/релизного контура позже) **или** **Вариант А** после исправления auth и унификации Source of Truth.

---

## Задача 1. Аудит страницы «Версии»

### Вопрос №1 — продуктовая цель

**Какую задачу решает страница (по задумке Phase 1)?**

Показать **срез установленных версий платформы по контурам** (DEV / Template / Client) и **историю установок** — не список всех tenant, а **релизный реестр**: какая версия кода где стоит, когда установлена, кем, с каким описанием.

**Какая информация должна быть:**

| Блок | Содержание |
|------|------------|
| Текущие версии | Среда, компания, версия, дата установки, статус |
| История | Дата, среда, компания, версия, автор, описание, статус |

**Чем отличается от «Компании»:**

| Аспект | Компании | Версии |
|--------|----------|--------|
| Фокус | Операционный реестр tenant | Релизный реестр по средам |
| Охват | Все компании (фильтр, создание) | Канонические контуры (DEV/Template/Client MVP) |
| История | Нет | Есть (append-only) |
| Действия | CRUD компаний, лицензии, детали | Phase 1: только просмотр |

### Вопрос №2 — дублирование с «Компании»

**Колонка «Версия» в Компаниях** читает `portals.template_version` (Tenant Registry).

**Страница «Версии»** читает `platform_environment_versions.platform_version` (Version Registry).

Это **разные поля в разных таблицах**. Сейчас seed совпадает (`1.0.0` / `1.0.0-dev`), но **синхронизация не гарантирована** — архитектурный риск dual Source of Truth.

### Сравнение: Компании VS Версии

| Функция | Компании | Версии |
|---------|----------|--------|
| Список tenant | ✅ | Частично (3 канонических) |
| Текущая версия | ✅ (`template_version`) | ✅ (`platform_version`) |
| История установок | ❌ | ✅ |
| Дата / автор установки | ❌ | ✅ |
| Среда (DEV/Template/Client) | Через badge типа | Явная колонка |
| Создание / редактирование компании | ✅ | ❌ |
| Поиск по компаниям | ✅ | ❌ |
| Работает в UI сейчас | ✅ | ❌ (`Not authenticated`) |

### Итог по задаче 1

```text
Страница НУЖНА как задел под Release Pipeline (история + срез по контурам).

Но верхняя таблица «Текущие версии» СЕЙЧАС частично избыточна
относительно «Компании» при наличии двух несвязанных источников версии.

В текущем виде страница не даёт ценности — она сломана.
```

---

## Задача 2. Аудит ошибки `Not authenticated`

### Симптом

На `/control-plane/releases/versions` отображается `Not authenticated`, при этом Platform Owner в Control Plane, остальные разделы работают.

### Цепочка вызова (frontend)

```text
PlatformVersionsPage.jsx
  → platformVersionRegistryApi.fetchPlatformVersionRegistrySummary()
  → apiClient.get("/platform/version-registry/summary")
```

Файл: `frontend/src/modules/platformReleases/api/platformVersionRegistryApi.js`

```javascript
import { apiClient } from "../../../api/apiClient";
// ...
await apiClient.get("/platform/version-registry/summary");
```

`apiClient` (`frontend/src/api/apiClient.js`) — **голый axios без interceptors**, **без `Authorization: Bearer`**.

### Сравнение с рабочим соседним API

`platformReleasesApi.js` (раздел «Проверка») использует:

```javascript
import { platformApiClient } from "../../designer/api/platformApiClient";
```

`platformApiClient` добавляет токен через `getToken()` в request interceptor.

### Цепочка (backend)

```text
GET /platform/version-registry/summary
  → require_platform_admin (control_plane/dependencies.py)
  → get_current_user (auth/dependencies.py)
  → OAuth2PasswordBearer(tokenUrl="/auth/login")
```

При **отсутствии** заголовка `Authorization` FastAPI `OAuth2PasswordBearer` возвращает:

```http
HTTP 401
{"detail": "Not authenticated"}
```

Это **стандартное сообщение FastAPI**, не кастомный текст из `get_current_user` (там — «Неверный токен», «Пользователь не найден» и т.д.).

### Точная причина

```text
platformVersionRegistryApi использует apiClient без Bearer-токена.

Backend требует авторизацию (require_platform_admin).

Запрос приходит без Authorization → OAuth2PasswordBearer → 401 "Not authenticated".

PlatformVersionsPage показывает detail из ответа как текст ошибки.
```

### Что НЕ является причиной

- Маршрут страницы — корректен (`ControlPlaneLayout.jsx` → `releases/versions`)
- Role guard Platform Owner — не достигается (падает раньше на 401)
- CORS / baseURL — запрос доходит до backend (иначе был бы Network Error)

---

## Задача 3. Аудит меню Control Plane

### Механизмы хранения настроек меню

| Механизм | Ключ / источник | Что хранит |
|----------|-----------------|------------|
| `readControlPlaneSystemMenuSettings` | `ui:platform:controlPlane:systemMenuSettings` | sort_order, block_id, icon, visibility per item id |
| `readControlPlaneSidebarCollapsed` | `ui:platform:controlPlane:sidebarCollapsed` | свёрнутость |
| `readControlPlaneLeftMenuScale` | `ui:platform:controlPlane:leftMenuScale` | масштаб |
| Дерево пунктов | `CONTROL_PLANE_NAV_ITEMS` в коде | структура, id, маршруты |

Применение: `AppSidebarRenderer.jsx` → `applySystemMenuSettingsToTree` + `organizeRootNavigationIntoBlocks`.

### Что изменилось в Phase 1

До Phase 1 (по тестам и `navigationMenuBlocks.js`): пункт **«Релизы»** с id **`cp-releases`** (плоский).

После Phase 1: группа **`cp-group-releases`** с детьми:

- `cp-releases-review` (Проверка)
- `cp-releases-versions` (Версии)

### Почему «сбрасывается» меню

```text
1. Настройки меню привязаны к item id (cp-releases, cp-overview, …).

2. После рефакторинга id cp-releases заменён на cp-group-releases + дети.

3. Старые настройки в localStorage остаются, но относятся к несуществующему cp-releases.

4. Новые пункты не наследуют block_id / sort_order / иконки пользователя.

5. CONTROL_PLANE_DEFAULT_BLOCK_BY_ID всё ещё содержит "cp-releases",
   но не "cp-group-releases" → блок по умолчанию пересчитывается иначе.

6. Перезагрузка после изменений Cursor (HMR / full reload) применяет новое дерево из кода —
   визуально это выглядит как «сброс настроек».
```

**localStorage не очищается автоматически** — сброс **логический** (orphan settings), не технический wipe.

### Точный источник

**Смена структуры и id пунктов навигации в `controlPlaneNavigation.js` без миграции пользовательских `systemMenuSettings`.**

---

## Задача 4. Соответствие архитектуре

### Принцип «не создавать сущности без продуктовой ценности»

| Проверка | Результат |
|----------|-----------|
| Отдельная страница без уникальных данных | **Fail частично** — верхняя таблица дублирует «Компании» |
| История версий | **Pass** — уникальная ценность |
| Dual SoT версии (`template_version` vs `platform_version`) | **Fail** — одна информация в двух местах, разные таблицы |

```text
Да — одна и та же информация (текущая версия) отображается в двух местах
с разными источниками данных. История — только на «Версии».
```

---

## Задача 5. Рекомендации

### Вариант А — Оставить страницу «Версии»

| | |
|--|--|
| **Плюсы** | Готовый задел под Release Pipeline; история; environment-first view |
| **Минусы** | Дублирование с «Компании»; нужен fix auth; нужна унификация SoT |
| **Риски** | Пользователи видят разные версии в двух экранах |
| **Рекомендация** | Допустим **после** fix auth + единый источник версии + убрать колонку из Companies или читать из registry |

### Вариант Б — Удалить страницу «Версии»

| | |
|--|--|
| **Плюсы** | Убирает дублирование и сломанный экран |
| **Минусы** | Теряется история в UI; нет точки входа для release ops |
| **Риски** | Откат Phase 1 UI без замены истории |
| **Рекомендация** | **Не рекомендуется** — история уникальна |

### Вариант В — Объединить с «Компании» (рекомендуемый)

| | |
|--|--|
| **Плюсы** | Один экран для tenant + версия; меньше путаницы; соответствует архитектуре SoT |
| **Минусы** | Нужен UX-дизайн вкладки «История версий» или drawer |
| **Риски** | Перегрузка экрана «Компании» |
| **Рекомендация** | **Рекомендуется для MVP**: колонка «Версия» в Компаниях ← version registry; история — вкладка или подраздел; пункт меню «Версии» убрать или сделать redirect |

**Итоговая рекомендация:** **Вариант В** (краткосрочно) + исправление auth если страница остаётся до merge; миграция menu settings `cp-releases` → `cp-group-releases`; `template_version` → read from registry или sync on write.

---

## Что увидит владелец продукта

**Что сейчас не так**

1. Раздел «Версии» **не открывается** — показывает ошибку входа, хотя вы уже в Control Plane.
2. Версия компании видна в «Компании», и задумывалась отдельная страница «Версии» — **одно и то же частично показывается дважды**, при этом данные могут разойтись.
3. После обновлений интерфейса **сбрасывается порядок и оформление левого меню** — потому что пункт «Релизы» переименовали и разбили на подпункты, а старые настройки к ним не привязались.

**Почему это произошло**

Новая страница подключена к API **без передачи токена авторизации** (техническая ошибка интеграции). Меню и версии проектировались **параллельно** с разделом «Компании», без объединения источника данных о версии.

**Что рекомендуется**

1. **Срочно** (следующий WI): починить авторизацию API «Версии» — использовать тот же клиент, что и «Проверка».
2. **Продуктово**: объединить отображение текущей версии с «Компании»; историю оставить отдельной вкладкой или убрать дублирующий пункт меню.
3. **Меню**: добавить миграцию настроек при смене id пунктов навигации.

---

## Architecture Audit

| Вопрос | Pass / Fail |
|--------|-------------|
| Source of Truth для версии единый | **Fail** — `portals.template_version` vs `platform_environment_versions` |
| Страница с отдельной ценностью | **Partial** — история да, snapshot частично дублирует |
| Auth layer согласован с Control Plane | **Fail** — `apiClient` vs `platformApiClient` |
| Menu settings migration при смене id | **Fail** |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| Данные анализировались | read-only: код frontend/backend, структура API, navigation config |
| БД изменялась | **Нет** |
| Runtime-данные изменялись | **Нет** |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Тестовые данные создавались | **Нет** |
| Тестовые данные удалялись | **Нет** |
| Остались | **0** |

---

## Cleanup Audit

```text
visible_test_records_count = 0
remaining_test_records_count = 0
Cleanup status: PASSED
```

---

## Manual Smoke

**NOT PERFORMED** — read-only аудит; причина `Not authenticated` установлена статическим анализом кода (совпадает с паттерном FastAPI OAuth2).

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Цель страницы «Версии» | ✅ |
| Дублирование с «Компании» | ✅ |
| Причина Not authenticated | ✅ |
| Причина сброса меню | ✅ |
| Варианты решений | ✅ |
| Раздел для владельца продукта | ✅ |
| Аудиты | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**

---

## Ссылки на код

| Артефакт | Путь |
|----------|------|
| Versions page | `frontend/src/modules/platformReleases/pages/PlatformVersionsPage.jsx` |
| Broken API client | `frontend/src/modules/platformReleases/api/platformVersionRegistryApi.js` |
| Working releases API | `frontend/src/modules/platformReleases/api/platformReleasesApi.js` |
| Backend router | `backend/app/modules/platform_version_registry/router.py` |
| Nav structure | `frontend/src/modules/controlPlane/config/controlPlaneNavigation.js` |
| Menu storage | `frontend/src/shared/uiStorage/controlPlaneUiStorage.js` |
| Block defaults (stale id) | `frontend/src/shared/navigation/navigationMenuBlocks.js` |
