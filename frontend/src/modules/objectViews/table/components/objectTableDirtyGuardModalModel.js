import {
  OFFICE_USER_VIEW_UNSAVED_CHANGES_DEFAULT_BOUNDS,
  OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY,
} from "./objectTableDirtyGuardModalKeys";

export { OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY };
export { OFFICE_USER_VIEW_UNSAVED_CHANGES_DEFAULT_BOUNDS };

/**
 * @param {"userView" | "baseState"} mode
 * @param {string} viewName
 */
export function resolveDirtyGuardModalCopy(mode, viewName) {
  const displayName = String(viewName || "").trim() || "Представление";
  const isBaseState = mode === "baseState";

  if (isBaseState) {
    return {
      title: 'Изменения в режиме «Все»',
      messageLine1: 'Вы изменили режим «Все».',
      messageLine2: "Сохранить изменения как новое представление?",
      hint: "Если не сохранить, изменения будут потеряны.",
    };
  }

  return {
    title: `Изменения в представлении «${displayName}»`,
    messageLine1: `Вы изменили представление «${displayName}».`,
    messageLine2: "Сохранить изменения?",
    hint: "Если не сохранить, изменения будут потеряны.",
  };
}

/**
 * @param {"userView" | "baseState"} mode
 */
export function resolveDirtyGuardFooterActions(mode) {
  return {
    showDiscard: true,
    showSaveAsNew: true,
    showSave: mode !== "baseState",
  };
}
