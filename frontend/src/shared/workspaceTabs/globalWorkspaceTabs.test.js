import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";

import { describe, it } from "node:test";



import { PAGE_LAYOUT_PAGE_TYPE } from "../appShell/pageLayoutContract/pageLayoutContractTypes.js";

import {

  buildWorkspaceTabPayload,

  resolveCurrentWorkspaceTabDescriptor,

} from "./resolveCurrentWorkspaceTabDescriptor.js";

import {
  resolveMinimizeNavigateRoute,
  shouldWarnAboutMinimizeNavigateRoute,
} from "./resolveMinimizeNavigateRoute.js";
import { resolveWorkspaceTabDisplayTitle } from "./resolveWorkspaceTabDisplayTitle.js";
import { resolvePortalPageViewLayoutContractOverrides } from "../../portal/resolvePortalPageViewLayoutContract.js";



const workspaceTabsDir = dirname(fileURLToPath(import.meta.url));



describe("resolveCurrentWorkspaceTabDescriptor", () => {

  it("resolves studio object settings route", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/designer/tenant/1/object-types/abc-123/actions",

      search: "",

      hash: "",

    });



    assert.equal(descriptor.moduleKey, "studio");

    assert.equal(descriptor.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT);

    assert.equal(descriptor.tenantId, 1);

    assert.match(descriptor.route, /actions/);

  });



  it("resolves office plan route", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/portal/1/object-types/projects/plan",

      search: "",

      hash: "",

    });



    assert.equal(descriptor.moduleKey, "office");

    assert.equal(descriptor.pageType, "object_plan");

    assert.equal(descriptor.context.viewKey, "plan");

  });



  it("resolves office workspace route", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/portal/1/workspaces/product",

      search: "",

      hash: "",

    });



    assert.equal(descriptor.pageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE);

    assert.equal(descriptor.context.workspaceSlug, "product");

  });



  it("maps yasii contract module key to chat for workspace tab API", () => {
    const descriptor = resolveCurrentWorkspaceTabDescriptor(
      {
        pathname: "/yasii",
        search: "",
        hash: "",
      },
      {
        pageTitle: "Ассистент",
        context: { pageTitle: "Ассистент" },
      },
    );

    const payload = buildWorkspaceTabPayload(descriptor, {
      isMinimized: true,
      moduleKey: "yasii",
      pageType: PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE,
    });

    assert.equal(descriptor.moduleKey, "chat");
    assert.equal(payload.module_key, "chat");
    assert.equal(payload.page_type, "chat_room");
    assert.equal(payload.title, "Ясии: Ассистент");
  });

  it("builds API payload from descriptor", () => {

    const descriptor = resolveCurrentWorkspaceTabDescriptor({

      pathname: "/portal/2/object-types/tasks/default_table",

      search: "",

      hash: "",

    });



    const payload = buildWorkspaceTabPayload(descriptor, { isPinned: true });



    assert.equal(payload.module_key, "office");

    assert.equal(payload.page_type, "object_table");

    assert.equal(payload.tenant_id, 2);

    assert.equal(payload.is_pinned, true);

  });

  it("builds Russian display title for office object with name", () => {
    const descriptor = resolveCurrentWorkspaceTabDescriptor({
      pathname: "/portal/1/object-types/zadachnik/default_table",
      search: "",
      hash: "",
    });

    const payload = buildWorkspaceTabPayload(descriptor, {
      pageTitle: "Задачник",
      context: { objectTypeName: "Задачник" },
    });

    assert.equal(payload.title, "Офис: Задачник");
  });

});

describe("resolveWorkspaceTabDisplayTitle integration", () => {
  it("bar resolves display title from tab descriptor", () => {
    const barSource = readFileSync(
      join(workspaceTabsDir, "GlobalWorkspaceTabsBar.jsx"),
      "utf8",
    );

    assert.match(barSource, /resolveWorkspaceTabDisplayTitle/);
  });

  it("minimize passes pageTitle from contract", () => {
    const controlsSource = readFileSync(
      join(workspaceTabsDir, "PageWorkspaceTabControls.jsx"),
      "utf8",
    );

    assert.match(controlsSource, /contract\.title/);
    assert.match(controlsSource, /contract\.context/);
    assert.match(controlsSource, /contract\.route/);
  });

  it("stored tab with layoutPageType resolves studio section title", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Studio",
      route: "/designer/tenant/1/relations",
      module_key: "studio",
      page_type: "generic",
      context_json: {
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
        sectionKey: "relations",
      },
    });

    assert.equal(title, "Студия: Связи");
  });
});



describe("Global workspace tabs UI integration", () => {

  it("mounts provider and global bottom bar in AppShell", () => {

    const appSource = readFileSync(

      join(workspaceTabsDir, "../../App.jsx"),

      "utf8",

    );

    const appShellSource = readFileSync(

      join(workspaceTabsDir, "../appShell/AppShell.jsx"),

      "utf8",

    );

    const frameSource = readFileSync(

      join(workspaceTabsDir, "../shell/AppShellFrame.jsx"),

      "utf8",

    );



    assert.match(appSource, /GlobalWorkspaceTabsProvider/);

    assert.match(appSource, /<AppShell>/);

    assert.match(appShellSource, /GlobalWorkspaceTabsBar/);

    assert.doesNotMatch(frameSource, /GlobalWorkspaceTabsBar/);

    assert.doesNotMatch(frameSource, /PageWorkspaceTabControls/);

  });



  it("registers page actions through AppShell bridge without PageToolbar strip", () => {

    const appShellSource = readFileSync(

      join(workspaceTabsDir, "../appShell/AppShell.jsx"),

      "utf8",

    );

    const controlsSource = readFileSync(

      join(workspaceTabsDir, "PageWorkspaceTabControls.jsx"),

      "utf8",

    );

    const providerSource = readFileSync(

      join(workspaceTabsDir, "GlobalWorkspaceTabsProvider.jsx"),

      "utf8",

    );



    assert.match(appShellSource, /WorkspacePageActionsBridge/);

    assert.match(appShellSource, /AppShellPageActionsHost/);

    assert.match(appShellSource, /PageLayoutContractProvider/);

    assert.doesNotMatch(appShellSource, /AppShellPageToolbar/);

    assert.match(controlsSource, /AppShellPageMinimizeButton/);

    assert.match(controlsSource, /usePageLayoutContract/);

    assert.match(controlsSource, /contract\?\.canMinimize/);

    assert.match(controlsSource, /contract\.fallbackRoute/);

    assert.doesNotMatch(controlsSource, /<Pin /);

    assert.match(providerSource, /isPinned:\s*false/);

    assert.match(providerSource, /isMinimized:\s*true/);

    assert.match(providerSource, /contractFallbackRoute/);

  });



  it("bar hides when there are no tabs", () => {

    const barSource = readFileSync(

      join(workspaceTabsDir, "GlobalWorkspaceTabsBar.jsx"),

      "utf8",

    );



    assert.match(barSource, /if \(!tabs\.length\)/);

    assert.match(barSource, /return null/);

  });



  it("bottom bar uses browser-like compact working-page tabs with close", () => {

    const barSource = readFileSync(

      join(workspaceTabsDir, "GlobalWorkspaceTabsBar.jsx"),

      "utf8",

    );

    const barCss = readFileSync(

      join(workspaceTabsDir, "globalWorkspaceTabsBar.css"),

      "utf8",

    );



    assert.match(barSource, /Рабочие страницы/);

    assert.doesNotMatch(barSource, /<Pin /);

    assert.doesNotMatch(barSource, /tab\.is_pinned/);

    assert.match(barSource, /global-workspace-tabs-bar__close/);

    assert.match(barCss, /flex-wrap:\s*nowrap/);

    assert.match(barCss, /max-height:\s*32px/);

    assert.match(barCss, /font-size:\s*12px/);

  });



  it("PortalPageView registers administration and designer page editor contracts", () => {
    const portalPageSource = readFileSync(
      join(workspaceTabsDir, "../../portal/PortalPageView.jsx"),
      "utf8",
    );
    const contractSource = readFileSync(
      join(workspaceTabsDir, "../../portal/resolvePortalPageViewLayoutContract.js"),
      "utf8",
    );

    assert.match(portalPageSource, /resolvePortalPageViewLayoutContractOverrides/);
    assert.match(contractSource, /STUDIO_ADMIN/);
    assert.match(contractSource, /STUDIO_PAGE_EDITOR/);
    assert.match(contractSource, /PAGE_LAYOUT_TOOLBAR_ZONE\.APP_HEADER/);
    assert.match(contractSource, /canMinimize:\s*true/);
  });

  it("provider exposes minimize action and open/close tab lifecycle", () => {

    const providerSource = readFileSync(

      join(workspaceTabsDir, "GlobalWorkspaceTabsProvider.jsx"),

      "utf8",

    );



    assert.match(providerSource, /minimizeCurrentPage/);

    assert.match(providerSource, /openWorkspaceTab/);

    assert.match(providerSource, /deleteWorkspaceTab/);

    assert.match(providerSource, /listWorkspaceTabs/);

  });

  it("minimize office CMS contract saves pageTitle in payload context", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/portal/1/page/12" },
      12,
      {
        portalId: 1,
        page: { title: "Мои задачи" },
      },
    );

    const descriptor = resolveCurrentWorkspaceTabDescriptor({
      pathname: "/portal/1/page/12",
      search: "",
      hash: "",
    });

    const payload = buildWorkspaceTabPayload(descriptor, {
      pageTitle: contract.title,
      context: contract.context,
    });

    assert.equal(payload.title, "Офис: Мои задачи");
    assert.equal(payload.context_json.pageTitle, "Мои задачи");
    assert.ok(contract.fallbackRoute);
  });

  it("minimize studio CMS contract saves pageTitle in payload context", () => {
    const contract = resolvePortalPageViewLayoutContractOverrides(
      { pathname: "/designer/tenant/1/page/42" },
      42,
      {
        page: { title: "Лендинг продукта" },
      },
    );

    const descriptor = resolveCurrentWorkspaceTabDescriptor({
      pathname: "/designer/tenant/1/page/42",
      search: "",
      hash: "",
    });

    const payload = buildWorkspaceTabPayload(descriptor, {
      pageTitle: contract.title,
      context: contract.context,
    });

    assert.equal(payload.title, "Студия: Лендинг продукта");
    assert.equal(payload.context_json.pageTitle, "Лендинг продукта");
    assert.ok(contract.fallbackRoute);
  });

  it("provider resolves minimize navigate route when fallback equals current route", () => {
    const providerSource = readFileSync(
      join(workspaceTabsDir, "GlobalWorkspaceTabsProvider.jsx"),
      "utf8",
    );

    assert.match(providerSource, /resolveMinimizeNavigateRoute/);
    assert.match(providerSource, /if \(!saved\?\.route\)/);
    assert.match(providerSource, /if \(navigateRoute\)/);
    assert.doesNotMatch(providerSource, /if \(!navigateRoute\)/);

    const navigateRoute = resolveMinimizeNavigateRoute({
      currentRoute: "/portal/1/page/12",
      contractFallbackRoute: "/portal/1/page/12",
      tenantId: 1,
    });

    assert.equal(navigateRoute, "/portal/1/page/1");
  });

  it("does not require navigate route when minimized tab has open route", () => {
    assert.equal(
      shouldWarnAboutMinimizeNavigateRoute({
        tabCreated: true,
        tabOpenRoute: "/portal/1/page/12",
        navigateRoute: null,
      }),
      false,
    );
  });

  it("provider preserves tab order on activation via stable sort helper", () => {
    const providerSource = readFileSync(
      join(workspaceTabsDir, "GlobalWorkspaceTabsProvider.jsx"),
      "utf8",
    );

    assert.match(providerSource, /sortWorkspaceTabs/);
    assert.match(providerSource, /resolveNextWorkspaceTabSortOrder/);
    assert.doesNotMatch(providerSource, /last_opened_at/);
  });

  it("opens profile_panel tabs via profile panel handlers without navigate", () => {
    const providerSource = readFileSync(
      join(workspaceTabsDir, "GlobalWorkspaceTabsProvider.jsx"),
      "utf8",
    );

    assert.match(providerSource, /isProfilePanelWorkspaceTab/);
    assert.match(providerSource, /openFromTab/);
    assert.match(providerSource, /registerProfilePanelHandlers/);
    assert.match(
      providerSource,
      /if \(isProfilePanelWorkspaceTab\(tab\)\) \{[\s\S]*openFromTab[\s\S]*return;/,
    );
  });

});

