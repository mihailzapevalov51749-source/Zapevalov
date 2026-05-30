# ADR-001. Universal Table Retirement

## Статус

Accepted

## Дата

2026-05-30

## Контекст

В проекте исторически существовали два контура данных:

1. Legacy Universal Table:
   - universal_tables
   - universal_table_rows
   - universal_views
   - UniversalTableView
   - table blocks on portal canvas

2. Target Object Platform:
   - Object Type
   - Published Catalog
   - Runtime Entity
   - ObjectViewHost
   - ObjectEntityCard
   - Runtime Entity API

Ранее Universal Table рассматривалась как источник данных, который нужно мигрировать в Runtime Entity.

После архитектурного аудита принято решение:
данные Universal Table не являются ценными и не требуют миграции.

## Решение

Universal Table признаётся legacy-модулем.

Миграция данных Universal Table в Runtime Entity **не выполняется**.

Новые бизнес-данные создаются только через:

```text
Object Type → Publish → Runtime Entity
```

Universal Table не развивается, не расширяется и не используется для новых сценариев.

## Последствия

- Phase 9.6 больше не заблокирована миграцией данных.
- Dual SoT больше не считается долгосрочным состоянием.
- Runtime Entity становится единственным целевым источником бизнес-данных.
- Universal Table подлежит изоляции, отключению и последующему удалению.
- Все новые функции должны строиться только вокруг Object Platform.

## Запрещено

- создавать новые Universal Table;
- создавать новые Universal Table blocks;
- развивать universal_views;
- добавлять новую бизнес-логику в `modules/universalTable`;
- использовать Universal Table как fallback для Object Platform.

## Разрешено временно

- сохранять legacy-код до удаления зависимостей;
- использовать временные placeholders для старых table blocks;
- оставлять совместимость только до завершения Legacy Removal.

## Целевое состояние

Runtime Entity является единственным source of truth.

Universal Table полностью удалена из frontend, backend, routes, API, blocks, notifications, comments, notes и navigation bridges.

## Связанные документы

- [YASNOPRO_ARCHITECTURE_DIRECTION.md](../YASNOPRO_ARCHITECTURE_DIRECTION.md)
- [YASNOPRO_ARCHITECTURE_STATUS.md](../YASNOPRO_ARCHITECTURE_STATUS.md)
- [YASNOPRO_ARCHITECTURE_DEBT.md](../YASNOPRO_ARCHITECTURE_DEBT.md) — AD-UT-RETIREMENT
- [YASNOPRO_MIGRATION_MAP.md](../YASNOPRO_MIGRATION_MAP.md) — Updated Migration Strategy
