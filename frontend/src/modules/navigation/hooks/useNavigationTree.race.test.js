import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import test from "node:test";

const navigationDir = dirname(fileURLToPath(import.meta.url));

test("useNavigationTree clears navigation on portal switch and ignores stale responses", () => {
  const source = readFileSync(join(navigationDir, "useNavigationTree.js"), "utf8");

  assert.match(source, /beginNavigationReloadRequest/);
  assert.match(source, /isStaleNavigationReloadResponse/);
  assert.match(source, /currentPortalIdRef/);
  assert.match(source, /reloadRequestSeqRef/);
  assert.match(
    source,
    /previousPortalIdRef\.current !== portalId[\s\S]*setNavigation\(\[\]\)/,
  );
  assert.match(source, /if \(isStaleResponse\(\)\) \{[\s\S]*return;/);
});
