import { describe, expect, it } from "vitest";

import {
  resolvePlanFieldDisplayValue,
  resolvePlanStatusOptions,
} from "./planFieldUtils.js";

const STATUS_FIELD = {
  key: "status",
  field_type: "status",
  settings_json: {
    options: [
      { key: "option_1780780345", label: "Не начато", color: "#94A3B8" },
      { key: "option_active", label: "Активное", color: "#3B82F6" },
    ],
  },
};

describe("resolvePlanFieldDisplayValue", () => {
  it("resolves option key to label via field settings", () => {
    const display = resolvePlanFieldDisplayValue("option_1780780345", STATUS_FIELD);

    expect(display.label).toBe("Не начато");
    expect(display.color).toBe("#94A3B8");
  });

  it("falls back to String(rawValue) when field definition is missing", () => {
    const display = resolvePlanFieldDisplayValue("option_1780780345", null);

    expect(display.label).toBe("option_1780780345");
    expect(display.color).toBe("");
  });

  it("exposes options compatible with Plan detail select", () => {
    expect(resolvePlanStatusOptions(STATUS_FIELD)).toEqual([
      { value: "option_1780780345", label: "Не начато" },
      { value: "option_active", label: "Активное" },
    ]);
  });
});
