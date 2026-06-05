import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PAGE_OPEN_TARGET,
  buildPageOpenHref,
  pickPrimaryPageUsage,
  resolvePageOpenHref,
  resolvePageOpenTarget,
} from "./resolvePageOpenTarget.js";

describe("resolvePageOpenTarget", () => {
  it("prioritizes workspace home over navigation", () => {
    const usage = pickPrimaryPageUsage([
      { kind: "navigation", navigation_item_id: 10 },
      { kind: "workspace_home", workspace_slug: "dev", workspace_id: 3 },
    ]);

    assert.equal(usage.kind, "workspace_home");
  });

  it("prioritizes navigation over workspace tab", () => {
    const usage = pickPrimaryPageUsage([
      { kind: "workspace_tab", workspace_slug: "dev", workspace_id: 3 },
      { kind: "navigation", navigation_item_id: 10 },
    ]);

    assert.equal(usage.kind, "navigation");
  });

  it("builds office navigation href", () => {
    const href = buildPageOpenHref({
      tenantId: 1,
      pageId: 52,
      usage: { kind: "navigation" },
    });

    assert.equal(href, "/portal/1/page/52");
  });

  it("builds workspace home href", () => {
    const href = buildPageOpenHref({
      tenantId: 1,
      pageId: 10,
      usage: { kind: "workspace_home", workspace_slug: "razrabotka" },
    });

    assert.equal(href, "/portal/1/workspaces/razrabotka");
  });

  it("falls back to studio editor when page is unused", async () => {
    const href = await resolvePageOpenHref({
      tenantId: 1,
      page: { id: 99, usages: [] },
    });

    assert.equal(href, "/designer/tenant/1/page/99");
  });

  it("resolves workspace tab slug via tabs api", async () => {
    const href = await resolvePageOpenHref({
      tenantId: 1,
      page: {
        id: 48,
        usages: [
          {
            kind: "workspace_tab",
            workspace_id: 7,
            workspace_slug: "dev",
          },
        ],
      },
      listWorkspaceTabs: async () => [
        { tab_type: "page", target_id: "48", slug: "tasks" },
      ],
    });

    assert.equal(href, "/portal/1/workspaces/dev/tasks");
  });

  it("marks workspace tab target as needing resolve without slug", () => {
    const target = resolvePageOpenTarget({
      tenantId: 1,
      pageId: 48,
      usage: {
        kind: "workspace_tab",
        workspace_id: 7,
        workspace_slug: "dev",
      },
    });

    assert.equal(target.target, PAGE_OPEN_TARGET.WORKSPACE_TAB);
    assert.equal(target.needsWorkspaceTabResolve, true);
  });
});
