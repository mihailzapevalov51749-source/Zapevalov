import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCompanyEntryPath,
  isReservedCompanyKeySegment,
  normalizeCompanyKey,
} from "./companyKeyPaths.js";

describe("companyKeyPaths", () => {
  it("normalizes company key", () => {
    assert.equal(normalizeCompanyKey(" OOO_Rozetka "), "ooo_rozetka");
  });

  it("detects reserved top-level segments", () => {
    assert.equal(isReservedCompanyKeySegment("designer"), true);
    assert.equal(isReservedCompanyKeySegment("ooo_rozetka"), false);
  });

  it("builds canonical company entry path", () => {
    assert.equal(buildCompanyEntryPath("ooo_rozetka"), "/ooo_rozetka");
  });
});
