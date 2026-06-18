# Local Dev Stack Manager (WI-20.1)

Минимальный диспетчер локальных сред **DEV**, **TEMPLATE** и **CLIENT**.

Источник истины по портам и сервисам: `manifest.yaml`.

## Требования

- `backend/.venv` (зависимости backend)
- `frontend/node_modules` (зависимости frontend)
- PostgreSQL на `localhost:5434` (см. `docker-compose.yml`)
- Изолированные БД: `yasnopro_dev`, `yasnopro_template`, `yasnopro_client`

## Команды

Из корня репозитория:

```powershell
.\scripts\dev-stack\dev-stack.ps1 start
.\scripts\dev-stack\dev-stack.ps1 stop
.\scripts\dev-stack\dev-stack.ps1 status
```

Прямой вызов Python (опционально):

```powershell
backend\.venv\Scripts\python.exe scripts\dev-stack\dev_stack.py status --repo-root .
```

## Что делает `start`

1. Проверяет `backend/.venv` и `frontend/node_modules`.
2. Проверяет, что порты свободны: `8010–8012`, `5173–5175`.
3. Запускает 6 **headless** фоновых процессов (`CREATE_NO_WINDOW`, без `DETACHED_PROCESS`, без cmd/powershell окон).
4. Backend: `python.exe -m uvicorn ...`; frontend: `node.exe .../vite.js --mode ...`.
5. Сохраняет PID в `.run/<service>.json`.
6. Пишет логи в `logs/*.log` (append).
7. Сразу возвращает управление терминалу.

## Что делает `stop`

1. Читает PID из `.run/`.
2. Завершает процессы.
3. Удаляет PID-файлы.

## Что делает `status`

Выводит состояние каждого сервиса:

| Статус | Значение |
|--------|----------|
| `RUNNING` | Порт слушает (основной сигнал для backend/frontend) |
| `STOPPED` | PID-файла нет и порт не слушает |
| `STALE PID` | PID-файл есть, процесс мёртв, порт не слушает |
| `FAILED` | PID жив, но порт ещё не слушает |

Проверка портов на Windows использует `netstat` (кэш на команду) с fallback `connect()` и timeout ≤ 0.5 с на сервис.

## Порты

| Среда | Backend | Frontend |
|-------|---------|----------|
| DEV | 8010 | 5173 |
| TEMPLATE | 8011 | 5174 (artifact: `dist-template` + `vite preview`) |
| CLIENT | 8012 | 5175 |

TEMPLATE frontend (WI-RUNTIME-ISOLATION-02 spike): перед `dev-stack start` выполнить `cd frontend && npm run build:template`. TEMPLATE обслуживает статический `frontend/dist-template`, не live `frontend/src`.

## Артефакты runtime

```text
.run/                 # PID-файлы (gitignored)
logs/                 # stdout/stderr сервисов (gitignored)
```

## Вне scope WI-20.1

Не реализовано: doctor, smoke, GUI, Docker orchestration, health checks, auto-restart, watchdog.
