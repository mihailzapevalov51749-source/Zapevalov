import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  YASII_PANEL_CONTROL,
  resolveYasiiPanelControlOrder,
} from "./yasiiPanelWindowControls.js";

const panelDir = dirname(fileURLToPath(import.meta.url));

describe("resolveYasiiPanelControlOrder", () => {
  it("returns fullscreen, pin, close for floating panel", () => {
    assert.deepEqual(resolveYasiiPanelControlOrder("floating"), [
      YASII_PANEL_CONTROL.FULLSCREEN,
      YASII_PANEL_CONTROL.PIN,
      YASII_PANEL_CONTROL.CLOSE,
    ]);
  });

  it("returns minimize before fullscreen for workspace page", () => {
    assert.deepEqual(resolveYasiiPanelControlOrder("workspace"), [
      YASII_PANEL_CONTROL.MINIMIZE,
      YASII_PANEL_CONTROL.FULLSCREEN,
      YASII_PANEL_CONTROL.PIN,
      YASII_PANEL_CONTROL.CLOSE,
    ]);
  });
});

describe("YasiiPanelHeaderActions integration", () => {
  it("uses shared control order and workspace minimize via workspace tabs", () => {
    const headerSource = readFileSync(
      join(panelDir, "../components/YasiiPanelHeaderActions.jsx"),
      "utf8",
    );

    assert.match(headerSource, /resolveYasiiPanelControlOrder/);
    assert.match(headerSource, /YasiiPanelControlButton/);
    assert.match(headerSource, /minimizeCurrentPage/);
    assert.match(headerSource, /<Minus/);
    assert.match(headerSource, /<X/);
    assert.match(headerSource, /yasii-panel-header__action-icon/);
    assert.doesNotMatch(
      headerSource,
      /Закрыть ЯСИИ[\s\S]*Развернуть ЯСИИ/,
    );
  });
});
