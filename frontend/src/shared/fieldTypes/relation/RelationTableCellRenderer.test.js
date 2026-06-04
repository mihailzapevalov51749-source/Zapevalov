import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const rendererSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "RelationTableCellRenderer.jsx"),
  "utf8",
);

const viewCellSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../viewEngine/ViewEngineCell.jsx"),
  "utf8",
);

describe("RelationTableCellRenderer", () => {
  it("renders relation table enriched values and opens related entity", () => {
    assert.match(rendererSource, /isRelationTableValue/);
    assert.match(rendererSource, /formatRelationTableDisplayLabel/);
    assert.match(rendererSource, /onOpenRelatedEntity/);
    assert.match(rendererSource, /many_compact/);
  });

  it("is wired in ViewEngineCell for relation columns", () => {
    assert.match(viewCellSource, /RelationTableCellRenderer/);
    assert.match(viewCellSource, /isRelationColumn/);
    assert.match(
      viewCellSource,
      /isRelationColumn \? \([\s\S]*RelationTableCellRenderer/,
    );
  });
});
