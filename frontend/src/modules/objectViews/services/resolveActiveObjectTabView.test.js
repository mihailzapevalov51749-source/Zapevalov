import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

import {
  resolveActiveObjectTabView,
} from "../services/resolveActiveView.js";

describe("resolveActiveObjectTabView", () => {
  it("resolves plan tab by key from full tab lookup", () => {
    const views = [
      {
        raw: { key: "default_table", view_type: "table" },
        contract: { key: "default_table", viewType: "table" },
      },
      {
        raw: { key: "architecture", view_type: "plan" },
        contract: { key: "architecture", viewType: "plan" },
      },
    ];

    const plan = resolveActiveObjectTabView(views, "architecture");
    assert.equal(plan?.contract?.viewType, "plan");

    const tableOnlyViews = views.filter(
      (item) => String(item.raw?.view_type || "").toLowerCase() === "table",
    );
    assert.equal(resolveActiveObjectTabView(tableOnlyViews, "architecture"), null);
  });
});

describe("plan view routing evidence", () => {
  it("uses tab lookup and caps query page size", () => {
    const definitionsSource = readFileSync(
      new URL("../hooks/useObjectViewDefinitions.js", import.meta.url),
      "utf8",
    );
    const hostSource = readFileSync(
      new URL("../ObjectViewHost.jsx", import.meta.url),
      "utf8",
    );
    const previewSource = readFileSync(
      new URL("../../designer/components/tabs/RuntimePreviewTab.jsx", import.meta.url),
      "utf8",
    );

    assert.match(definitionsSource, /resolveActiveObjectTabView/);
    assert.doesNotMatch(hostSource, /Math\.max\(pageSize, 1000\)/);
    assert.match(hostSource, /Math\.min\(Math\.max\(Number\(pageSize\)/);
    assert.match(previewSource, /viewType=\{selectedView\?\.view_type/);
  });
});
