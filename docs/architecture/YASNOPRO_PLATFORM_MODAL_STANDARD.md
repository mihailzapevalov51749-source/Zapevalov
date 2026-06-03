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

## Cursor rule

`.cursor/rules/platform-modal-standard.mdc` — обязательно для агентов.
