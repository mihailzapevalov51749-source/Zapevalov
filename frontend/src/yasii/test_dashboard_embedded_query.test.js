import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

describe("yasiiEmbeddedApi endpoints", () => {
  it("targets ACE handoff endpoint", () => {
    const source = readSource("./yasiiEmbeddedApi.js");
    assert.match(source, /\/ai-context\/handoff/);
    assert.match(source, /createAceHandoff/);
  });

  it("targets embedded query endpoint", () => {
    const source = readSource("./yasiiEmbeddedApi.js");
    assert.match(source, /\/yasii\/embedded\/query/);
    assert.match(source, /sendEmbeddedQuery/);
  });
});

describe("Platform Dashboard embedded integration wiring", () => {
  it("uses floating launcher with surface context provider", () => {
    const hookSource = readSource("./hooks/useYasiiEmbeddedQuery.js");
    const panelSource = readSource("./components/YasiiEmbeddedPanel.jsx");
    const floatingSource = readSource("./components/YasiiFloatingButton.jsx");
    const pageSource = readFileSync(
      join(__dirname, "../modules/platformDashboard/pages/PlatformDevelopmentPage.jsx"),
      "utf8",
    );

    assert.match(hookSource, /sendEmbeddedQuery/);
    assert.doesNotMatch(hookSource, /sendYasiiQuery/);
    assert.match(panelSource, /resolveEmbeddedSurface/);
    assert.match(floatingSource, /YasiiLauncher/);
    assert.match(floatingSource, /resolveSurfaceFromRoute/);
    assert.match(floatingSource, /useYasiiSurfaceContext/);
    assert.doesNotMatch(floatingSource, /hideOnPlatformDashboard/);
    assert.match(pageSource, /YasiiSurfaceContextProvider/);
    assert.match(pageSource, /buildPlatformDashboardMetadata/);
    assert.doesNotMatch(pageSource, /PlatformDashboardYasiiEntry/);
    assert.doesNotMatch(pageSource, /sendYasiiQuery/);
    assert.doesNotMatch(pageSource, /\/yasii\/query/);
  });

  it("does not route dashboard panel through legacy query API", () => {
    const panelSource = readSource("./components/YasiiEmbeddedPanel.jsx");
    assert.doesNotMatch(panelSource, /\/yasii\/query/);
    assert.doesNotMatch(panelSource, /sendYasiiQuery/);
  });

  it("uses only floating placement in launcher", () => {
    const launcherSource = readSource("./components/YasiiLauncher.jsx");
    assert.match(launcherSource, /yasii-launcher--floating/);
    assert.doesNotMatch(launcherSource, /placement/);
    assert.doesNotMatch(launcherSource, /yasii-launcher--inline/);
  });

  it("uses meaningful backend message instead of generic demo fallback", () => {
    const hookSource = readSource("./hooks/useYasiiEmbeddedQuery.js");
    assert.match(hookSource, /payload\?\.message/);
    assert.doesNotMatch(
      hookSource,
      /if \(payload\?\.demo === true\) \{\s*return DEMO_ASSISTANT_TEXT;\s*\}/,
    );
  });

  it("uses instant chat scroll strategy without smooth behavior", () => {
    const panelSource = readSource("./components/YasiiEmbeddedPanel.jsx");
    const scrollSource = readSource("./yasiiChatScroll.js");
    assert.match(panelSource, /inputRef/);
    assert.match(panelSource, /resolveMessageScrollIntent/);
    assert.doesNotMatch(panelSource, /behavior:\s*"smooth"/);
    assert.match(scrollSource, /behavior:\s*"auto"/);
  });
});
