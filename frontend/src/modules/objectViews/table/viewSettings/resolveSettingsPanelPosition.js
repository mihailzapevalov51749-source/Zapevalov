export const OBJECT_TABLE_SETTINGS_PANEL_WIDTH = 328;

const VIEWPORT_MARGIN = 8;

/**
 * Позиция карточки настроек от anchor кнопки (шестерёнка) — как wrapper в UT.
 */
export function resolveSettingsPanelPosition(anchorEl) {
  const rect = anchorEl?.getBoundingClientRect?.();

  if (!rect) {
    return {
      top: 96,
      left: Math.max(
        VIEWPORT_MARGIN,
        window.innerWidth - OBJECT_TABLE_SETTINGS_PANEL_WIDTH - 44,
      ),
      maxHeight: window.innerHeight - 32,
    };
  }

  const maxHeight = window.innerHeight - 32;

  let left = rect.left - OBJECT_TABLE_SETTINGS_PANEL_WIDTH - VIEWPORT_MARGIN;

  if (left < VIEWPORT_MARGIN) {
    left = rect.right + VIEWPORT_MARGIN;
  }

  if (left + OBJECT_TABLE_SETTINGS_PANEL_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
    left = window.innerWidth - OBJECT_TABLE_SETTINGS_PANEL_WIDTH - VIEWPORT_MARGIN;
  }

  let top = rect.top;

  if (top + maxHeight > window.innerHeight - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, window.innerHeight - maxHeight - VIEWPORT_MARGIN);
  }

  top = Math.max(VIEWPORT_MARGIN, top);

  return {
    top,
    left,
    maxHeight,
  };
}

/**
 * Начальные bounds PlatformModal от anchor шестерёнки (первое открытие без localStorage).
 */
export function anchorToModalDefaultBounds(
  anchorEl,
  { width = OBJECT_TABLE_SETTINGS_PANEL_WIDTH, height = 520 } = {},
) {
  const anchorPosition = resolveSettingsPanelPosition(anchorEl);
  const maxHeight = anchorPosition.maxHeight;
  const resolvedHeight = Math.min(height, maxHeight);

  return {
    x: anchorPosition.left,
    y: anchorPosition.top,
    width,
    height: resolvedHeight,
  };
}
