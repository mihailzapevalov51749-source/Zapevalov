import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { mapPlatformProfileToGeneralSettings } from "../../controlPlane/platformProfile/platformProfileSettingsModel.js";
import { TENANT_GENERAL_SETTINGS_DEFAULTS } from "./generalSettingsDefaults.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("GeneralSettingsPanel contains tenant general settings grid blocks", () => {
  const source = readFileSync(join(__dirname, "GeneralSettingsPanel.jsx"), "utf8");

  assert.match(source, /topGridStyle/);
  assert.match(source, /bottomGridStyle/);
  assert.match(source, /Основная информация/);
  assert.match(source, /Ключевые параметры/);
  assert.match(source, /Хранилище файлов/);
  assert.match(source, /Почтовые настройки \(SMTP\)/);
  assert.match(source, /Политики паролей/);
  assert.match(source, /Поддержка и контакты/);
  assert.match(source, /Системная информация/);
});

test("mapPlatformProfileToGeneralSettings uses platform profile domain only", () => {
  const mapped = mapPlatformProfileToGeneralSettings({
    domain: "platform_profile_settings",
    general: { name: "Test Platform" },
  });

  assert.equal(mapped.general.name, "Test Platform");
  assert.notEqual(mapped.general.name, TENANT_GENERAL_SETTINGS_DEFAULTS.general.name);
  assert.equal(mapped.smtp.host, "smtp.yasno.ru");
});
