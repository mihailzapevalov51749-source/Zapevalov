# ARCHITECTURE ALIGNMENT REVIEW

**Тип:** Architecture Governance Pass  
**Область:** `docs/architecture/` (24 файла на момент ревью)  
**Режим:** только анализ; документы и код не изменялись  

**Canonical governance-документы (новые / уточняющие):**  
`YASNOPRO_ARCHITECTURE_GLOSSARY.md`, `YASNOPRO View Ownership Model.md`, `YASNOPRO Event Bus Model.md`, `YASNOPRO Portal Composition Model.md`, `YASNOPRO_SCOPE_TENANT_MODEL.md`, `YASNOPRO_WORKFLOW_MODEL.md`, `YASNOPRO_PROCESS_ENGINE_MODEL.md`

**Стратегический pivot:** `YASNOPRO ARCHITECTURE RESET STRATEGY.md`

---

## 1. Общая оценка архитектуры

### Уровень зрелости

| Измерение | Оценка | Комментарий |
|-----------|--------|-------------|
| Концептуальная целостность (AOBP vision) | **Высокая** | PLATFORM_CORE, TARGET, GLOSSARY, README согласованы по направлению |
| Терминологическая зрелость | **Средняя** | Glossary введён, но legacy-документы не полностью выровнены |
| Ownership / state model | **Средняя+** | VIEW_OWNERSHIP + обновлённый STATE_MODEL — сильный шаг; остаются серые зоны (Process runtime, Layout vs Workspace) |
| Process / Workflow / BPMN | **Средняя** | Чёткое разделение Workflow ≠ Process; риск двойного ownership execution state |
| Roadmap / phase governance | **Низкая** | **Критический конфликт** RESET_STRATEGY vs ROADMAP / MIGRATION_MAP / STATUS |
| Готовность к масштабируемой реализации | **~60% концепция / ~45% контракты** | Без единой phase-таблицы и выравнивания legacy-доков параллельная разработка даст drift |

### Сильные стороны

- Единый **архитектурный язык** в GLOSSARY (ViewTemplate, RuntimeRepresentation, ViewSession, UI Command ≠ Domain Event).
- **View Ownership Model** — ownership matrix, split-brain / hidden sync явно запрещены.
- **Event Bus Model** — разделение Domain Event Bus / UI Command Bus / Runtime Interaction / AI Context Events.
- **Portal Composition Model** — Portal → Page → Section → Block; Block ≠ Entity.
- **Scope Tenant Model** — tenant + scope (personal → global) с isolation rules для AI, events, relations.
- **RUNTIME_DESIGNER_MODEL** (актуализирован) — Designer → ViewTemplate; Runtime → RuntimeRepresentation.
- **TARGET_ARCHITECTURE** — Representation Engine отделён от Layout; управляет RuntimeRepresentation, не spatial layout.
- **STATE_MODEL** (актуализирован) — ViewSession vs RuntimeRepresentation с примерами filters owner.

### Главные риски

1. **Две стратегии миграции** (Stabilization-first vs Reset / Entity-first) без declared canonical source.
2. **Legacy wording** в VIEW_ENGINE, ENTITY_MODEL, PERSONALIZATION, EVENT_ENGINE (опечатка §2).
3. **README** не индексирует governance-документы — риск обхода Glossary при чтении.
4. **Именование файлов** (пробелы vs `YASNOPRO_*_MODEL.md`) — риск «два стандарта» документации.
5. **Runtime Engine** как owner ViewSession и Runtime Process State без формального определения слоя.
6. **Workspace / RuntimeWorkspace** в нескольких документах как контейнер representations + layout — риск смешения ownership.

### Готовность к разработке

- **Можно** начинать новые контуры **рядом с legacy** (путь RESET_STRATEGY + Designer Core) при freeze legacy.
- **Нельзя** считать Architecture Stabilization завершённой по STATUS / MIGRATION_MAP.
- **Platform Runtime Foundation** в коде не подтверждается документами как реализованный; в docs — **частично сформирован** (Portal, View ownership, Event bus, Scope — на уровне спецификаций).

---

## 2. Semantic consistency review

| ID | Проблема | Где | Слой | Принцип | Опасность | Последствия | Рекомендация |
|----|----------|-----|------|---------|-----------|-------------|--------------|
| SEM-01 | Голое слово **representation** | VIEW_ENGINE_MODEL (§11–18), ENTITY_MODEL (§19–21), STATE (редко), EVENT (View Events), PERSONALIZATION («создавать representations») | View / Entity | GLOSSARY: запрет `representation` без уточнения | Drift при чтении старых доков | Два persistence-контура в коде | Пометить legacy-секции; в новых правках использовать только RuntimeRepresentation / Representation Engine |
| SEM-02 | **Representation** = «персональная настройка» в ENTITY_MODEL | ENTITY_MODEL §19–20 | Entity / View | ViewTemplate ≠ RuntimeRepresentation | Entity doc описывает UI personalization | Разработчики читают ENTITY как SoT для views | В ENTITY оставить ссылку на GLOSSARY; убрать дублирование View/Representation или пометить deprecated |
| SEM-03 | **View** без ViewType / ViewTemplate | VIEW_ENGINE, ENTITY §16–18, PLATFORM §4.5 | View | Meta-driven, explicit terms | View = instance или type? | Дубли API `/views` | Везде: ViewType / ViewTemplate / view instance |
| SEM-04 | **Workflow** vs **Process** — иерархия есть, но термин «бизнес-процесс» пересекается | WORKFLOW §31–56 vs PROCESS §27–96 | Process | Workflow ≠ Process | Путаница orchestration vs state machine | Дубли execution | Закрепить в GLOSSARY: Process (orchestration), Workflow (state machine), BPMN (graph) |
| SEM-05 | **Tabs** — ViewTypeTab vs RepresentationTab vs Personal Tabs | GLOSSARY, README, PERSONALIZATION | UI | Tabs ≠ Representations | Один UI control — три роли | Неверный save target | Ссылка из PERSONALIZATION на GLOSSARY terms |
| SEM-06 | **Dashboard** — View Type, Block, DashboardTemplate/Instance | VIEW_ENGINE, PORTAL, GLOSSARY | View / Portal | Separation of concerns | Три «Dashboard» | God-widget layer | Одна строка в GLOSSARY: иерархия DashboardTemplate → DashboardInstance → widgets |
| SEM-07 | **Workspace** vs **Portal** vs **Page** | PERSONALIZATION, PORTAL, GLOSSARY Runtime Workspace | Portal | Workspace != Portal (PORTAL §369) | Workspace = portal? | Дубли navigation | PORTAL — canonical; PERSONALIZATION — только ссылка |
| SEM-08 | EVENT_ENGINE §2: «**AI Context Engine** — движок событий» | EVENT_ENGINE_MODEL §2 | Event / AI | Layer boundaries | Фактическая ошибка в spec | Неверный onboarding | Исправить формулировку на «Event Engine» (единственная явная factual error) |
| SEM-09 | **Universal Table** — принцип един, transition contract слабый | README, GLOSSARY, PLATFORM; RESET §21 | View / Entity | Table ≠ SoT | Имя «table» = Entity в голове | AD-001 persists | PLATFORM/RESET: абзац «legacy compatibility layer» + запрет новых table-SoT features |
| SEM-10 | **inline editing** в README без Entity Command | README §Universal Table | View / Entity | View never owns business truth | View пишет в rows | Table остаётся SoT | Добавить: inline edit = command to Entity Layer |

---

## 3. Ownership conflicts

| ID | Конфликт | Документы | Почему опасно | Принцип | Последствия | Рекомендация |
|----|----------|-----------|---------------|---------|-------------|--------------|
| OWN-01 | **RuntimeRepresentation** — owner «Runtime Personalization Layer» vs engine «Representation Engine» | VIEW_OWNERSHIP, TARGET §14, TECHNICAL §20 | Engine vs layer не связаны явно | One owner | Два модуля без контракта | TARGET: Representation Engine **реализует** ownership Personalization Layer |
| OWN-02 | **ViewSession** — owner «Runtime Engine» (не Session Engine, не View Engine) | VIEW_OWNERSHIP, STATE §16 | «Runtime Engine» нигде не определён как platform layer | One scope — one owner | Реализация в controller | Определить Session Engine / View Session Store в TARGET или GLOSSARY |
| OWN-03 | **RuntimeLayoutDelta** — owner Layout Engine (VIEW_OWNERSHIP) vs persistence «runtime personalization» | VIEW_OWNERSHIP, GLOSSARY, SCOPE | Split между engine и layer | Layout ≠ personalization storage | Два API сохранения layout | Явно: Layout Engine **writes**; Personalization Layer **owns policy** |
| OWN-04 | **Layout State** включает «runtime composition» | STATE §21 | Пересечение с RuntimeWorkspace | Layout ≠ business; Workspace composition | Layout хранит business-facing structure | Убрать composition из Layout State → RuntimeWorkspace |
| OWN-05 | **RuntimeWorkspace** содержит representations + layouts | GLOSSARY Workspace §362–368, PORTAL | Контейнер ≠ owner, но намекает на co-location | No split-brain | Save workspace = save rep | Workspace хранит **references** (ids), не копии state |
| OWN-06 | **Runtime Process State** — owner «Runtime Engine»; orchestration — Process Engine | PROCESS §577–712 | Кто владеет active task / stage? | Process Engine orchestrates | Execution state в UI | Matrix: Process Engine owns execution state; View only projects |
| OWN-07 | **Workflow State** vs **Workflow Instance** — Workflow Engine owner (WORKFLOW) — согласовано | WORKFLOW | — | OK при соблюдении | — | Подтвердить в GLOSSARY cross-link |
| OWN-08 | **Entity.history** vs **Event Engine** canonical | GLOSSARY Entity History, ENTITY §7, EVENT | Два источника истории | Event owns history | Рассинхрон timeline | ENTITY: history = projection only (как в GLOSSARY) |
| OWN-09 | **Entity.relations** в структуре Entity vs Relation Instance | ENTITY §7, RELATION | Dual graph storage | Relation Engine owns graph | lookup/parent_id pseudo-relations | ENTITY: relations = references; instances in Relation Engine |
| OWN-10 | **Field.ui** в ENTITY §10 | ENTITY | Presentation в schema | View ≠ Entity | Designer field change ломает all views | field display → ViewTemplate overrides (GLOSSARY intent) |
| OWN-11 | **Block Runtime State** vs **ViewSession** | PORTAL §294–316 | Два temporary state на block | ViewSession scoped | Block + table double dirty | Block Runtime State только UI chrome; view state — ViewSession |
| OWN-12 | **Representation Engine** (TARGET) vs **View Service** manages representations (TECHNICAL §73) | TARGET, TECHNICAL | Service boundary unclear | Engine ownership | God View Service | TECHNICAL: View Service → read models; Representation Engine → write/persist RuntimeRepresentation |

### Split-brain / hidden sync (документированные риски vs анти-паттерны)

| Риск | Статус в docs | Gap |
|------|---------------|-----|
| filters в component + representation + window | Запрещено в VIEW_OWNERSHIP, STATE, EVENT_BUS | Legacy docs не ссылаются на UI Command Bus |
| CustomEvent как platform bus | Запрещено; RESET §25 legacy bridge | Нет formal «legacy bridge» spec |
| table controller owns view state | Запрещено WORKFLOW/PROCESS/VIEW_OWNERSHIP | Нет в VIEW_ENGINE (legacy wording) |

---

## 4. Runtime/Designer conflicts

| ID | Конфликт | Документы | Опасность | Принцип | Последствия | Рекомендация |
|----|----------|-----------|-----------|---------|-------------|--------------|
| RD-01 | **Согласовано (после правок):** Designer → ViewTemplate, Process/Workflow Definition; Runtime → RuntimeRepresentation, instances | RUNTIME_DESIGNER §9–10, §467+, GLOSSARY, README | — | Runtime ≠ Designer | — | Поддерживать; не откатывать |
| RD-02 | **Designer Configuration** включает «Workflow» (GLOSSARY §534) без Process Definition | GLOSSARY | Workflow definition без process context | Designer owns definitions | Orphan workflows | GLOSSARY: Workflow Definition + Process Definition |
| RD-03 | **Runtime users** могут «создавать AI views» (PERSONALIZATION) | PERSONALIZATION | Shadow ViewTemplate | Runtime не меняет schema | Undeclared templates | AI views = DashboardInstance/widgets only, not ViewTemplate |
| RD-04 | **Page** — «runtime или designer страница» (GLOSSARY Page) | GLOSSARY | Один тип Page для двух режимов | Runtime ≠ Designer | Shared state | Runtime Page vs Designer Page types в PORTAL |
| RD-05 | **isEditMode** / canvas в runtime — не описано в core docs | PORTAL (designer routes), STATUS | Designer в runtime shell | Runtime ≠ Designer | PortalPageView anti-pattern | PORTAL: Designer Page vs Runtime Page (уже частично есть) |
| RD-06 | **Publish ViewTemplate** vs RuntimeRepresentation migration (VIEW_OWNERSHIP §570) | VIEW_OWNERSHIP | Хорошо описано | — | — | Реализовать как governance rule при Phase 2–3 |

---

## 5. Process/Workflow/BPMN conflicts

| ID | Конфликт | Документы | Опасность | Принцип | Последствия | Рекомендация |
|----|----------|-----------|-----------|---------|-------------|--------------|
| PW-01 | **Согласовано:** Workflow ≠ Process; Designer Definition / Runtime Instance | WORKFLOW, PROCESS | — | — | — | — |
| PW-02 | **Process Engine orchestrates Workflow** vs **Workflow Engine = execution core** | PROCESS §489–507, WORKFLOW §96 | Двойной «центр» execution | Single orchestration | Race in transitions | Одна формула: Process Engine orchestrates; Workflow Engine executes state machine **as subordinate** |
| PW-03 | **BPMN** = executable graph (PROCESS) — не отдельно «BPMN не владеет execution» | PROCESS | BPMN diagram mistaken for owner | BPMN = model; Process Engine executes | UI drives BPMN | Добавить: BPMN storage = Process Definition; execution = Process Engine |
| PW-04 | **Sequence Flow** = workflow transition (PROCESS §332) | PROCESS | Collapse workflow into BPMN edges | Workflow owns transitions | Дубли rules | Sequence Flow triggers Workflow transitions, not replaces Workflow Engine |
| PW-05 | **Workflow history = Event Engine** (WORKFLOW) — согласовано с EVENT | WORKFLOW, EVENT, GLOSSARY | — | Event owns history | — | — |
| PW-06 | **View Engine** не владеет workflow — согласовано | WORKFLOW, PROCESS | — | — | — | — |
| PW-07 | **Rule Engine** в PROCESS без отдельного документа | PROCESS | Implicit engine | Platform core clarity | Rules in table/UI | WORKFLOW_MODEL-level stub или GLOSSARY entry Rule Engine |
| PW-08 | PHASE 1 STABILIZATION: «не внедряем сложный workflow» vs новые PROCESS/WORKFLOW docs | MIGRATION §163, ROADMAP | Teams build workflow on legacy table | Stabilization first | Scope creep | Пометить PROCESS/WORKFLOW как **spec-only until Phase N** |

---

## 6. Naming conflicts

| Проблема | Файлы | Рекомендация |
|----------|-------|--------------|
| **Canonical `YASNOPRO_<DOMAIN>_MODEL.md` нарушен** | `YASNOPRO Event Bus Model.md`, `YASNOPRO Portal Composition Model.md`, `YASNOPRO View Ownership Model.md`, `YASNOPRO ARCHITECTURE RESET STRATEGY.md` | Переименовать в underscore-формат **или** явный exception list в README |
| Дублирование domain **Event** | `YASNOPRO_EVENT_ENGINE_MODEL.md` + `YASNOPRO Event Bus Model.md` | OK если роли разделены: Engine = domain; Bus = taxonomy — добавить cross-links в оба |
| Дублирование domain **View state** | `YASNOPRO_STATE_MODEL.md` + `YASNOPRO View Ownership Model.md` | OK: STATE = lifecycle/dirty; OWNERSHIP = matrix — README: «когда читать какой» |
| Дублирование **Process/Workflow** | `YASNOPRO_PROCESS_ENGINE_MODEL.md` + `YASNOPRO_WORKFLOW_MODEL.md` | OK — иерархия; GLOSSARY index |
| README не перечисляет 8+ governance-файлов | README §Документы | Обновить индекс (отдельный patch) |
| **Personal Representation** vs **RuntimeRepresentation** | README §189, PERSONALIZATION | Унифицировать на RuntimeRepresentation |
| **Runtime Workspace** vs **RuntimeWorkspace** | PERSONALIZATION, GLOSSARY | Один camelCase term в glossary |
| TARGET §14 заголовок `## Representation Engine` (двойной ##) | TARGET | Косметика markdown |

---

## 7. Roadmap conflicts

### Критический конфликт: что такое PHASE 1?

| Источник | PHASE 1 |
|----------|---------|
| **MIGRATION_MAP §8**, **ROADMAP §9**, **ARCHITECTURE_STATUS §3** | **STABILIZATION** (state, globals, CustomEvent, giant controllers) |
| **ARCHITECTURE RESET STRATEGY §8** | **DESIGNER / ENTITY CORE FOUNDATION** (новый core рядом с legacy) |

**Вывод:** без **canonical phase authority** команда не может закрыть «Architecture Stabilization» — RESET объявляет стабилизацию legacy прекращённой (§6), STATUS — PHASE 1 Stabilization IN PROGRESS.

### Другие phase расхождения

| Тема | ROADMAP | MIGRATION_MAP | RESET |
|------|---------|---------------|-------|
| Phase 2 | View Engine Extraction | View Session Stabilization | Table View Engine |
| Entity Layer | Phase 3 | Phase 4 | Phase 1 (в составе Designer Core) |
| Runtime/Designer split | (в roadmap позже) | Phase 7 | Phase 6 |
| Representation / Session | Внутри View Engine phase | Phase 2 dedicated | Phase 3 |

### Текущая архитектурная стадия (по документам)

| Вопрос | Ответ |
|--------|-------|
| **Реальная стадия** | Level 1 Hybrid (STATUS); table-centric legacy + conceptual AOBP docs |
| **Architecture Stabilization завершена?** | **Нет** (STATUS: IN PROGRESS; State UNSTABLE; DoD не достигнут) |
| **Platform Runtime Foundation начался?** | **Документально — да** (governance pass); **в коде — вне scope ревью**, STATUS указывает NOT IMPLEMENTED для core engines |
| **Какие layers сформированы (docs)** | Glossary, View ownership, Event bus taxonomy, Portal composition, Scope/tenant, Process/Workflow **spec**; Entity/Event/Relation engines — **concept only** |

### RESET vs STABILIZATION

RESET §6: прекращать бесконечную стабилизацию legacy.  
STATUS §14: запрет massive refactor **до завершения Stabilization**.

**Governance gap:** нет документа «какой документ главнее» (README vs RESET vs MIGRATION).

**Рекомендация:** один **CANONICAL_MIGRATION_AUTHORITY** paragraph в README: при конфликте — RESET для strategic order; MIGRATION для legacy freeze rules; или явный выбор product owner.

---

## 8. Legacy wording

| Legacy pattern | Где ещё живёт | Canonical term (GLOSSARY) |
|----------------|---------------|---------------------------|
| `representation` без уточнения | VIEW_ENGINE, ENTITY, EVENT View Events, PERSONALIZATION | RuntimeRepresentation / Representation Engine |
| `Representation` = saved view config (без Runtime prefix) | VIEW_ENGINE §11–18 | RuntimeRepresentation |
| `View State` с filters/sort (до разделения) | VIEW_ENGINE §27–28 «Table View State» vs «Table Representation» | ViewSession vs RuntimeRepresentation |
| Designer creates representations | Исправлено в RUNTIME_DESIGNER | Designer → ViewTemplate |
| saved layouts in Representation Engine | **Снято** в TARGET §14 (актуальная версия) | LayoutTemplate / RuntimeLayoutDelta |
| `window.__` / CustomEvent | Запрещено везде; RESET legacy bridge | UI Command Bus |
| Table as SoT (implicit) | AD-001, STATUS | Entity Layer |
| `views` in ObjectType (ENTITY §4) | ENTITY | allowed_view_types + view_template_ids |
| AI Context Engine = Event Engine | EVENT §2 | Event Engine |
| STABILIZATION FIRST (PLATFORM §12) vs Reset | PLATFORM vs RESET | Declared strategy pointer |

---

## 9. Architectural risks

| # | Риск | Уровень | Описание |
|---|------|---------|----------|
| R1 | **Dual migration strategy** | CRITICAL | Stabilization vs Reset без arbiter |
| R2 | **Glossary bypass** | HIGH | README reading order skips GLOSSARY / VIEW_OWNERSHIP |
| R3 | **Documentation–implementation gap** | HIGH | Сильные specs; STATUS — engines NOT IMPLEMENTED |
| R4 | **Representation naming in old docs** | HIGH | VIEW_ENGINE drives implementation language |
| R5 | **Runtime Engine undefined** | MEDIUM | Owner label without layer spec |
| R6 | **Workspace as aggregate root** | MEDIUM | May absorb rep + layout ownership |
| R7 | **Process/Workflow ahead of stabilization** | MEDIUM | Spec invites early implementation |
| R8 | **TECHNICAL API `/representations`** vs RuntimeRepresentation | MEDIUM | API naming vs glossary |
| R9 | **File naming inconsistency** | LOW | Tooling / discoverability |
| R10 | **EVENT_ENGINE typo** | LOW | Trust in docs |

### Специальные проверки (чеклист запроса)

| Проверка | Статус |
|----------|--------|
| Universal Table не SoT | **Декларировано**; AD-001 ACTIVE |
| ViewTemplate != RuntimeRepresentation != ViewSession | **Согласовано** в GLOSSARY, VIEW_OWNERSHIP, STATE |
| Layout не в Representation Engine | **Согласовано** в TARGET §14 |
| UI Command != Domain Event | **Согласовано** EVENT_BUS + GLOSSARY |
| Tenant-scoped personalization | **Согласовано** SCOPE_TENANT |
| BPMN не заменяет Process Engine | **В целом да**; уточнить Sequence Flow (PW-04) |
| Dashboard не canonical state | **Декларировано**; нужна иерархия Template/Instance (SEM-06) |

---

## 10. Recommended fixes

Только governance / documentation alignment. Без massive rewrite. Без implementation.

| Priority | Problem | Document | Recommendation |
|----------|---------|----------|----------------|
| **P0** | PHASE 1 означает разное | RESET, MIGRATION_MAP, STATUS, README | Добавить § «Canonical migration authority» + таблица фаз (1 страница) |
| **P0** | Две стратегии: stabilize legacy vs freeze + new core | RESET §6 vs STATUS §14 | Явно: legacy — только regression fixes; new work — только Designer Core path |
| **P1** | README не индексирует governance docs | README | Расширить список документов + mandatory read order (GLOSSARY → VIEW_OWNERSHIP → EVENT_BUS) |
| **P1** | Legacy `representation` в VIEW_ENGINE | VIEW_ENGINE_MODEL | Banner «terminology superseded by GLOSSARY» + replace terms in key §11–18 при точечном edit |
| **P1** | ENTITY_MODEL Representation §19 | ENTITY_MODEL | Заменить на RuntimeRepresentation или deprecated pointer |
| **P1** | EVENT §2 typo | EVENT_ENGINE_MODEL | Исправить «AI Context Engine» → «Event Engine» |
| **P1** | PERSONALIZATION «representations» | RUNTIME_PERSONALIZATION | Заменить на RuntimeRepresentation |
| **P2** | Runtime Engine undefined | GLOSSARY или TARGET | Добавить primitive Runtime Engine / Session Engine |
| **P2** | Process runtime state owner | PROCESS_ENGINE_MODEL | Owner execution state → Process Engine (не generic Runtime Engine) |
| **P2** | Layout State «runtime composition» | STATE_MODEL §21 | Перенести composition → RuntimeWorkspace |
| **P2** | File naming | 4 files with spaces | Rename to `YASNOPRO_*` или exception registry |
| **P2** | TECHNICAL View Service vs Representation Engine | TECHNICAL_ARCHITECTURE | Align §73, §20 with TARGET §14 |
| **P3** | Rule Engine stub | GLOSSARY or PROCESS | One-paragraph definition |
| **P3** | PROCESS/WORKFLOW spec maturity | MIGRATION_MAP | Mark «design spec — not Phase 1 deliverable» |
| **P3** | TARGET markdown §14 header | TARGET | Fix heading level |

---

## 11. Documents already aligned

| Документ | Почему aligned |
|----------|----------------|
| **YASNOPRO_ARCHITECTURE_GLOSSARY.md** | Canonical terms, forbidden mixes, Entity History projection |
| **YASNOPRO View Ownership Model.md** | Ownership matrix, split-brain, session vs persisted rules |
| **YASNOPRO Event Bus Model.md** | UI vs Domain; automation only on Domain Events |
| **YASNOPRO Portal Composition Model.md** | Portal/Page/Section/Block; Block ≠ Entity; Layout ≠ business |
| **YASNOPRO_SCOPE_TENANT_MODEL.md** | Tenant + scope; AI/event/relation isolation |
| **YASNOPRO_RUNTIME_DESIGNER_MODEL.md** (актуальные §) | ViewTemplate vs RuntimeRepresentation; Runtime user actions |
| **YASNOPRO_STATE_MODEL.md** (§16–20) | ViewSession vs RuntimeRepresentation; filter ownership example |
| **YASNOPRO_TARGET_ARCHITECTURE.md** (§14–16) | Representation Engine vs Layout Engine vs Session Engine |
| **YASNOPRO_WORKFLOW_MODEL.md** | Workflow ≠ Process; history via Event Engine |
| **YASNOPRO_PROCESS_ENGINE_MODEL.md** | BPMN executable model; boundaries with View/Layout |
| **README.md** (§правила) | View Template vs Runtime Representation; Tabs |
| **YASNOPRO_ARCHITECTURE_DEBT.md** | AD items match governance themes |

### Частично aligned (требуют terminology pass)

| Документ | Gap |
|----------|-----|
| YASNOPRO_VIEW_ENGINE_MODEL.md | Bare «Representation» |
| YASNOPRO_ENTITY_MODEL.md | View/Representation chapters duplicate + legacy terms |
| YASNOPRO_RUNTIME_PERSONALIZATION_MODEL.md | «representations» wording; View Template section OK |
| YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md | Phase numbering vs RESET |
| YASNOPRO_TECHNICAL_ARCHITECTURE.md | API names vs glossary |
| YASNOPRO_EVENT_ENGINE_MODEL.md | Typo §2; good otherwise |
| YASNOPRO_AI_CONTEXT_MODEL.md | Designer «создаёт representation» (§250 area) — check legacy line |

---

## 12. Final architecture assessment

### Текущее состояние платформы (документарное)

ЯсноПро находится в фазе **документарного governance maturity jump**: появился согласованный слой терминов и ownership для View, Events, Portal и Tenant, при этом **стратегия миграции раздвоена** между «дожать Stabilization legacy» и «Reset → Designer/Entity Core first».

### Сильные стороны (готовность к масштабированию)

- Чёткая **целевая AOBP-модель** и anti-patterns catalog.
- **Разделение** ViewTemplate / RuntimeRepresentation / ViewSession / UI Command / Domain Event — при соблюдении GLOSSARY реализуемо без переписывания всего UI сразу.
- **Process/Workflow/BPMN** описаны как отдельный orchestration stack, не смешанный с View Engine (при условии PW-02/PW-04 уточнений).

### Слабые стороны

- **Нет единого phase source of truth** — главный blocker governance.
- **Legacy documents** всё ещё задают язык реализации (VIEW_ENGINE, ENTITY).
- **Runtime Engine** и **Session Engine** — термины без полной platform spec.
- **README index** отстаёт от фактического состава `docs/architecture/`.

### Главный вывод для governance

Архитектура **концептуально готова** к controlled parallel build (Designer Core + legacy freeze).  
Архитектура **не готова** к декларации «Stabilization complete» или к unconstrained feature work на legacy table stack без drift.

**Следующий governance-шаг (не код):**  
1) Canonical phase table (1 doc section).  
2) Terminology deprecation banners на VIEW_ENGINE + ENTITY.  
3) README index + mandatory reading path.  
4) Resolve RESET vs STABILIZATION authority с product/architecture owner.

---

*Конец отчёта. Дата governance pass: по состоянию репозитория на момент создания файла.*
