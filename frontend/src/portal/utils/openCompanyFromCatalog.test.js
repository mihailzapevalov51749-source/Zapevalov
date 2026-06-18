import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCompanyPortalPath,
  buildSessionBridgeEntryUrl,
} from "./openCompanyBridgeUrls.js";

const catalogItem = {
  id: 21,
  portal_id: 21,
  home_page_id: 1067,
  frontend_base_url: "http://localhost:5175",
  code: "ooo_rozetka",
  database_name: "yasnopro_client",
};

describe("openCompanyFromCatalog bridge helpers", () => {
  it("builds portal path from catalog metadata", () => {
    assert.equal(buildCompanyPortalPath(catalogItem), "/portal/21/page/1067");
  });

  it("builds session bridge entry URL with ticket and redirect", () => {
    const url = buildSessionBridgeEntryUrl({
      frontendBaseUrl: "http://localhost:5175",
      bridgeTicket: "signed-ticket",
      redirectPath: "/portal/21/page/1067",
    });

    assert.equal(
      url,
      "http://localhost:5175/auth/session-bridge-entry?ticket=signed-ticket&redirect=%2Fportal%2F21%2Fpage%2F1067",
    );
  });

  it("rejects invalid bridge entry URL inputs", () => {
    assert.equal(
      buildSessionBridgeEntryUrl({
        frontendBaseUrl: "",
        bridgeTicket: "signed-ticket",
        redirectPath: "/portal/21/page/1067",
      }),
      null,
    );
    assert.equal(
      buildSessionBridgeEntryUrl({
        frontendBaseUrl: "http://localhost:5175",
        bridgeTicket: "",
        redirectPath: "/portal/21/page/1067",
      }),
      null,
    );
  });
});
