import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDuplicatePayload,
  buildGridSlotContextPayload,
  buildHourSlotPrefill,
  buildSlotPrefill,
  clampMenuPosition,
  closedCalendarContextMenu,
  EVENT_CONTEXT_MENU_ACTIONS,
  openEventContextMenu,
  openSlotContextMenu,
  resolveHourFromGridOffset,
  SLOT_CONTEXT_MENU_ACTIONS,
} from "./calendarContextMenu.js";

describe("calendarContextMenu utils", () => {
  it("builds slot prefill with one hour duration", () => {
    const prefill = buildSlotPrefill({
      tenantId: 1,
      date: "2026-06-24",
      startTime: "15:00",
    });

    assert.equal(prefill.tenantId, 1);
    assert.equal(prefill.portalId, 1);
    assert.match(prefill.startDateTime, /2026-06-24/);
    assert.equal(
      new Date(prefill.endDateTime).getTime() - new Date(prefill.startDateTime).getTime(),
      60 * 60 * 1000,
    );
  });

  it("builds hour slot prefill for week/day grid", () => {
    const prefill = buildHourSlotPrefill({
      tenantId: 1,
      date: new Date("2026-06-24T00:00:00"),
      hour: 15,
    });

    assert.match(prefill.startDateTime, /2026-06-24/);
    assert.equal(
      new Date(prefill.endDateTime).getTime() - new Date(prefill.startDateTime).getTime(),
      60 * 60 * 1000,
    );
  });

  it("opens slot and event context menu states", () => {
    const slotMenu = openSlotContextMenu({
      x: 120,
      y: 240,
      date: new Date("2026-06-24T00:00:00"),
      startTime: "15:00",
      view: "week",
    });

    assert.equal(slotMenu.open, true);
    assert.equal(slotMenu.mode, "slot");
    assert.equal(slotMenu.date, "2026-06-24");

    const eventMenu = openEventContextMenu({
      x: 80,
      y: 160,
      event: { id: 42, tenant_id: 1, title: "Demo" },
    });

    assert.equal(eventMenu.mode, "event");
    assert.equal(eventMenu.eventId, "42");
    assert.equal(closedCalendarContextMenu().open, false);
  });

  it("builds duplicate payload with shifted time and new title", () => {
    const payload = buildDuplicatePayload({
      id: 7,
      title: "Demo",
      event_type: "meeting",
      start_at: "2026-06-24T15:00:00.000Z",
      end_at: "2026-06-24T16:00:00.000Z",
      description: "Test",
      location: "Office",
      meeting_url: null,
      participants: [{ user_id: 3 }],
    });

    assert.equal(payload.title, "Копия: Demo");
    assert.deepEqual(payload.participant_ids, [3]);
    assert.equal(payload.create_event_chat, false);
    assert.notEqual(payload.start_at, "2026-06-24T15:00:00.000Z");
  });

  it("builds grid slot payload from events layer offset", () => {
    const layerElement = {
      getBoundingClientRect: () => ({ top: 100, left: 0, width: 200, height: 1152 }),
    };
    const mouseEvent = { clientX: 240, clientY: 820 };

    const payload = buildGridSlotContextPayload({
      mouseEvent,
      layerElement,
      date: new Date("2026-06-24T00:00:00"),
      view: "week",
      hourHeight: 48,
    });

    assert.equal(payload.hour, 15);
    assert.equal(payload.view, "week");
    assert.equal(payload.x, 240);
  });

  it("resolveHourFromGridOffset clamps to valid hour range", () => {
    assert.equal(resolveHourFromGridOffset(720, 48), 15);
    assert.equal(resolveHourFromGridOffset(-10, 48), 0);
    assert.equal(resolveHourFromGridOffset(9999, 48), 23);
  });

  it("exports context menu action lists for CalendarContextMenu", () => {
    assert.ok(Array.isArray(EVENT_CONTEXT_MENU_ACTIONS));
    assert.ok(Array.isArray(SLOT_CONTEXT_MENU_ACTIONS));
    assert.equal(SLOT_CONTEXT_MENU_ACTIONS.length, 1);
    assert.equal(SLOT_CONTEXT_MENU_ACTIONS[0].id, "create");
    assert.deepEqual(
      EVENT_CONTEXT_MENU_ACTIONS.map((action) => action.id),
      ["open", "edit", "duplicate", "delete"],
    );
  });

  it("clamps menu position inside viewport", () => {
    const originalInnerWidth = globalThis.window?.innerWidth;
    const originalInnerHeight = globalThis.window?.innerHeight;

    globalThis.window = {
      innerWidth: 800,
      innerHeight: 600,
    };

    const clamped = clampMenuPosition(900, 700, 220, 180);
    assert.ok(clamped.x <= 572);
    assert.ok(clamped.y <= 412);

    if (originalInnerWidth != null) {
      globalThis.window.innerWidth = originalInnerWidth;
      globalThis.window.innerHeight = originalInnerHeight;
    }
  });
});
