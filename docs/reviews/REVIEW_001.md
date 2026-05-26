REVIEW_001
Фокус: что мешает закрыть PHASE 1 — STABILIZATION по YASNOPRO_MIGRATION_MAP.md, YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md §9, YASNOPRO_ARCHITECTURE_DEBT.md, YASNOPRO_ARCHITECTURE_STATUS.md.

Definition of Done PHASE 1: runtime стабилен, regressions контролируются, state ownership понятен, основные flows deterministic. Сейчас статус документов: IN PROGRESS, State Architecture — UNSTABLE, View Session — UNSTABLE.

Top Critical Problems
Split-brain state (AD-002, CRITICAL) — один и тот же view state живёт в section hooks и table controller, связь через universal-table:state-changed (feedback loop). Любая правка → непредсказуемый порядок обновлений.

Незавершённый tableSessionStore (хуже, чем только globals) — save-handler регистрируется, markTableSessionDirty нигде не вызывается, dirty пишется напрямую в window.__UNIVERSAL_TABLE_DIRTY__. Два контракта save/dirty без единого владельца.

CustomEvent bus как platform integration (AD-003) — 15+ типов universal-table:* между toolbar, section, table, navigation. Нет схемы, нет трассировки, скрытые listeners.

Giant controllers (AD-004) — useUniversalTableController (~1120), PortalPageView (~1395), useUniversalTableEvents (~790). Любой «стабилизирующий» patch бьёт по нескольким слоям сразу.

Representation ≠ Session не разведены даже для PHASE 1 flows — dirty/save/leave завязаны на representations + globals + events одновременно. Save/discard/reload — главный источник регрессий (AD-006).

Детерминизм identity таблицы нарушен — ContentSection может подставить block.id как tableId. Это ломает deterministic flows до начала работы со state.

Giant Controllers
Файл	~размер	Что смешано	Почему блокирует PHASE 1
frontend/src/portal/PortalPageView.jsx
~1395
page runtime, designer (isEditMode), sections/blocks DnD, table preview, modals, entity registry
Нельзя стабилизировать «страницу» изолированно; высокая плотность регрессий
frontend/src/modules/universalTable/hooks/useUniversalTableController.js
~1120
data fetch, filters, sort, columns, card, files, representations props, height, emit state outward
Центр split-brain; useEffect → state-changed на каждое изменение
frontend/src/modules/universalTable/hooks/useUniversalTableEvents.js
~790
весь command-handling через window.addEventListener
Скрытая бизнес-логика UI-команд; нет explicit ownership
frontend/src/modules/sections/hooks/useSectionUniversalTableControls.js
~440+
representations, view state, dirty, dispatch, events
Второй мозг таблицы на уровне section
frontend/src/modules/sections/components/FreeLayoutSection.jsx
~797
layout algorithm + API persistence + pointer handlers
Регрессии resize/position при любом state-fix рядом
backend/app/modules/universal_tables/service.py
крупный monolith
CRUD + column semantics + system comments
Backend regressions при «стабилизации» data contract
Вывод: пока эти файлы — единственные orchestrators, PHASE 1 нельзя закрыть декомпозицией слоёв — только узкие контрактные фиксы (dirty, state owner, events).

Hidden Synchronization
Механизм	Где	Суть
universal-table:state-changed
useUniversalTableController.js (dispatch) ↔ useTableStateEvents.js (listen)
Controller пушит полный snapshot → section перезаписывает useTableViewState + filter state. Циклическая синхронизация.
universal-table:mark-dirty
useTableDirtyState.js (table) → useTableStateEvents.js (section)
Dirty в table поднимает dirty в section через DOM, не через общий store
universal-table:apply-view-state
useUniversalTableDispatch.js ↔ controller/events
Применение representation дублирует путь через events
universal-table:columns-ready
controller dispatch ↔ useSectionUniversalTableControls listen
Скрытый handshake «таблица готова»
Legacy window sync
tableSessionStore.syncLegacyWindowDirty/SaveHandler
Map sessions + window globals без единого write-path
Leave navigation
LeftSidebar → request-leave-confirm → TableRepresentationsBar
Async save через event chain + window.__UNIVERSAL_TABLE_SAVE_HANDLER__
Orphan events
universal-view:active-changed (dispatch без listeners); move-row (listen без dispatch)
Доказательство неконтролируемого event surface
Главный blocker: без удаления/замены state-changed feedback deterministic architecture недостижима в PHASE 1.

Split-Brain State
A. View / columns / filters (самый опасный)
State	Owner 1	Owner 2	Связь
hidden columns, column order
useTableViewState.js (section)
controller internal state
state-changed, update-hidden-columns, apply-view-state
filters, sort, conditions
useTableBasicState.js (section)
controller activeFilter, sortRules, …
dispatch + state-changed
quick filter order
TableViewBar localStorage
table runtime
отдельный ключ universal-table:{blockId}:quick-filter-order
B. Dirty / save (блокирует DoD PHASE 1)
State	Места
isRepresentationDirty
table useTableDirtyState.js
isBaseStateDirty
section useTableDirtyState.js
window.__UNIVERSAL_TABLE_DIRTY__
оба dirty hooks, events, bar state, sidebar
tableSessionStore Map.dirty
не заполняется (API есть, вызовов нет)
save handler
registerTableSessionSaveHandler vs window.__UNIVERSAL_TABLE_SAVE_HANDLER__ vs LeftSidebar direct read
C. Saved representation vs session
Saved	Session/runtime
useTableRepresentations.js → localStorage
section useTableViewState + controller
universal_views (БД)
UniversalTableView + useUniversalViews
(опционально) block.settings
apply через useTableRepresentationApply + events
D. Table identity split-brain
resolveBlockTableId.js — 6+ полей
ContentSection.jsx tableIdentity — fallback tableBlock?.id
Разные ключи localStorage: …:representations, …:quick-filter-order, views visible limit
Architecture Boundary Violations
View ↔ Entity
Backend: universal_table_rows + JSONB = фактический Entity storage (AD-001).
Frontend: useUniversalTable.js — lifecycle rows; EntityCardMain.jsx — findColumnByTitle по русским заголовкам; subtasks как строки таблицы.
Полиморфные ссылки: entity_type=universal_table:{id} в notes/comments — не ObjectType.
Representation ↔ Session State
useTableRepresentations пишет в localStorage при mutate (implicit save).
Dirty representation и dirty «base view» — разные флаги + один global dirty.
useTableRepresentationApply меняет runtime state при hydrate (неявное применение saved → session).
Runtime ↔ Designer
PortalPageView: isEditMode управляет DnD, empty zones, section tools, table preview в одном дереве.
WorkspaceTopBar: вход/выход из edit в runtime chrome.
Admin routes в том же SPA — нет boundary bundle.
Block ↔ business data
block.settings / content / config — все могут нести table_id.
BlocksList прокидывает representations — view session на уровне list, не block scope.
Event ↔ State
CustomEvent выполняет роль state replication и command bus (AD-003) — прямое нарушение STATE_MODEL и будущего Event Engine.
Regression Risk Zones
Критические (трогать только с чеклистом):

useUniversalTableController.js — filters, columns, card, emit events
useSectionUniversalTableControls.js + useTableRepresentationApply.js — apply/save representation
useTableStateEvents.js + useUniversalTableDispatch.js — вся section↔table связь
TableRepresentationsBar.jsx + оба useTableDirtyState.js + LeftSidebar.jsx — save/discard/leave/F5
ContentSection.jsx — tableIdentity fallbacks
PortalPageView.jsx — edit mode, layout, sections
FreeLayoutSection.jsx — grid positions / height
Средние: TableViewBar.jsx, TableFiltersModal.jsx, useQuickFilterEvents.js, UniversalTableView.jsx (второй контур views)

Backend: universal_tables/service.py — serialize_row, column detectors, system comments

PHASE 1 blockers
По MIGRATION_MAP §8 PHASE 1 должен убрать: hidden sync, duplicated state, window.__ globals, giant controllers (контроль), CustomEvent chains.

DoD критерий	Статус	Blocker
Runtime стабилен
❌
save/discard/leave/column reorder — история регрессий из-за split-brain
Regressions контролируются
⚠️
нет явного event/state contract; giant files
State ownership понятен
❌
3–5 владельцев на один block scope
Flows deterministic
❌
state-changed loop, dual dirty, неполный session store
Что НЕ является blocker PHASE 1 (но мешает дальше): Entity Layer, Relation Engine, Event Store, AI Context — это PHASE 3+.

Что является скрытым blocker: незавершённый tableSessionStore — добавляет слой, не закрывая AD-002.

Recommended Stabilization Order
Порядок согласован с PHASE 1 scope (без Entity/redesign). Каждый шаг — 1 bug / 1 patch / 1 commit (ROADMAP §7).

Шаг	Действие	Почему сначала	Ключевые файлы	Регрессия
0
Заморозить массовые refactor и новые universal-table:* / window.__*
Остановить рост хаоса (PHASE 1 цель)
process
—
1
Единый dirty/save контракт на block/table scope — либо довести tableSessionStore (все writes через него), либо временно один scoped global без пустого Map
Блокирует leave/F5/save bar; сейчас split-brain опаснее globals
tableSessionStore.js, оба useTableDirtyState.js, LeftSidebar.jsx, TableRepresentationsBar.jsx, useUniversalTableEvents.js
Высокая
2
Разорвать feedback state-changed — выбрать owner: section или table; второй только читает props/context
Главный hidden sync; без этого нет deterministic flow
useUniversalTableController.js, useTableStateEvents.js, useSectionUniversalTableControls.js
Очень высокая
3
Канонический tableId — убрать block.id fallback; единый resolver
Иначе шаги 1–2 нестабильны на части страниц
ContentSection.jsx, resolveBlockTableId.js, block create flows
Средняя
4
Инвентаризация CustomEvent: kill orphans, документировать dispatch↔listen matrix
Снижает скрытые side effects
dispatch/events hooks, TableViewBar
Средняя
5
Зафиксировать один persistence для toolbar representations на время PHASE 1 (localStorage или server views — не оба в одном UX path)
Убирает implicit save/discard путаницу
useTableRepresentations.js, useUniversalViews.js, bars
Высокая
6
Regression checklist: 2 таблицы на странице, reorder columns, apply rep, dirty leave, F5, embedded block
DoD PHASE 1
manual QA
—
7
Только после 1–6: ограниченная декомпозиция giant hooks (extract без смены behavior)
AD-004; иначе patch density остаётся
controller, events
Высокая
Не в PHASE 1 (отложить): Entity Layer, Relation Engine, Runtime/Designer split (PHASE 7), полная замена CustomEvent на platform bus (PHASE 6), AI agents.

Что не трогать до шагов 1–3: FreeLayoutSection drag/resize, useUniversalTable.js CRUD, fieldTypes, backend serialize semantics.

Краткий вердикт
PHASE 1 не закрыт, потому что платформа ещё не выполняет собственный DoD: state не имеет одного владельца, flows не детерминированы из-за state-changed + dual dirty + незавершённого session store.

Самый большой одиночный blocker: цепочка section view state ↔ controller ↔ CustomEvent ↔ section (split-brain + hidden sync).

Самый большой процессный blocker: правки через giant controllers без regression discipline — каждый «малый» fix становится platform-wide риском.

Для углубления: полная матрица dispatch/listen по всем universal-table:* — рекомендуется отдельная инвентаризация (в коде ≥15 типов событий).