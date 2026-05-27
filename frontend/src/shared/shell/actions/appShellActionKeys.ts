export const APP_SHELL_ACTION_KEYS = {
  sidebar: {
    toggleCollapse: "shell.sidebar.toggleCollapse",
    enterEditMode: "shell.sidebar.enterEditMode",
    exitEditMode: "shell.sidebar.exitEditMode",
    addItem: "shell.sidebar.addItem",
    openSettings: "shell.sidebar.openSettings",
    changeMenuScale: "shell.sidebar.changeMenuScale",
    toggleItemExpanded: "shell.sidebar.toggleItemExpanded",
    openItem: "shell.sidebar.openItem",
    dragItem: "shell.sidebar.dragItem",
  },
  header: {
    goBack: "shell.header.goBack",
    editTitle: "shell.header.editTitle",
    saveTitle: "shell.header.saveTitle",
    cancelTitle: "shell.header.cancelTitle",
    search: "shell.header.search",
    clearSearch: "shell.header.clearSearch",
    openNotifications: "shell.header.openNotifications",
    enterEditMode: "shell.header.enterEditMode",
    exitEditMode: "shell.header.exitEditMode",
    savePage: "shell.header.savePage",
    openSettings: "shell.header.openSettings",
    switchMode: "shell.header.switchMode",
  },
  system: {
    switchToRuntime: "shell.mode.switchToRuntime",
    switchToDesigner: "shell.mode.switchToDesigner",
    openPage: "shell.route.openPage",
    openDesignerObject: "shell.route.openDesignerObject",
    openNotification: "shell.notification.open",
    submitSearch: "shell.search.submit",
  },
  local: {
    setCollapsed: "shell.sidebar.setCollapsed",
    setSearchValue: "shell.header.setSearchValue",
    setMenuScale: "shell.sidebar.setMenuScale",
    setHeaderPageEdit: "shell.header.setPageEditMode",
    setSidebarMenuEdit: "shell.sidebar.setMenuEditMode",
    setTitleEditing: "shell.header.setTitleEditing",
  },
} as const;

export const APP_SHELL_LEGACY_ACTION_KEY_ALIASES: Record<string, string> = {
  "shell.sidebar.toggle-collapse": APP_SHELL_ACTION_KEYS.sidebar.toggleCollapse,
  "shell.sidebar.set-collapsed": APP_SHELL_ACTION_KEYS.local.setCollapsed,
  "shell.header.search.set-value": APP_SHELL_ACTION_KEYS.local.setSearchValue,
  "shell.sidebar.set-menu-scale": APP_SHELL_ACTION_KEYS.local.setMenuScale,
  "shell.edit.header-page": APP_SHELL_ACTION_KEYS.local.setHeaderPageEdit,
  "shell.edit.sidebar-menu": APP_SHELL_ACTION_KEYS.local.setSidebarMenuEdit,
  "shell.edit.title-editing": APP_SHELL_ACTION_KEYS.local.setTitleEditing,
  "shell.header.search.clear": APP_SHELL_ACTION_KEYS.header.clearSearch,
  "shell.edit.enter-page": APP_SHELL_ACTION_KEYS.header.enterEditMode,
  "shell.edit.exit-page": APP_SHELL_ACTION_KEYS.header.exitEditMode,
  "shell.edit.title.start": APP_SHELL_ACTION_KEYS.header.editTitle,
  "shell.edit.title.save": APP_SHELL_ACTION_KEYS.header.saveTitle,
  "shell.edit.title.cancel": APP_SHELL_ACTION_KEYS.header.cancelTitle,
};

export const APP_SHELL_ACTION_KEY_PATTERN =
  /^(shell|runtime|designer)\.[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/;

export function normalizeAppShellActionKey(actionKey: string): string {
  if (!actionKey) {
    return actionKey;
  }

  return APP_SHELL_LEGACY_ACTION_KEY_ALIASES[actionKey] ?? actionKey;
}

export function isCanonicalAppShellActionKey(actionKey: string): boolean {
  return APP_SHELL_ACTION_KEY_PATTERN.test(actionKey);
}
