# YASNOPRO_APPSHELL_RUNTIME_PARITY_VALIDATION

## 1. Purpose

Зафиксировать DEV-only проверку parity между legacy Runtime shell и AppShell shadow на route `/dev/appshell-shadow-runtime`.

## 2. Scope

In scope:

- diagnostics/parity checklist;
- статусы check-пунктов (`pass | warn | fail | not_applicable`);
- итоговый `parityStatus` (`pass | partial | fail`);
- фиксация mismatch без production wiring.

Out of scope:

- замена production shell;
- action/routing execution;
- runtime state ownership transfer.

## 3. Runtime parity checklist

Проверяются:

1. `sourceMode === bridge`
2. `snapshot freshness !== expired`
3. `activePageId` совпадает с `page.id`
4. `activeItemId` найден в `navigation`
5. `sidebar item count > 0`
6. `headerTitle` совпадает с `page.title/name`
7. `collapsed` совпадает с legacy collapsed value
8. `search.enabled` отражает runtime availability
9. `notifications.enabled` отражает availability
10. `notifications.unreadCount` является number
11. `geometry offsets` заполнены
12. `missingFields` пустой или явно объяснён

## 4. Validation statuses

- `pass` — проверка соответствует parity ожиданию;
- `warn` — проверка частично валидна или требует уточнения источника;
- `fail` — обнаружен mismatch;
- `not_applicable` — нет достаточных данных для корректной оценки.

Итог:

- `parityStatus = pass` — нет fail/warn;
- `parityStatus = partial` — fail нет, но есть warn;
- `parityStatus = fail` — есть хотя бы один fail.

## 5. Current result

Текущий результат вычисляется динамически в `AppShellShadowProvider` на основе live diagnostics.

Новые diagnostics-поля:

- `parityStatus`
- `failedChecks[]`
- `warningChecks[]`
- `passedChecks[]`
- `parityChecks[]` (детали каждого пункта)

## 6. Known mismatches

Типичные ожидаемые mismatch/risks:

- `sourceMode` не `bridge` (если выбран mock или bridge snapshot неполный);
- `activeItemId` отсутствует в navigation при несогласованном snapshot;
- `missingFields` не пустой при неполном bridge emit;
- `snapshot freshness` может уйти в `expired` при отсутствии новых эмиссий.

## 7. Required fixes before production replacement

1. Закрыть все `fail` и минимизировать `warn` в runtime parity checklist.
2. Провести аналогичный designer parity cycle.
3. Подтвердить rollback drill.
4. Закрыть AD-SHELL-001.
5. Повторить readiness review после parity validation.

## 8. Definition of Done

- [x] Parity checklist panel добавлен в dev diagnostics UI.
- [x] Статусы checks (`pass/warn/fail/not_applicable`) реализованы.
- [x] Итоговый `parityStatus` реализован.
- [x] Diagnostics включают failed/warning/passed arrays.
- [x] Обновлены архитектурные документы Phase 6.13.
