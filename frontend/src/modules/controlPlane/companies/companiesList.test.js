import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("CompaniesList renders id, original name and current name columns", () => {
  const listSource = readFileSync(join(__dirname, "CompaniesList.jsx"), "utf8");
  const stylesSource = readFileSync(join(__dirname, "companiesWorkspaceStyles.js"), "utf8");

  assert.match(listSource, /Название при создании/);
  assert.match(listSource, /Текущее название/);
  assert.match(listSource, /resolveCompanyOriginalName/);
  assert.match(listSource, /resolveCompanyCurrentName/);
  assert.match(listSource, /company\.id/);
  assert.match(stylesSource, /gridTemplateColumns/);
});
