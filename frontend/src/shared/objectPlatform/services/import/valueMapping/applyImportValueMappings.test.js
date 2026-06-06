import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildImportValueMappingsLookup,
  importValueMappingsNeedUserInput,
  lookupImportValueMappingRule,
  updateImportValueMappingRule,
} from "./applyImportValueMappings.js";
import { IMPORT_VALUE_SKIP_OPTION } from "./importValueMappingConstants.js";

describe("applyImportValueMappings", () => {
  it("tracks unresolved user input and updates rules", () => {
    const rules = [
      {
        id: "status::выполняется",
        fieldKey: "status",
        excelValue: "Выполняется",
        resolvedValue: null,
        skip: false,
      },
    ];

    assert.equal(importValueMappingsNeedUserInput(rules), true);

    const updated = updateImportValueMappingRule(rules, "status::выполняется", "v_rabote");

    assert.equal(importValueMappingsNeedUserInput(updated), false);

    const lookup = buildImportValueMappingsLookup(updated);
    const rule = lookupImportValueMappingRule(lookup, "status", "Выполняется");

    assert.equal(rule?.resolvedValue, "v_rabote");

    const skipped = updateImportValueMappingRule(
      rules,
      "status::выполняется",
      IMPORT_VALUE_SKIP_OPTION,
    );

    assert.equal(importValueMappingsNeedUserInput(skipped), false);
    assert.equal(skipped[0].skip, true);
  });
});
