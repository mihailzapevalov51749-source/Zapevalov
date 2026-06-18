import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const apiSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "globalUsersApi.js"),
  "utf8",
);

test("global users API loads from control-plane endpoint without tenant scope", () => {
  assert.match(apiSource, /platformApiClient\.get\("\/control-plane\/global-users"\)/);
  assert.doesNotMatch(apiSource, /tenantId|tenant_id|currentTenant|currentUser/);
});
