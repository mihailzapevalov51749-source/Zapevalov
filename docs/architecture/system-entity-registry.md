# System Entity Registry v1

## Назначение

**System Entity Registry** — единый каталог системных сущностей платформы ЯсноПро и централизованная точка аудита соответствия [ADR-007](./adr/ADR-007-system-entity-standard.md).

Registry v1 **не** заменяет и **не** переносит существующие registry-модули:

- `anchor_registry.py`
- `quick_form_view_registry.py`
- `workspace_home/registry.py`
- `navigation/system_registry/registry.py`

Он агрегирует метаданные и делегирует audit в уже реализованные функции.

## Модуль

```text
backend/app/modules/platform/system_entity_registry/
  __init__.py
  types.py
  catalog.py
  audit.py
  specs/
    plan_root.py
    default_quick_form.py
    workspace_home.py
    navigation.py
```

## Каталог

`SYSTEM_ENTITY_CATALOG` — кортеж из 7 `SystemEntitySpec`:

| system_type | display_name |
|-------------|--------------|
| `runtime.plan_root_anchor` | Plan Root Anchor |
| `designer.default_quick_form` | Default Quick Form View |
| `workspace.home_tab` | Workspace Home Tab |
| `workspace.home_page` | Workspace Home Page |
| `workspace.root_section` | Workspace Root Section |
| `navigation.system_item` | Navigation System Item |
| `navigation.workspace_placement` | Workspace Navigation Placement |

Каждый spec описывает structural key, unique scope, поддержку ensure/reconcile/recovery/audit и visibility policy.

## Audit API

```python
from app.modules.platform.system_entity_registry import (
    audit_all_system_entities,
    generate_system_entity_compliance_report,
)

results = audit_all_system_entities(db)
report = generate_system_entity_compliance_report(db)
```

`audit_all_system_entities()`:

1. обходит все spec из каталога;
2. вызывает существующие `audit_*()` адаптеры (без дублирования SQL);
3. применяет entity-specific evaluators для подсчёта нарушений;
4. возвращает агрегированный список `SystemEntityAuditResult`.

`generate_system_entity_compliance_report()` формирует матрицу ADR-007 compliance (PASS / PARTIAL / FAIL).

## CLI

```powershell
cd backend
python scripts/audit_system_entities.py
```

## Связь с ADR-007

Registry v1 — operational layer поверх ADR-007:

- каталог фиксирует нормативные требования к каждой сущности;
- compliance report отражает известные gaps из ADR (PARTIAL);
- audit использует production registry, не копирует бизнес-логику.

## Ограничения v1

- нет orchestration / ensure-all entrypoint;
- нет HTTP API;
- нет изменения существующих registry и БД;
- workspace home tab / root section — PARTIAL compliance при известных DB gaps;
- navigation audit не проверяет полноту ensure-каталога (только дубли по `system_key`).

## Следующие этапы (вне v1)

- HTTP endpoint для owner/ops audit;
- analyzer check в platform dashboard refresh;
- DB unique indexes для workspace home tab / root section (ADR-007 follow-up).
