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

describe("Platform event journal routing", () => {
  it("mounts journal page instead of legacy dashboard page", () => {
    const appSource = readFileSync(
      join(__dirname, "../App.jsx"),
      "utf8",
    );
    const journalSource = readFileSync(
      join(__dirname, "../modules/platformDashboard/pages/PlatformEventJournalPage.jsx"),
      "utf8",
    );

    assert.match(appSource, /PlatformEventJournalPage/);
    assert.doesNotMatch(appSource, /PlatformDevelopmentPage/);
    assert.doesNotMatch(journalSource, /YasiiSurfaceContextProvider/);
    assert.doesNotMatch(journalSource, /buildPlatformDashboardMetadata/);
  });
});

describe("YASII embedded panel wiring", () => {
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

  it("prefers backend message text in resolveAssistantText", () => {
    const hookSource = readSource("./hooks/useYasiiEmbeddedQuery.js");
    assert.match(hookSource, /function resolveAssistantText/);
    assert.match(hookSource, /payload\?\.message/);
    assert.match(hookSource, /resolveAssistantText\(payload\)/);
  });

  it("uses instant chat scroll strategy without smooth behavior", () => {
    const panelSource = readSource("./components/YasiiEmbeddedPanel.jsx");
    const scrollSource = readSource("./yasiiChatScroll.js");
    assert.match(panelSource, /inputRef/);
    assert.match(panelSource, /resolveMessageScrollIntent/);
    assert.match(panelSource, /useLayoutEffect/);
    assert.match(panelSource, /scrollAssistantMessageToStart/);
    assert.doesNotMatch(panelSource, /behavior:\s*"smooth"/);
    assert.match(scrollSource, /scrollAssistantMessageToStart/);
  });
});
