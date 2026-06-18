import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldShowOpenTemplateButton,
  TEMPLATE_ENVIRONMENT_KEY,
} from "./templateEnvironmentLaunchHelpers.js";
import { buildSessionBridgeEntryUrl } from "./openCompanyBridgeUrls.js";

describe("openTemplateFromEnvironment helpers", () => {
  it("shows open button only for TEMPLATE environment", () => {
    assert.equal(
      shouldShowOpenTemplateButton({ environment_key: TEMPLATE_ENVIRONMENT_KEY }),
      true,
    );
    assert.equal(shouldShowOpenTemplateButton({ environment_key: "DEV" }), false);
    assert.equal(shouldShowOpenTemplateButton({ environment_key: "CLIENT" }), false);
    assert.equal(shouldShowOpenTemplateButton(null), false);
  });

  it("builds session bridge entry URL for template redirect", () => {
    const url = buildSessionBridgeEntryUrl({
      frontendBaseUrl: "http://localhost:5174",
      bridgeTicket: "signed-template-ticket",
      redirectPath: "/portal/2/page/347",
    });

    assert.equal(
      url,
      "http://localhost:5174/auth/session-bridge-entry?ticket=signed-template-ticket&redirect=%2Fportal%2F2%2Fpage%2F347",
    );
  });
});
