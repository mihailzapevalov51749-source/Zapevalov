import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

describe("PlatformModalShell resize regression guard", () => {
  it("renders resize handles with data attributes and startResize wiring", () => {
    const shellSource = readSource("./PlatformModalShell.jsx");
    const stylesSource = readSource("./platformModalStyles.js");

    assert.match(shellSource, /data-platform-modal-resize-handle="e"/);
    assert.match(shellSource, /data-platform-modal-resize-handle="s"/);
    assert.match(shellSource, /data-platform-modal-resize-handle="se"/);
    assert.match(shellSource, /startResize\?\.\("se", event\)/);
    assert.match(shellSource, /canCustomizeLayout \?/);
  });

  it("keeps resize handle z-index above footer for pointer events", () => {
    const stylesSource = readSource("./platformModalStyles.js");
    const shellSource = readSource("./PlatformModalShell.jsx");

    assert.match(stylesSource, /PLATFORM_MODAL_FOOTER_Z_INDEX/);
    assert.match(stylesSource, /PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX/);
    assert.match(
      stylesSource,
      /zIndex: PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX/,
    );
    assert.match(stylesSource, /zIndex: PLATFORM_MODAL_FOOTER_Z_INDEX/);
    assert.doesNotMatch(shellSource, /bottom: footerReservePx/);

    const footerIndex = stylesSource.indexOf("PLATFORM_MODAL_FOOTER_Z_INDEX = ");
    const resizeIndex = stylesSource.indexOf("PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX = ");
    assert.ok(footerIndex >= 0 && resizeIndex >= 0);

    const footerValue = Number(
      stylesSource
        .slice(footerIndex)
        .match(/PLATFORM_MODAL_FOOTER_Z_INDEX = (\d+)/)?.[1],
    );
    const resizeValue = Number(
      stylesSource
        .slice(resizeIndex)
        .match(/PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX = (\d+)/)?.[1],
    );

    assert.ok(resizeValue > footerValue);
  });
});

describe("PlatformModal layout hook", () => {
  it("exposes startResize handler for drag resize sessions", () => {
    const layoutSource = readSource("./usePlatformModalLayout.js");

    assert.match(layoutSource, /const startResize = useCallback/);
    assert.match(layoutSource, /startResize,/);
    assert.match(layoutSource, /saveModalBounds/);
  });
});
