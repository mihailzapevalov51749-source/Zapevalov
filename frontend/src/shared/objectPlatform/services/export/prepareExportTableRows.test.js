import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildObjectTableHierarchyDisplayRows } from "../../../../modules/objectViews/table/services/buildObjectTableHierarchyDisplayRows.js";
import { resolveExpandableHierarchyRowIds } from "../../../../modules/objectViews/table/services/resolveExpandableHierarchyRowIds.js";

const orderHierarchySource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "orderExportHierarchyRows.js"),
  "utf8",
);

function row(id) {
  return { id, cells: [] };
}

describe("orderExportHierarchyRows", () => {
  it("reuses buildObjectTableHierarchyDisplayRows for export ordering", () => {
    assert.match(orderHierarchySource, /buildObjectTableHierarchyDisplayRows/);
    assert.match(orderHierarchySource, /resolveExpandableHierarchyRowIds/);
    assert.match(orderHierarchySource, /EXPORT_HIERARCHY_NUMBER_COLUMN_KEY/);
  });

  it("places hierarchy column after row number with compact label", () => {
    assert.match(orderHierarchySource, /label: "Иерархия"/);
    assert.match(orderHierarchySource, /isTableRowNumberPresentationFieldKey/);
    assert.doesNotMatch(orderHierarchySource, /Иерархический №/);
  });
});

describe("export hierarchy ordering", () => {
  it("exports full tree order with hierarchy numbers when all parents expanded", () => {
    const flatRows = [row("r1"), row("r2"), row("r2c1"), row("r2c2"), row("r3")];
    const parentByChild = new Map([
      ["r2c1", "r2"],
      ["r2c2", "r2"],
    ]);
    const childrenByParent = new Map([["r2", ["r2c1", "r2c2"]]]);

    const expandableRowIds = resolveExpandableHierarchyRowIds({
      childrenByParent,
      flatRowIds: flatRows.map((item) => String(item.id)),
    });

    const ordered = buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds: new Set(expandableRowIds),
    });

    assert.deepEqual(ordered.map((item) => item.id), ["r1", "r2", "r2c1", "r2c2", "r3"]);
    assert.deepEqual(
      ordered.map((item) => item.hierarchy.hierarchyNumber),
      ["1", "2", "2.1", "2.2", "3"],
    );
  });

  it("includes collapsed descendants when all expandable parents are expanded", () => {
    const flatRows = [row("a"), row("b")];
    const parentByChild = new Map([["b", "a"]]);
    const childrenByParent = new Map([["a", ["b"]]]);

    const expandableRowIds = resolveExpandableHierarchyRowIds({
      childrenByParent,
      flatRowIds: flatRows.map((item) => String(item.id)),
    });

    const ordered = buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds: new Set(expandableRowIds),
    });

    assert.deepEqual(ordered.map((item) => item.id), ["a", "b"]);
    assert.equal(ordered[1].hierarchy.hierarchyNumber, "1.1");
  });
});
