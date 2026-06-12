export const JOURNAL_CALENDAR_POPOVER_GAP = 4;
export const JOURNAL_CALENDAR_VIEWPORT_PADDING = 8;
export const JOURNAL_CALENDAR_DEFAULT_WIDTH = 272;
export const JOURNAL_CALENDAR_DEFAULT_HEIGHT = 340;

/**
 * Viewport-aware placement for the journal date calendar popover.
 * Flips left when there is not enough space on the right; flips up when needed.
 */
export function computeCalendarPopoverPosition(
  anchorRect,
  {
    width = JOURNAL_CALENDAR_DEFAULT_WIDTH,
    height = JOURNAL_CALENDAR_DEFAULT_HEIGHT,
    gap = JOURNAL_CALENDAR_POPOVER_GAP,
    viewportPadding = JOURNAL_CALENDAR_VIEWPORT_PADDING,
    viewportWidth = globalThis.innerWidth ?? 0,
    viewportHeight = globalThis.innerHeight ?? 0,
  } = {},
) {

  const spaceBelow = viewportHeight - anchorRect.bottom - gap - viewportPadding;
  const spaceAbove = anchorRect.top - gap - viewportPadding;
  const openUp = spaceBelow < height && spaceAbove > spaceBelow;

  let left = anchorRect.left;
  if (left + width > viewportWidth - viewportPadding) {
    left = anchorRect.right - width;
  }
  left = Math.max(
    viewportPadding,
    Math.min(left, viewportWidth - width - viewportPadding),
  );

  let top = openUp
    ? anchorRect.top - height - gap
    : anchorRect.bottom + gap;
  top = Math.max(
    viewportPadding,
    Math.min(top, viewportHeight - height - viewportPadding),
  );

  return { top, left, openUp };
}
