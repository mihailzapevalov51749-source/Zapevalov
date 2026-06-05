import { describe, expect, it } from "vitest";

import {
  buildDefaultValuePayload,
  emptyDefaultValue,
  normalizeDefaultValueFromField,
  validateDefaultValueDraft,
} from "./defaultValueFormUtils";

describe("defaultValueFormUtils", () => {
  it("normalizes legacy boolean", () => {
    expect(normalizeDefaultValueFromField(true, "boolean")).toEqual({
      type: "true",
      value: null,
    });
  });

  it("builds text constant payload", () => {
    const result = buildDefaultValuePayload(
      { type: "constant", value: "Новый проект" },
      "text",
    );

    expect(result.payload).toEqual({
      type: "constant",
      value: "Новый проект",
    });
  });

  it("clears value for current_user", () => {
    const result = buildDefaultValuePayload(
      { type: "current_user", value: 99 },
      "user",
    );

    expect(result.payload).toEqual({
      type: "current_user",
      value: null,
    });
  });

  it("validates choice option against field options", () => {
    const error = validateDefaultValueDraft(
      { type: "option", value: "missing" },
      "choice",
      {
        choiceOptions: [{ key: "new", label: "Новая" }],
      },
    );

    expect(error).toBe("Выберите вариант из списка поля");
  });

  it("returns false default for boolean fields", () => {
    expect(emptyDefaultValue("boolean")).toEqual({
      type: "false",
      value: null,
    });
  });
});
