import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";

import { resolveSurfaceFromRoute } from "../embedded/resolveSurfaceFromRoute.js";
import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";
import {
  buildPlanViewSurfaceValue,
  buildPortalPageSurfaceValue,
  buildQuickFormSurfaceValue,
  buildWorkspaceSurfaceValue,
  resolveCanonicalYasiiTenantId,
} from "./yasiiRuntimeSurfaceContext.js";
import {
  readYasiiPreWorkspacePath,
  resolveYasiiTenantId,
  writeYasiiPreWorkspacePath,
} from "../workspace/yasiiWorkspaceModeStorage.js";
import {
  YASII_ACTIVE_TENANT_SESSION_KEY,
} from "../../shared/uiStorage/uiStorageKeys.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensureStorage() {
  if (typeof globalThis.sessionStorage?.clear !== "function") {
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }

  if (typeof globalThis.localStorage?.clear !== "function") {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }
}

function clearStorage() {
  ensureStorage();
  sessionStorage.clear();
  localStorage.clear();
}

describe("yasiiContextIntegrity", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("resolves portal tenant from /portal/{id} routes", () => {
    assert.equal(
      resolveCanonicalYasiiTenantId({ pathname: "/portal/15/page/42" }),
      "15",
    );
    assert.equal(
      resolveSurfaceFromRoute("/portal/15/page/42").contextData.tenantId,
      "15",
    );
  });

  it("resolves designer tenant consistently", () => {
    const resolved = resolveSurfaceFromRoute(
      "/designer/tenant/7/object-types/projects/plan",
    );

    assert.equal(resolved.contextData.tenantId, "7");
    assert.equal(resolved.contextData.viewId, "plan");
  });

  it("builds portal page surface with page metadata", () => {
    const surface = buildPortalPageSurfaceValue({
      tenantId: 15,
      pathname: "/portal/15/page/42",
      pageId: 42,
      pageTitle: "Главная",
    });

    assert.equal(surface.contextData.tenantId, "15");
    assert.equal(surface.contextData.metadata.pageId, "42");
    assert.equal(surface.contextData.metadata.pageTitle, "Главная");
  });

  it("builds plan and quick form surfaces with tenant and entity context", () => {
    const plan = buildPlanViewSurfaceValue({
      tenantId: 15,
      pathname: "/portal/15/object-types/tasks/plan",
      objectTypeKey: "tasks",
      objectTypeId: "tasks",
    });
    const quickForm = buildQuickFormSurfaceValue({
      tenantId: 15,
      pathname: "/portal/15/object-types/tasks/quick_form",
      objectTypeKey: "tasks",
      objectTypeId: "tasks",
    });

    assert.equal(plan.contextData.tenantId, "15");
    assert.equal(plan.contextData.viewId, "plan");
    assert.equal(quickForm.contextData.tenantId, "15");
    assert.equal(quickForm.contextData.objectTypeName, "tasks");
    assert.equal(quickForm.surfaceId, EMBEDDED_SURFACE_IDS.OBJECT_CARD);
  });

  it("builds workspace surface with workspace metadata", () => {
    const surface = buildWorkspaceSurfaceValue({
      tenantId: 15,
      pathname: "/portal/15/workspaces/dev/home",
      workspaceSlug: "dev",
      workspaceId: 9,
      tabSlug: "home",
      tabTitle: "Главная",
    });

    assert.equal(surface.contextData.tenantId, "15");
    assert.equal(surface.contextData.metadata.workspaceSlug, "dev");
    assert.equal(surface.contextData.metadata.tabSlug, "home");
  });

  it("keeps tenant-specific pre-workspace return paths on switch", () => {
    writeYasiiPreWorkspacePath("/portal/15/page/42", 15, "/portal/15/page/42");
    writeYasiiPreWorkspacePath("/portal/21/page/7", 21, "/portal/21/page/7");

    assert.equal(readYasiiPreWorkspacePath(15, "/yasii"), "/portal/15/page/42");
    assert.equal(readYasiiPreWorkspacePath(21, "/yasii"), "/portal/21/page/7");
    assert.equal(resolveYasiiTenantId("/yasii"), 21);
    assert.equal(
      sessionStorage.getItem(YASII_ACTIVE_TENANT_SESSION_KEY),
      "21",
    );
  });

  it("removes tenant 1 fallback from resolveYasiiReturnPath", () => {
    const source = readFileSync(
      join(__dirname, "../../shared/appMode/appModeNavigation.js"),
      "utf8",
    );

    assert.doesNotMatch(source, /getStoredRuntimePath\(1\)/);
    assert.match(source, /resolveYasiiReturnPath\(preWorkspacePath, tenantId/);
    assert.match(source, /resolveTenantRuntimeEntryPath\(normalizedTenantId\)/);
  });

  it("passes tenant id into resolveYasiiReturnPath from workspace UI", () => {
    const workspaceSource = readFileSync(
      join(__dirname, "../pages/YasiiWorkspacePage.jsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      join(__dirname, "../components/YasiiPanelHeaderActions.jsx"),
      "utf8",
    );

    assert.match(workspaceSource, /resolveYasiiReturnPath\([\s\S]*portalId/);
    assert.match(panelSource, /resolveYasiiReturnPath\([\s\S]*tenantId/);
  });
});
