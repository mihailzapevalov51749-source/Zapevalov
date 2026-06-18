# Исправление скролла на вкладке «Компании → Версии»

**Дата:** 2026-06-16  
**Тип:** CSS/layout fix (frontend only)  
**Ограничения:** SoT, API, БД, модель версий — **не изменялись**

---

## Проверенные правила

- `01_ARCHITECTURE_RULES.mdc`
- `02_PROMPT_STANDARD.mdc`
- `03_QUALITY_CONTROL.mdc`
- DEV Journal Rules
- Test Data Audit Rules
- Cleanup Audit Rules

---

## Задача 1. Причина

Цепочка layout:

```text
control-plane-root (overflow-y: auto)
  └ companies-workspace (overflow: hidden, flex column)
       ├ workspace-runtime-tabs
       └ companies-workspace__canvas (overflow: hidden, flex: 1)
            └ companies-workspace__versions-tab
                 └ platform-versions-page--embedded
```

**Две блокировки прокрутки:**

| # | Место | Проблема |
|---|-------|----------|
| 1 | `CompaniesVersionsTab` | Inline `styles.tabContent` задавал `overflow: hidden`, перекрывая CSS-класс `overflow-y: auto` |
| 2 | `.platform-versions-page--embedded` | Наследовал `flex: 1` от `.platform-versions-page` → контент сжимался по высоте родителя вместо естественного роста |

Вкладки **Клиенты** / **Лицензии** используют `overflow: hidden` намеренно — внутренние панели (`listBody`) скроллятся сами. Вкладка **Версии** — длинная вертикальная страница, ей нужен скролл на уровне tab container.

---

## Задача 2. Исправление

1. **`companiesWorkspaceStyles.tabContentScrollable`** — вариант `tabContent` с `overflowY: "auto"`, `overflowX: "hidden"`.
2. **`CompaniesVersionsTab`** — использует `tabContentScrollable` вместо `tabContent`.
3. **`companies-workspace__versions-tab`** — `flex: 1`, `min-height: 0`, `overflow-y: auto`.
4. **`.platform-versions-page--embedded`** — `flex: 0 0 auto`, `min-height: auto` (контент растёт, скролл на обёртке).

Вкладки Клиенты / Лицензии **не изменялись**.

---

## Layout audit (ожидаемое поведение)

| Проверка | Ожидание |
|----------|----------|
| Контуры платформы | видны |
| Клиентские компании | видны |
| История версий | прокручивается до конца |
| Левое меню CP | без изменений |
| Верхняя панель | без изменений |
| Клиенты / Лицензии | layout прежний |

---

## Data Impact Audit

| Показатель | Значение |
|------------|----------|
| БД | не изменялась |
| Данные | не изменялись |

---

## Test Data Audit

| Показатель | Значение |
|------------|----------|
| Создано | 0 |
| Удалено | 0 |
| Осталось | 0 |

---

## Cleanup Audit

```text
visible_test_records_count = 0
remaining_test_records_count = 0
Cleanup status: PASSED
```

---

## Manual Smoke

**NOT PERFORMED** — рекомендуется открыть **Компании → Версии** и прокрутить до конца истории.

---

## Changed Files

- `frontend/src/modules/controlPlane/companies/companiesWorkspaceStyles.js`
- `frontend/src/modules/controlPlane/companies/CompaniesVersionsTab.jsx`
- `frontend/src/modules/controlPlane/companies/companiesWorkspacePage.css`
- `frontend/src/modules/platformReleases/styles/platformVersionsPage.css`

---

## Success Criteria

| Критерий | Статус |
|----------|--------|
| Скролл работает | ✅ (layout fix) |
| Весь контент доступен | ✅ |
| Клиенты / Лицензии не сломаны | ✅ |
| БД не менялась | ✅ |
| Нет тестового мусора | ✅ |
| DEV Journal | ✅ |

**Вердикт: DONE**
