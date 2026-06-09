import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";

import { describe, it } from "node:test";



const appShellDir = dirname(fileURLToPath(import.meta.url));



describe("AppShell integration", () => {

  it("wraps authenticated routes in App.jsx", () => {

    const appSource = readFileSync(join(appShellDir, "../../App.jsx"), "utf8");



    assert.match(appSource, /<AppShell>/);

    assert.match(appSource, /GlobalWorkspaceTabsProvider/);

  });



  it("renders bottom tabs without separate PageToolbar strip", () => {

    const appShellSource = readFileSync(join(appShellDir, "AppShell.jsx"), "utf8");

    const frameSource = readFileSync(

      join(appShellDir, "../shell/AppShellFrame.jsx"),

      "utf8",

    );

    const cssSource = readFileSync(join(appShellDir, "appShell.css"), "utf8");



    assert.match(appShellSource, /GlobalWorkspaceTabsBar/);

    assert.match(appShellSource, /app-shell__bottom-tabs/);

    assert.doesNotMatch(appShellSource, /AppShellPageToolbar/);

    assert.doesNotMatch(frameSource, /GlobalWorkspaceTabsBar/);

    assert.doesNotMatch(cssSource, /app-shell-page-toolbar/);

  });



  it("does not reserve workspace height for removed PageToolbar", () => {

    const frameSource = readFileSync(

      join(appShellDir, "../shell/AppShellFrame.jsx"),

      "utf8",

    );

    const chromeSource = readFileSync(

      join(appShellDir, "AppShellChromeContext.jsx"),

      "utf8",

    );



    assert.doesNotMatch(frameSource, /pageToolbarHeight/);

    assert.doesNotMatch(chromeSource, /pageToolbarHeight/);

    assert.doesNotMatch(chromeSource, /registerPageToolbarHeight/);

  });



  it("keeps page actions host and toolbar slot API", () => {

    const actionsSource = readFileSync(

      join(appShellDir, "AppShellPageActionsContext.jsx"),

      "utf8",

    );



    assert.match(actionsSource, /AppShellPageActionsHost/);

    assert.match(actionsSource, /AppShellPageActionsSlot/);

    assert.match(actionsSource, /registerToolbarSlot/);

    assert.match(actionsSource, /createPortal/);

  });



  it("registers workspace page actions from AppShell", () => {

    const appShellSource = readFileSync(join(appShellDir, "AppShell.jsx"), "utf8");



    assert.match(appShellSource, /WorkspacePageActionsBridge/);

    assert.match(appShellSource, /AppShellPageActionsHost/);

  });



  it("positions bottom tabs inside main content area using chrome offset", () => {

    const appShellSource = readFileSync(join(appShellDir, "AppShell.jsx"), "utf8");

    const cssSource = readFileSync(join(appShellDir, "appShell.css"), "utf8");



    assert.match(appShellSource, /workspaceLeftOffset/);

    assert.match(cssSource, /app-shell__bottom-tabs/);

    assert.match(cssSource, /global-workspace-tabs-bar/);

  });



  it("reserves bottom tabs space only in main workspace, not sidebar", () => {

    const cssSource = readFileSync(join(appShellDir, "appShell.css"), "utf8");



    assert.match(cssSource, /--app-shell-bottom-tabs-height/);

    assert.match(cssSource, /\.app-shell__main/);

    assert.match(cssSource, /\.app-shell-frame__workspace[^}]*padding-bottom:\s*var\(--app-shell-bottom-tabs-height\)/);

    assert.doesNotMatch(cssSource, /--app-shell-viewport-height/);

    assert.doesNotMatch(cssSource, /\.app-shell__main[^}]*padding-bottom/);

    assert.doesNotMatch(cssSource, /\.app-shell-frame__sidebar[^}]*padding-bottom/);

  });

});


