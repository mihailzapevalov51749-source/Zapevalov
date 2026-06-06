import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ObjectTableView excel import integration", () => {
  it("registers import provider only outside studio preview", () => {
    const source = readFileSync(new URL("./ObjectTableView.jsx", import.meta.url), "utf8");

    assert.match(source, /registerObjectTableImportProvider/);
    assert.match(source, /resolveImportableFields/);
    assert.match(source, /buildImportSnapshot/);
    assert.match(source, /onImported: \(\) => query\.reload/);
    assert.match(source, /if \(isPreviewMode\) \{[\s\S]*return undefined;[\s\S]*registerObjectTableImportProvider/);
  });
});
