import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PAGE_LAYOUT_PAGE_TYPE } from "../appShell/pageLayoutContract/pageLayoutContractTypes.js";
import {
  CORPORATE_CHAT_PAGE_ID,
  resolveWorkspaceTabDisplayTitle,
} from "./resolveWorkspaceTabDisplayTitle.js";
import {
  buildWorkspaceTabPayload,
  resolveCurrentWorkspaceTabDescriptor,
} from "./resolveCurrentWorkspaceTabDescriptor.js";

describe("resolveWorkspaceTabDisplayTitle", () => {
  it("formats studio object list as Студия: Объекты", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/designer/tenant/1/object-types",
      module_key: "studio",
      page_type: "studio_object_settings",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST,
      context_json: { layoutPageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST },
    });

    assert.equal(title, "Студия: Объекты");
  });

  it("formats studio workspaces as Студия: Рабочие пространства", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/designer/tenant/1/workspaces",
      module_key: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES,
    });

    assert.equal(title, "Студия: Рабочие пространства");
  });

  it("formats studio admin as Студия: Администрирование", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/designer/tenant/1/administration",
      module_key: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN,
    });

    assert.equal(title, "Студия: Администрирование");
  });

  it("formats office CMS page with context.pageTitle as Офис: Мои задачи", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Офис: Страница",
      route: "/portal/1/page/12",
      module_key: "office",
      page_type: "page",
      context_json: {
        pageTitle: "Мои задачи",
        pageId: 12,
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
      },
    });

    assert.equal(title, "Офис: Мои задачи");
  });

  it("formats studio CMS page with context.pageTitle", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Студия: Страница",
      route: "/designer/tenant/1/page/42",
      module_key: "studio",
      page_type: "page",
      context_json: {
        pageTitle: "Лендинг продукта",
        pageId: 42,
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR,
      },
    });

    assert.equal(title, "Студия: Лендинг продукта");
  });

  it("formats office page with user title as Офис: <title>", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/portal/1/page/12",
      module_key: "office",
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
      context_json: { pageTitle: "Проблемы", layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE },
    });

    assert.equal(title, "Офис: Проблемы");
  });

  it("formats office library as Офис: Документы when no library title", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/portal/1/library/5",
      module_key: "office",
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY,
    });

    assert.equal(title, "Офис: Документы");
  });

  it("uses object display name instead of technical key", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/portal/1/object-types/zadachnik/default_table",
      module_key: "office",
      page_type: "object_table",
      pageType: PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME,
      context_json: {
        objectTypeKey: "zadachnik",
        objectTypeName: "Задачник",
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME,
      },
    });

    assert.equal(title, "Офис: Задачник");
  });

  it("falls back to object key when display name is missing", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/portal/1/object-types/zadachnik/default_table",
      module_key: "office",
      page_type: "object_table",
      context_json: {
        objectTypeKey: "zadachnik",
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME,
      },
    });

    assert.equal(title, "Офис: zadachnik");
  });

  it("formats corporate chat as Офис: Чат without interlocutor name", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: `Страница ${CORPORATE_CHAT_PAGE_ID}`,
      route: `/portal/1/page/${CORPORATE_CHAT_PAGE_ID}`,
      module_key: "office",
      page_type: "page",
      context_json: {
        pageId: CORPORATE_CHAT_PAGE_ID,
        chatTitle: "Лисас Идеева",
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
      },
    });

    assert.equal(title, "Офис: Чат");
    assert.doesNotMatch(title, /Страница\s+35/i);
    assert.doesNotMatch(title, /Лисас Идеева/i);
  });

  it("formats portal dashboard as Офис: Развитие продукта", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/portal/1/platform",
      module_key: "dashboard",
      pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    });

    assert.equal(title, "Офис: Развитие продукта");
  });

  it("formats profile with user name as Профиль: <name>", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/profile",
      module_key: "settings",
      pageType: PAGE_LAYOUT_PAGE_TYPE.PROFILE,
      context_json: { userName: "Михаил Запевалов", pageTitle: "Михаил Запевалов" },
    });

    assert.equal(title, "Профиль: Михаил Запевалов");
  });

  it("formats yasii workspace as Ясии: Ассистент", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      route: "/yasii",
      module_key: "chat",
      pageType: PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE,
    });

    assert.equal(title, "Ясии: Ассистент");
  });

  it("re-resolves legacy stored title Объект: Задачник to Офис: Задачник", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Объект: Задачник",
      route: "/portal/1/object-types/zadachnik/default_table",
      module_key: "office",
      page_type: "object_table",
      context_json: {
        objectTypeName: "Задачник",
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME,
      },
    });

    assert.equal(title, "Офис: Задачник");
  });

  it("ignores technical stored title Studio", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Studio",
      route: "/designer/tenant/1/pages",
      module_key: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES,
    });

    assert.equal(title, "Студия: Страницы");
  });

  it("buildWorkspaceTabPayload stores Russian display title", () => {
    const descriptor = resolveCurrentWorkspaceTabDescriptor({
      pathname: "/designer/tenant/1/trash",
      search: "",
      hash: "",
    });

    const payload = buildWorkspaceTabPayload(descriptor);

    assert.equal(payload.title, "Студия: Корзина");
    assert.equal(payload.page_type, "generic");
    assert.equal(payload.context_json.layoutPageType, PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH);
  });
});
