import assert from "node:assert/strict";
import test from "node:test";

import { buildLoginCompanySubtitle } from "./loginCompanySubtitle.js";

test("buildLoginCompanySubtitle uses company name with guillemets", () => {
  assert.equal(buildLoginCompanySubtitle("ООО Розетка"), "Компания «ООО Розетка»");
});

test("buildLoginCompanySubtitle falls back without technical ids", () => {
  assert.equal(buildLoginCompanySubtitle(""), "Компания");
  assert.equal(buildLoginCompanySubtitle("   "), "Компания");
  assert.equal(buildLoginCompanySubtitle(null), "Компания");
  assert.equal(buildLoginCompanySubtitle(undefined), "Компания");
});
