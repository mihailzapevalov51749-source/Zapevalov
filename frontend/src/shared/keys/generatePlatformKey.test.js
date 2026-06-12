import assert from "node:assert/strict";
import test from "node:test";

import { generatePlatformKey, slugifyPlatformKey } from "./generatePlatformKey.js";
import { validatePlatformKey } from "./platformKeyValidation.js";

test("generatePlatformKey transliterates latin names to snake_case", () => {
  assert.equal(generatePlatformKey("Platform Developer"), "platform_developer");
  assert.equal(generatePlatformKey("Release Manager"), "release_manager");
});

test("generatePlatformKey transliterates cyrillic names", () => {
  assert.equal(
    slugifyPlatformKey("Администратор платформы"),
    "administrator_platformy",
  );
  assert.equal(slugifyPlatformKey("Роль тестирования"), "rol_testirovaniya");
});

test("generatePlatformKey avoids duplicates with numeric suffix", () => {
  assert.equal(
    generatePlatformKey("Platform Developer", ["platform_developer"]),
    "platform_developer_2",
  );
});

test("validatePlatformKey rejects invalid and duplicate keys", () => {
  assert.equal(validatePlatformKey(""), "Укажите код");
  assert.equal(validatePlatformKey("1bad"), "Код должен начинаться с латинской буквы или _");
  assert.equal(
    validatePlatformKey("platform_developer", ["platform_developer"]),
    "Роль с таким кодом уже существует",
  );
  assert.equal(validatePlatformKey("platform_developer", []), null);
});
