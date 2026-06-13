import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  CORPORATE_CHAT_PAGE_ID,
  isRuntimeChatNavigationItem,
  resolveIsCorporateChatPage,
} from "./resolveCorporateChatPage.js";

describe("resolveIsCorporateChatPage", () => {
  it("matches legacy DEV tenant page id", () => {
    assert.equal(
      resolveIsCorporateChatPage({
        pageId: CORPORATE_CHAT_PAGE_ID,
        activeNavigationItem: null,
      }),
      true,
    );
  });

  it("matches runtime.chat system_key on any page id", () => {
    assert.equal(
      resolveIsCorporateChatPage({
        pageId: 128,
        activeNavigationItem: {
          system_key: "runtime.chat",
          menu_scope: "runtime",
          title: "Чат",
        },
      }),
      true,
    );
  });

  it("matches runtime nav title fallback without system_key", () => {
    assert.equal(
      resolveIsCorporateChatPage({
        pageId: 128,
        activeNavigationItem: {
          menu_scope: "runtime",
          title: "Чат",
        },
      }),
      true,
    );
  });

  it("does not match designer nav item named Чат", () => {
    assert.equal(
      resolveIsCorporateChatPage({
        pageId: 128,
        activeNavigationItem: {
          menu_scope: "designer",
          title: "Чат",
        },
      }),
      false,
    );
  });

  it("does not match unrelated CMS page", () => {
    assert.equal(
      resolveIsCorporateChatPage({
        pageId: 12,
        activeNavigationItem: {
          menu_scope: "runtime",
          title: "Главная",
        },
      }),
      false,
    );
  });
});

describe("isRuntimeChatNavigationItem", () => {
  it("accepts explicit runtime.chat key", () => {
    assert.equal(
      isRuntimeChatNavigationItem({
        system_key: "runtime.chat",
        title: "Corporate chat",
      }),
      true,
    );
  });
});

describe("PortalPageView corporate chat binding", () => {
  it("renders CorporateChatPage via resolveIsCorporateChatPage", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PortalPageView.jsx"),
      "utf8",
    );

    assert.match(source, /resolveIsCorporateChatPage/);
    assert.match(source, /<CorporateChatPage tenantId=\{portalId\} \/>/);
  });
});
