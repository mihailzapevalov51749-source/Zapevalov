import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import useObjectTableSelection from "./useObjectTableSelection.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("useObjectTableSelection module", () => {
  it("exports selection api surface", () => {
    const source = readFileSync(resolve(here, "useObjectTableSelection.js"), "utf8");

    expect(source).toContain("toggleSelection");
    expect(source).toContain("selectAllVisible");
    expect(source).toContain("clearSelection");
    expect(source).toContain("toggleAllVisible");
    expect(source).toContain("headerIndeterminate");
    expect(typeof useObjectTableSelection).toBe("function");
  });

  it("wires into ObjectTableView and ViewEngineTable", () => {
    const tableView = readFileSync(
      resolve(here, "../ObjectTableView.jsx"),
      "utf8",
    );
    const viewEngineTable = readFileSync(
      resolve(here, "../../../../shared/viewEngine/ViewEngineTable.jsx"),
      "utf8",
    );
    const selectionCell = readFileSync(
      resolve(here, "../../../../shared/viewEngine/components/ViewEngineSelectionCell.jsx"),
      "utf8",
    );

    expect(tableView).toContain("useObjectTableSelection");
    expect(tableView).toContain("ObjectTableBulkActionsBar");
    expect(tableView).toContain("rowSelection={rowSelection}");
    expect(viewEngineTable).toContain("rowSelection");
    expect(selectionCell).toContain("stopPropagation");
  });
});
