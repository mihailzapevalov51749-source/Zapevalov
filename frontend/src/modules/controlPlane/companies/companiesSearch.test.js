import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompanySearchHaystack,
  filterCompaniesBySearch,
  resolveCompanyCurrentName,
  resolveCompanyOriginalName,
} from "./companiesSearch.js";

test("resolveCompanyOriginalName falls back to current name", () => {
  assert.equal(
    resolveCompanyOriginalName({ original_name: "Розетка", name: "Розетка СПБ" }),
    "Розетка",
  );
  assert.equal(resolveCompanyOriginalName({ name: "Розетка" }), "Розетка");
});

test("resolveCompanyCurrentName returns profile name", () => {
  assert.equal(resolveCompanyCurrentName({ name: "Розетка СПБ" }), "Розетка СПБ");
});

test("filterCompaniesBySearch matches id, original and current names", () => {
  const companies = [
    {
      id: 21,
      original_name: "Розетка",
      name: "Розетка СПБ",
      code: "ooo_rozetka",
      public_slug: "rozetka",
      tenant_type: "CLIENT",
      tenant_status: "ACTIVE",
      platform_version: "1.0.0",
      template_version: "1.0.0",
    },
    {
      id: 2,
      original_name: "Эталон",
      name: "Эталон",
      code: "template",
      public_slug: "template",
      tenant_type: "TEMPLATE",
      tenant_status: "ACTIVE",
      platform_version: "1.0.14",
      template_version: "1.0.14",
    },
  ];

  assert.deepEqual(filterCompaniesBySearch(companies, "21"), [companies[0]]);
  assert.deepEqual(filterCompaniesBySearch(companies, "розетка"), [companies[0]]);
  assert.deepEqual(filterCompaniesBySearch(companies, "спб"), [companies[0]]);
  assert.deepEqual(filterCompaniesBySearch(companies, "rozetka"), [companies[0]]);
  assert.equal(buildCompanySearchHaystack(companies[0]).includes("21"), true);
});
