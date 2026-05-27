# YASNOPRO_APPSHELL_DESIGNER_PARITY_VALIDATION

## 1. Purpose

Зафиксировать DEV-only проверку parity между legacy Designer shell и AppShell shadow на route `/dev/appshell-shadow-designer`.

## 2. Scope

In scope:

- diagnostics/parity checklist для designer mode;
- статусы check-пунктов (`pass | warn | fail | not_applicable`);
- итоговый `designerParityStatus` (`pass | partial | fail`);
- фиксация mismatch без production replacement.

Out of scope:

- замена `DesignerHeader` / `DesignerSidebar`;
- вмешательство в Designer navigation;
- action execution / API calls.

## 3. Designer parity checklist

Проверяются:

1. `sourceMode` valid
2. `mode === designer`
3. `sidebar sections/items exist`
4. `active item exists`
5. `header title exists`
6. `modeActions include switch/runtime action`
7. `capabilities exist`
8. `geometry offsets filled`
9. `collapsed value boolean`
10. `missingFields empty or explained`

## 4. Validation statuses

- `pass` — parity check выполнен;
- `warn` — check частично валиден или требует уточнения;
- `fail` — check не выполнен;
- `not_applicable` — недостаточно данных для корректной оценки.

Итог:

- `designerParityStatus = pass` — нет fail/warn;
- `designerParityStatus = partial` — fail нет, но есть warn;
- `designerParityStatus = fail` — есть хотя бы один fail.

## 5. Current result

Текущий статус вычисляется динамически в `AppShellShadowProvider` и отображается в `AppShellShadowDiagnostics`.

Diagnostics-поля:

- `designerParityStatus`
- `designerFailedChecks[]`
- `designerWarningChecks[]`
- `designerPassedChecks[]`
- `designerParityChecks[]`

Readiness правило:

- `sourceMode === bridge` — основной критерий доказательности;
- `mock` режим полезен для визуальной отладки, но **не считается production readiness evidence**.

## 6. Known mismatches

Ожидаемые риски:

- `sourceMode` может быть `mock`/`unavailable` при отсутствии полноценного bridge snapshot;
- `active item` может рассинхронизироваться при изменении designer menu contract;
- `missingFields` может появиться после расширения snapshot schema.

## 7. Required fixes before production replacement

1. Подтвердить designer parity на bridge/live данных (не в mock-only режиме).
2. Свести `warn/fail` к нулю для runtime + designer parity.
3. Завершить cross-mode readiness review.

## 8. Definition of Done

- [x] Создан route `/dev/appshell-shadow-designer`.
- [x] Добавлен Designer parity checklist panel.
- [x] Реализованы `designerParityStatus` и arrays с результатами checks.
- [x] Добавлен Designer Shadow Bridge (DEV-only read-only source).
- [x] Обновлены архитектурные документы Phase 6.14.
