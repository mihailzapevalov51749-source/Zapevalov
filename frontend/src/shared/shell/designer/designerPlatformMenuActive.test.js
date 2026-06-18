import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDesignerRouteOwner } from "./designerRouteOwnership.js";
import { resolveActiveDesignerSidebarItemId } from "./designerNavigationResolver.js";

const TENANT_ID = 1;
const BASE = `/designer/tenant/${TENANT_ID}`;

const STUDIO_MENU_ITEMS = [
  {
    id: "system-designer-event-journal",
    title: "Журнал событий",
    route: `${BASE}/event-journal`,
    path: `${BASE}/event-journal`,
    system_key: "event-journal",
    section: "event-journal",
  },
  {
    id: "system-designer-platform-releases",
    title: "Релизы платформы",
    route: `${BASE}/platform-releases`,
    path: `${BASE}/platform-releases`,
    system_key: "platform-releases",
    section: "platform-releases",
  },
  {
    id: "system-designer-pages",
    title: "Страницы",
    route: `${BASE}/pages`,
    path: `${BASE}/pages`,
    system_key: "pages",
    section: "pages",
  },
];

describe("resolveDesignerRouteOwner platform sections", () => {
  it("maps event-journal route to event-journal section key", () => {
    const owner = resolveDesignerRouteOwner(`${BASE}/event-journal`, STUDIO_MENU_ITEMS, TENANT_ID);
    assert.equal(owner?.kind, "root_section");
    assert.equal(owner?.sectionKey, "event-journal");
  });

  it("maps platform-releases route to platform-releases section key", () => {
    const owner = resolveDesignerRouteOwner(
      `${BASE}/platform-releases`,
      STUDIO_MENU_ITEMS,
      TENANT_ID,
    );
    assert.equal(owner?.kind, "root_section");
    assert.equal(owner?.sectionKey, "platform-releases");
  });
});

describe("resolveActiveDesignerSidebarItemId platform sections", () => {
  it("highlights event journal on event-journal route", () => {
    const pathname = `${BASE}/event-journal`;
    const routeOwner = resolveDesignerRouteOwner(pathname, STUDIO_MENU_ITEMS, TENANT_ID);
    const activeId = resolveActiveDesignerSidebarItemId({
      activePathname: pathname,
      navigationItems: STUDIO_MENU_ITEMS,
      tenantId: TENANT_ID,
      routeOwner,
    });
    assert.equal(activeId, "system-designer-event-journal");
  });

  it("highlights platform releases on platform-releases route", () => {
    const pathname = `${BASE}/platform-releases`;
    const routeOwner = resolveDesignerRouteOwner(pathname, STUDIO_MENU_ITEMS, TENANT_ID);
    const activeId = resolveActiveDesignerSidebarItemId({
      activePathname: pathname,
      navigationItems: STUDIO_MENU_ITEMS,
      tenantId: TENANT_ID,
      routeOwner,
    });
    assert.equal(activeId, "system-designer-platform-releases");
  });

  it("highlights platform releases without stored route owner (reload fallback)", () => {
    const pathname = `${BASE}/platform-releases`;
    const activeId = resolveActiveDesignerSidebarItemId({
      activePathname: pathname,
      navigationItems: STUDIO_MENU_ITEMS,
      tenantId: TENANT_ID,
      routeOwner: null,
    });
    assert.equal(activeId, "system-designer-platform-releases");
  });

  it("does not highlight event journal on platform-releases route", () => {
    const pathname = `${BASE}/platform-releases`;
    const activeId = resolveActiveDesignerSidebarItemId({
      activePathname: pathname,
      navigationItems: STUDIO_MENU_ITEMS,
      tenantId: TENANT_ID,
      routeOwner: null,
    });
    assert.notEqual(activeId, "system-designer-event-journal");
  });
});
