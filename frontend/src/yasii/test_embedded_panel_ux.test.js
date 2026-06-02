import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

describe("YASII embedded panel UX", () => {
  it("shows fixed status label instead of surface name near online indicator", () => {
    const panelSource = readSource("./components/YasiiEmbeddedPanel.jsx");

    assert.match(panelSource, /YASII_STATUS_LABEL/);
    assert.match(panelSource, /Цифровой сотрудник/);
    assert.doesNotMatch(panelSource, /\{sourceLabel\}[\s\S]*yasii-panel-header__status/);
    assert.match(panelSource, /<YasiiEmbeddedContextHeader sourceLabel=\{sourceLabel\} \/>/);
  });

  it("uses compact source hint markup", () => {
    const headerSource = readSource("./components/YasiiEmbeddedContextHeader.jsx");
    const stylesSource = readSource("./styles.css");

    assert.match(headerSource, /yasii-embedded-source-hint/);
    assert.doesNotMatch(headerSource, /yasii-embedded-banner/);
    assert.match(stylesSource, /\.yasii-embedded-source-hint/);
    assert.doesNotMatch(stylesSource, /\.yasii-embedded-banner/);
  });

  it("scrolls to the latest assistant message after layout", () => {
    const panelSource = readSource("./components/YasiiEmbeddedPanel.jsx");

    assert.match(panelSource, /useLayoutEffect/);
    assert.match(panelSource, /findMessageElement/);
    assert.match(panelSource, /scrollAssistantMessageToStart/);
    assert.doesNotMatch(panelSource, /scrollMessageIntoView/);
  });
});
