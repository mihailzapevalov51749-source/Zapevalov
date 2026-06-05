import { describe, expect, it } from "vitest";

import {
  buildInitialCreateFormValuesWithDefaults,
  resolveFieldDefaultForForm,
} from "./applyDefaultValues";

describe("applyDefaultValues", () => {
  it("resolves text constant", () => {
    const value = resolveFieldDefaultForForm({
      key: "title",
      rawFieldType: "text",
      defaultValueJson: { type: "constant", value: "Новый проект" },
    });

    expect(value).toBe("Новый проект");
  });

  it("resolves today + 7 days", () => {
    const value = resolveFieldDefaultForForm(
      {
        key: "due",
        rawFieldType: "date",
        defaultValueJson: { type: "today_plus_days", value: 7 },
      },
      { now: new Date("2026-06-05T12:00:00.000Z") },
    );

    expect(value).toBe("2026-06-12");
  });

  it("applies defaults and keeps manual priority via missing keys only on backend", () => {
    const values = buildInitialCreateFormValuesWithDefaults(
      [
        {
          key: "status",
          rawFieldType: "choice",
          defaultValueJson: { type: "option", value: "new" },
        },
        {
          key: "active",
          rawFieldType: "boolean",
          defaultValueJson: { type: "true", value: null },
        },
      ],
      { now: new Date("2026-06-05T12:00:00.000Z") },
    );

    expect(values.status).toBe("new");
    expect(values.active).toBe(true);
  });
});
