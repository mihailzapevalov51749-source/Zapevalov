import { describe, expect, it } from "vitest";

import {
  buildPortalObjectRoute,
  buildPortalObjectTabHref,
  parsePortalObjectRoute,
} from "./portalObjectRoutes";

describe("portalObjectRoutes", () => {
  it("builds object tab route for slug-based object types", () => {
    expect(
      buildPortalObjectRoute(1, { objectTypeKey: "zadachnik", viewKey: "kanban" }),
    ).toBe("/portal/1/object-types/zadachnik/kanban");
  });

  it("parses view key from portal object path", () => {
    expect(
      parsePortalObjectRoute("/portal/1/object-types/zadachnik/kanban"),
    ).toEqual({
      portalId: 1,
      objectTypeRef: "zadachnik",
      viewKey: "kanban",
      isDataRoute: false,
    });
  });

  it("reads view key from query for uuid data routes", () => {
    const uuid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    expect(
      parsePortalObjectRoute(
        `/portal/1/object-types/${uuid}/data`,
        "?viewKey=default_table",
      ),
    ).toEqual({
      portalId: 1,
      objectTypeRef: uuid,
      viewKey: "default_table",
      isDataRoute: true,
    });
  });

  it("buildPortalObjectTabHref mirrors slug tab navigation", () => {
    expect(
      buildPortalObjectTabHref({
        portalId: 1,
        objectTypeRef: "zadachnik",
        viewKey: "card",
      }),
    ).toBe("/portal/1/object-types/zadachnik/card");
  });
});
