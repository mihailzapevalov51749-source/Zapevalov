# Инвентаризация сценария DEV → Панель управления → Эталон → Компании

**Дата:** 2026-06-16  
**Тип:** read-only инвентаризация по фактическому коду

---

## Главный вывод

Целевой сценарий **частично реализован через старый контур** `platform_releases` с UI в Студии и Панели управления. **Новый канонический контур** (Build → Release Package → Deployment → Version Registry) **реализован только в backend API**, **без frontend**. Параллельно существует **module-config pipeline** (publications / offers / applies), не покрывающий code release.

**Полный сценарий через один интерфейс сейчас невозможен** без интеграции нового API в существующие экраны или замены backend-привязок.

---

## Старый контур (факт)

| Блок | Таблицы | API prefix | Service | UI |
|---|---|---|---|---|
| Platform Release | `platform_releases`, `release_changes`, `tenant_update_offers`, `tenant_versions`, `platform_release_modules` | `/platform/releases` | `platform_release/service.py` | Studio + CP Review |
| Module Publication | `platform_module_publications` | `/platform/module-publications` | `platform_module_publications/service.py` | CP (скрытый route) |
| Module Update Offers | `tenant_module_update_offers` | `/platform/module-update-offers`, `/tenants/{id}/module-update-offers` | `tenant_module_update_offers/service.py` | CP вкладка |
| Module Config Apply | `tenant_module_configuration_applies`, rollbacks, diffs | applies/rollbacks/diffs routers | respective services | CP (скрытые routes) |

## Новый контур (факт)

| Блок | Таблицы | API prefix | Service | UI |
|---|---|---|---|---|
| Build | `platform_code_builds` | `/platform/builds` | `platform_build_registry/service.py` | **отсутствует** |
| Release Package | `platform_release_packages` | `/platform/release-packages` | `platform_release_package_registry/service.py` | **отсутствует** |
| Deployment | `platform_deployments` | `/platform/deployments` | `platform_deployment_registry/service.py` | **отсутствует** |
| Version Registry | `platform_environment_versions`, `platform_version_history` | `/platform/version-registry` (read) | `platform_version_registry/service.py` | CP Компании → Версии (read) |

---

## Экран «Релизы платформы»

- **Файл:** `frontend/src/modules/platformReleases/pages/PlatformReleasesPage.jsx`
- **Маршрут:** `/designer/tenant/{id}/platform-releases` (Студия DEV)
- **API:** `platformReleasesApi.js` → `/platform/releases`
- **Контур:** **старый** (`platform_releases`)
- **Действия:** create, update, submit-for-review, list modules
- **Не использует:** `platform_release_packages`, builds, deployments

## Экран «Релизы» в Панели управления

- **Файл:** `PlatformReleaseReviewPage.jsx`
- **Маршрут:** `/control-plane/releases`
- **API:** review-queue, start-review, approve, publish-to-template, offer-to-tenants
- **Контур:** **старый**

---

## Guards (Publication)

- `tenant_write_policy.py`: DEV-only structure/config writes; publish source=DEV target=TEMPLATE; apply target=CLIENT
- `guard_direct_structure_write` в designer services
- `apply_tenant_update` (legacy): обновляет только `tenant_versions` + `portal.template_version`, **не копирует конфигурацию**
- `publish_release_to_template` (legacy): metadata version на эталоне, **не deployment registry**
- Scripts: bypass через `bypass_write_policy` flags

---

## Дублирование

1. Два типа offers: `tenant_update_offers` (platform release) vs `tenant_module_update_offers` (module)
2. Три пути «публикации»: platform_releases, module_publications, release_packages (новый)
3. Два реестра версий: `tenant_versions` (legacy apply) vs `platform_environment_versions` (deployment success)

---

## Рекомендация по экранам

Переиспользовать **UX-паттерн** `PlatformReleasesPage` + `PlatformReleaseReviewPage`, но **заменить API-слой** на новый контур или ввести orchestration bridge. Отдельный раздел «Пакеты обновлений» **не обязателен**, если адаптировать существующие экраны.

**Новые экраны минимально нужны для:** Сборки (Studio), Установки в Эталон (CP) — если не встроить в существующие.

---

## Data Impact / Test Data / Cleanup

Изменений данных нет. Тестовые записи не создавались.
