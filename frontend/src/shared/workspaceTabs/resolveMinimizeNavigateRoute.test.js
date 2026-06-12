import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  clearPortalHomePageCache,
  primePortalHomePageCache,
} from "../../portal/utils/resolvePortalHomePage.js";
import {
  resolveMinimizeNavigateRoute,
  shouldWarnAboutMinimizeNavigateRoute,
} from "./resolveMinimizeNavigateRoute.js";

describe("resolveMinimizeNavigateRoute", () => {
  beforeEach(() => {
    clearPortalHomePageCache();
    primePortalHomePageCache(1, 5);
  });
  afterEach(() => clearPortalHomePageCache());

  it("uses contract fallback when it differs from current route", () => {
    const route = resolveMinimizeNavigateRoute({
      currentRoute: "/portal/1/page/23",
      contractFallbackRoute: "/portal/1/page/5",
      tenantId: 1,
    });

    assert.equal(route, "/portal/1/page/5");
  });

  it("computes safe parent route when fallback equals current route", () => {
    const route = resolveMinimizeNavigateRoute({
      currentRoute: "/portal/1/page/23",
      contractFallbackRoute: "/portal/1/page/23",
      tenantId: 1,
    });

    assert.equal(route, "/portal/1/page/5");
  });

  it("returns studio pages list for designer page editor", () => {
    const route = resolveMinimizeNavigateRoute({
      currentRoute: "/designer/tenant/1/page/42",
      contractFallbackRoute: "/designer/tenant/1/page/42",
      tenantId: 1,
    });

    assert.equal(route, "/designer/tenant/1/pages");
  });

  it("ignores query string when comparing current and fallback routes", () => {
    const route = resolveMinimizeNavigateRoute({
      currentRoute: "/portal/1/page/23?workspaceSlug=home",
      contractFallbackRoute: "/portal/1/page/23",
      tenantId: 1,
    });

    assert.equal(route, "/portal/1/page/5");
  });

  it("returns null when already on the only safe route", () => {
    const route = resolveMinimizeNavigateRoute({
      currentRoute: "/portal/1/page/5",
      contractFallbackRoute: "/portal/1/page/5",
      tenantId: 1,
    });

    assert.equal(route, null);
  });
});

describe("shouldWarnAboutMinimizeNavigateRoute", () => {
  it("does not warn when tab was created with open route", () => {
    assert.equal(
      shouldWarnAboutMinimizeNavigateRoute({
        tabCreated: true,
        tabOpenRoute: "/portal/1/page/23",
        navigateRoute: null,
      }),
      false,
    );
  });

  it("does not warn when navigate route exists", () => {
    assert.equal(
      shouldWarnAboutMinimizeNavigateRoute({
        tabCreated: true,
        tabOpenRoute: null,
        navigateRoute: "/portal/1/page/5",
      }),
      false,
    );
  });

  it("warns only when tab was not created and no routes exist", () => {
    assert.equal(
      shouldWarnAboutMinimizeNavigateRoute({
        tabCreated: false,
        tabOpenRoute: null,
        navigateRoute: null,
      }),
      true,
    );
  });
});
