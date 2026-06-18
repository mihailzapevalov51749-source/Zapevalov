import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("CompanyDetailCard uses Superadmin terminology", () => {
  const source = readFileSync(join(__dirname, "CompanyDetailCard.jsx"), "utf8");

  assert.match(source, /aria-label="Superadmin"/);
  assert.match(source, /label="Роль"/);
  assert.match(source, /Superadmin/);
  assert.match(source, /Сменить Superadmin/);
  assert.match(source, /Назначить Superadmin/);
  assert.match(source, /Superadmin не назначен/);
  assert.doesNotMatch(source, /Владелец компании/);
  assert.doesNotMatch(source, /Company Owner/);
  assert.doesNotMatch(source, /Сменить администратора/);
});
