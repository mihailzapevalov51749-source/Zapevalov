import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPendingTarget,
  mapNotificationNavigateDetail,
} from "./notificationNavigationMapper.js";

describe("notificationNavigationMapper", () => {
  it("maps runtime entity with published ref to published_runtime_reference", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "runtime_entity",
      entityId: "11111111-1111-1111-1111-111111111111",
      published_runtime_ref: {
        object_type_key: "orders",
        runtime_entity_id: "11111111-1111-1111-1111-111111111111",
        runtime_route: "/portal/1/object-types/orders",
      },
    });

    const target = buildPendingTarget({ ...mapped, detail: {} });

    assert.equal(target.type, "published_runtime_reference");
    assert.equal(target.objectTypeKey, "orders");
  });

  it("maps runtime entity without ref to runtime_entity_card", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "runtime_entity",
      entityId: "11111111-1111-1111-1111-111111111111",
    });

    const target = buildPendingTarget({ ...mapped, detail: {} });
    assert.equal(target.type, "runtime_entity_card");
  });

  it("maps legacy UT payload to notification_unavailable", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "universal_table:42",
      entityId: "7",
      tableId: "42",
      rowId: "7",
      source: "card_comment",
    });

    const target = buildPendingTarget({ ...mapped, detail: {} });
    assert.equal(target.type, "notification_unavailable");
  });

  it("maps library file payload", () => {
    const mapped = mapNotificationNavigateDetail({
      source: "library_file",
      fileId: "15",
      entityType: "file",
      entityId: "15",
    });

    const target = buildPendingTarget({ ...mapped, detail: {} });
    assert.equal(target.type, "library_file");
  });

  it("maps chat payload", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "chat",
      entityId: "3",
    });

    const target = buildPendingTarget({ ...mapped, detail: {} });
    assert.equal(target.type, "chat_message");
  });
});
