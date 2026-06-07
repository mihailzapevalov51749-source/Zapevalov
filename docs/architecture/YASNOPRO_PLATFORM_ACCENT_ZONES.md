# YASNOPRO Platform Accent Zones

## Правило дизайн-системы

Платформа ЯсноПро разделена на две визуальные среды с разными акцентными цветами:

| Среда | Маршрут | Акцент | Hex |
|-------|---------|--------|-----|
| **Studio** | `/designer/*` | Фиолетовый | `#7c3aed` |
| **Office** | `/portal/*`, runtime и прочие рабочие маршруты | Синий | `#2563ff` |

Акцент применяется к:

- Primary-кнопкам
- Активным вкладкам и пунктам меню
- Фокусу полей ввода
- Toggle / checkbox (`accent-color`)
- Badge, Progress, иконкам действий

## Единый источник истины

| Артефакт | Путь |
|----------|------|
| CSS-тokens | `frontend/src/shared/platformAccent/platformAccentTokens.css` |
| Определение зоны по маршруту | `frontend/src/shared/platformAccent/platformZone.js` |
| Синхронизация `body` | `frontend/src/shared/platformAccent/PlatformZoneTracker.jsx` |
| Hook для компонентов | `frontend/src/shared/platformAccent/usePlatformZone.js` |

### Semantic CSS variables

На элементе с `data-platform-zone="studio|office"` доступны:

- `--platform-accent`
- `--platform-accent-hover`
- `--platform-accent-soft`
- `--platform-accent-border`
- `--platform-accent-muted` (disabled primary)
- `--platform-accent-on-soft`
- `--platform-accent-active-bg`
- `--platform-accent-active-text`
- `--platform-accent-focus-ring`

Legacy alias для Studio-компонентов:

- `--designer-accent` → `--platform-accent`
- `--designer-accent-hover`, `--designer-accent-soft`, `--designer-accent-border`

## Как система определяет среду

```text
pathname.startsWith("/designer") → Studio (purple)
иначе → Office (blue)
```

`PlatformZoneTracker` в `App.jsx` выставляет `data-platform-zone` на `document.body` при каждой навигации.

`PlatformModal` (portal в `document.body`) дополнительно проставляет `data-platform-zone` на overlay/panel — модалки наследуют тему без хардкода в каждой модалке.

Shell-обёртки:

- `DesignerShell` / `AppShellFrame platformZone="studio"`
- `PortalLayout` / `AppShellFrame platformZone="office"`

## Запреты

- Не хардкодить `#2563ff` / `#7c3aed` в модалках и формах — использовать `var(--platform-accent*)`.
- Не создавать отдельную тему для одной модалки.
- Не дублировать палитры — расширять `platformAccentTokens.css`.

## PlatformModal

Модалки на `PlatformModal` автоматически получают акцент текущей среды. Footer primary disabled использует `--platform-accent-muted`.

См. также: [YASNOPRO_PLATFORM_MODAL_STANDARD.md](./YASNOPRO_PLATFORM_MODAL_STANDARD.md)
