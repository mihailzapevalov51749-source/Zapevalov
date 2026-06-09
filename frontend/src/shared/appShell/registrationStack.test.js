import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const appShellDir = dirname(fileURLToPath(import.meta.url));

function upsertStackEntry(stack, ownerId, payload) {
  const existingIndex = stack.findIndex((entry) => entry.ownerId === ownerId);

  if (existingIndex >= 0) {
    stack[existingIndex] = { ownerId, ...payload };
  } else {
    stack.push({ ownerId, ...payload });
  }

  return stack;
}

function removeStackEntry(stack, ownerId) {
  return stack.filter((entry) => entry.ownerId !== ownerId);
}

function resolveActiveContract(stack) {
  if (!stack.length) {
    return null;
  }

  return stack[stack.length - 1]?.contract ?? null;
}

function resolveActiveChrome(stack) {
  if (!stack.length) {
    return null;
  }

  return stack[stack.length - 1]?.patch ?? null;
}

function resolveActiveToolbarSlot(stackBySlotId, slotId) {
  const stack = stackBySlotId[slotId];

  if (!Array.isArray(stack) || stack.length === 0) {
    return null;
  }

  return stack[stack.length - 1]?.element ?? null;
}

describe("registration stack lifecycle", () => {
  it("restores parent contract after child unregister", () => {
    let stack = [];

    stack = upsertStackEntry(stack, "parent", {
      contract: { pageType: "studio_workspaces", canMinimize: true },
    });
    stack = upsertStackEntry(stack, "child", {
      contract: { pageType: "object_runtime", canMinimize: true },
    });

    assert.equal(resolveActiveContract(stack)?.pageType, "object_runtime");

    stack = removeStackEntry(stack, "child");

    assert.equal(resolveActiveContract(stack)?.pageType, "studio_workspaces");
    assert.equal(resolveActiveContract(removeStackEntry(stack, "parent")), null);
  });

  it("restores parent chrome after nested AppShellFrame unregister", () => {
    let stack = [];

    stack = upsertStackEntry(stack, "designer-shell", {
      patch: { workspaceLeftOffset: 260, hasPlatformChrome: true },
    });
    stack = upsertStackEntry(stack, "portal-layout", {
      patch: { workspaceLeftOffset: 260, hasPlatformChrome: true },
    });

    assert.equal(resolveActiveChrome(stack)?.workspaceLeftOffset, 260);

    stack = removeStackEntry(stack, "portal-layout");

    assert.equal(resolveActiveChrome(stack)?.workspaceLeftOffset, 260);
    assert.equal(resolveActiveChrome(removeStackEntry(stack, "designer-shell")), null);
  });

  it("restores parent app-header slot after nested header unregister", () => {
    const stacks = {};
    const parentElement = { id: "parent-slot" };
    const childElement = { id: "child-slot" };

    stacks["app-header"] = [];
    stacks["app-header"] = upsertStackEntry(stacks["app-header"], "parent", {
      element: parentElement,
    });
    stacks["app-header"] = upsertStackEntry(stacks["app-header"], "child", {
      element: childElement,
    });

    assert.equal(resolveActiveToolbarSlot(stacks, "app-header")?.id, "child-slot");

    stacks["app-header"] = removeStackEntry(stacks["app-header"], "child");

    assert.equal(resolveActiveToolbarSlot(stacks, "app-header")?.id, "parent-slot");
  });
});

describe("ownership stack implementation in AppShell providers", () => {
  it("PageLayoutContractProvider uses owner-based contract stack", () => {
    const source = readFileSync(
      join(appShellDir, "pageLayoutContract/PageLayoutContractContext.jsx"),
      "utf8",
    );

    assert.match(source, /stackRef/);
    assert.match(source, /unregisterContract/);
    assert.match(source, /useId\(\)/);
  });

  it("AppShellChromeProvider uses owner-based chrome stack", () => {
    const source = readFileSync(join(appShellDir, "AppShellChromeContext.jsx"), "utf8");

    assert.match(source, /stackRef/);
    assert.match(source, /unregisterChrome/);
    assert.doesNotMatch(source, /resetChrome/);
  });

  it("AppShellPageActionsProvider uses owner-based toolbar slot stack", () => {
    const source = readFileSync(join(appShellDir, "AppShellPageActionsContext.jsx"), "utf8");

    assert.match(source, /slotStacksRef/);
    assert.match(source, /\(ownerId, slotId, element\)/);
    assert.match(source, /registerToolbarSlot\(ownerId, slotId/);
    assert.match(source, /useId\(\)/);
  });

  it("bottom tabs container respects workspace left offset from chrome stack", () => {
    const appShellSource = readFileSync(join(appShellDir, "AppShell.jsx"), "utf8");
    const cssSource = readFileSync(join(appShellDir, "appShell.css"), "utf8");

    assert.match(appShellSource, /chrome\.workspaceLeftOffset/);
    assert.match(appShellSource, /app-shell__bottom-tabs/);
    assert.match(cssSource, /\.app-shell__bottom-tabs/);
    assert.match(cssSource, /\.global-workspace-tabs-bar/);
  });
});
