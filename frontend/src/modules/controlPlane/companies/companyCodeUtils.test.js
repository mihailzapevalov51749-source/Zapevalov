import assert from "node:assert/strict";
import test from "node:test";

import { buildCompanyCodeFromName, isValidCompanyCode } from "./companyCodeUtils.js";

test("buildCompanyCodeFromName transliterates company names", () => {
  assert.equal(buildCompanyCodeFromName("ООО Ромашка"), "ooo_romashka");
  assert.equal(buildCompanyCodeFromName("Platform Template"), "platform_template");
  assert.equal(buildCompanyCodeFromName("Demo Компания"), "demo_kompaniya");
});

test("isValidCompanyCode accepts snake_case keys", () => {
  assert.equal(isValidCompanyCode("ooo_romashka"), true);
  assert.equal(isValidCompanyCode("1bad"), false);
});
