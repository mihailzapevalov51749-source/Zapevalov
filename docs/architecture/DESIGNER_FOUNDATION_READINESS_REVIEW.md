# DESIGNER FOUNDATION READINESS REVIEW

**Тип:** финальная governance-проверка перед реализацией  
**Контекст:** AOBP, parallel Platform Core, Designer Foundation как основной фокус, legacy Runtime — support only  
**Canonical authority:** `YASNOPRO_ARCHITECTURE_DIRECTION.md` (P0)  
**Режим:** только аудит; документы и код не изменялись  

**Проверено:** 26 файлов в `docs/architecture/` (включая пустой `YASNOPRO_RUNTIME_FOUNDATION_PLAN.md`).

---

## 1. Итоговая оценка готовности

### Готова ли архитектура к началу реализации Designer Foundation?

**Ответ: ДА — с оговорками (conditional go).**

Архитектура **достаточна для старта ограниченного Designer Foundation Slice 1** (Entity/Object modeling + Designer Shell + draft/publish metadata).  
Архитектура **недостаточна для одномоментной реализации полного** Designer Foundation (все 14 перечисленных designer-слоёв включая BPMN, Workflow runtime bindings, AI Context Designer, Permissions Designer, Designer Workspace).

### Степень готовности

| Область | Оценка | Комментарий |
|---------|--------|-------------|
| Стратегическое направление | **~90%** | `ARCHITECTURE_DIRECTION` снимает конфликт RESET vs STABILIZATION |
| Governance / terminology | **~80%** | GLOSSARY, VIEW_OWNERSHIP, RUNTIME_DESIGNER |
| Ownership contracts (conceptual) | **~75%** | Матрицы есть; не хватает API-level contracts |
| Designer Foundation (full stack) | **~45%** | Process/BPMN/Permissions/AI Designer — spec-heavy, implementation-light |
| Runtime Foundation (implementation) | **~25%** | Contracts частично; **RUNTIME_FOUNDATION_PLAN пуст** |
| Legacy boundary clarity | **~85%** | PLATFORM_CORE transition contract + DIRECTION |

**Сводная готовность к старту Slice 1:** **~72%** (architecture governance).  
**Сводная готовность к «полному» Designer Foundation:** **~48%**.

### Главные сильные стороны

1. **`YASNOPRO_ARCHITECTURE_DIRECTION.md`** — официальный parallel development, legacy freeze rules, Universal Table = transitional View Engine, Designer Foundation = architecturally active, canonical migration authority.
2. **`YASNOPRO_ARCHITECTURE_GLOSSARY.md` + View Ownership Model** — чёткое разделение ViewTemplate / RuntimeRepresentation / ViewSession; Designer Configuration vs Runtime Personalization.
3. **`YASNOPRO_RUNTIME_DESIGNER_MODEL.md`** — Designer создаёт definitions; Runtime потребляет published models; draft/published в Designer State.
4. **`YASNOPRO_PLATFORM_CORE.md`** — ObjectType, Field Definition, Relation Definition, ViewTemplate, LayoutTemplate, Entity Layer SoT, Universal Table transition contract.
5. **Process/Workflow models** — Workflow ≠ Process; Designer Definition / Runtime Instance; Event Engine owns history (для будущих фаз, не блокирует Slice 1).

### Главные риски

1. **`YASNOPRO_RUNTIME_FOUNDATION_PLAN.md` — пустой файл** при объявленном «Runtime Foundation → active formation».
2. **Нет `YASNOPRO_DESIGNER_FOUNDATION_PLAN.md`** — нет governing implementation slice, DoD, порядка модулей.
3. **`YASNOPRO_ARCHITECTURE_STATUS.md` / `MIGRATION_MAP`** не синхронизированы с DIRECTION (Phase 1 = Stabilization IN PROGRESS vs DIRECTION «stabilization completed enough»).
4. **Publish / Runtime consumption** — размазаны по RUNTIME_DESIGNER, VIEW_OWNERSHIP, PERSONALIZATION; нет единого Publish & Consumption contract.
5. **Реализация может «прилипнуть» к legacy** (admin UI, `universal_tables`, PortalPageView) — архитектурно запрещено, но не закреплено техническими границами (отдельный route, отдельные tables).
6. **Permissions Designer, AI Context Designer, Designer Navigation/Workspace** — почти нет отдельных contracts.

---

## 2. Architecture consistency review

### Противоречия и их статус

| # | Тема | Документы | Статус после DIRECTION |
|---|------|-----------|------------------------|
| C1 | **PHASE 1** = Stabilization vs Designer/Entity Core | MIGRATION §8, STATUS §3, RESET §8, DIRECTION §205–245 | **Снято governance:** DIRECTION P0 — stabilization = bounded, «completed enough»; приоритет — Platform Core / Designer |
| C2 | **Runtime Foundation Plan** vs Direction | DIRECTION §340–367, файл RUNTIME_FOUNDATION_PLAN | **Открытый gap:** plan file empty |
| C3 | **Designer Foundation** vs **Runtime/Designer Split Phase 7** | MIGRATION §14 (Designer Shell phase 7), DIRECTION (Designer active now) | **Согласуемо:** split shell можно делать инкрементально; Designer Foundation ≠ полный split |
| C4 | **Entity Layer** в MIGRATION Phase 4 vs RESET/DIRECTION Phase 1 | MIGRATION §11, RESET §8 | **Снято:** DIRECTION + RESET — Entity/Object в первом новом контуре |
| C5 | **README** не индексирует DIRECTION, GLOSSARY, governance docs | README | **Minor:** не блокирует старт, риск обхода |
| C6 | **VIEW_ENGINE / ENTITY_MODEL** — legacy term `representation` | VIEW_ENGINE, ENTITY | **Не блокирует Slice 1** если команда обязана GLOSSARY |
| C7 | **TARGET §119** «Views» vs ViewTemplate | TARGET Designer Shell | **Терминология:** использовать ViewTemplate в реализации |
| C8 | **Process Engine** в DIRECTION как «сформирован» vs STATUS NOT IMPLEMENTED | DIRECTION §274, STATUS | **Различие docs vs code:** architecturally formed ≠ implemented — OK для Designer start |

### Согласованность с заявленным контекстом (пользователь)

| Утверждение контекста | Подтверждение в docs |
|------------------------|---------------------|
| Фокус — Designer Foundation | DIRECTION §370–387, RESET §8, PLATFORM_CORE §986 |
| Runtime не переписывается целиком | DIRECTION §99–137, RESET §7.1 |
| Legacy UT = transitional View Engine | DIRECTION §167–202, PLATFORM_CORE §718+ |
| Новый core parallel | DIRECTION §259–265, RESET |
| Запрет new capabilities на legacy | DIRECTION §155–163 |

**Вывод:** **противоречие Direction ↔ текущий фокус на Designer — отсутствует.** Противоречие **Direction ↔ пустой Runtime Foundation Plan** — есть.

---

## 3. Ownership readiness

### Уже определённые owner'ы (достаточно для Slice 1)

| Сущность | Owner (canonical) | Источник | Persistence / scope |
|----------|-------------------|----------|---------------------|
| **ObjectType** | Designer Layer → platform registry / Entity Layer metadata | GLOSSARY, PLATFORM_CORE §4.1, TARGET §8 | company / tenant; draft→published |
| **Field Definition** | Designer Layer (часть ObjectType) | GLOSSARY, PLATFORM_CORE §4.3, ENTITY | с ObjectType |
| **Relation Definition** | Designer Layer; graph — Relation Engine | GLOSSARY, RELATION, PROCESS bindings | designer-published |
| **ViewTemplate** | Designer Layer | GLOSSARY, VIEW_OWNERSHIP, RUNTIME_DESIGNER §30 | published configuration |
| **LayoutTemplate** | Designer Layer | GLOSSARY, VIEW_OWNERSHIP | company/global |
| **RuntimeRepresentation** | Runtime Personalization Layer | GLOSSARY, VIEW_OWNERSHIP, TARGET §14 | personal/team; tenant-scoped |
| **ViewSession** | Runtime Engine / Session | GLOSSARY, STATE §16, VIEW_OWNERSHIP | temporary |
| **RuntimeWorkspace** | Runtime Personalization | GLOSSARY, PORTAL, SCOPE | personal/team/department |
| **Process Definition** | Designer Layer | PROCESS §101–136 | designer; BPMN graph inside |
| **Workflow Definition** | Designer Layer | WORKFLOW §118–145 | designer |
| **Process Instance / runtime execution** | Process Engine orchestrates; Workflow Engine executes SM | PROCESS, WORKFLOW | runtime |
| **Workflow Instance** | Workflow Engine | WORKFLOW | runtime |
| **Workflow / Process history** | Event Engine (canonical) | WORKFLOW, PROCESS, GLOSSARY | persisted events |
| **RuntimeLayoutDelta** | Layout Engine (spatial); policy — Personalization | VIEW_OWNERSHIP | personal/team |

### Ownership gaps (не блокируют Slice 1, блокируют поздние слайсы)

| Gap | Влияние |
|-----|---------|
| **Representation Engine** vs **Runtime Personalization Layer** — роли engine vs layer | Реализация persistence module |
| **Runtime Engine** не формализован как модуль | ViewSession store naming |
| **Runtime Process State** owner «Runtime Engine» vs Process Engine | Process runtime UI |
| **Permissions** — нет Permissions Designer model | Permissions Designer slice |
| **Designer draft/publish** — нет единой state machine (только упоминания) | Publish System |

---

## 4. Designer readiness

Оценка **архитектурной** готовности к реализации (не кода).

| Designer layer | Readiness | Обоснование |
|----------------|-----------|-------------|
| **Object Designer (ObjectType)** | **READY** | PLATFORM_CORE, ENTITY, GLOSSARY, TECHNICAL ObjectType Service |
| **Field Designer** | **READY** | Field Definition в GLOSSARY/CORE; reusable fields principle |
| **Relation Designer** | **READY (MVP)** | RELATION_ENGINE_MODEL §35–36 structures; binding to ObjectType in PROCESS |
| **ViewTemplate Designer** | **READY (MVP)** | VIEW_OWNERSHIP matrix; RUNTIME_DESIGNER §30; legacy VIEW_ENGINE terms — риск naming only |
| **LayoutTemplate Designer** | **PARTIAL** | GLOSSARY + PORTAL; нет designer UI composition spec |
| **Process Designer** | **PARTIAL** | PROCESS_ENGINE — rich spec; **defer execution/runtime** |
| **BPMN Designer** | **NOT YET** | Executable BPMN direction clear; нет designer UX/graph editor contract, versioning |
| **Workflow Designer** | **PARTIAL** | WORKFLOW definition clear; после Process Definition bindings |
| **Permissions Designer** | **NOT YET** | SCOPE formula + TECHNICAL levels; нет designer artifact model |
| **AI Context Designer** | **NOT YET** | AI_CONTEXT Designer AI §31; нет configuration schema / bindings contract |
| **Publish System** | **PARTIAL** | draft/published в RUNTIME_DESIGNER §331; VIEW_OWNERSHIP publish rules; **нет единого doc** |
| **Designer Navigation** | **NOT YET** | TARGET «Designer Shell» list only |
| **Designer Workspace** | **NOT YET** | Runtime Workspace описан; Designer Workspace — нет (риск смешения с Runtime Workspace) |
| **Designer Composition** | **NOT YET** | PORTAL Designer Composition vs Runtime Composition — partial |

### Разделение Designer Foundation vs Runtime (п.4–5 запроса)

| Пара | Статус в docs |
|------|----------------|
| Designer Foundation vs Runtime Personalization | **OK** — GLOSSARY, RUNTIME_DESIGNER, PERSONALIZATION |
| RuntimeRepresentation vs ViewSession | **OK** — VIEW_OWNERSHIP, STATE |
| Process Definition vs Workflow Definition vs BPMN vs Execution | **OK** — WORKFLOW ≠ Process; PROCESS orchestrates; **не смешивать с personalization** |
| Runtime Personalization vs Process/Workflow | **OK** — filters/representations не владеют workflow state |

---

## 5. Runtime dependency risks

### Требует ли Designer Foundation полной Runtime Foundation?

**Нет** — по canonical docs:

- DIRECTION §340–367: Runtime Foundation **partially architecturally formed**; Runtime Engine **не реализован полностью**.
- RESET §8: Designer Layer **независимо** от legacy Universal Table runtime.
- DIRECTION §259–265: новая архитектура **рядом**, не поверх legacy controllers.

**Минимум для Designer Slice 1:**

- tenant boundary (SCOPE_TENANT);
- draft/publish metadata store (новые tables/services);
- Designer Shell (отдельный frontend contour);
- **не** требуется: стабильный ViewSession, Representation save в legacy, Process Instance runtime.

### Опасности из legacy runtime

| Risk | Описание | Mitigation (architecture, не code) |
|------|----------|-------------------------------------|
| R1 | Реализация Designer внутри `PortalPageView` / admin modules | Отдельный Designer Shell route; DIRECTION governance check |
| R2 | ObjectType = `universal_table_columns` | Запрет в DIRECTION/PLATFORM_CORE; новые modules only |
| R3 | ViewTemplate = `universal_views` / localStorage representations | Явный новый ViewTemplate store; legacy read-only adapter позже |
| R4 | Publish ломает legacy toolbar | Publish affects **only** new catalog; legacy until adapter |
| R5 | Shared DB migrations без tenant_id | SCOPE_TENANT mandatory fields |
| R6 | Команда «дожимает» Phase 2 View Session в legacy вместо Designer | DIRECTION: Platform Core priority |

### Universal Table как transitional layer

**Согласовано** в DIRECTION §167–202, PLATFORM_CORE §718–816, RESET §21:

- UT не SoT;
- inline edit → Entity Command (when Entity exists);
- Designer **не зависит** от UT.

---

## 6. Missing architectural contracts

### Критично до или в начале Slice 1

| Документ / contract | Зачем | Статус |
|---------------------|-------|--------|
| **`YASNOPRO_DESIGNER_FOUNDATION_PLAN.md`** | Slices, DoD, module order, out-of-scope | **ОТСУТСТВУЕТ — рекомендуется** |
| **`YASNOPRO_RUNTIME_FOUNDATION_PLAN.md`** (наполнение) | Что именно stabilizes в legacy vs что не трогаем | **Файл пуст** |
| **Designer Publish & Consumption Contract** (можно раздел в DESIGNER_FOUNDATION_PLAN) | draft/publish/deprecate; runtime read-only catalog | Размазано |
| **Designer API contract** (resources: object-types, fields, relations, view-templates) | Backend/frontend boundary | Только TECHNICAL service names |
| **Sync STATUS / MIGRATION** с DIRECTION | Избежать споров «можно ли начинать» | STATUS устарел |

### Желательно до Slice 2+

| Contract | Для |
|----------|-----|
| Permissions Designer Model | Permissions Designer |
| Designer Navigation & Information Architecture | Designer Shell UX |
| Designer Workspace (vs Runtime Workspace) | аналитик composition |
| BPMN Designer / graph persistence | Process Designer UI |
| AI Context binding schema | AI Context Designer |
| Entity API read contract for Runtime (future) | Table View Engine adapter |

### Нужен ли отдельный `YASNOPRO_DESIGNER_FOUNDATION_PLAN.md`?

**Да, рекомендуется как governing document** (вопрос 7).

**Причины:**

- `ARCHITECTURE_DIRECTION` — strategy, не implementation slices;
- `RESET_STRATEGY` — migration philosophy;
- `RUNTIME_FOUNDATION_PLAN` — пуст;
- MIGRATION_MAP — legacy phase numbering, не Designer backlog;
- без PLAN команды реализуют «весь Designer сразу» (BPMN, Permissions, AI) → regression и scope explosion.

**Минимальное содержание PLAN (рекомендация содержания, не создание файла):**

1. Slice 1 scope (ObjectType, Field, Relation Definition MVP, Designer Shell, Publish draft);
2. Explicit out-of-scope;
3. DoD per slice;
4. Legacy touch policy (bugfix only);
5. Dependency graph (Entity API before Runtime adapter).

---

## 7. Recommended first implementation steps

Порядок **архитектурно безопасный** для Runtime (не implementation spec).

| Step | Что | Почему первым | Риск для legacy |
|------|-----|---------------|-----------------|
| 1 | Принять **DESIGNER_FOUNDATION_PLAN** (governance) + заполнить **RUNTIME_FOUNDATION_PLAN** (bounded legacy) | Фиксирует scope | Нет |
| 2 | **Designer Shell** — отдельный app contour (route, permissions, navigation skeleton) | Не трогает PortalPageView | Низкий |
| 3 | **Backend: ObjectType + FieldDefinition** (tenant-scoped, draft/publish) | Core SoT без UI table | Низкий |
| 4 | **Object Designer UI** (CRUD ObjectType, fields) | Ценность для аналитика | Низкий |
| 5 | **Relation Definition MVP** (без graph UI luxury) | Связь object model | Низкий |
| 6 | **Publish service v1** (publish ObjectType; invalidates nothing in legacy) | Contract foundation | Низкий |
| 7 | **Read-only Published Catalog API** (internal) | Подготовка consumption без legacy wiring | Низкий |
| 8 | **ViewTemplate Designer MVP** (metadata only, без runtime render) | После ObjectType stable | Низкий |
| 9 | **LayoutTemplate MVP** (optional in Slice 1) | Можно Slice 2 | Низкий |

**Не включать в первый шаг:** BPMN editor, Workflow Instance, Process Instance runtime, AI Context config UI, Permissions matrix UI, legacy table refactor, Entity runtime in production portal.

---

## 8. What must NOT be implemented yet

| Категория | Что нельзя | Почему |
|-----------|------------|--------|
| Legacy core | Массовый refactor `useUniversalTableController`, `PortalPageView` | DIRECTION: bounded legacy support |
| Legacy SoT | Новые business entities только в `universal_table_rows` | AD-001, RESET |
| Runtime features | Полный Runtime Shell, View Session rewrite, representation unification в legacy | RUNTIME_FOUNDATION not defined |
| Process runtime | Process Instance execution, BPMN runtime engine | Spec exists; execution — later phase |
| Workflow runtime | Workflow Instance, automation triggers | After Event Engine foundation |
| Designer advanced | BPMN Designer, Permissions Designer, AI Context Designer | Contracts NOT YET |
| Integration | Forcing legacy UT to use Entity API under pressure | Adapter — after Entity stable |
| Platform | Event Store, Relation Instance at scale, AI Agents | Later migration phases |
| Governance violation | New `window.__*`, new `universal-table:*` for designer | EVENT_BUS, DIRECTION |

---

## 9. Architecture stage assessment

### 1. Завершена ли Architecture Governance Phase?

**Достаточно для перехода — ДА** (по `ARCHITECTURE_DIRECTION`):

- canonical authority назначен;
- glossary + ownership + event bus + portal + scope exist;
- `ARCHITECTURE_ALIGNMENT_REVIEW` выполнен;
- stabilization = **bounded**, не gate для Designer.

**Формально в `ARCHITECTURE_STATUS` — всё ещё IN PROGRESS** → обновление STATUS рекомендуется, но **не блокирует go** при принятии DIRECTION.

### 2. Готова ли платформа к Designer Foundation?

**К Slice 1 — ДА.**  
**К полному Designer Foundation — НЕТ.**

### 3. Текущая стадия платформы

По `ARCHITECTURE_DIRECTION` §528–538 (официально):

```text
Architecture Stabilization → completed enough for transition
Platform Runtime Foundation → active formation (contracts partial; plan empty)
Platform Core Formation → active
Designer Foundation → architecturally active → implementation may start (Slice 1)
```

**Не путать:**

| Стадия | Статус |
|--------|--------|
| Platform Runtime Foundation | Формирование **контрактов**; legacy runtime **живой**; plan doc пуст |
| Designer Foundation | **Старт реализации Slice 1** разрешён governance |
| Platform Core Formation | Параллельно: Entity/ObjectType — первый materialized core |

### 4. Зрелые layers для implementation

| Layer | Зрелость для implementation |
|-------|----------------------------|
| Architecture Direction / Glossary | **High** |
| Runtime/Designer separation | **High** |
| ViewTemplate / RuntimeRepresentation ownership | **High** (MVP) |
| Scope / Tenant | **High** |
| Entity / ObjectType / Field (concept) | **High** |
| Relation Definition (concept) | **Medium-High** |
| Publish flow (concept) | **Medium** |
| Portal/Layout (designer templates) | **Medium** |
| Process/Workflow/BPMN (designer UI) | **Low** (spec only) |
| Event/Relation engines (runtime) | **Low** (not started) |
| AI Context Designer | **Low** |

---

## 10. Final recommendation

### Можно ли начинать реализацию Designer Foundation?

**ДА — начать Designer Foundation Slice 1** при выполнении governance preconditions:

1. Зафиксировать **`YASNOPRO_ARCHITECTURE_DIRECTION.md`** как единственный arbiter фаз (команда / README).
2. **Создать `YASNOPRO_DESIGNER_FOUNDATION_PLAN.md`** (governing; не код) — обязательный precondition.
3. **Заполнить или заменить** пустой `YASNOPRO_RUNTIME_FOUNDATION_PLAN.md` — что legacy stabilizes, что frozen.
4. Обязательная reading path: DIRECTION → GLOSSARY → PLATFORM_CORE (§4, §718) → RUNTIME_DESIGNER → VIEW_OWNERSHIP → SCOPE_TENANT.
5. Implementation rule: **новые backend modules + `frontend/src/designer/`** (или аналог по TECHNICAL §10); **zero dependency** on `useUniversalTableController` for metadata CRUD.

### Нельзя объявлять

- «Designer Foundation complete» до PLAN slices 2+;
- «Runtime Foundation ready» пока plan пуст и legacy state UNSTABLE в STATUS;
- Process/BPMN/Workflow **runtime** как часть первого релиза Designer.

### Publish / Runtime consumption (п. проверки)

| Роль | Согласовано в docs |
|------|-------------------|
| Designer создаёт metadata | **ДА** — ObjectType, Field, Relation, ViewTemplate, LayoutTemplate, Process/Workflow Definition |
| Designer публикует модели | **ДА** — draft/published (RUNTIME_DESIGNER §331; VIEW_OWNERSHIP publish rules) |
| Runtime потребляет published | **ДА** — RUNTIME_DESIGNER §29, DIRECTION §437–442 |
| Runtime не меняет schema | **ДА** — RUNTIME_DESIGNER §77–88, PERSONALIZATION restrictions |
| Runtime не владеет definitions | **ДА** — ownership tables §3 |

**Gap:** нет одного **versioned catalog contract** (как runtime узнаёт published version, rollback, compatibility) — закрыть в DESIGNER_FOUNDATION_PLAN §Publish.

### Итоговая формула

```text
Архитектура готова начать Designer Foundation
как новый parallel Platform Core contour,

не как переписывание Runtime,

не как расширение Universal Table,

и не как полный BPMN/Permissions/AI Designer в первом релизе.
```

---

*Governance audit complete. Следующий шаг вне scope ревью: authoring `YASNOPRO_DESIGNER_FOUNDATION_PLAN.md` (документ, не код).*
