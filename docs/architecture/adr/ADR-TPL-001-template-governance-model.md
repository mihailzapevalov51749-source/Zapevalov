# ADR-TPL-001. Template Governance Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-tpl-001-template-governance-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-CP-001 — Control Plane Orchestration Model
- `docs/architecture/platform/tenant-environment-strategy.md`
- `docs/architecture/platform/control-plane-architecture.md`
- `backend/app/modules/tenant_environment/constants.py`
- `backend/app/modules/company_database_provisioning/provision_service.py`
- `scripts/runtime/README.md`

---

## 1. Контекст

TEMPLATE фигурирует во всех ключевых сценариях платформы:

- первый получатель Unified Release Package после review;
- эталон структуры и конфигурации;
- источник `CREATE DATABASE … WITH TEMPLATE yasnopro_template` при создании компаний;
- источник начального company runtime (целевое — ADR-RT-001);
- golden reference для DEMO.

При этом **отдельного нормативного определения** «что такое TEMPLATE» не существовало — роль описывалась фрагментарно в tenant-environment-strategy и operational docs.

ADR-TPL-001 фиксирует **единую модель TEMPLATE**, согласованную с ADR-REL-001, ADR-RT-001 и ADR-CP-001.

### As-is (текущее состояние)

| Аспект | Факт |
|--------|------|
| Logical tenant | `portals` с `tenant_type=TEMPLATE` (типично `id=2`) |
| Database | `yasnopro_template` |
| Runtime slot | `runtime/template/` (unified releases) |
| Version pin | `platform_environment_versions` + `portals.template_version` |
| Publish path | CP `publish_release_to_template` (registry); module `publish_publication_to_template` (config); physical promote — **ручной** |
| Direct edit | Структура в DEV; в TEMPLATE — через publication/publish, не ad-hoc в CLIENT |

---

## 2. Решение (Decision)

**TEMPLATE** — это **защищённое эталонное окружение платформы**, состоящее из логического tenant, выделенной PostgreSQL БД и выделенного runtime slot, чьё **нормативное состояние** определяется **последним успешным Publish To TEMPLATE** утверждённого Unified Release Package и используется **исключительно** как golden reference для создания и обновления компаний, а не как рабочая компания клиента.

TEMPLATE **не является** DEV, **не является** CLIENT, **не является** Control Plane.

---

## 3. Определение TEMPLATE (TEMPLATE Definition)

**TEMPLATE ЯсноПро** — это **golden reference environment**: изолированный tenant (`tenant_type=TEMPLATE`, технический `portal.id` и `code`), связанная с ним база данных `yasnopro_template`, runtime slot `runtime/template/`, и зафиксированная в Control Plane registry версия Unified Release Package (`platform_environment_versions`), содержащие **проверенную платформенную структуру, конфигурацию и code baseline** без пользовательского бизнес-контента клиентских компаний, обновляемые **только** через контролируемый маршрут DEV → Release Package → Control Plane → Publish To TEMPLATE.

Идентификация и защита — по `id`, `tenant_type`, `environment_role`, `is_protected`, `code`. **Не** по `name` / `title`.

---

## 4. Состав TEMPLATE (TEMPLATE Composition)

| Элемент | Обязательно | Опционально | Не входит |
|---------|-------------|-------------|-----------|
| **Database** (`yasnopro_template`) | ✓ | | |
| **Runtime** (`runtime/template/`) | ✓ | | |
| **Configuration** (module configs, settings) | ✓ | | |
| **Structure** (object types, fields) | ✓ | | |
| **Pages** (structure, layouts) | ✓ | | |
| **Navigation** | ✓ | | |
| **Permissions** (platform scaffold) | ✓ | | |
| **Object Model** | ✓ | | |
| **Processes** (definitions) | ✓ | | |
| **Actions** (definitions) | ✓ | | |
| **Reference Data** (минимальный seed для проверки) | | ✓ | |
| **Release Version** (`platform_version` pin) | ✓ | | |
| **Template Metadata** (portal row in CP DB) | ✓ | | |
| User business records клиентов | | | ✓ |
| Company users / memberships клиентов | | | ✓ |
| Company journals / audit of client ops | | | ✓ |
| Company documents / uploads клиентов | | | ✓ |
| DEV experimental data | | | ✓ |
| DEMO demonstration datasets | | | ✓ (живут в DEMO, не в TEMPLATE) |

**Минимальный состав** согласован с Platform Seed v1.0; **полный эталон** — superset после publish pipeline.

---

## 5. Что НЕ входит в TEMPLATE

| Категория | Пояснение |
|-----------|-----------|
| Пользовательские данные компаний | Object records клиентов |
| Контент компаний | Документы, чаты, файлы CLIENT |
| Журналы компаний | Tenant-scoped company audit |
| Пользователи компаний | CLIENT memberships |
| Платформенная разработка «вживую» | Эксперименты DEV |
| Демо-наполнение | Только в DEMO tenant |
| Per-company runtime | `runtime/company/{code}/` — отдельные слоты |
| Unified Release Package registry rows | SoT в CP DB, не «внутри» TEMPLATE |

Допускается **минимальный служебный контент** для smoke/verify структуры (не клиентский production content).

---

## 6. Источник истины TEMPLATE (TEMPLATE Source Of Truth)

### 6.1. Канон (нормативное состояние)

| Объект | Роль SoT |
|--------|----------|
| **Последний succeeded Publish** Unified Release Package → TEMPLATE | **Канон** состава TEMPLATE |
| `platform_environment_versions` (template `portal_id`) | **Канон** текущей `platform_version` |
| `platform_deployments` (target=template, succeeded) | **Канон** факта применения package |
| `yasnopro_template` PostgreSQL | **Канон** structure + config **data plane** |
| `runtime/template/current/` + active `release-NNN/` | **Канон** code **artifact plane** |

### 6.2. Производные

| Объект | Роль |
|--------|------|
| `portals.template_version` | Display/legacy label; сверять с `platform_environment_versions` |
| `runtime/template/releases/` (неактивные) | History для rollback template slot |
| Module publication rows после embed в package | Источник snapshots; не отдельный SoT |

### 6.3. Служебные

| Объект | Роль |
|--------|------|
| `portals.name`, `title` | Display only |
| CP registry rows о TEMPLATE | Metadata, не content |
| DEV tenant drafts | Не SoT для TEMPLATE |

### 6.4. Правило согласованности

```text
TEMPLATE canonical state =
  platform_release_packages (last published to template)
  + yasnopro_template DB snapshot
  + runtime/template/current manifest digests
  + platform_environment_versions.platform_version
```

Расхождение слоёв (registry version ≠ runtime digest) — **архитектурное нарушение**, требующее remediation.

---

## 7. Жизненный цикл TEMPLATE (TEMPLATE Lifecycle)

```text
BOOTSTRAP / SEED
  │  Platform Seed v1.0 + initial template DB + runtime baseline
  ▼
ACTIVE (GOLDEN)
  │  Принимает Publish To TEMPLATE из approved Release Package
  ▼
PUBLISHING (transient)
  │  CP orchestrator: code + config + structure apply
  ▼
ACTIVE (new platform_version pinned)
  │
  ├─► Used for CREATE COMPANY (provisioning clone)
  ├─► Used as compatibility reference for offers
  └─► Used as DEMO structure source (DEMO adds data separately)
  │
  ▼
[No ARCHIVE for canonical TEMPLATE in normal operations]
  TEMPLATE is permanent golden environment (is_protected)
```

| Фаза | Описание |
|------|----------|
| **Создание** | Platform bootstrap / seed; не создаётся как CLIENT |
| **Обновление** | Только Publish To TEMPLATE из Unified Release Package |
| **Публикация** | Первый materialization point полного package (ADR-REL-001) |
| **Использование** | `WITH TEMPLATE` + initial runtime copy для новых компаний |
| **Архивирование** | **Запрещено** для canonical TEMPLATE (`is_protected`) |

---

## 8. Управление TEMPLATE (TEMPLATE Governance)

### 8.1. Кто может изменять TEMPLATE

| Actor | Допустимо |
|-------|-----------|
| **Control Plane** (orchestrated Publish) | ✓ Полный package apply |
| **Platform reviewer** | ✓ Approve package (не прямой edit TEMPLATE) |
| **DEV** (design) | ✓ Только в DEV tenant; изменения попадают в TEMPLATE через package |
| **Company admin / CLIENT** | ✗ |
| **Operator manual SQL/UI** | ✗ (anti-pattern) |
| **Module publication publish** (interim) | ✓ Config slice до полной унификации в package |

### 8.2. Как изменяется TEMPLATE (целевой единственный путь)

```text
DEV: design + Release Draft
  → CP: Review → Approve
  → CP: Publish To TEMPLATE (orchestrator)
       ├─ materialize runtime/template/release-NNN
       ├─ apply config/structure to yasnopro_template
       └─ pin platform_version
```

### 8.3. Как фиксируются изменения

- `platform_deployments` (succeeded, target=template portal)
- `platform_environment_versions` + `platform_version_history`
- `platform_event_journal` event
- `manifest.json` в active template release
- Package immutability после publish (ADR-REL-001)

---

## 9. Связь с Release Package (Release Package Relationship)

```text
Unified Release Package (approved, immutable)
        │
        ▼
CP: Publish To TEMPLATE
        │
        ├─ Code layer      → runtime/template/releases/release-NNN/ activated
        ├─ Config layer    → yasnopro_template module/configuration rows
        ├─ Structure layer → yasnopro_template structure rows (future/guarded)
        ├─ Governance      → deployment succeeded + journal
        └─ Version         → platform_environment_versions.platform_version
        │
        ▼
Template Version (pinned)
```

### 9.1. Что применяется при Publish

| Слой package | Применение к TEMPLATE |
|--------------|----------------------|
| Code artifacts | **Да** — template runtime slot |
| Config snapshots | **Да** — template DB |
| Structure snapshots | **Да** (when in package) |
| Migration plan | **Да** — template DB migrations |
| Changelog / notes | Registry + journal (не data mutation) |

### 9.2. Версия TEMPLATE

```text
platform_environment_versions.tenant_id = template_portal_id
platform_environment_versions.platform_version = package.platform_version
```

Компании **не получают** обновления автоматически при publish to TEMPLATE — только через Offer (ADR-REL-001).

---

## 10. Связь с Company Runtime (Company Runtime Relationship)

```text
TEMPLATE (golden)
  ├─ yasnopro_template DB
  └─ runtime/template/current → release-NNN
        │
        ▼
CP: Create Company (provisioning)
        │
        ├─ CREATE DATABASE yasnopro_company_{code} WITH TEMPLATE yasnopro_template
        │     → structure + config scaffold cloned
        ├─ Personalize portal (code, name, tenant_type=CLIENT)
        ├─ [TARGET] Materialize runtime/company/{code}/releases/release-001
        │     from template active release
        └─ Pin platform_version = template's current version
        │
        ▼
Company Runtime (independent lifecycle thereafter)
```

### 10.1. Что получает новая компания

| Из TEMPLATE | Да/Нет |
|-------------|--------|
| DB schema + structure definitions | **Да** (clone) |
| Module configuration scaffold | **Да** (clone) |
| Reference seed rows (if any in template) | **Да** (clone) |
| Template code baseline (active release) | **Да** (target: copy materialize) |
| Template `platform_version` at provision time | **Да** (pin) |
| TEMPLATE portal row as-is | **Нет** (personalized CLIENT portal) |
| TEMPLATE uploads/mounts content | **Нет** (empty company mounts) |
| Other companies' data | **Нет** |

### 10.2. Что не получает

- User content других tenants
- DEV/DEMO-specific data
- Future template updates без Accept Offer

---

## 11. Связь с Control Plane (Control Plane Relationship)

По ADR-CP-001.

### 11.1. Действия CP над TEMPLATE (разрешены)

| Действие | Описание |
|----------|----------|
| Publish To TEMPLATE | Orchestrated full package apply |
| Record deployment / version | Registry writes |
| Read template metadata | Company registry, version UI |
| Initiate template runtime rollback | Operator action via orchestrator |
| Audit / journal | Mandatory events |

### 11.2. Запрещены для CP

| Действие | Причина |
|----------|---------|
| Ad-hoc edit object records in `yasnopro_template` | Нарушает package traceability |
| Publish без approved package | Обход review |
| Use TEMPLATE as CLIENT in offers | EXCLUDED tenant types |
| Hard-delete protected template portal | Architecture rules |
| Bypass Publication Guard | Structure safety |

### 11.3. Процессы через CP

```text
Review Release → Approve → Publish To TEMPLATE → (later) Offer To Companies
Company provisioning reads template version from CP registry
```

---

## 12. Ограничения (Restrictions)

TEMPLATE **запрещено**:

| # | Запрет |
|---|--------|
| 1 | Использовать как рабочую компанию клиента |
| 2 | Вести платформенную разработку напрямую (только приём из package) |
| 3 | Изменять в обход Unified Release Package + Publish (ad-hoc SQL/UI) |
| 4 | Изменять через CLIENT tenant или company admin |
| 5 | Содержать клиентский production user content |
| 6 | Быть источником демо-данных для CLIENT (DEMO isolated) |
| 7 | Архивировать / hard-delete canonical template (`is_protected`) |
| 8 | Идентифицировать/защищать по display `name` |
| 9 | Получать company-specific uploads/mounts от CLIENT |
| 10 | Auto-push updates to companies без Offer pipeline |

---

## 13. Архитектурные инварианты (Architectural Invariants)

1. **TEMPLATE — единственный golden reference** для bootstrap новых CLIENT (не DEV, не DEMO, не CLIENT).
2. **TEMPLATE не содержит** пользовательского бизнес-контента клиентских компаний.
3. **Нормативное состояние TEMPLATE** соответствует **последнему succeeded Publish** Unified Release Package (целевое; при interim drift — remediate).
4. **Новая компания** создаётся из `yasnopro_template` (`WITH TEMPLATE`) + pin version at provision time.
5. **Обновление TEMPLATE** не автоматически обновляет компании — только Offer → Accept.
6. **TEMPLATE защищён** (`is_protected`, `tenant_type=TEMPLATE`).
7. **Разработка структуры** — в DEV; TEMPLATE — приёмник проверенных изменений.
8. **Technical keys** — идентификация по `portal.id`, `code`, `database_name`, не по title.
9. **TEMPLATE runtime** — отдельный slot `runtime/template/`, не shared с `runtime/client/` (interim) или `runtime/company/`.
10. **Публикация в TEMPLATE** — обязательный gate перед Offer To Companies.

---

## 14. Анти-паттерны (нарушения архитектуры)

| Анти-паттерн | Почему нарушение |
|--------------|------------------|
| Прямое изменение `yasnopro_template` в обход Release Package | Нет traceability, drift от registry |
| Ручной promote runtime без CP deployment record | Registry ≠ physical state |
| Работа в TEMPLATE как в CLIENT (реальные пользователи) | Загрязнение golden reference |
| Clone компании из DEV или CLIENT | Нестабильный bootstrap |
| Копирование DEMO data в TEMPLATE | Demo leak в новые компании |
| Изменение TEMPLATE через company tenant | Wrong ownership boundary |
| Публикация config без review/guards | Structure safety risk |
| Использование `name` для template identification | Architecture rules violation |
| Shared CLIENT runtime как «template for companies» | ADR-RT-001 violation |
| Skip Publish To TEMPLATE → direct Offer | Companies без golden validation |

---

## 15. TEMPLATE vs смежные окружения

| | DEV | TEMPLATE | DEMO | CLIENT |
|--|-----|----------|------|--------|
| Разработка | ✓ | ✗ | ✗ | ✗ |
| Golden reference | ✗ | ✓ | ✗ | ✗ |
| Bootstrap source | ✗ | ✓ | ✗ | ✗ |
| Client user content | ✗ | ✗ | demo only | ✓ |
| Receive package publish | ✗ | ✓ (first) | via template+data | via offer |
| Per-company runtime | DEV slot | template slot | demo policy | company slot |

---

## 16. Фазы внедрения governance

| Фаза | Scope |
|------|-------|
| Phase 0 | ADR-TPL-001 accepted |
| Phase 1 | Unified Publish To TEMPLATE orchestrator (ADR-CP-001) |
| Phase 2 | Digest consistency gate template registry ↔ runtime |
| Phase 3 | Deprecate standalone module publish as primary path |
| Phase 4 | Provisioning materialize from template runtime (ADR-RT-001) |

---

## 17. Документы, требующие обновления

| Документ | Изменение |
|----------|-----------|
| `docs/architecture/platform/tenant-environment-strategy.md` | Cross-ref ADR-TPL-001; §5 TEMPLATE align |
| `docs/architecture/adr/ADR-REL-001-unified-release-package.md` | Cross-ref ADR-TPL-001 |
| `docs/architecture/adr/ADR-RT-001-per-company-runtime.md` | Cross-ref ADR-TPL-001 |
| `docs/architecture/adr/ADR-CP-001-control-plane-orchestration-model.md` | Cross-ref ADR-TPL-001 |
| `docs/architecture/platform/control-plane-architecture.md` | Template governance section |
| `docs/architecture/README.md` | Index ADR-TPL-001 |
| `scripts/runtime/README.md` | TEMPLATE as golden runtime slot |

---

## 18. Риски

| Риск | Mitigation |
|------|------------|
| Interim triple path (governance + module + manual promote) | Phase 1–3 unified publish |
| `template_version` vs `platform_environment_versions` drift | Single pin policy |
| Operators edit template DB directly | Anti-patterns + audit |
| LEGACY_TEMPLATE (`id=13`) confusion | Deprecate; resolver fallback documented |
| TEMPLATE polluted with test data | Demo Environment Audit + guards |

---

## 19. Критерии принятия ADR

- [x] Официальное определение TEMPLATE
- [x] Состав TEMPLATE
- [x] Источник истины
- [x] Жизненный цикл
- [x] Правила управления
- [x] Связь с Release Package
- [x] Связь с Company Runtime
- [x] Связь с Control Plane
- [x] Ограничения и инварианты
- [x] Анти-паттерны
