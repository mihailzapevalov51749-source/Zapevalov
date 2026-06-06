import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("PortalObjectDataPage excel import host", () => {
  it("mounts ObjectExcelImportHost in office runtime", () => {
    const source = readFileSync(new URL("./PortalObjectDataPage.jsx", import.meta.url), "utf8");

    assert.match(source, /ObjectExcelImportHost/);
    assert.doesNotMatch(source, /studio-preview/);
  });
});
