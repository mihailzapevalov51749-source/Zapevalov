import { describe, expect, it } from "vitest";

import {
  buildPortalObjectRoute,
  buildPortalObjectTabHref,
  parsePortalObjectRoute,
  resolvePortalIdFromPath,
  resolvePortalNavigationClickTarget,
  rewritePortalScopedPath,
  transformRuntimeNavigationForPortal,
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

  it("resolvePortalIdFromPath reads portal id from runtime URL", () => {
    expect(resolvePortalIdFromPath("/portal/2/page/1", 1)).toBe(2);
    expect(resolvePortalIdFromPath("/admin/users", 3)).toBe(3);
  });

  it("rewritePortalScopedPath replaces stale portal id in menu URLs", () => {
    expect(rewritePortalScopedPath("/portal/1/page/12", 2)).toBe(
      "/portal/2/page/12",
    );
    expect(
      rewritePortalScopedPath("/portal/1/object-types/projects/plan", 2),
    ).toBe("/portal/2/object-types/projects/plan");
    expect(
      rewritePortalScopedPath("/designer/tenant/1/workspaces/razrabotka", 2),
    ).toBe("/portal/2/workspaces/razrabotka");
  });

  it("transformRuntimeNavigationForPortal rewrites persisted portal paths", () => {
    const [item] = transformRuntimeNavigationForPortal(
      [
        {
          id: "12",
          title: "Мои задачи",
          type: "page",
          page_id: 12,
          url: "/portal/1/page/12",
          route: "/portal/1/page/12",
        },
      ],
      2,
    );

    expect(item.url).toBe("/portal/2/page/12");
    expect(item.route).toBe("/portal/2/page/12");
  });

  it("resolvePortalNavigationClickTarget keeps tenant context on sidebar click", () => {
    expect(
      resolvePortalNavigationClickTarget(
        {
          title: "Мои задачи",
          url: "/portal/1/page/12",
        },
        2,
      ),
    ).toEqual({ path: "/portal/2/page/12" });

    expect(
      resolvePortalNavigationClickTarget(
        {
          title: "Главная",
          page_id: 1,
        },
        2,
      ),
    ).toEqual({ pageId: 1 });
  });
});
