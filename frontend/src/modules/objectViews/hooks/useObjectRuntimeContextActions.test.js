import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const hookSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useObjectRuntimeContextActions.js"),
  "utf8",
);

const hostSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../ObjectViewHost.jsx"),
  "utf8",
);

const tableSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../table/ObjectTableView.jsx",
  ),
  "utf8",
);

describe("useObjectRuntimeContextActions", () => {
  it("registers shared import and export providers", () => {
    assert.match(hookSource, /registerObjectTableImportProvider/);
    assert.match(hookSource, /registerObjectTableExportProvider/);
    assert.match(hookSource, /resolveImportableFields/);
    assert.match(hookSource, /useObjectTableColumns/);
  });
});

describe("ObjectViewHost runtime context actions", () => {
  it("wires object context actions for all view adapters", () => {
    assert.match(hostSource, /useObjectRuntimeContextActions/);
    assert.match(hostSource, /resolvedViewType === "plan"/);
  });
});

describe("ObjectTableView runtime context actions", () => {
  it("does not register duplicate object context providers", () => {
    assert.doesNotMatch(tableSource, /registerObjectTableImportProvider/);
    assert.doesNotMatch(tableSource, /registerObjectTableExportProvider/);
  });
});
