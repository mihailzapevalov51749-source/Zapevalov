# WI-ARCH-003 — Architecture Explorer Audit

```yaml
slug: wi-arch-003-architecture-explorer-audit
status: accepted
date: 2026-06-19
scope: read-only audit
```

## Краткий вывод

Раздел **«Архитектура платформы»** строится из **статического catalog seed** (`catalog.py` → `architecture_components`), а не из ADR. Сканер v1.0.0 собирает **evidence findings** (маршруты, таблицы, файлы docs) и **не обновляет** дерево компонентов. ADR-файлы попадают в findings как обычные `.md` без парсинга содержимого.

## Источники

| Слой | Источник истины |
|------|-----------------|
| Дерево / карточки | `architecture_components` + `architecture_links` (seed) |
| Evidence | `architecture_scans` + `architecture_findings` |
| Сканер | `scanner.py` + `platform_dashboard_analyzer/backend_scan.py` |

## Почему ADR не меняют UI

1. `ensure_catalog_seeded` — только insert новых ключей, без update.
2. `execute_architecture_scan` — только findings, без sync catalog.
3. Нет парсера ADR (frontmatter, Target/Gap sections).
4. `_attach_component_hints` — substring heuristics; пути `docs/architecture/adr/ADR-*` почти не мапятся.
