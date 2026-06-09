import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  YASII_PRESENTATION,
  isYasiiPanelPresentation,
  resolveInitialYasiiPresentation,
} from "./yasiiPresentationState.js";

const presentationDir = dirname(fileURLToPath(import.meta.url));

describe("yasiiPresentationState", () => {
  it("resolves initial presentation from pin", () => {
    assert.equal(resolveInitialYasiiPresentation(true), YASII_PRESENTATION.PANEL);
    assert.equal(resolveInitialYasiiPresentation(false), YASII_PRESENTATION.CLOSED);
  });

  it("detects panel presentation", () => {
    assert.equal(isYasiiPanelPresentation(YASII_PRESENTATION.PANEL), true);
    assert.equal(isYasiiPanelPresentation(YASII_PRESENTATION.PAGE), false);
  });
});

describe("yasii presentation transitions", () => {
  it("closes panel before expand and after minimize", () => {
    const headerSource = readFileSync(
      join(presentationDir, "../components/YasiiPanelHeaderActions.jsx"),
      "utf8",
    );
    const contextSource = readFileSync(
      join(presentationDir, "../context/YasiiAssistantContext.jsx"),
      "utf8",
    );
    const launcherSource = readFileSync(
      join(presentationDir, "../components/YasiiLauncher.jsx"),
      "utf8",
    );
    const workspaceSource = readFileSync(
      join(presentationDir, "../pages/YasiiWorkspacePage.jsx"),
      "utf8",
    );

    assert.match(contextSource, /YASII_PRESENTATION/);
    assert.match(contextSource, /enterYasiiPage/);
    assert.match(contextSource, /leaveYasiiPageToPanel/);
    assert.match(contextSource, /leaveYasiiPageMinimized/);
    assert.match(headerSource, /enterYasiiPage/);
    assert.match(headerSource, /leaveYasiiPageMinimized/);
    assert.match(headerSource, /leaveYasiiPageToPanel/);
    assert.doesNotMatch(
      headerSource,
      /navigate\("\/yasii"\)[\s\S]*setFloatingOpen\?\.\(true\)/,
    );
    assert.match(launcherSource, /isYasiiPanelPresentation/);
    assert.match(workspaceSource, /enterYasiiPage/);
  });
});
