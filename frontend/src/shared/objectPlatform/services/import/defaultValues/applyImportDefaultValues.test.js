import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyImportDefaultValues } from "./applyImportDefaultValues.js";
import { IMPORT_DATA_SOURCE_DEFAULT_VALUE } from "./importDefaultValueConstants.js";

describe("applyImportDefaultValues", () => {
  it("applies default user value to row values", () => {
    const fieldByKey = new Map([
      [
        "assignee",
        {
          key: "assignee",
          rawFieldType: "user",
          type: "user",
          isRequired: true,
        },
      ],
    ]);

    const values = {};

    applyImportDefaultValues(
      values,
      [
        {
          fieldKey: "assignee",
          source: IMPORT_DATA_SOURCE_DEFAULT_VALUE,
          defaultValue: 42,
        },
      ],
      fieldByKey,
    );

    assert.equal(values.assignee, 42);
  });
});
