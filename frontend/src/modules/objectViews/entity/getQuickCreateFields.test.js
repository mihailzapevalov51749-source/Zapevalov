import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

describe("getQuickCreateFields", () => {
  it("documents title-always and quick_create filter contract", () => {
    const source = readFileSync(join(dir, "getQuickCreateFields.js"), "utf8");

    assert.match(source, /resolveTitleFieldKey/);
    assert.match(source, /includeTitle/);
    assert.match(source, /quick_create/);
    assert.match(source, /isCreatableFieldType/);
    assert.doesNotMatch(source, /rawType === "relation"/);
    assert.match(source, /isTitleField/);
    assert.match(source, /isRequired: includeTitle \? true/);
  });
});
