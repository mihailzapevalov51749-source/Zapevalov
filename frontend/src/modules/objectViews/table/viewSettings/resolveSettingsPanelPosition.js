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

const TITLE_FIELD_PANEL_GAP = 12;
const TITLE_FIELD_VIEWPORT_MARGIN = 12;

/**
 * Начальные bounds PlatformModal от anchor кнопки глаза у Title Field.
 */
export function anchorRectToModalDefaultBounds(
  anchorRect,
  {
    width = 320,
    height = 500,
    fallback = null,
  } = {},
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const resolvedWidth = Math.min(
    width,
    viewportWidth - TITLE_FIELD_VIEWPORT_MARGIN * 2,
  );
  const resolvedHeight = Math.min(
    height,
    viewportHeight - TITLE_FIELD_VIEWPORT_MARGIN * 2,
  );

  if (!anchorRect) {
    const base = fallback || {
      x: 48,
      y: 72,
      width: resolvedWidth,
      height: resolvedHeight,
    };

    return {
      x: base.x,
      y: base.y,
      width: resolvedWidth,
      height: resolvedHeight,
    };
  }

  let x = anchorRect.left;
  let y = anchorRect.top - resolvedHeight - TITLE_FIELD_PANEL_GAP;

  if (y < TITLE_FIELD_VIEWPORT_MARGIN) {
    y = anchorRect.bottom + TITLE_FIELD_PANEL_GAP;
  }

  x = Math.max(
    TITLE_FIELD_VIEWPORT_MARGIN,
    Math.min(
      x,
      viewportWidth - resolvedWidth - TITLE_FIELD_VIEWPORT_MARGIN,
    ),
  );
  y = Math.max(
    TITLE_FIELD_VIEWPORT_MARGIN,
    Math.min(
      y,
      viewportHeight - resolvedHeight - TITLE_FIELD_VIEWPORT_MARGIN,
    ),
  );

  return {
    x,
    y,
    width: resolvedWidth,
    height: resolvedHeight,
  };
}
