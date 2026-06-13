# Platform Event Journal — DEV logging (Cursor / agents)

## Источник истины для UI

Страница **Designer → Журнал событий** (DEV tenant) читает только таблицу
`platform_event_journal_entries` через API
`GET /designer/tenants/{tenantId}/event-journal/entries`.

Файл `backend/app/modules/platform_event_journal/seed.py` — **bootstrap-каталог**,
не runtime-журнал. Запись только в `seed.py` **не гарантирует** появление в UI.

## Канонический механизм для разработки продукта

Для аудитов, архитектурных решений, исправлений, рефакторингов и новых функций
**Cursor обязан** создавать запись в БД:

```python
from app.db.session import SessionLocal
from app.modules.platform_event_journal.cursor_dev_journal import record_cursor_dev_event

db = SessionLocal()
try:
    record_cursor_dev_event(
        db,
        slug="unique-task-slug",
        title="Краткое название",
        description="Подробное описание выполненной работы.",
        event_type="fix",  # audit | architecture | development | fix | ux_improvement
    )
finally:
    db.close()
```

Эквивалент (низкий уровень):

```python
from app.modules.platform_event_journal.audit_service import record_dev_development_event

record_dev_development_event(db, ..., author="Cursor", commit=True)
```

## Куда попадает запись

| Writer | journal_kind | scope | UI |
|--------|--------------|-------|-----|
| `record_cursor_dev_event` / `record_dev_development_event` | `dev_development` | `tenant` | Designer → Журнал событий (DEV) |
| `record_platform_event` | `platform_audit` | `platform` | Control Plane → Журнал событий |
| `record_seed_journal_entry` (bootstrap) | по `classify_seed_slug` | varies | после `ensure_platform_event_journal_bootstrap()` |

**Не смешивать:** DEV journal не должен попадать в Control Plane audit.

## seed.py и bootstrap

- `ensure_platform_event_journal_bootstrap(db)` — idempotent insert недостающих seed slug.
- Вызывается вручную или при миграции/инициализации; **не** при каждом HTTP-запросе.
- После изменения `seed.py` для появления записей в БД нужен bootstrap + `commit`.

## Запрещено считать задачу завершённой

- Только правка `seed.py` без записи в БД.
- `POST /platform-event-journal/entries` для DEV-истории (legacy alias, легко перепутать с CP).

## CLI

```bash
cd backend
python scripts/record_platform_event_journal_entry.py --title "..." --slug "..." --event-type fix
```

Скрипт использует legacy writer → DEV journal (как `record_dev_development_event`).
