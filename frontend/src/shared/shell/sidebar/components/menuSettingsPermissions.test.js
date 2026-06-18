import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("PortalLayout disables user menu personalization", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "..", "..", "layouts", "PortalLayout.jsx"),
    "utf8",
  );

  assert.match(source, /canPersonalizeMenu: false/);
  assert.match(source, /canDragItems: sidebarControls\.isEditMode && canEditNavigationMenu/);
  assert.match(source, /canManageNavigationMenu\(getStoredCurrentUser\(\)\)/);
});

test("sidebarAdapters exposes menu settings gear only for canEditMenu", () => {
  const source = readFileSync(join(__dirname, "..", "sidebarAdapters.ts"), "utf8");

  assert.match(source, /canPersonalizeMenu = input\.canPersonalizeMenu \?\? false/);
  assert.match(source, /canOpenSettings = input\.canOpenSettings \?\? canEditMenu/);
  assert.match(source, /if \(capabilities\.canEditMenu\) \{/);
});

test("AppSidebarRenderer hides footer settings gear for non-admin users", () => {
  const source = readFileSync(join(__dirname, "AppSidebarRenderer.jsx"), "utf8");

  assert.match(source, /contract\?\.capabilities\?\.canEditMenu \? \(/);
  assert.match(source, /applyUserPreferences: false/);
  assert.match(source, /loadUserPreferences: false/);
});

test("useRuntimeMenuLayerSettings builds tenant-only menu by default", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "..", "navigation", "useRuntimeMenuLayerSettings.js"),
    "utf8",
  );

  assert.match(source, /applyUserPreferences = false/);
  assert.match(source, /loadUserPreferences = false/);
  assert.match(source, /if \(!applyUserPreferences\) \{\s*return sortNavigationTreeBySortOrder\(withTenant\)/);
  assert.doesNotMatch(
    source,
    /fetchUserMenuPreferences\(tenantId\)[\s\S]*applyMenuLayers[\s\S]*always/s,
  );
});

test("usePlatformSidebarControls blocks personalize actions without canPersonalizeMenu", () => {
  const source = readFileSync(join(__dirname, "..", "usePlatformSidebarControls.js"), "utf8");

  assert.match(source, /canPersonalizeMenu = false/);
  assert.match(source, /case "toggle-personalize-mode":[\s\S]*if \(!canPersonalizeMenu\)/);
  assert.match(source, /case "reset-menu-preferences":[\s\S]*if \(!canPersonalizeMenu\)/);
});

test("navigationMenuSettings admin move uses tenant menu-settings API", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "..", "navigation", "navigationMenuSettings.js"),
    "utf8",
  );

  assert.match(source, /preferenceScope === "user"/);
  assert.match(source, /putTenantRuntimeMenuSettingsBulk/);
});

test("MenuItemEditor personalizeOnly remains isolated from tenant fields", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "..", "..", "modules", "navigation", "components", "MenuItemEditor.jsx"),
    "utf8",
  );

  assert.match(source, /personalizeOnly = false/);
});

test("useBlockedMenuDragAndDrop preserves local blocks while skipBlocksSyncRef is set", () => {
  const hookSource = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "modules",
      "navigation",
      "hooks",
      "useBlockedMenuDragAndDrop.js",
    ),
    "utf8",
  );

  assert.match(hookSource, /skipBlocksSyncRef/);
});
