import assert from "node:assert/strict";
import test from "node:test";

import {
  computeCalendarPopoverPosition,
  JOURNAL_CALENDAR_DEFAULT_HEIGHT,
  JOURNAL_CALENDAR_DEFAULT_WIDTH,
  JOURNAL_CALENDAR_VIEWPORT_PADDING,
} from "./computeCalendarPopoverPosition.js";

test("computeCalendarPopoverPosition flips left near the right edge", () => {
  const viewportWidth = 1200;
  const anchorRect = {
    left: viewportWidth - 120,
    right: viewportWidth - 20,
    top: 200,
    bottom: 232,
  };

  const placement = computeCalendarPopoverPosition(anchorRect, {
    width: JOURNAL_CALENDAR_DEFAULT_WIDTH,
    height: JOURNAL_CALENDAR_DEFAULT_HEIGHT,
    viewportWidth,
    viewportHeight: 800,
  });

  assert.ok(
    placement.left + JOURNAL_CALENDAR_DEFAULT_WIDTH <=
      viewportWidth - JOURNAL_CALENDAR_VIEWPORT_PADDING,
  );
  assert.ok(placement.left < anchorRect.left);
});

test("computeCalendarPopoverPosition flips up when there is no space below", () => {
  const viewportHeight = 800;
  const anchorRect = {
    left: 200,
    right: 360,
    top: viewportHeight - 80,
    bottom: viewportHeight - 48,
  };

  const placement = computeCalendarPopoverPosition(anchorRect, {
    width: JOURNAL_CALENDAR_DEFAULT_WIDTH,
    height: JOURNAL_CALENDAR_DEFAULT_HEIGHT,
    viewportWidth: 1200,
    viewportHeight,
  });

  assert.equal(placement.openUp, true);
  assert.ok(placement.top < anchorRect.top);
});
