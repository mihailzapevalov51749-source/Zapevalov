# YASNOPRO APP SHELL ARCHITECTURE

## Статус

DRAFT

---

# 1. Назначение документа

Документ определяет архитектуру единой оболочки платформы YasnoPro.

Цель:
создать единый AppShell для всех режимов платформы:

- Runtime
- Designer
- Admin
- AI
- System
- Tenant Workspaces

Документ фиксирует:

- архитектурные принципы shell;
- роль sidebar/header/workspace;
- tenant-модель;
- role/mode separation;
- правила расширения платформы;
- принципы единого shell state.

---

# 2. Главный архитектурный принцип

## Runtime и Designer — не отдельные приложения

Runtime, Designer, Admin и другие режимы:

- НЕ являются отдельными системами;
- НЕ имеют собственных layout engines;
- НЕ должны дублировать shell-инфраструктуру.

Они являются:

- разными режимами доступа;
- разными capability layers;
- разными workspace contexts;

внутри одной платформы.

---

# 3. Единая оболочка платформы

## Платформа должна иметь единый AppShell

```txt
YasnoPro Platform
 └── AppShell
      ├── AppSidebar
      ├── AppHeader
      └── AppWorkspace
```

Shell:

- один;
- общий для всей платформы;
- не зависит от бизнес-логики конкретного режима.

---

# 4. AppShell

## Назначение

AppShell отвечает за:

- общую геометрию платформы;
- layout;
- sidebar;
- header;
- overlays;
- workspace boundaries;
- shell transitions;
- shell responsiveness;
- shell state synchronization.

AppShell НЕ отвечает за:

- бизнес-логику;
- runtime entities;
- designer entities;
- permissions logic;
- workflows.

---

# 5. Unified Shell State

## Shell state должен быть единым

Shell state принадлежит платформе, а не отдельному режиму.

Неправильно:

```txt
Runtime sidebar collapsed state
Designer sidebar collapsed state
```

Правильно:

```txt
Global shell state
```

---

## Collapse state должен быть общим

Состояние collapse sidebar должно сохраняться между режимами платформы.

Пример:

```txt
1. Пользователь свернул sidebar в Runtime
2. Перешёл в Designer
3. Sidebar остаётся свернутым
4. Меняется только наполнение sidebar
```

---

## Sidebar state не зависит от mode

Mode не должен управлять:

- sidebar width;
- collapsed state;
- shell geometry;
- shell positioning.

Mode должен менять только:

- menu content;
- visible capabilities;
- available actions;
- workspace context.

---

## Единый storage key

Shell state должен использовать единый storage key.

Правильно:

```txt
yasnopro-sidebar-collapsed
```

Неправильно:

```txt
yasnopro-runtime-sidebar-collapsed
yasnopro-designer-sidebar-collapsed
```

---

## Sidebar collapse — часть shell continuity

Collapse sidebar — это не настройка режима.

Это:
- пользовательское shell preference;
- часть UX continuity;
- часть platform behavior.

---

# 6. AppSidebar

## Назначение

AppSidebar — единое левое меню платформы.

Sidebar:

- не принадлежит Runtime;
- не принадлежит Designer;
- не принадлежит Admin.

Sidebar принадлежит платформе.

---

## Sidebar изменяет только наполнение

Меняться должны:

- menu items;
- menu sections;
- actions;
- capabilities;
- visibility rules.

Не должны меняться:

- layout;
- width;
- collapse behavior;
- icon sizes;
- typography;
- spacing;
- brand block;
- shell geometry.

---

## Sidebar Structure

```txt
AppSidebar
 ├── BrandBlock
 ├── SidebarSections
 ├── SidebarItems
 ├── SidebarFooter
 └── CollapseControl
```

---

## Sidebar Modes

Sidebar может отображать:

- Runtime Navigation
- Designer Navigation
- Admin Navigation
- AI Navigation
- System Navigation

Но:

- внутри одного shell;
- внутри одного sidebar framework.

---

## Sidebar Width

Sidebar width должен быть единым для всех режимов платформы.

```txt
Expanded: 248px
Collapsed: 56px
```

Sidebar width не зависит от mode.

---

## Sidebar Collapse Behavior

Collapsed sidebar:

- остаётся видимым;
- сохраняет логотип;
- сохраняет иконки;
- скрывает текст;
- сохраняет навигацию.

Sidebar НЕ должен исчезать полностью.

Неправильно:

```txt
Collapsed width = 0
```

Правильно:

```txt
Collapsed width = 56px
```

---

# 7. AppHeader

## Назначение

AppHeader — единая верхняя панель платформы.

Header:

- принадлежит платформе;
- не принадлежит Runtime или Designer.

---

## Header может изменять только content layer

Меняться могут:

- actions;
- breadcrumbs;
- mode-specific controls;
- tenant-specific controls.

Не должны меняться:

- geometry;
- shell positioning;
- layout model;
- overlay integration;
- header sizing.

---

## Header Structure

```txt
AppHeader
 ├── LeftActions
 ├── Breadcrumbs
 ├── ContextActions
 ├── ModeActions
 ├── Notifications
 ├── UserControls
 └── TenantSwitcher
```

---

# 8. AppWorkspace

## Назначение

AppWorkspace — рабочая область платформы.

Workspace отображает:

- Runtime pages;
- Designer pages;
- Admin pages;
- AI workspaces;
- Dashboards;
- Editors;
- Entity cards.

---

## Workspace не владеет shell

Workspace:

- не должен управлять sidebar;
- не должен управлять header;
- не должен управлять overlays geometry.

Workspace является consumer shell infrastructure.

---

# 9. Tenant Architecture

## Tenant — основная единица платформы

Платформа строится как multi-tenant system.

```txt
YasnoPro Platform
 ├── Tenant A
 ├── Tenant B
 ├── Tenant C
 └── System Tenant
```

---

## Tenant хранит

Tenant включает:

- пользователей;
- роли;
- permissions;
- объекты;
- views;
- menus;
- branding;
- automations;
- AI context;
- storage;
- integrations;
- workflows;
- settings.

---

## Компания пользователя

Компания пользователя должна существовать:

- НЕ как отдельное приложение;
- НЕ как отдельный runtime;
- НЕ как отдельный designer.

Компания пользователя является tenant платформы.

---

## Internal/System Tenant

Платформа может иметь:

- internal tenant;
- system tenant;
- owner tenant.

Он может содержать:

- platform administration;
- tenant management;
- billing;
- AI management;
- object templates;
- system libraries;
- global automations.

---

# 10. Roles и Modes

## Role != Mode

### Role

Role определяет:

- permissions;
- доступ;
- capability visibility.

Примеры:

- User
- Analyst
- Admin
- Owner

---

### Mode

Mode определяет:

- workspace context;
- active tools;
- active navigation set.

Примеры:

- Runtime
- Designer
- Admin
- AI

---

## Один пользователь может иметь несколько modes

Например:

```txt
User
 ├── Runtime access
 ├── Designer access
 └── Admin access
```

Пользователь не переходит в другую систему.

Он переключает режим работы внутри платформы.

---

# 11. Sidebar Generation

## Sidebar должен строиться динамически

Неправильно:

```txt
RuntimeSidebar
DesignerSidebar
AdminSidebar
```

Правильно:

```txt
buildSidebar({
  tenant,
  role,
  mode,
  permissions,
  enabledModules
})
```

---

# 12. Header Generation

## Header должен строиться динамически

```txt
buildHeader({
  tenant,
  role,
  mode,
  workspaceContext
})
```

---

# 13. Shell Geometry

## Geometry принадлежит AppShell

Shell geometry включает:

- sidebar widths;
- header heights;
- overlay offsets;
- z-index layers;
- transitions;
- workspace boundaries.

---

## Workspace не должен владеть geometry

Неправильно:

```txt
FileViewer знает sidebar width
Designer знает shell offsets
Runtime знает overlay geometry
```

Правильно:

```txt
Shell geometry centralized
```

---

# 14. Overlay Architecture

## Overlays принадлежат shell layer

Примеры:

- FileViewer
- EntityCard
- Notifications
- Modals
- Drawers
- AI panels

Все overlays:

- используют shell geometry;
- используют centralized z-index tokens;
- не владеют layout offsets.

---

# 15. UI Architecture Principles

## Платформа должна ощущаться как одна система

Неправильно:

```txt
Runtime = отдельное приложение
Designer = отдельная админка
```

Правильно:

```txt
YasnoPro OS
 ├── Runtime mode
 ├── Designer mode
 ├── Admin mode
 └── AI mode
```

---

## Переключается режим мышления, а не приложение

Пользователь:

- не покидает платформу;
- не переходит в другой frontend;
- не теряет shell continuity.

Он:

- переключает role;
- переключает mode;
- переключает context.

---

# 16. Shell Continuity

## Shell должен сохранять continuity между режимами

При переключении mode:

- sidebar не должен исчезать;
- shell geometry не должна перестраиваться;
- collapse state не должен сбрасываться;
- overlays не должны ломаться;
- пользователь не должен ощущать переход в другую систему.

---

## Меняется только content layer

При смене mode изменяется:

- menu content;
- workspace content;
- available actions;
- capabilities;
- tools.

Не изменяется:

- shell structure;
- shell geometry;
- sidebar behavior;
- header positioning;
- overlay behavior.

---

# 17. Current Migration Direction

## Текущее направление

Платформа движется к:

- unified AppShell;
- unified AppSidebar;
- unified AppHeader;
- centralized shell geometry;
- unified shell state;
- multi-tenant architecture;
- role-driven navigation;
- mode-driven workspace behavior.

---

# 18. Planned Future Refactoring

## Planned Components

```txt
shared/shell/
 ├── AppShell
 ├── AppSidebar
 ├── AppHeader
 ├── ShellWorkspace
 ├── ShellOverlays
 ├── SidebarSection
 ├── SidebarItem
 ├── SidebarFooter
 └── TenantSwitcher
```

---

## Planned Shared Infrastructure

```txt
shared/layout/
 ├── layoutTokens
 ├── shellGeometry
 ├── overlayGeometry
 ├── zIndexTokens
 ├── transitionTokens
 ├── useShellGeometry
 └── useShellState
```

---

# 19. Strategic Goal

## YasnoPro — не портал

Платформа развивается не как:

- portal builder;
- admin panel;
- BPM tool.

Платформа развивается как:

```txt
AI-native multi-tenant operating system for organizations
```

AppShell является базовым уровнем этой системы.