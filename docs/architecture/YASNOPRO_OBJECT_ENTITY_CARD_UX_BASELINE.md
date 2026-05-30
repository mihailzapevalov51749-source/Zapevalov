# Object Entity Card — UX Baseline

Целевая runtime-карточка экземпляра объекта (`modules/objectEntities`) — основная платформенная карточка для Object Views.

Принцип: **зрелый визуальный UX без дублирования Universal Table Card**. Архитектура object-centric; UT Card — reference по паттернам, не по коду.

## Визуальный принцип

1. **Hero Header** — идентичность объекта (ID, название, мета-строка, действия).
2. **Отдельная полоса вкладок** — Поля / Заметки / Вложения под header, не внутри него.
3. **Двухколоночное рабочее пространство** — основной контент + комментарии справа (300px).
4. **Иерархия полей** — «Основное» / «Дополнительно» (только presentation).
5. **Одна точка сохранения** — кнопка «Сохранить» только в header (footer удалён).

## PR-A (завершён)

- Hero Header, tabs, fields grouping, comments shell, footer removal, build/runtime-boundaries OK.

## PR-A2 (стабилизация)

| Область | Решение |
|--------|---------|
| Overlay offset | `paddingLeft` через `resolveEntityCardInset()` → `LAYOUT_TOKENS.overlay.entityCardInset` (350). Не `resolveWorkspaceLeftOffset` (220) — иначе ломается выравнивание. |
| Notes badge | `EntityNotesEditor.onCountChange` → `ObjectEntityNotes` → `ObjectEntityCardView` (0/1, без нового API). |
| Attachments count | `countEntityAttachmentFiles` = `collectAttachmentFiles(...).length` (та же нормализация, что у панели). |
| Empty states | Контейнерные hint-блоки в `ObjectEntityCardView` + стили в `objectEntityCard.css`. |
| Header meta | Пустые `—`/автор/дата не рендерятся; статус не дублируется в «Основное». |
| Comments sidebar | 300px / min 240px; `@media (max-width: 1080px)` → 260px; `overflow: auto` в body. |

### Overlay — TODO (Phase 2)

Динамический offset от AppShell (`sidebarCollapsed`, `workspaceLeftOffset`) **не подключён** намеренно:

- `resolveWorkspaceLeftOffset` даёт ~220px (runtime sidebar).
- Entity card overlay использует **entityCardInset 350** (legacy UT + portal chrome).
- См. `UniversalTableModals.jsx` TODO и `overlayGeometry.ts`.

Безопасный контракт сегодня: `resolveEntityCardInset()` из `shared/layout/overlayGeometry.ts`.

## Что НЕ входит (PR-A / PR-A2)

- Runtime Entity / comments / notes / attachments API
- Notification routing, identity, gateways
- `published_runtime_ref`, `initialContext` contract
- `EntityNotesEditor` / `EntityAttachmentsPanel` / `CommentsPanel` API
- Checklist, related rows, parent entity
- Inline save, activity feed, workflow

## PR-B — Card Settings & Configurable Sections (завершён)

### Аудит storage

| Источник | Вывод |
|---------|--------|
| `useObjectViewPersistence` | `updateView` → `settings_json.objectView.presentation` |
| `objectViewContract` | `presentation.table` уже используется для колонок |
| `table.settings.rowCard` (UT) | **Не используется** — legacy, не переносим |
| Object Type / catalog | Отдельного card layout нет |
| Session | `useObjectViewSession` — transient deltas |

### Выбранный storage

**View Definition `settings_json` → `objectView.presentation.card`**

Путь: `buildObjectViewPayload` → `settings_json.objectView.presentation.card`

Persistence: **DONE** (через существующий `designerApi.updateView` / `saveView`, без нового backend).

### Модель `presentation.card`

```json
{
  "sections": [
    { "id": "primary", "title": "Основное", "fieldKeys": [], "visible": true, "order": 0 },
    { "id": "additional", "title": "Дополнительно", "fieldKeys": [], "visible": true, "order": 1 }
  ],
  "tabs": [
    { "id": "fields", "visible": true, "order": 0 },
    { "id": "notes", "visible": true, "order": 1 },
    { "id": "attachments", "visible": true, "order": 2 }
  ],
  "hiddenFieldKeys": []
}
```

Default builder: `buildDefaultObjectEntityCardLayout` (= `fieldPanelGrouping` Основное/Дополнительно).

### Поддержано / не поддержано

| Поддержано | Не поддержано |
|-----------|----------------|
| Видимость секций, полей, вкладок | Drag-and-drop |
| Порядок секций/вкладок (↑↓) | Checklist, related rows, parent |
| Сохранение в view settings | Per-user runtime representation |
| Settings panel в hero header | Object Type global card (только per-view) |
| Session overlay до save view | Миграция UT `rowCard` |

### UI

- `ObjectEntityCardSettingsPanel` — slide-over справа
- Кнопка ⚙ в hero header (если есть `viewId`, не studio-preview)
- `ObjectEntityFieldsPanel` / `ObjectEntityCardTabs` читают normalized layout

## PR-D1 — Hero v2 + Context Strip (завершён)

- Порядок: **Title → Context Strip → Meta (P1/P2/P3) → System info** (UUID не в фокусе).
- Title редактируется в Hero (`FieldEditor`), исключён из вкладки «Поля».
- Meta P1: статус, исполнитель, срок; P2: изменён; P3: тип, автор (если уместно).
- `EntityCardHeroContextStrip` — слот под parent chain (PR-C5).
- `EntityCardSystemInfo` — collapsible ID / created / updated / version.
- Индикатор несохранённых изменений на кнопке «Сохранить».

## PR-D3 — Exact visual parity (entityCard folder as SoT)

- Modal/Layout/Header/Comments/Settings — стили и компоненты из `universalTable/components/entityCard/`.
- OEC не использует `shared/entityCardShell` для layout/modal.
- Relations list — `entityCardSubtasksStyles`.
- Удалены PR-D1/PR-A orphan styles и components.

## PR-D2 — Visual convergence with UT Card (завершён)

- Секции как UT: Parent → Main → Fields grid → Attachments → Tabs block.
- Header UT: Назад + № + toolbar (Save, Settings, Close).
- Убраны Hero / global tabs / context strip / system info.
- Notes + Relations — inner tabs (expand/collapse), runtime data без изменений.

## PR-D1 — отменён по направлению

Hero v2 (Linear-style) заменён PR-D2; референс — UT Card.

## PR-C2/C3 — Related Entities tab (завершён)

- Вкладка **Связи** (`relations`) в Object Entity Card.
- Read-only список через `runtime_relation_instances` + `catalog.relations`.
- Группировка по relation key / direction; open related entity (same object type).
- Без legacy `parent_id` / UT Related Rows.
- Детали: [YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md](./YASNOPRO_RUNTIME_RELATIONS_CARD_INTEGRATION.md)

## PR-C4+ (следующие)

- Create/delete relation UI
- Parent shortcut в hero (PR-C5)
- Cross-object type card open / route
- Backend relations summary endpoint (optional)
- Checklist tab

## Ключевые файлы

```
frontend/src/modules/objectEntities/
  ObjectEntityCardView.jsx
  ObjectEntityCardModal.jsx
  services/objectEntityCardLayout.js
  hooks/useObjectEntityCardSettings.js
  components/ObjectEntityCardSettingsPanel.jsx
  components/ObjectEntityCardHeader.jsx
  components/ObjectEntityCardTabs.jsx
  components/ObjectEntityFieldsPanel.jsx
  components/ObjectEntityComments.jsx
  objectEntityCard.css

frontend/src/modules/objectViews/services/
  objectViewContract.js (presentation.card)
  mergeEffectiveContract.js / contractGuards.js / buildObjectViewPayload.js

frontend/src/shared/entityCardShell/
frontend/src/shared/layout/overlayGeometry.ts
frontend/src/shared/layout/layoutTokens.ts  → overlay.entityCardInset
```
