import { describe, expect, it } from "vitest";

import { catalogFieldToFieldDef } from "./catalogFieldToFieldDef.js";
import { resolveFieldPlaceholder } from "../../../../../shared/fieldEditors/resolveFieldPlaceholder.js";
import { fieldDefToRendererColumn } from "../../../../../shared/viewEngine/utils/fieldDefToRendererColumn.js";

describe("catalogFieldToFieldDef placeholder", () => {
  it("maps placeholder from published catalog field", () => {
    const fieldDef = catalogFieldToFieldDef({
      key: "current_behavior",
      name: "Что происходит сейчас",
      field_type: "text",
      description: "Фактическое поведение",
      placeholder: "Опишите текущее нежелательное поведение",
      settings_json: {},
    });

    expect(fieldDef.placeholder).toBe("Опишите текущее нежелательное поведение");
    expect(fieldDef.description).toBe("Фактическое поведение");
  });

  it("defaults placeholder to empty string for legacy fields", () => {
    const fieldDef = catalogFieldToFieldDef({
      key: "title",
      name: "Title",
      field_type: "text",
      settings_json: {},
    });

    expect(fieldDef.placeholder).toBe("");
  });
});

describe("resolveFieldPlaceholder", () => {
  it("prefers fieldDef.placeholder over column settings", () => {
    const fieldDef = { placeholder: "From field def" };
    const column = { settings: { placeholder: "From settings" } };

    expect(resolveFieldPlaceholder(fieldDef, column)).toBe("From field def");
  });

  it("passes placeholder into renderer column", () => {
    const fieldDef = catalogFieldToFieldDef({
      key: "note",
      name: "Note",
      field_type: "text",
      placeholder: "Кратко опишите проблему",
      settings_json: {},
    });
    const column = fieldDefToRendererColumn(fieldDef);

    expect(column.placeholder).toBe("Кратко опишите проблему");
    expect(resolveFieldPlaceholder(fieldDef, column)).toBe("Кратко опишите проблему");
  });
});
