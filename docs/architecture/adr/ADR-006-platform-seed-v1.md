# ADR-006. Platform Seed v1.0

## Статус

Accepted

## Дата

2026-06-09

## Slug

`adr-006-platform-seed-v1`

## Контекст

При создании новых tenant в ЯсноПро использовался `clone_tenant_structure` из **portal 1**.

Аудит показал:

- portal 1 содержит пользовательские object types, workspaces, страницы и контент;
- в БД нет надёжного разделения platform vs user для всех сущностей;
- clone копирует **все** структурные записи source tenant без фильтра;
- portal 1 непригоден как эталон для новых компаний.

Нужна отдельная архитектурная концепция минимального состава новой компании, независимая от dev/demo tenant.

## Решение

Принять спецификацию **Platform Seed v1.0** как нормативный минимальный набор платформенных инструментов для каждой новой компании.

Нормативный документ:

- [YASNOPRO_PLATFORM_SEED_v1.md](../YASNOPRO_PLATFORM_SEED_v1.md)
- slug: `platform-seed-v1`

### Ключевые положения

1. **Platform Seed** — только платформенные инструменты (Office + Studio), без user/custom структуры.
2. **Отраслевые шаблоны** (HR, CRM, PM и др.) накладываются **поверх** Seed, не заменяя его.
3. **portal 1** не является source of truth для bootstrap новых компаний.
4. Реализация bootstrap (`platform-bootstrap`, `template-tenant`) — отдельные последующие этапы; **clone service на данном ADR не меняется**.

## Последствия

### Положительные

- Чёткая граница platform / template / user content.
- Основа для Template System и Company Provisioning.
- Снижение риска «грязного» tenant при создании компании.

### Отрицательные / ограничения

- Текущий auto-clone из portal 1 остаётся до реализации Platform Bootstrap.
- Требуются будущие документы: Template Tenant, Platform Bootstrap.

## Связанные документы

| Документ | Slug |
|----------|------|
| Platform Seed v1.0 | `platform-seed-v1` |
| Scope Tenant Model | `yasnopro-scope-tenant-model` |
| Platform Baseline v1 | `yasnopro-platform-baseline-v1` |
| Template System (planned) | `template-system` |
| Template Tenant (planned) | `template-tenant` |
| Company Provisioning (planned) | `company-provisioning` |
| Platform Bootstrap (planned) | `platform-bootstrap` |

## Compliance

Любая реализация создания новой компании должна соответствовать [YASNOPRO_PLATFORM_SEED_v1.md](../YASNOPRO_PLATFORM_SEED_v1.md) после внедрения Platform Bootstrap.

До внедрения bootstrap действующий clone-from-portal-1 считается **legacy** и **не соответствует** Platform Seed v1.0.
