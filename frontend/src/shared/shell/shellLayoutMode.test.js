import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  isDesignerShellEmbeddedPortalRoute,
  isDesignerTenantRoute,
  resolvePortalLayoutMode,
  shouldCreateTopLevelShell,
  SHELL_LAYOUT_MODE,
} from "./shellLayoutMode.js";

const shellDir = dirname(fileURLToPath(import.meta.url));

describe("shellLayoutMode", () => {
  it("detects designer tenant routes", () => {
    assert.equal(isDesignerTenantRoute("/designer/tenant/1/object-types"), true);
    assert.equal(isDesignerTenantRoute("/portal/1/page/1"), false);
  });

  it("resolves embedded mode for designer tenant routes by default", () => {
    assert.equal(
      resolvePortalLayoutMode("/designer/tenant/1/pages", null),
      SHELL_LAYOUT_MODE.EMBEDDED,
    );
    assert.equal(
      resolvePortalLayoutMode("/portal/1/page/1", null),
      SHELL_LAYOUT_MODE.SHELL,
    );
  });

  it("honors explicit layout mode override", () => {
    assert.equal(
      resolvePortalLayoutMode("/portal/1/page/1", SHELL_LAYOUT_MODE.EMBEDDED),
      SHELL_LAYOUT_MODE.EMBEDDED,
    );
    assert.equal(
      resolvePortalLayoutMode("/designer/tenant/1/pages", SHELL_LAYOUT_MODE.SHELL),
      SHELL_LAYOUT_MODE.SHELL,
    );
  });

  it("skips top-level shell creation in embedded mode", () => {
    assert.equal(shouldCreateTopLevelShell(SHELL_LAYOUT_MODE.EMBEDDED), false);
    assert.equal(shouldCreateTopLevelShell(SHELL_LAYOUT_MODE.SHELL), true);
  });

  it("matches designer embedded portal routes", () => {
    assert.equal(
      isDesignerShellEmbeddedPortalRoute("/designer/tenant/1/administration/users"),
      true,
    );
    assert.equal(
      isDesignerShellEmbeddedPortalRoute("/designer/tenant/1/object-types"),
      false,
    );
  });
});

describe("layout ownership", () => {
  it("DesignerShell provides embedded layout mode to child routes", () => {
    const source = readFileSync(
      join(shellDir, "../../modules/designer/components/shell/DesignerShell.jsx"),
      "utf8",
    );

    assert.match(source, /ShellLayoutModeProvider/);
    assert.match(source, /SHELL_LAYOUT_MODE\.EMBEDDED/);
    assert.match(source, /AppShellFrame/);
    assert.doesNotMatch(source, /PortalLayout/);
  });

  it("PortalLayout skips AppShellFrame in embedded mode", () => {
    const source = readFileSync(
      join(shellDir, "../../layouts/PortalLayout.jsx"),
      "utf8",
    );

    assert.match(source, /shouldCreateTopLevelShell/);
    assert.match(source, /portal-layout--embedded/);
    assert.match(source, /data-shell-layout-mode=\{SHELL_LAYOUT_MODE\.EMBEDDED\}/);
  });

  it("PortalPageView skips PortalLayout for designer embedded routes", () => {
    const source = readFileSync(
      join(shellDir, "../../portal/PortalPageView.jsx"),
      "utf8",
    );

    assert.match(source, /isDesignerShellEmbeddedRoute/);
    assert.match(source, /if \(isDesignerShellEmbeddedRoute\)/);
    assert.match(source, /EmbeddedPageContent/);
  });

  it("AppShellFrame uses flex sidebar/main without duplicate sidebar offset", () => {
    const frameSource = readFileSync(join(shellDir, "AppShellFrame.jsx"), "utf8");
    const cssSource = readFileSync(
      join(shellDir, "../appShell/appShell.css"),
      "utf8",
    );

    assert.match(frameSource, /className="app-shell-frame"/);
    assert.match(frameSource, /app-shell-frame__sidebar/);
    assert.doesNotMatch(frameSource, /left:\s*workspaceLeftOffset/);
    assert.doesNotMatch(frameSource, /100vh/);
    assert.match(cssSource, /display:\s*flex/);
    assert.match(cssSource, /\.app-shell-frame__main/);
    assert.match(cssSource, /min-width:\s*0/);
    assert.doesNotMatch(cssSource, /\.app-shell-frame__main[^}]*width:\s*100%/);
  });

  it("embedded content does not reserve sidebar offset", () => {
    const cssSource = readFileSync(
      join(shellDir, "../appShell/appShell.css"),
      "utf8",
    );

    assert.match(cssSource, /\.embedded-page-content/);
    assert.match(cssSource, /margin-left:\s*0/);
    assert.match(cssSource, /max-width:\s*none/);
  });

  it("sidebar footer layout stays independent from bottom tabs strip", () => {
    const cssSource = readFileSync(
      join(shellDir, "../appShell/appShell.css"),
      "utf8",
    );
    const sidebarCssSource = readFileSync(
      join(shellDir, "sidebar/components/appSidebarRenderer.css"),
      "utf8",
    );

    assert.match(cssSource, /\.app-shell-frame__sidebar[^}]*display:\s*flex/);
    assert.match(cssSource, /\.app-shell-frame__sidebar[^}]*height:\s*100%/);
    assert.match(sidebarCssSource, /\.app-sidebar-renderer__footer[^}]*flex-shrink:\s*0/);
    assert.match(cssSource, /\.app-shell__bottom-tabs[^}]*background:\s*transparent/);
  });

  it("GlobalWorkspaceTabsBar stays in AppShell only", () => {
    const appShellSource = readFileSync(
      join(shellDir, "../appShell/AppShell.jsx"),
      "utf8",
    );
    const frameSource = readFileSync(join(shellDir, "AppShellFrame.jsx"), "utf8");

    assert.match(appShellSource, /GlobalWorkspaceTabsBar/);
    assert.doesNotMatch(frameSource, /GlobalWorkspaceTabsBar/);
  });
});
