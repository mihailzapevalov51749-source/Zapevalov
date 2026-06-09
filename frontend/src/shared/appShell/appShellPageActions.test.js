import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";

import { describe, it } from "node:test";



import { isWorkspaceTabDescriptorSupported } from "../workspaceTabs/isWorkspaceTabDescriptorSupported.js";

import { resolveCurrentWorkspaceTabDescriptor } from "../workspaceTabs/resolveCurrentWorkspaceTabDescriptor.js";



const appShellDir = dirname(fileURLToPath(import.meta.url));



describe("isWorkspaceTabDescriptorSupported", () => {

  it("supports office workspace routes", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/portal/1/workspaces/product/architecture",

      search: "",

      hash: "",

    });



    assert.equal(

      isWorkspaceTabDescriptorSupported(descriptor, {

        pathname: "/portal/1/workspaces/product/architecture",

      }),

      true,

    );

  });



  it("supports profile route", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/profile",

      search: "",

      hash: "",

    });



    assert.equal(

      isWorkspaceTabDescriptorSupported(descriptor, { pathname: "/profile" }),

      true,

    );

  });



  it("rejects dev preview routes", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/dev/app-header-renderer",

      search: "",

      hash: "",

    });



    assert.equal(

      isWorkspaceTabDescriptorSupported(descriptor, {

        pathname: "/dev/app-header-renderer",

      }),

      false,

    );

  });

});



describe("AppShell page actions — Page Layout Contract phase 4", () => {

  it("removed standalone AppShellPageToolbar component", () => {

    const appShellSource = readFileSync(join(appShellDir, "AppShell.jsx"), "utf8");



    assert.doesNotMatch(appShellSource, /AppShellPageToolbar/);

  });



  it("host portals actions into contract toolbarZoneId without priority", () => {

    const actionsSource = readFileSync(

      join(appShellDir, "AppShellPageActionsContext.jsx"),

      "utf8",

    );



    assert.match(actionsSource, /registerToolbarSlot/);

    assert.match(actionsSource, /toolbarSlots/);

    assert.match(actionsSource, /usePageLayoutContract/);

    assert.match(actionsSource, /contract\?\.toolbarZoneId/);

    assert.match(actionsSource, /contract\?\.canMinimize/);

    assert.match(actionsSource, /createPortal/);

    assert.match(actionsSource, /slotStacksRef/);

    assert.match(actionsSource, /registerToolbarSlot\(ownerId, slotId/);

    assert.doesNotMatch(actionsSource, /priority/);

  });



  it("AppShellPageActionsSlot registers slotId without priority prop", () => {

    const actionsSource = readFileSync(

      join(appShellDir, "AppShellPageActionsContext.jsx"),

      "utf8",

    );



    assert.match(actionsSource, /slotId/);

    assert.doesNotMatch(actionsSource, /priority/);

  });



  it("bridge registers actions only when contract.canMinimize is true", () => {

    const bridgeSource = readFileSync(

      join(appShellDir, "../workspaceTabs/WorkspacePageActionsBridge.jsx"),

      "utf8",

    );



    assert.match(bridgeSource, /usePageLayoutContract/);

    assert.match(bridgeSource, /contract\?\.canMinimize/);

    assert.match(bridgeSource, /page layout contract is not registered/);

  });



  it("keeps unified minimize-only controls without pin UI", () => {

    const controlsSource = readFileSync(

      join(appShellDir, "../workspaceTabs/PageWorkspaceTabControls.jsx"),

      "utf8",

    );

    const minimizeButtonSource = readFileSync(
      join(appShellDir, "AppShellPageMinimizeButton.jsx"),
      "utf8",
    );

    const toolbarCss = readFileSync(join(appShellDir, "pageToolbarActions.css"), "utf8");



    assert.match(controlsSource, /AppShellPageMinimizeButton/);

    assert.match(minimizeButtonSource, /app-shell-page-minimize-control/);

    assert.match(minimizeButtonSource, /app-shell-page-minimize-control__button/);

    assert.match(minimizeButtonSource, /<Minus /);

    assert.match(minimizeButtonSource, /Свернуть страницу/);

    assert.doesNotMatch(controlsSource, /view-engine-toolbar__tool-btn/);

    assert.doesNotMatch(controlsSource, /<Pin /);

    assert.doesNotMatch(controlsSource, /Закрепить/);

    assert.match(toolbarCss, /--app-shell-minimize-control-size:\s*28px/);

  });



  it("renders minimize slot only in global AppHeader between search and notifications", () => {

    const appHeaderSource = readFileSync(

      join(appShellDir, "../shell/header/components/AppHeaderRenderer.jsx"),

      "utf8",

    );



    assert.match(appHeaderSource, /app-header-renderer__search/);

    assert.match(appHeaderSource, /app-header-renderer__page-toolbar/);

    assert.match(appHeaderSource, /AppShellPageActionsSlot/);

    assert.match(appHeaderSource, /PAGE_LAYOUT_TOOLBAR_ZONE\.APP_HEADER/);

    assert.match(appHeaderSource, /app-header-renderer__notification-wrap/);



    const searchIndex = appHeaderSource.indexOf("app-header-renderer__search");

    const toolbarIndex = appHeaderSource.indexOf("app-header-renderer__page-toolbar");

    const notificationsIndex = appHeaderSource.indexOf("app-header-renderer__notification-wrap");



    assert.ok(searchIndex < toolbarIndex);

    assert.ok(toolbarIndex < notificationsIndex);

  });



  it("removes local minimize slots from page toolbars", () => {

    const localHeaders = [

      join(appShellDir, "../../portal/components/PortalObjectRuntimeHeader.jsx"),

      join(appShellDir, "../../modules/chats/components/ChatHeader.jsx"),

      join(appShellDir, "../../modules/designer/components/objectTypes/ObjectTypeWorkspaceHeader.jsx"),

      join(appShellDir, "../../modules/platformDashboard/pages/PlatformDevelopmentPage.jsx"),

    ];



    for (const headerPath of localHeaders) {

      const source = readFileSync(headerPath, "utf8");

      assert.doesNotMatch(source, /AppShellPageActionsSlot/);

    }

  });



  it("registers minimize only through app-header on full platform studio pages", () => {
    const studioPages = [
      join(appShellDir, "../../modules/designer/pages/DesignerPagesPage.jsx"),
      join(appShellDir, "../../modules/designer/pages/DesignerTrashPage.jsx"),
      join(appShellDir, "../../modules/designer/pages/DesignerWorkspacesPage.jsx"),
      join(appShellDir, "../../modules/designer/pages/DesignerWorkspaceDetailPage.jsx"),
      join(appShellDir, "../../modules/designer/pages/DesignerSectionPlaceholderPage.jsx"),
      join(appShellDir, "../../yasii/pages/YasiiWorkspacePage.jsx"),
    ];

    for (const pagePath of studioPages) {
      const source = readFileSync(pagePath, "utf8");

      assert.match(source, /PAGE_LAYOUT_TOOLBAR_ZONE\.APP_HEADER/);
      assert.match(source, /canMinimize:\s*true/);
      assert.doesNotMatch(source, /AppShellPageActionsSlot/);
    }
  });

  it("documents existing page toolbar zones in styles", () => {

    const cssSource = readFileSync(

      join(appShellDir, "pageToolbarActions.css"),

      "utf8",

    );



    assert.match(cssSource, /app-shell-page-actions-anchor/);

    assert.match(cssSource, /app-shell-page-minimize-control__button/);

    assert.match(cssSource, /app-header-renderer__page-toolbar/);

  });

});


