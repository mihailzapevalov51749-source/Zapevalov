import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
} from "../shared/appShell/pageLayoutContract/pageLayoutContractTypes.js";
import {
  clearPortalHomePageCache,
  primePortalHomePageCache,
} from "./utils/resolvePortalHomePage.js";

import {
  isDesignerShellEmbeddedPortalRoute,
  resolvePortalPageTitle,
  resolvePortalPageViewFallbackRoute,
  resolvePortalPageViewLayoutContractOverrides,
} from "./resolvePortalPageViewLayoutContract.js";

const portalDir = dirname(fileURLToPath(import.meta.url));

describe("resolvePortalPageViewLayoutContractOverrides", () => {
  beforeEach(() => {
    clearPortalHomePageCache();
    primePortalHomePageCache(1, 5);
  });
  afterEach(() => clearPortalHomePageCache());
  it("returns studio_admin contract for designer administration root", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/designer/tenant/1/administration" },
      null,
    );

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("returns studio_admin contract for nested designer administration pages", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/designer/tenant/1/administration/users" },
      null,
    );

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("returns studio_page_editor contract for designer custom page route", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/designer/tenant/1/page/42" },
      42,
    );

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("keeps chat_room handling disabled in PortalPageView overrides", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/portal/1/page/35" },
      35,
    );

    assert.equal(contract.canMinimize, false);
    assert.equal(contract.toolbarZoneId, null);
  });

  it("detects corporate chat by runtime navigation system_key", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/portal/2/page/128" },
      128,
      {
        activeNavigationItem: {
          system_key: "runtime.chat",
          menu_scope: "runtime",
          title: "Чат",
        },
      },
    );

    assert.equal(contract.canMinimize, false);
    assert.equal(contract.toolbarZoneId, null);
  });

  it("does not treat unrelated CMS page as chat when system_key missing", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/portal/2/page/128" },
      128,
      {
        activeNavigationItem: {
          menu_scope: "runtime",
          title: "Главная",
        },
      },
    );

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE);
  });

  it("returns office_page contract for portal CMS route", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/portal/1/page/12" },
      12,
    );

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE);
    assert.equal(contract.canMinimize, true);
  });

  it("returns office CMS title, context.pageTitle and fallbackRoute", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/portal/1/page/12" },
      12,
      {
        portalId: 1,
        page: { title: "Мои задачи" },
        navigationItemTitle: "Мои задачи",
      },
    );

    assert.equal(contract.title, "Мои задачи");
    assert.equal(contract.context.pageTitle, "Мои задачи");
    assert.equal(contract.context.pageId, 12);
    assert.equal(contract.context.layoutPageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE);
    assert.equal(contract.fallbackRoute, "/portal/1/page/5");
    assert.equal(contract.canMinimize, true);
  });

  it("returns studio page editor title, context.pageTitle and fallbackRoute", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/designer/tenant/1/page/42" },
      42,
      {
        page: { title: "Лендинг продукта" },
      },
    );

    assert.equal(contract.title, "Лендинг продукта");
    assert.equal(contract.context.pageTitle, "Лендинг продукта");
    assert.equal(contract.context.pageId, 42);
    assert.equal(contract.fallbackRoute, "/designer/tenant/1/pages");
    assert.equal(contract.canMinimize, true);
  });

  it("returns studio administration fallbackRoute for nested admin page", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/designer/tenant/1/administration/users" },
      null,
      {
        headerTitle: "Пользователи системы",
      },
    );

    assert.equal(contract.fallbackRoute, "/designer/tenant/1/administration");
    assert.equal(contract.title, "Пользователи системы");
  });

  it("does not enable minimize for unknown system route", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/legacy-removed-route" },
      null,
    );

    assert.equal(contract.canMinimize, false);
    assert.equal(contract.toolbarZoneId, null);
  });

  it("does not enable minimize for dev preview route", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/dev/app-header-renderer" },
      null,
    );

    assert.equal(contract.canMinimize, false);
    assert.equal(contract.toolbarZoneId, null);
  });
});

describe("resolvePortalPageTitle", () => {
  it("prefers page.title over navigation title", () => {
    assert.equal(
      resolvePortalPageTitle({
        page: { title: "Мои задачи", name: "tasks" },
        navigationItemTitle: "Задачи",
      }),
      "Мои задачи",
    );
  });

  it("falls back to navigation title and readable slug", () => {
    assert.equal(
      resolvePortalPageTitle({
        navigationItemTitle: "Проблемы",
      }),
      "Проблемы",
    );
    assert.equal(
      resolvePortalPageTitle({
        page: { slug: "my_tasks" },
      }),
      "my tasks",
    );
  });
});

describe("resolvePortalPageViewFallbackRoute", () => {
  beforeEach(() => {
    clearPortalHomePageCache();
    primePortalHomePageCache(1, 5);
  });
  afterEach(() => clearPortalHomePageCache());

  it("returns office home for portal CMS page", () => {
    assert.equal(
      resolvePortalPageViewFallbackRoute("/portal/1/page/23", { portalId: 1 }),
      "/portal/1/page/5",
    );
  });

  it("returns studio pages list for designer page editor", () => {
    assert.equal(
      resolvePortalPageViewFallbackRoute("/designer/tenant/1/page/42", { portalId: 1 }),
      "/designer/tenant/1/pages",
    );
  });
});

describe("isDesignerShellEmbeddedPortalRoute", () => {
  it("matches designer administration and page routes", () => {
    assert.equal(
      isDesignerShellEmbeddedPortalRoute("/designer/tenant/1/administration"),
      true,
    );
    assert.equal(
      isDesignerShellEmbeddedPortalRoute("/designer/tenant/1/administration/users"),
      true,
    );
    assert.equal(
      isDesignerShellEmbeddedPortalRoute("/designer/tenant/1/page/15"),
      true,
    );
  });

  it("does not match standalone portal routes", () => {
    assert.equal(isDesignerShellEmbeddedPortalRoute("/portal/1/page/15"), false);
  });
});

describe("PortalPageView embedded studio shell rendering", () => {
  it("skips nested PortalLayout for designer administration and page routes", () => {
    const source = readFileSync(join(portalDir, "PortalPageView.jsx"), "utf8");

    assert.match(source, /isDesignerShellEmbeddedPortalRoute/);
    assert.match(source, /if \(isDesignerShellEmbeddedRoute\)/);
    assert.match(source, /return pageShellInner/);
    assert.match(source, /EmbeddedPageContent/);
    assert.match(source, /resolvePortalPageViewLayoutContractOverrides/);
    assert.match(source, /portalLayoutContractOverrides/);
    assert.match(source, /useResolvedPageLayoutContract\(portalLayoutContractOverrides\)/);
  });

  it("does not load runtime navigation inside designer embedded shell", () => {
    const source = readFileSync(join(portalDir, "PortalPageView.jsx"), "utf8");

    assert.match(source, /enabled:\s*!isDesignerShellEmbeddedRoute/);
    assert.match(source, /navigationError && !isDesignerShellEmbeddedRoute/);
    assert.match(source, /resolveStudioTenantIdFromPath\(location\.pathname\)/);
  });
});
