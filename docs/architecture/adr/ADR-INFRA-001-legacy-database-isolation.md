# ADR-INFRA-001. Legacy Database Isolation

## Статус

**Accepted** — нормативное инфраструктурное решение платформы ЯсноПро

## Дата

2026-06-21

## Slug

`adr-infra-001-legacy-database-isolation`

## Связанные материалы

- WI-INFRA-DB-AUDIT-001 — Portal Constructor Legacy Database Audit
- WI-INFRA-CONFIG-001 — Remove Legacy portal_constructor_v2 References
- `scripts/dev-stack/manifest.yaml` — Source of Truth для назначения рабочих БД
- `backend/app/core/environment_guard.py` — блокировка legacy для DEV/TEMPLATE/CLIENT
- ADR-SEC-001 — Security & Isolation Model

---

## 1. Контекст

До разделения сред платформа использовала одну монолитную PostgreSQL-базу:

```text
portal_constructor_v2
```

После внедрения изолированных контуров рабочие backend-процессы используют:

| Контур | База |
|--------|------|
| DEV | `yasnopro_dev` |
| TEMPLATE | `yasnopro_template` |
| CLIENT | `yasnopro_client` |

База `portal_constructor_v2` **сохранена** как legacy snapshot (rollback reserve, migration scripts), но **не участвует** в runtime DEV/TEMPLATE/CLIENT.

Риск: файл `platform/.env` содержал `DATABASE_URL=.../portal_constructor_v2`, что могло привести к случайному запуску backend против legacy БД.

---

## 2. Решение

### 2.1. Legacy database

```text
portal_constructor_v2 = legacy database
```

- **Не использовать** для DEV, TEMPLATE, CLIENT.
- **Не удалять** без отдельного WI (archive/retirement roadmap).
- Допустимые ссылки: migration/backfill scripts, audit artifacts, tests, documentation.

### 2.2. Source of Truth для рабочих БД

Единственный источник назначения БД для рабочих контуров:

```text
scripts/dev-stack/manifest.yaml
    ↓
dev_stack.py (_database_url)
    ↓
process DATABASE_URL + APP_ENV
    ↓
backend (Environment Guard)
```

Файл `platform/.env` **не содержит** `DATABASE_URL`.

### 2.3. Environment Guard

При `APP_ENV ∈ {DEV, TEMPLATE, CLIENT}` и `DATABASE_URL` → `portal_constructor_v2`:

- `run_environment_guard()` → **EnvironmentGuardError**, процесс не стартует.
- `session.py` → дополнительная fail-fast проверка при импорте.

### 2.4. docker-compose.yml

Помечен как **LEGACY REFERENCE ONLY**. Production PostgreSQL: `yasnopro_pg_prod`, data root `E:\YasnoPro\data\postgres`.

---

## 3. Последствия

### Положительные

- Исключён случайный запуск рабочих контуров на legacy БД через stale `.env`.
- Явное разделение legacy vs working databases в коде и документации.

### Отрицательные / ограничения

- Ручной `uvicorn` без dev-stack требует явного `DATABASE_URL` и `APP_ENV` в process env.
- Legacy scripts с `SOURCE_DB = portal_constructor_v2` остаются — только для миграционных WI.

---

## 4. Критерии соблюдения

| Проверка | Ожидание |
|----------|----------|
| dev-stack DEV | `database=yasnopro_dev` |
| dev-stack TEMPLATE | `database=yasnopro_template` |
| dev-stack CLIENT | `database=yasnopro_client` |
| APP_ENV=DEV + legacy URL | Guard **fail** |
| platform/.env | **нет** DATABASE_URL |

---

## 5. Статус legacy retirement

Архивирование `portal_constructor_v2` — **отдельный WI** (см. WI-INFRA-DB-AUDIT-001 retirement roadmap). Данное ADR **не** авторизует DROP DATABASE.
