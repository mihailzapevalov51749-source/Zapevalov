import { describe, expect, it } from "vitest";

import {
  canMoveTableColumn,
  enforceTitleFieldFirstInColumnOrder,
  normalizeTableDisplayFieldKeys,
  resolveObjectTypeTitleFieldKey,
} from "./tableColumnOrder";

import { SYSTEM_ENTITY_FIELD_KEYS } from "../../../shared/runtime/systemEntityFields";

describe("tableColumnOrder", () => {
  it("pins title field to the first data column", () => {
    expect(
      enforceTitleFieldFirstInColumnOrder(
        ["priority", "title", "status"],
        "title",
      ),
    ).toEqual(["title", "priority", "status"]);
  });

  it("blocks moving title and swapping into its slot", () => {
    const order = ["title", "priority", "status"];

    expect(canMoveTableColumn("title", "down", order, "title")).toBe(false);
    expect(canMoveTableColumn("priority", "up", order, "title")).toBe(false);
    expect(canMoveTableColumn("priority", "down", order, "title")).toBe(true);
  });

  it("All mode: title → user fields → canonical system fields", () => {
    const result = normalizeTableDisplayFieldKeys(
      [
        "finish",
        "title",
        "description",
        SYSTEM_ENTITY_FIELD_KEYS.createdBy,
        SYSTEM_ENTITY_FIELD_KEYS.updatedAt,
        SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
        SYSTEM_ENTITY_FIELD_KEYS.createdAt,
        SYSTEM_ENTITY_FIELD_KEYS.updatedBy,
        SYSTEM_ENTITY_FIELD_KEYS.id,
      ],
      {
        titleFieldKey: "title",
        isAllMode: true,
      },
    );

    expect(result).toEqual([
      "title",
      "finish",
      "description",
      SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
      SYSTEM_ENTITY_FIELD_KEYS.createdBy,
      SYSTEM_ENTITY_FIELD_KEYS.createdAt,
      SYSTEM_ENTITY_FIELD_KEYS.updatedBy,
      SYSTEM_ENTITY_FIELD_KEYS.updatedAt,
      SYSTEM_ENTITY_FIELD_KEYS.id,
    ]);
  });

  it("User view: title first, preserves custom order for other fields", () => {
    const result = normalizeTableDisplayFieldKeys(
      ["priority", "title", SYSTEM_ENTITY_FIELD_KEYS.createdAt, "status"],
      {
        titleFieldKey: "title",
        isAllMode: false,
      },
    );

    expect(result).toEqual([
      "title",
      "priority",
      SYSTEM_ENTITY_FIELD_KEYS.createdAt,
      "status",
    ]);
  });

  it("resolves title from published catalog view settings_json.projection", () => {
    const title = resolveObjectTypeTitleFieldKey(
      {
        views: [
          {
            key: "default_table",
            settings_json: {
              projection: { title_field: "assignee" },
            },
          },
        ],
      },
      ["title", "assignee", "finish"],
      { publishedViewKey: "default_table" },
    );

    expect(title).toBe("assignee");
  });

  it("resolves title from published default_table view", () => {
    const title = resolveObjectTypeTitleFieldKey(
      {
        views: [
          {
            key: "kanban",
            projection: { title_field: "finish" },
          },
          {
            key: "default_table",
            projection: { title_field: "title" },
          },
        ],
      },
      ["finish", "title", "description"],
      { publishedViewKey: "default_table" },
    );

    expect(title).toBe("title");
  });

  it("prefers runtime projection title over view fallback", () => {
    const title = resolveObjectTypeTitleFieldKey(
      {
        views: [{ key: "default_table", projection: { title_field: "finish" } }],
      },
      ["finish", "title"],
      {
        publishedViewKey: "default_table",
        runtimeProjection: { title_field: "title" },
      },
    );

    expect(title).toBe("title");
  });
});
