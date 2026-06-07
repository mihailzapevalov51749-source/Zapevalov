import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const tableSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "ObjectTableView.jsx"),
  "utf8",
);

describe("ObjectTableView excel import integration", () => {
  it("relies on ObjectViewHost runtime context actions instead of local providers", () => {
    assert.doesNotMatch(tableSource, /registerObjectTableImportProvider/);
    assert.match(tableSource, /query\.reload/);
  });
});
