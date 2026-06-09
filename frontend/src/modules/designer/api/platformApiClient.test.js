import { describe, expect, it } from "vitest";

import {
  formatRestoreConflictMessage,
  getApiErrorMessage,
} from "./platformApiClient.js";

describe("formatRestoreConflictMessage", () => {
  it("formats relation_definition conflict with key", () => {
    expect(
      formatRestoreConflictMessage({
        error: "restore_conflict",
        entity_type: "relation_definition",
        key: "idei",
        message: "Активная сущность с таким ключом уже существует",
      }),
    ).toBe(
      'Невозможно восстановить запись.\n\nВ системе уже существует активная связь с ключом "idei".',
    );
  });
});

describe("getApiErrorMessage", () => {
  it("maps restore_conflict detail to user-facing text", () => {
    const message = getApiErrorMessage(
      {
        response: {
          data: {
            detail: {
              error: "restore_conflict",
              entity_type: "relation_definition",
              key: "idei",
              message: "Активная сущность с таким ключом уже существует",
            },
          },
        },
      },
      "Не удалось восстановить",
    );

    expect(message).toContain("Невозможно восстановить запись.");
    expect(message).toContain('"idei"');
  });

  it("uses fallback instead of Network Error", () => {
    expect(
      getApiErrorMessage({ message: "Network Error" }, "Не удалось восстановить"),
    ).toBe("Не удалось восстановить");
  });
});
