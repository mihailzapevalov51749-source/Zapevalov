import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { canNavigateBackInBrowserHistory } from "../../../shared/navigation/canNavigateBackInBrowserHistory.js";

const designerDir = dirname(fileURLToPath(import.meta.url));

describe("canNavigateBackInBrowserHistory", () => {
  it("returns false when browser history has only one entry", () => {
    const originalHistory = globalThis.history;
    globalThis.history = { length: 1 };

    try {
      assert.equal(canNavigateBackInBrowserHistory(), false);
    } finally {
      globalThis.history = originalHistory;
    }
  });
});

describe("DesignerAccessGate return action", () => {
  it("renders platform button and uses safe back-or-home navigation", () => {
    const gateSource = readFileSync(
      join(designerDir, "../pages/DesignerAccessGate.jsx"),
      "utf8",
    );
    const navigationSource = readFileSync(
      join(designerDir, "resolveDesignerAccessDeniedNavigation.js"),
      "utf8",
    );

    assert.match(gateSource, /platform-quick-create-modal__btn--primary/);
    assert.match(gateSource, /Вернуться/);
    assert.match(gateSource, /marginTop:\s*24/);
    assert.match(gateSource, /canNavigateBackInBrowserHistory\(\)/);
    assert.match(gateSource, /navigate\(-1\)/);
    assert.match(gateSource, /resolveDesignerAccessDeniedHomePath/);
    assert.match(gateSource, /platformQuickCreateModal\.css/);
    assert.doesNotMatch(gateSource, /ObjectSettingsButton/);
    assert.match(navigationSource, /resolveTenantIdFromPathname/);
    assert.match(navigationSource, /resolveTenantRuntimeEntryPath/);
    assert.doesNotMatch(gateSource, /window\.history\.back/);
    assert.doesNotMatch(gateSource, /window\.location\.reload/);
  });
});
