# Modularity Alignment Audit
# Аудит соответствия архитектуры ЯсноПро принципу модульности

**Дата:** 2026-06-16  
**Тип:** read-only архитектурный аудит  
**Главный вопрос:** строим модульную платформу или усиливаем монолит?

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

*(Publication Guard Rules — через `PUBLICATION_GUARD_FOUNDATION_AUDIT.md` и P1 report)*

---

## Executive Summary

### Вердикт

```text
Курс в целом СООТВЕТСТВУЕТ модульной стратегии,
но на MVP-этапе доставка КОДА — атомарная (вся платформа),
а доставка КОНФИГУРАЦИЙ — уже модульная.
```

**Мы не уходим в «большой монолит без модулей».**  
**Мы строим монорепо с логической модульностью и поэтапно добавляем registry доставки кода.**

«Один Build всей платформы» — **временный технический шаг MVP**, не отказ от модульности, при условии:
- BOM модулей внутри Build/Package;
- отдельный контур Module Publications (config);
- явная дорожная карта к Module Code Release (post-MVP).

**Рекомендация:** **Вариант В (гибрид)** — Core Platform Release + Module Config Publication сейчас; Module Code Release позже.

**Code Build Registry:** **продолжать**, определение Build **не менять**; зафиксировать в документах разделение уровней модульности.

---

## Источники (проверено)

| Документ | Статус |
|----------|--------|
| `CODE_RELEASE_PIPELINE_READINESS_AUDIT.md` | ✅ |
| `CODE_RELEASE_FOUNDATION_MVP.md` | ✅ |
| `RELEASE_PACKAGE_DESIGN_AUDIT.md` | ✅ |
| `BUILD_DEFINITION_AUDIT.md` | ✅ |
| `CODE_BUILD_REGISTRY_READINESS_AUDIT.md` | ✅ |
| `MIGRATION_ROLLBACK_FOUNDATION.md` | ✅ |
| `DEV_TEMPLATE_CLIENT_READINESS_AUDIT.md` | ✅ |
| `PUBLICATION_GUARD_FOUNDATION_AUDIT.md` | ✅ |
| `PUBLICATION_GUARD_FOUNDATION_P1_REPORT.md` | ✅ |
| `canonical-tenant-module-configuration-architecture.md` | ✅ |
| `YASNOPRO_TECHNICAL_ARCHITECTURE.md` | ✅ (цели модульности) |
| **Publication Package readiness/design** | ❌ **отдельного документа нет** |

---

## Блок 1. Что было задумано

По `docs/architecture/README.md`, `YASNOPRO_TECHNICAL_ARCHITECTURE.md`:

| Принцип | Смысл |
|---------|-------|
| **Модульность** | Новые modules/views добавляются без разрушения платформы |
| **Заменяемость** | Части можно обновлять и откатывать управляемо |
| **Изоляция изменений** | Доработка блока не ломает остальное |
| **Управляемые поставки** | Template/Client не меняются напрямую |
| **DEV — единственная разработка** | Publication / release contours |

**Важно:** изначально модульность в ЯсноПро — **логическая и продуктовая** (registry, manifests, tenant module lifecycle), а не обязательно **независимый deploy каждого `.py` файла**.

---

## Блок 2. Что фактически построено

| Решение | Модульность | Комментарий |
|---------|-------------|-------------|
| **Publication Guard P0/P1** | ✅ поддерживает | DEV-only structure/config writes; изоляция Template/Client |
| **Version Registry** | ⚪ нейтрально | SemVer per environment; не модульный deploy |
| **Migration Rollback Foundation** | ✅ поддерживает | version ↔ schema; безопасный откат платформы |
| **Module Publications** | ✅ **сильно поддерживает** | Per-`module_key` DEV→Template config snapshot |
| **Tenant module apply/offers/previews/rollback** | ✅ поддерживает | Модульные client updates **конфигурации** |
| **platform_module_manifests / versions** | ✅ поддерживает | Registry, BOM, replaceable module metadata |
| **Release Package Design (hybrid)** | ✅ поддерживает (MVP) | Platform package + internal module BOM |
| **Build Definition (full product)** | ⚪ нейтрально / MVP compromise | Атомарный code deploy; BOM сохраняет модульную семантику |
| **Code Build Registry (planning)** | ✅ поддерживает | Anchor для управляемой доставки кода |
| **Монорепо + один uvicorn/vite** | ⚠️ ограничивает | Физически один runtime — пока нет module code bundles |
| **Structure via clone/bootstrap** | ⚠️ слабее модульности | Не publication pipeline для pages/objects |

---

## Блок 3. Монолит против модульности

### Прямой ответ

```text
«Один Build всей платформы» = временный MVP-шаг доставки КОДА,
НЕ закрепление монолитной продуктовой архитектуры.
```

| Понятие | Что означает сейчас |
|---------|---------------------|
| **Build всей платформы** | Один commit → один набор артефактов (backend+frontend+schema+BOM) |
| **Монолит (плохой)** | Нет границ модулей, нет registry, любое изменение ломает всё без audit |
| **Монорепо (нейтрально)** | Один git repo ≠ один неразделимый продукт |

### Совместимость с будущей модульностью

| Механизм | Как сохраняет модульность |
|----------|---------------------------|
| `build_manifest_json.modules[]` | Фиксирует состав модулей в сборке |
| `platform_module_manifests` | Границы router/route/table per module |
| Module Publications | Независимая поставка **настроек** per module |
| Будущий Module Build | Отдельный артефакт per module **после** physical separation |

---

## Блок 4. Уровни модульности

### Уровень 1 — Кодовая сборка (platform code)

| Сейчас | Цель |
|--------|------|
| Один tree, один deploy | Registry: какой commit/build активен |
| Любая правка файла → все tenant | Controlled deploy DEV→Template→Client |
| **Статус** | MVP: атомарный platform build |

### Уровень 2 — Runtime modules (calendar, chat, …)

| Сейчас | Цель |
|--------|------|
| Папки в `backend/app/modules/`, manifests в БД | BOM в Build; optional enable/disable per tenant |
| Код не отделён как JAR/npm package | Post-MVP: module artifacts |
| **Статус** | **Логическая модульность есть**; deploy — в составе platform |

### Уровень 3 — Конфигурации модулей

| Сейчас | Цель |
|--------|------|
| `tenant_module_configurations`, publications, diffs, applies | ✅ **Уже модульная поставка** per `module_key` |
| Tenant Configuration Layer неполный | Расширение settings_schema |
| **Статус** | **Наиболее зрелый модульный контур** |

### Уровень 4 — Клиентские обновления

| Сейчас | Цель |
|--------|------|
| `tenant_module_update_offers`, previews, apply, rollback | Per-tenant, per-module config rollout |
| `tenant_update_offers` (platform governance) | Platform version offers |
| Code deploy per client | Будущий `code_deployments` |
| **Статус** | Config — модульно; code — пока нет |

---

## Блок 5. Module Publications

### Это модульная поставка?

**Да — для уровня 3 (конфигурация), не для уровня 1 (код).**

| Вопрос | Ответ |
|--------|-------|
| Что обновляет? | Snapshot конфигурации модуля (`snapshot_payload` JSONB) DEV→Template |
| Код или конфиг? | **Конфигурация** (settings, permissions, templates blocks в diff) |
| Основа будущей модульности? | **Да** — паттерн per-`module_key` publication, review, apply, offers |

**Вывод:** Module Publications — **уже реализованная модульная архитектура поставки настроек**. Code Release её не заменяет.

---

## Блок 6. Release Package Design

### MVP vs целевая архитектура

| | MVP | Целевая |
|--|-----|---------|
| Deploy unit | Один Release Package (platform) | Platform + optional Module Packages |
| Module granularity | BOM внутри package | + независимые module code releases |
| Соответствие модульности | **Допустимо** | **Гибрид В** |

**Вердикт:** Release Package = backend+frontend+schema+BOM — **правильный MVP**, **не противоречит** модульной стратегии при hybrid model (`RELEASE_PACKAGE_DESIGN_AUDIT` вариант В).

---

## Блок 7. Целевая архитектура — варианты

### А. Единый платформенный релиз

| | |
|--|--|
| Плюсы | Простота, совместимость API/UI |
| Минусы | Любая мелочь → полный релиз |
| Риски | Ощущение монолита |
| ЯсноПро | **MVP да**, долгосрочно недостаточно |

### Б. Модульные релизы (только calendar, chat, …)

| | |
|--|--|
| Плюсы | Точечные обновления |
| Минусы | Нет physical module bundles, shared schema, API matrix |
| Риски | Преждевременная сложность |
| ЯсноПро | **Сейчас низкое соответствие** |

### В. Гибрид ✅

```text
Core Platform Release (code + schema)
+
Module Config Publication (per module_key) — УЖЕ ЕСТЬ
+
Module Code Release (per module_key) — ПОЗЖЕ
```

| | |
|--|--|
| Плюсы | Соответствует факту; путь эволюции без ломки |
| Минусы | Два/три контура в голове и UI |
| Риски | Путаница терминов — mitigated docs |
| ЯсноПро | **Рекомендуется** |

---

## Блок 8. Рекомендация

### Куда должна идти ЯсноПро

```text
Модульная платформа с гибридной доставкой:
  • код платформы — атомарный релиз на MVP
  • конфигурации модулей — модульная поставка (уже работает)
  • код отдельных модулей — этап 2+ после registry и physical artifacts
```

| Вопрос | Ответ |
|--------|-------|
| Продолжать Code Build Registry? | **Да** |
| Менять определение Build? | **Нет** (BUILD_DEFINITION_AUDIT) |
| Module Build позже? | **Да**, после platform registry + optional artifact split |
| Core vs Module Release? | **Да, разделить в терминологии и UI** |
| Как не закопаться в монолит? | BOM, отдельные контуры, не смешивать code/config/structure |

---

## Блок 9. Что сделано правильно

1. **Разделение контуров:** Publication Guard (data) ≠ Module Publications (config) ≠ Code Release (design).
2. **Per-module registry:** `platform_modules`, manifests, versions, publications.
3. **Tenant module lifecycle:** offers → preview → diff → apply → rollback.
4. **DEV-only write policy** для structure и config.
5. **Hybrid Release Package** с BOM — сохраняет модульную семантику внутри platform build.
6. **Version registry** per environment — основа controlled rollout.
7. **Schema catalog** — привязка version к миграциям.
8. **Technical keys** (`module_key`, `build_key`) — не display names как id.

---

## Блок 10. Что сделано неправильно / риски

1. **Мгновенное влияние кода на все tenant** — до работающего deploy registry (факт монорепо).
2. **Путаница «релиз»:** `platform_releases` vs будущий code/release package.
3. **Structure publication ~15%** — clone вместо модульной поставки структуры (`DEV_TEMPLATE_CLIENT_READINESS_AUDIT`).
4. **Tenant Configuration Layer неполный** — много hardcoded в runtime modules.
5. **Риск восприятия:** «полный Build» = «мы отказались от модулей» — **документационный gap**.
6. **Нет отдельного Publication Package design doc** — терминология размыта.

---

## Блок 11. Корректировки

### В документах

- Добавить `MODULARITY_DELIVERY_MODEL.md` (или секцию в architecture README): 4 уровня модульности.
- Явно: **MVP platform build ≠ отказ от module releases**.
- Control Plane: три вкладки — Code Release | Module Config | Platform Governance.
- Отметить отсутствие Publication Package doc; не смешать с Module Publications.

### В будущей реализации

- `code_builds.build_manifest_json` — обязательный module BOM.
- Release Package → `release_package_modules` (зеркало `platform_release_modules`).
- Не встраивать tenant snapshots в Build.
- Post-MVP WI: Module Code Artifact + Module Build (отдельный от platform build).

### В терминологии

| Термин | Значение |
|--------|----------|
| **Platform Build** | Вся платформа из commit |
| **Module Publication** | Config DEV→Template |
| **Module Apply** | Config Template→Client |
| **Platform Release (governance)** | Changelog/offers, не code |
| **Release Package** | Blessed deployable code unit |

### В архитектурных правилах

- Запрет смешивать `platform_releases` с `code_builds`.
- Запрет хранить tenant data в Build Registry.
- Обязательный BOM модулей в platform build/release package.

---

## Что увидит владелец продукта

**Идём ли туда, куда хотели?**  
В целом **да**. Модули как части продукта уже есть: календарь, чаты и другие блоки можно настраивать и поставлять клиентам **по отдельности** на уровне настроек. Мы закрываем дыру: **код сейчас меняется сразу везде** — для этого строим учёт сборок и поставок.

**Риск монолита**  
Не в том, что модули исчезли, а в том, что **пока любое изменение кода требует обновления всей платформы**. Это первый этап, не финал.

**Почему полный Build допустим сейчас**  
У нас один общий «движок» программы. Честнее сначала научиться фиксировать и ставить **целые проверенные сборки**, чем делать вид, что модули обновляются по отдельности, когда технически это ещё невозможно.

**Что позже для модульности**  
Сохранить отдельные поставки настроек модулей; внутри каждой сборки платформы вести список модулей; со временем — отдельные обновления кода модулей, когда они станут самостоятельными пакетами.

---

## Architecture Audit

| Вопрос | Ответ |
|--------|-------|
| Дублирование сущностей | Риск при слиянии code + governance + config |
| Лишние таблицы | Низкий при `code_*` + существующие module tables |
| Переиспользовать | Manifests, publications, apply/rollback, guards |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| БД | не изменялась |
| Данные | не изменялись |

---

## Test Data Audit

Создано / удалено / осталось: **0 / 0 / 0**

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
|----------|--------|
| Документы проверены | ✅ |
| Соответствие модульности определено | ✅ |
| Уровни разделены | ✅ |
| Целевая архитектура | ✅ (гибрид В) |
| Code Build Registry | ✅ продолжать |
| Правильно / неправильно | ✅ |
| Корректировки | ✅ |
| Владелец продукта | ✅ |
| Код/БД | ✅ не менялись |
| DEV Journal | ✅ |

**Вердикт: DONE**
