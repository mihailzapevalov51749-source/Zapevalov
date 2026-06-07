# YASNOPRO Platform Modal Standard

## Назначение

Единый стек для рабочих модалок и панелей настроек: перемещение, изменение размера, сохранение геометрии в `localStorage`.

## Стек

| Компонент | Роль |
|-----------|------|
| `usePlatformModalLayout` | bounds, drag, resize, persist/restore |
| `PlatformModalShell` | overlay, panel, resize handles |
| `PlatformModal` | обёртка: layout + Esc + persist on close |

## Запрет кастомных popover

Не использовать для настроек:

```css
position: fixed;
z-index: …;
top / left / width / height на корневом div панели;
```

Исключение только по явному указанию в задаче.

## Object Table View Settings (эталон)

- Файл: `ObjectTableViewSettingsPanel.jsx`
- `modalKey`: `object_table_view_settings_panel`
- `PlatformModal` + custom header (UT reference внутри)
- Заголовок: **Table Representation.name** (не Object View tab)
- Карандаш → `onRename` → `Table Representation.name`

## Checklist

- [ ] drag работает
- [ ] resize работает
- [ ] bounds сохраняются
- [ ] bounds восстанавливаются
- [ ] закрытие через Save / Esc / overlay / unmount сохраняет bounds
- [ ] уникальный `modalKey`

## Footer help (Справка)

Если в footer модалки есть элемент **Справка**, используйте `PlatformModalHelp`:

```jsx
import { PlatformModalHelp } from "../../shared/platformModal";

<PlatformModalHelp
  title="Заголовок"
  description="Краткий текст пояснения..."
/>
```

Правила:

- карточка появляется при **hover** и **focus** на кнопке «Справка»;
- скрывается при **mouse leave**, **blur** и **Escape** (Escape закрывает только справку, не модалку);
- не использовать `window.alert`, `title` attribute или отдельное окно;
- содержимое передаётся через props `title` / `description`;
- карточка рендерится поверх UI (portal), **не меняет высоту footer**.

Файлы: `PlatformModalHelp.jsx`, `platformModalHelp.css`.

## Cursor rule

`.cursor/rules/platform-modal-standard.mdc` — обязательно для агентов.

## Accent zones (Studio / Office)

Модалки наследуют акцентную тему через `data-platform-zone`:

- **Studio** (`/designer/*`) — фиолетовый `#7c3aed`
- **Office** (runtime) — синий `#2563ff`

`PlatformModalShell` проставляет зону на overlay/panel; `PlatformZoneTracker` синхронизирует `document.body`.

Подробнее: [YASNOPRO_PLATFORM_ACCENT_ZONES.md](./YASNOPRO_PLATFORM_ACCENT_ZONES.md)
