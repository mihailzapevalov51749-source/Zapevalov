import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  readYasiiPinned,
  writeYasiiPinned,
} from "./workspace/yasiiWorkspaceModeStorage.js";
import { resolveSurfaceFromRoute } from "./embedded/resolveSurfaceFromRoute.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

describe("yasii workspace modes", () => {
  it("persists pinned state when browser storage is available", () => {
    if (typeof localStorage === "undefined") {
      return;
    }

    writeYasiiPinned(true);
    assert.equal(readYasiiPinned(), true);
    writeYasiiPinned(false);
    assert.equal(readYasiiPinned(), false);
  });

  it("resolves /yasii route to workspace surface context", () => {
    const resolved = resolveSurfaceFromRoute("/yasii");
    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.GLOBAL);
    assert.equal(resolved.contextData.widgetId, "yasii-workspace");
    assert.equal(resolved.contextData.metadata.workspaceMode, "workspace");
  });

  it("keeps designer /processes on designer surface", () => {
    const resolved = resolveSurfaceFromRoute("/designer/tenant/1/processes");
    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.DESIGNER);
  });

  it("wires launcher dismiss guard, collapse-to-floating, and assistant session", () => {
    const launcherSource = readSource("./components/YasiiLauncher.jsx");
    const dismissSource = readSource("./workspace/yasiiFloatingDismiss.js");
    const assistantSource = readSource("./context/YasiiAssistantContext.jsx");
    const headerSource = readSource("./components/YasiiPanelHeaderActions.jsx");
    const workspaceSource = readSource("./pages/YasiiWorkspacePage.jsx");

    assert.match(launcherSource, /useYasiiAssistantSession/);
    assert.match(launcherSource, /shouldCloseFloatingOnOutsideClick/);
    assert.match(launcherSource, /event\.key !== "Escape"/);
    assert.match(dismissSource, /isPinned/);
    assert.match(assistantSource, /readYasiiPinned/);
    assert.match(assistantSource, /messages/);
    assert.match(headerSource, /resolveYasiiPanelControlOrder/);
    assert.match(headerSource, /Pin\.png/);
    assert.match(headerSource, /expand\.png/);
    assert.match(headerSource, /collapse\.png/);
    assert.match(headerSource, /minimizeCurrentPage/);
    assert.match(headerSource, /navigate\("\/yasii"\)/);
    assert.match(headerSource, /leaveYasiiPageToPanel/);
    assert.match(headerSource, /enterYasiiPage/);
    assert.match(workspaceSource, /enterYasiiPage/);
    assert.match(workspaceSource, /leaveYasiiPageMinimized/);
    assert.doesNotMatch(
      workspaceSource,
      /useEffect\(\(\) => {\s*session\?\.setFloatingOpen/,
    );
  });

  it("registers workspace page route in App shell", () => {
    const appSource = readFileSync(
      join(__dirname, "..", "App.jsx"),
      "utf8",
    );

    assert.match(appSource, /path="\/yasii"/);
    assert.match(appSource, /YasiiWorkspacePage/);
    assert.match(appSource, /YasiiAssistantProvider/);
  });
});
