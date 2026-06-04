import { describe, expect, it } from "vitest";

import {
  isCommentsSectionVisible,
  normalizeObjectEntityCardUtLayout,
  OBJECT_ENTITY_SECTION_TYPES,
  resolveVisibleUtSections,
} from "./objectEntityCardSectionsLayout";

function field(key, type = "text") {
  return { key, type, rawFieldType: type, label: key };
}

describe("normalizeObjectEntityCardUtLayout", () => {
  const editableFields = [
    field("title", "text"),
    field("finish", "date"),
    field("assignee", "user"),
    field("attachments", "files"),
  ];

  it("syncs main section to titleFieldKey instead of stale layout key", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      {
        sections: [
          {
            id: "main",
            type: OBJECT_ENTITY_SECTION_TYPES.mainFields,
            visible: true,
            order: 1,
            fieldKeys: ["finish"],
          },
          {
            id: "fields",
            type: OBJECT_ENTITY_SECTION_TYPES.fieldsGrid,
            visible: true,
            order: 2,
            fieldKeys: ["assignee", "attachments"],
          },
        ],
        hiddenFieldKeys: [],
        tabs: [],
      },
      editableFields,
      "title",
    );

    const main = layout.sections.find((section) => section.id === "main");

    expect(main?.fieldKeys?.[0]).toBe("title");
    expect(main?.fieldKeys).not.toContain("finish");
  });

  it("excludes file and attachment fields from fields grid", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      {
        sections: [
          {
            id: "main",
            type: OBJECT_ENTITY_SECTION_TYPES.mainFields,
            visible: true,
            order: 1,
            fieldKeys: ["title"],
          },
          {
            id: "fields",
            type: OBJECT_ENTITY_SECTION_TYPES.fieldsGrid,
            visible: true,
            order: 2,
            fieldKeys: ["assignee", "attachments", "finish"],
          },
        ],
        hiddenFieldKeys: [],
        tabs: [],
      },
      editableFields,
      "title",
    );

    const fieldsGrid = layout.sections.find((section) => section.id === "fields");

    expect(fieldsGrid?.fieldKeys).toEqual(["assignee", "finish"]);
    expect(fieldsGrid?.fieldKeys).not.toContain("attachments");
  });

  it("excludes catalog file field keys even when field type normalizes to text", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      {
        sections: [
          {
            id: "main",
            type: OBJECT_ENTITY_SECTION_TYPES.mainFields,
            visible: true,
            order: 1,
            fieldKeys: ["title"],
          },
          {
            id: "fields",
            type: OBJECT_ENTITY_SECTION_TYPES.fieldsGrid,
            visible: true,
            order: 2,
            fieldKeys: ["assignee", "vlozheniya"],
          },
        ],
        hiddenFieldKeys: [],
        tabs: [],
      },
      [
        field("title", "text"),
        field("assignee", "user"),
        field("vlozheniya", "unknown_upload_type"),
      ],
      "title",
      ["vlozheniya"],
    );

    const fieldsGrid = layout.sections.find((section) => section.id === "fields");

    expect(fieldsGrid?.fieldKeys).toEqual(["assignee"]);
  });

  it("includes comments section in default layout", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      null,
      editableFields,
      "title",
    );

    const comments = layout.sections.find((section) => section.id === "comments");

    expect(comments?.type).toBe(OBJECT_ENTITY_SECTION_TYPES.comments);
    expect(comments?.visible).toBe(true);
    expect(comments?.order).toBe(5);
  });

  it("persists hidden comments section and hides sidebar via resolver", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      {
        sections: [
          {
            id: "comments",
            type: OBJECT_ENTITY_SECTION_TYPES.comments,
            visible: false,
            order: 5,
            fieldKeys: [],
          },
        ],
        hiddenFieldKeys: [],
        tabs: [],
      },
      editableFields,
      "title",
    );

    expect(isCommentsSectionVisible(layout)).toBe(false);
    expect(
      resolveVisibleUtSections(layout).some((section) => section.id === "comments"),
    ).toBe(false);
  });

  it("restores field in grid after hiddenFieldKeys entry is removed", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      {
        sections: [
          {
            id: "main",
            type: OBJECT_ENTITY_SECTION_TYPES.mainFields,
            visible: true,
            order: 1,
            fieldKeys: ["title"],
          },
          {
            id: "fields",
            type: OBJECT_ENTITY_SECTION_TYPES.fieldsGrid,
            visible: true,
            order: 2,
            fieldKeys: ["assignee"],
          },
        ],
        hiddenFieldKeys: [],
        tabs: [],
      },
      editableFields,
      "title",
    );

    const fieldsGrid = layout.sections.find((section) => section.id === "fields");

    expect(fieldsGrid?.fieldKeys).toContain("finish");
    expect(fieldsGrid?.fieldKeys).toContain("assignee");
  });

  it("keeps tabs block hidden when section.visible is false", () => {
    const layout = normalizeObjectEntityCardUtLayout(
      {
        sections: [
          {
            id: "tabs",
            type: OBJECT_ENTITY_SECTION_TYPES.tabs,
            visible: false,
            order: 3,
            fieldKeys: [],
            tabIds: ["notes", "relations"],
          },
        ],
        hiddenFieldKeys: [],
        tabs: [
          { id: "notes", visible: true, order: 0 },
          { id: "relations", visible: true, order: 1 },
        ],
      },
      editableFields,
      "title",
    );

    const tabs = layout.sections.find((section) => section.id === "tabs");

    expect(tabs?.visible).toBe(false);
  });
});
