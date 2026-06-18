import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPendingTarget,
  mapNotificationNavigateDetail,
} from "./notificationNavigationMapper.js";
import { resolveNotificationNavigationOutcome } from "./notificationTargetRouting.js";

describe("calendar notification navigation", () => {
  it("maps legacy calendar invite payload to calendar_event target", () => {
    const mapped = mapNotificationNavigateDetail({
      type: "calendar_invite",
      entityType: "calendar_event",
      entityId: "12",
      context: {
        tenant_id: 1,
        event_id: 12,
        target: "calendar_event",
        entity_type: "calendar_event",
        entity_id: "12",
        tab: "calendar",
      },
    });

    const target = buildPendingTarget({ ...mapped, detail: mapped });

    assert.equal(target.type, "calendar_event");
    assert.equal(target.eventId, "12");
  });

  it("maps current calendar target payload to calendar_event target", () => {
    const mapped = mapNotificationNavigateDetail({
      type: "calendar_invite",
      entityType: "calendar_event",
      entityId: "15",
      context: {
        tenant_id: 1,
        portal_id: 1,
        event_id: 15,
        entity_type: "calendar_event",
        entity_id: "15",
        target: {
          type: "calendar_event",
          id: 15,
          tenant_id: 1,
          portal_id: 1,
          runtime: "runtime.calendar",
          action: "open",
        },
      },
    });

    const target = buildPendingTarget({ ...mapped, detail: mapped });
    const outcome = resolveNotificationNavigationOutcome(target, {
      pathname: "/portal/1/page/42",
    });

    assert.equal(target.type, "calendar_event");
    assert.equal(outcome.action, "open_calendar");
  });

  it("legacy UT payload remains unavailable without breaking mapper", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "universal_table:42",
      entityId: "7",
      source: "card_comment",
    });

    const target = buildPendingTarget({ ...mapped, detail: mapped });
    const outcome = resolveNotificationNavigationOutcome(target, {
      pathname: "/portal/1/page/1",
    });

    assert.equal(target.type, "notification_unavailable");
    assert.equal(outcome.action, "blocked");
  });
});
