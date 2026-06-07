import { describe, expect, it } from "vitest";

import {
  buildPlanInfoFieldContextMenuActions,
  buildPlanTabContextMenuActions,
  hideStudioDraftProjectionField,
  reorderPlanInfoFieldKeys,
  reorderPlanInfoFieldsInFieldOrder,
  reorderStudioDraftProjectionInfoFieldKeys,
  resolveStudioDraftInfoFieldKeys,
  toggleStudioDraftProjectionInfoField,
} from "./planPreviewConstructor.js";

describe("planPreviewConstructor", () => {
  it("reorders infoFieldKeys array", () => {
    const next = reorderPlanInfoFieldKeys(
      ["description", "owner", "status"],
      "status",
      "description",
      "before",
    );

    expect(next).toEqual(["status", "description", "owner"]);
  });

  it("reorders info fields inside fieldOrder without moving other keys", () => {
    const next = reorderPlanInfoFieldsInFieldOrder(
      ["title", "description", "owner", "status", "deadline"],
      ["description", "owner", "status"],
      "status",
      "description",
      "before",
    );

    expect(next).toEqual(["title", "status", "description", "owner", "deadline"]);
  });

  it("builds field context menu actions", () => {
    const actions = buildPlanInfoFieldContextMenuActions({
      fieldKey: "description",
      fieldLabel: "Описание",
      isInfoField: true,
    });

    expect(actions.map((action) => action.id)).toEqual([
      "rename-field",
      "hide-field",
      "toggle-info-field",
    ]);
    expect(actions[2].label).toContain("Скрыть");
  });

  it("builds tab context menu actions without showInInfo for info tab", () => {
    const actions = buildPlanTabContextMenuActions({
      tabKey: "info",
      tabLabel: "Основное",
      showInInfo: false,
      canHide: true,
    });

    expect(actions.map((action) => action.id)).toEqual(["rename-tab", "hide-tab"]);
  });

  it("resolves draft info keys from visible fields when info_field_keys is missing", () => {
    const keys = resolveStudioDraftInfoFieldKeys({
      visible_fields: ["title", "city", "date"],
      title_field: "title",
    });

    expect(keys).toEqual(["city", "date"]);
  });

  it("uses explicit empty info_field_keys without fallback", () => {
    const keys = resolveStudioDraftInfoFieldKeys({
      visible_fields: ["title", "city", "date"],
      title_field: "title",
      info_field_keys: [],
    });

    expect(keys).toEqual([]);
  });

  it("hides field from projection and info keys", () => {
    const next = hideStudioDraftProjectionField(
      {
        visible_fields: ["title", "city", "date"],
        field_order: ["title", "city", "date"],
        title_field: "title",
        info_field_keys: ["city", "date"],
      },
      "city",
    );

    expect(next.visible_fields).toEqual(["title", "date"]);
    expect(next.info_field_keys).toEqual(["date"]);
  });

  it("removes field from implicit info keys", () => {
    const next = toggleStudioDraftProjectionInfoField(
      {
        visible_fields: ["title", "city", "date"],
        title_field: "title",
      },
      "city",
    );

    expect(next.info_field_keys).toEqual(["date"]);
  });

  it("removes field from info keys only", () => {
    const next = toggleStudioDraftProjectionInfoField(
      {
        visible_fields: ["title", "city", "date"],
        info_field_keys: ["city", "date"],
      },
      "city",
    );

    expect(next.visible_fields).toEqual(["title", "city", "date"]);
    expect(next.info_field_keys).toEqual(["date"]);
  });

  it("reorders info keys when info_field_keys was implicit", () => {
    const next = reorderStudioDraftProjectionInfoFieldKeys(
      {
        visible_fields: ["title", "city", "date"],
        title_field: "title",
      },
      "date",
      "city",
      "before",
    );

    expect(next.info_field_keys).toEqual(["date", "city"]);
  });

  it("moves trailing info field before an earlier field", () => {
    const next = reorderPlanInfoFieldKeys(
      ["city", "date", "room", "type"],
      "type",
      "date",
      "before",
    );

    expect(next).toEqual(["city", "type", "date", "room"]);
  });
});
