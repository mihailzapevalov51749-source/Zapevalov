import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  resolveNextWorkspaceTabSortOrder,
  sortWorkspaceTabs,
} from "./workspaceTabsOrder.js";

const workspaceTabsDir = dirname(fileURLToPath(import.meta.url));

function makeTab(id, overrides = {}) {
  return {
    id,
    title: `Tab ${id}`,
    sort_order: 100,
    created_at: "2026-06-09T10:00:00.000Z",
    last_opened_at: "2026-06-09T10:00:00.000Z",
    ...overrides,
  };
}

describe("sortWorkspaceTabs", () => {
  it("orders tabs by sort_order then created_at", () => {
    const ordered = sortWorkspaceTabs([
      makeTab("c", {
        sort_order: 100,
        created_at: "2026-06-09T12:00:00.000Z",
      }),
      makeTab("a", {
        sort_order: 100,
        created_at: "2026-06-09T10:00:00.000Z",
      }),
      makeTab("b", {
        sort_order: 100,
        created_at: "2026-06-09T11:00:00.000Z",
      }),
    ]);

    assert.deepEqual(
      ordered.map((tab) => tab.id),
      ["a", "b", "c"],
    );
  });

  it("does not reorder tabs when last_opened_at changes on activation", () => {
    const tabs = [
      makeTab("a", {
        created_at: "2026-06-09T10:00:00.000Z",
        last_opened_at: "2026-06-09T10:00:00.000Z",
      }),
      makeTab("b", {
        created_at: "2026-06-09T11:00:00.000Z",
        last_opened_at: "2026-06-09T11:00:00.000Z",
      }),
      makeTab("c", {
        created_at: "2026-06-09T12:00:00.000Z",
        last_opened_at: "2026-06-09T12:00:00.000Z",
      }),
    ];

    const activated = sortWorkspaceTabs(
      tabs.map((tab) =>
        tab.id === "b"
          ? {
              ...tab,
              last_opened_at: "2026-06-09T20:00:00.000Z",
              is_minimized: false,
            }
          : tab,
      ),
    );

    assert.deepEqual(
      activated.map((tab) => tab.id),
      ["a", "b", "c"],
    );
  });

  it("preserves order of remaining tabs after close", () => {
    const remaining = sortWorkspaceTabs([
      makeTab("a", { created_at: "2026-06-09T10:00:00.000Z" }),
      makeTab("c", { created_at: "2026-06-09T12:00:00.000Z" }),
    ]);

    assert.deepEqual(
      remaining.map((tab) => tab.id),
      ["a", "c"],
    );
  });

  it("appends new minimized tabs using next sort_order", () => {
    const nextSortOrder = resolveNextWorkspaceTabSortOrder([
      makeTab("a", { sort_order: 100 }),
      makeTab("b", { sort_order: 101 }),
    ]);

    assert.equal(nextSortOrder, 102);
  });
});

describe("GlobalWorkspaceTabsProvider ordering contract", () => {
  it("uses stable sort helper instead of last_opened_at ordering", () => {
    const providerSource = readFileSync(
      join(workspaceTabsDir, "GlobalWorkspaceTabsProvider.jsx"),
      "utf8",
    );
    const orderSource = readFileSync(
      join(workspaceTabsDir, "workspaceTabsOrder.js"),
      "utf8",
    );

    assert.match(providerSource, /sortWorkspaceTabs/);
    assert.doesNotMatch(providerSource, /last_opened_at/);
    assert.match(orderSource, /created_at/);
    assert.doesNotMatch(orderSource, /left\?\.last_opened_at|right\?\.last_opened_at/);
  });
});
