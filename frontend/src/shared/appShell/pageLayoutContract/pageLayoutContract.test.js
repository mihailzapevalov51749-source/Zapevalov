import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";

import { describe, it } from "node:test";

import {
  buildWorkspaceTabPayload,
  resolveCurrentWorkspaceTabDescriptor,
} from "../../workspaceTabs/resolveCurrentWorkspaceTabDescriptor.js";
import { resolveWorkspaceTabDisplayTitle } from "../../workspaceTabs/resolveWorkspaceTabDisplayTitle.js";

import {
  PAGE_LAYOUT_MODULE_KEY,
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
} from "./pageLayoutContractTypes.js";

import {
  resolvePageLayoutContract,
  resolvePageLayoutFallbackRoute,
} from "./resolvePageLayoutContract.js";

const contractDir = dirname(fileURLToPath(import.meta.url));

describe("resolvePageLayoutContract", () => {
  it("resolves office workspace contract with app-header toolbar zone", () => {
    const location = {
      pathname: "/portal/1/workspaces/product",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);

    const contract = resolvePageLayoutContract(location, descriptor, {
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE,
      toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
      canMinimize: true,
    });

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.OFFICE);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
    assert.match(contract.route, /\/workspaces\/product/);
    assert.ok(contract.fallbackRoute);
  });

  it("resolves object plan contract with object-runtime-header toolbar zone", () => {
    const location = {
      pathname: "/portal/1/object-types/projects/plan",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);

    const contract = resolvePageLayoutContract(location, descriptor, {
      pageType: PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN,
      canMinimize: true,
    });

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves chat room contract with chat-header toolbar zone", () => {
    const location = {
      pathname: "/chats",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);

    const contract = resolvePageLayoutContract(location, descriptor, {
      pageType: PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM,
      canMinimize: true,
    });

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.CHAT);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
  });

  it("resolves studio object contract with studio-object-header toolbar zone", () => {
    const location = {
      pathname: "/designer/tenant/1/object-types/abc-123/fields",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);

    const contract = resolvePageLayoutContract(location, descriptor, {
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT,
      canMinimize: true,
    });

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
  });

  it("resolves dashboard contract with dashboard-toolbar toolbar zone", () => {
    const location = {
      pathname: "/portal/1/platform",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);

    const contract = resolvePageLayoutContract(location, descriptor, {
      pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
      canMinimize: true,
    });

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.DASHBOARD);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.DASHBOARD);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
  });

  it("resolves office page contract from portal CMS route", () => {
    const location = {
      pathname: "/portal/1/page/12",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves office library contract from library route", () => {
    const location = {
      pathname: "/portal/1/library/5",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio object list contract from object-types route", () => {
    const location = {
      pathname: "/designer/tenant/1/object-types",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio object data contract from data route", () => {
    const location = {
      pathname: "/designer/tenant/1/object-types/abc-123/data",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("returns unknown page type without overrides on unsupported route", () => {
    const location = {
      pathname: "/dev/app-header-renderer",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);

    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.UNKNOWN);
    assert.equal(contract.toolbarZoneId, null);
    assert.equal(contract.canMinimize, false);
  });

  it("resolves studio pages registry contract", () => {
    const location = {
      pathname: "/designer/tenant/1/pages",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio trash contract", () => {
    const location = {
      pathname: "/designer/tenant/1/trash",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio workspaces list contract", () => {
    const location = {
      pathname: "/designer/tenant/1/workspaces",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio workspace detail contract", () => {
    const location = {
      pathname: "/designer/tenant/1/workspaces/product",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio section placeholder contract", () => {
    const location = {
      pathname: "/designer/tenant/1/navigation",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio administration contract", () => {
    const location = {
      pathname: "/designer/tenant/1/administration/users",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves studio page editor contract", () => {
    const location = {
      pathname: "/designer/tenant/1/page/42",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.STUDIO);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });

  it("resolves yasii workspace contract", () => {
    const location = {
      pathname: "/yasii",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor);

    assert.equal(contract.pageType, PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE);
    assert.equal(contract.moduleKey, PAGE_LAYOUT_MODULE_KEY.YASII);
    assert.equal(contract.toolbarZoneId, PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER);
    assert.equal(contract.canMinimize, true);
  });
});

describe("resolvePageLayoutFallbackRoute", () => {
  it("returns a portal fallback route for the given tenant", () => {
    const fallbackRoute = resolvePageLayoutFallbackRoute(2);

    assert.match(fallbackRoute, /^\/portal\/\d+\//);
  });
});

describe("PageLayoutContract provider and registration", () => {
  it("exposes provider, register hook and resolved helper", () => {
    const contextSource = readFileSync(
      join(contractDir, "PageLayoutContractContext.jsx"),
      "utf8",
    );

    assert.match(contextSource, /PageLayoutContractProvider/);
    assert.match(contextSource, /useRegisterPageLayoutContract/);
    assert.match(contextSource, /useResolvedPageLayoutContract/);
    assert.match(contextSource, /unregisterContract\(ownerId\)/);
    assert.match(contextSource, /registerContract\(ownerId, contract\)/);
    assert.match(contextSource, /stackRef/);
  });

  it("mounts PageLayoutContractProvider inside AppShell", () => {
    const appShellSource = readFileSync(
      join(contractDir, "../AppShell.jsx"),
      "utf8",
    );

    assert.match(appShellSource, /PageLayoutContractProvider/);
    assert.match(appShellSource, /AppShellPageActionsProvider/);
  });
});

describe("pageLayoutContractTypes cleanup", () => {
  it("removed unused WORKSPACE_TABS toolbar zone", () => {
    const typesSource = readFileSync(
      join(contractDir, "pageLayoutContractTypes.js"),
      "utf8",
    );

    assert.doesNotMatch(typesSource, /WORKSPACE_TABS/);
  });
});

describe("full platform page contract registrations", () => {
  const pages = [
    {
      file: join(contractDir, "../../../portal/PortalWorkspaceRuntimePage.jsx"),
      pageTypeToken: "OFFICE_WORKSPACE",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../portal/PortalPageView.jsx"),
      pageTypeToken: "resolvePortalPageViewLayoutContractOverrides",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../portal/PortalLibraryRuntimePage.jsx"),
      pageTypeToken: "OFFICE_LIBRARY",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/ObjectTypesPage.jsx"),
      pageTypeToken: "STUDIO_OBJECT_LIST",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/ObjectTypeDataPage.jsx"),
      pageTypeToken: "STUDIO_OBJECT_DATA",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../portal/pages/PortalObjectDataPage.jsx"),
      pageTypeToken: "OBJECT_RUNTIME",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/chats/pages/CorporateChatPage.jsx"),
      pageTypeToken: "CHAT_ROOM",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/ObjectTypeWorkspacePage.jsx"),
      pageTypeToken: "STUDIO_OBJECT",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/platformDashboard/pages/PlatformDevelopmentPage.jsx"),
      pageTypeToken: "DASHBOARD",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/DesignerPagesPage.jsx"),
      pageTypeToken: "STUDIO_PAGES",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/DesignerTrashPage.jsx"),
      pageTypeToken: "STUDIO_TRASH",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/DesignerWorkspacesPage.jsx"),
      pageTypeToken: "STUDIO_WORKSPACES",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/DesignerWorkspaceDetailPage.jsx"),
      pageTypeToken: "STUDIO_WORKSPACE_DETAIL",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../modules/designer/pages/DesignerSectionPlaceholderPage.jsx"),
      pageTypeToken: "STUDIO_SECTION",
      toolbarZoneToken: "APP_HEADER",
    },
    {
      file: join(contractDir, "../../../yasii/pages/YasiiWorkspacePage.jsx"),
      pageTypeToken: "YASII_WORKSPACE",
      toolbarZoneToken: "APP_HEADER",
    },
  ];

  for (const page of pages) {
    it(`registers ${page.pageTypeToken} contract in ${page.file.split(/[/\\]/).slice(-1)[0]}`, () => {
      const source = readFileSync(page.file, "utf8");

      if (page.pageTypeToken.startsWith("resolve")) {
        assert.match(source, new RegExp(page.pageTypeToken));
        assert.match(source, /useResolvedPageLayoutContract/);
        return;
      }

      assert.match(source, new RegExp(`PAGE_LAYOUT_PAGE_TYPE\\.${page.pageTypeToken}`));
      assert.match(source, new RegExp(`PAGE_LAYOUT_TOOLBAR_ZONE\\.${page.toolbarZoneToken}`));
      assert.match(source, /useResolvedPageLayoutContract|useRegisterPageLayoutContract/);
      assert.match(source, /canMinimize:\s*true/);
    });
  }
});

describe("Page Layout Contract → workspace tab display title", () => {
  it("uses contract title for studio pages minimize payload", () => {
    const location = {
      pathname: "/designer/tenant/1/pages",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor, {
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES,
      canMinimize: true,
      title: "Страницы",
    });

    const payload = buildWorkspaceTabPayload(descriptor, {
      pageTitle: contract.title,
      context: contract.context,
    });

    assert.equal(payload.title, "Студия: Страницы");
  });

  it("uses contract title for office page minimize payload", () => {
    const location = {
      pathname: "/portal/1/page/12",
      search: "",
      hash: "",
    };

    const descriptor = resolveCurrentWorkspaceTabDescriptor(location);
    const contract = resolvePageLayoutContract(location, descriptor, {
      title: "Главная",
      context: { pageTitle: "Главная" },
    });

    const payload = buildWorkspaceTabPayload(descriptor, {
      pageTitle: contract.title,
      context: contract.context,
    });

    assert.equal(payload.title, "Офис: Главная");
  });

  it("does not expose technical page id as display title for chat page", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Страница 35",
      route: "/portal/1/page/35",
      module_key: "office",
      page_type: "page",
      context_json: {
        pageId: 35,
        chatTitle: "Корпоративный чат",
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
      },
    });

    assert.equal(title, "Офис: Чат");
    assert.doesNotMatch(title, /Страница\s+35/);
    assert.doesNotMatch(title, /Корпоративный чат/);
  });
});
