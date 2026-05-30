# YASNOPRO Development Lifecycle

## Назначение

Исключить ситуацию, когда код завершён и тесты пройдены, но документация и дашборд показывают старый статус.

**Этап не может получить статус `Completed` без Phase 5 — Documentation & Status Synchronization.**

Применяется по умолчанию ко всем этапам: Runtime, Designer, Platform, Notifications, Entity Cards, Dashboard, Object Model, Publication.

---

## Phase 1 — Analysis

- Анализ задачи
- Анализ архитектуры
- Определение границ изменений

---

## Phase 2 — Design

- Проектирование решения
- Проверка соответствия архитектуре

---

## Phase 3 — Implementation

- Изменение кода
- Рефакторинг
- Миграции

---

## Phase 4 — Verification

- Unit Tests
- Integration Tests (если применимо)
- Manual Verification

---

## Phase 5 — Documentation & Status Synchronization

**Обязательный этап.**

### 1. Architecture Documents

Проверить и обновить при необходимости:

- `YASNOPRO_ARCHITECTURE_STATUS.md`
- `YASNOPRO_ARCHITECTURE_DEBT.md`
- `YASNOPRO_ARCHITECTURE_DIRECTION.md`
- `YASNOPRO_RUNTIME_FOUNDATION_PLAN.md` (и `runtime/YASNOPRO_RUNTIME_FOUNDATION_PLAN.md`)

### 2. Migration Documents

- `YASNOPRO_MIGRATION_MAP.md`
- `YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md`
- `YASNOPRO_PHASE*_*.md` (если этап затрагивает legacy / runtime / designer)

### 3. Dashboard Sources

Обновить все документы и источники, из которых читается Platform Dashboard:

- статус
- прогресс
- дата обновления
- Completion Summary

Источники анализатора: `backend/app/modules/platform_dashboard_analyzer/` — `doc_reader.py`, `stage_works.py`.

### 4. Completion Summary

Добавить итог этапа в dedicated phase doc или в STATUS:

```markdown
## Completion Summary

Статус: Completed

Ключевые работы:

- ...
- ...

Результат:

- ...
- ...

Тесты:

- Passed
```

### 5. Status Update

Изменить статус этапа с `In Progress` на `Completed` (после синхронизации документов).

---

## Статусы этапа

| Статус | Значение |
|--------|----------|
| `IN PROGRESS` | Работа ведётся |
| `TECHNICALLY COMPLETE` | Код готов, тесты пройдены, документация ещё не синхронизирована |
| `DOCUMENTATION UPDATED` | Документы и dashboard sources обновлены, финальная проверка |
| `COMPLETED` | Phase 5 выполнена, этап закрыт |

### Переходы

```text
IN PROGRESS
    ↓
TECHNICALLY COMPLETE
    ↓
DOCUMENTATION UPDATED
    ↓
COMPLETED
```

---

## Definition Of Done

Этап считается завершённым только если выполнены **все** пункты:

```text
[ ] Код реализован
[ ] Архитектурная проверка пройдена
[ ] Unit Tests пройдены
[ ] Integration Tests пройдены (если применимо)
[ ] Ручная проверка выполнена
[ ] Документация обновлена
[ ] Dashboard Sources обновлены
[ ] Completion Summary добавлен
[ ] Статус этапа обновлён
```

---

## Связанные документы

- [YASNOPRO_ARCHITECTURE_STATUS.md](./YASNOPRO_ARCHITECTURE_STATUS.md)
- [YASNOPRO_MIGRATION_MAP.md](./YASNOPRO_MIGRATION_MAP.md)
- [YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md](./YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md)

---

## Versioning

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Введён обязательный Phase 5 и статус TECHNICALLY COMPLETE |
