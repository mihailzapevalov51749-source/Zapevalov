import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const headerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "PortalObjectRuntimeHeader.jsx"),
  "utf8",
);

const workspaceTabsSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "WorkspaceRuntimeTabsBar.jsx"),
  "utf8",
);

describe("PortalObjectRuntimeHeader", () => {
  it("renders object context menu trigger before object tabs", () => {
    assert.match(headerSource, /ObjectContextMenuTrigger/);
    assert.match(headerSource, /portal-object-runtime-header__context-trigger/);
    assert.match(headerSource, /workspace-runtime-tabs/);
  });

  it("supports menuInTab placement in active tab label", () => {
    assert.match(headerSource, /activeTab/);
    assert.match(headerSource, /menuInTab/);
    assert.match(headerSource, /portal-object-runtime-header__tab-with-menu/);
    assert.match(headerSource, /shouldRenderObjectIdentity/);
    assert.match(headerSource, /portal-object-runtime-header--menu-in-tab/);
  });

  it("renders tab menu trigger from resolvedActiveTab when tab item lacks menuInTab", () => {
    assert.match(headerSource, /shouldRenderMenuInActiveTab/);
    assert.match(headerSource, /showMenuInTab = shouldRenderMenuInActiveTab && isActive/);
    assert.doesNotMatch(headerSource, /showMenuInTab[\s\S]{0,120}tab\.menuInTab/);
    assert.match(headerSource, /shouldRenderObjectIdentity = !shouldRenderMenuInActiveTab/);
    assert.match(headerSource, /label=\{tabLabel\}/);
  });
});

describe("WorkspaceRuntimeTabsBar", () => {
  it("renders object menu trigger in active workspace tab when menuInTab is delegated", () => {
    assert.match(workspaceTabsSource, /activeTabMenuInTab/);
    assert.match(workspaceTabsSource, /objectMenuContext/);
    assert.match(workspaceTabsSource, /ObjectContextMenuTrigger/);
    assert.match(workspaceTabsSource, /workspace-runtime-tabs__tab-with-menu/);
    assert.match(
      workspaceTabsSource,
      /showMenuInTab[\s\S]*activeTabMenuInTab[\s\S]*menuContextProps/,
    );
  });
});
