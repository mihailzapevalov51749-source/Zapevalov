import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { migrateControlPlaneSystemMenuSettings } from "./controlPlaneNavMenuSettingsMigration.js";
import { resolveTenantPlatformVersion } from "../../modules/controlPlane/companies/resolveTenantPlatformVersion.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("migrateControlPlaneSystemMenuSettings copies cp-releases to cp-group-releases", () => {
  const { settings, changed } = migrateControlPlaneSystemMenuSettings({
    "cp-releases": {
      block_id: 3,
      sort_order: 12,
      color: "#2563eb",
    },
  });

  assert.equal(changed, true);
  assert.deepEqual(settings["cp-group-releases"], {
    block_id: 3,
    sort_order: 12,
    color: "#2563eb",
  });
  assert.equal(settings["cp-releases"], undefined);
});

test("migrateControlPlaneSystemMenuSettings is stable on repeated normalization", () => {
  const first = migrateControlPlaneSystemMenuSettings({
    "cp-releases": {
      block_id: 3,
      sort_order: 12,
    },
    "cp-group-releases": {
      block_id: 3,
      sort_order: 12,
    },
  });

  const second = migrateControlPlaneSystemMenuSettings(first.settings);

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.deepEqual(second.settings, first.settings);
});

test("resolveTenantPlatformVersion prefers platform_version from registry", () => {
  assert.equal(
    resolveTenantPlatformVersion({
      platform_version: "1.0.0-dev",
      template_version: "1.0.0",
    }),
    "1.0.0-dev",
  );
});

test("platformVersionRegistryApi uses platformApiClient with auth", () => {
  const source = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "modules",
      "platformReleases",
      "api",
      "platformVersionRegistryApi.js",
    ),
    "utf8",
  );

  assert.match(source, /platformApiClient/);
  assert.doesNotMatch(source, /from ["'].*\/api\/apiClient["']/);
});
