import { describe, expect, it } from "vitest";

import { shouldShowPlanRoleMappingMigrationAssistant } from "./shouldShowPlanRoleMappingMigrationAssistant.js";

describe("shouldShowPlanRoleMappingMigrationAssistant", () => {
  it("hides when roleMapping is filled", () => {
    expect(
      shouldShowPlanRoleMappingMigrationAssistant(
        { nodeTitle: "nazvanie" },
        { titleFieldKey: "nazvanie" },
      ),
    ).toBe(false);
  });

  it("shows when roleMapping empty and legacy keys exist", () => {
    expect(
      shouldShowPlanRoleMappingMigrationAssistant(
        {},
        { titleFieldKey: "nazvanie", descriptionFieldKey: "opisanie" },
      ),
    ).toBe(true);
  });

  it("hides when roleMapping empty and no legacy keys", () => {
    expect(shouldShowPlanRoleMappingMigrationAssistant({}, {})).toBe(false);
  });
});
