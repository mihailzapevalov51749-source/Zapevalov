import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { getPlatformQuickCreateDefaultBounds } from "../quickCreate/platformQuickCreateModalKeys.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

describe("PlatformModal standard min width", () => {
  it("uses 300px platform minimum for standard and compact presets", () => {
    const stylesSource = readSource("./platformModalStyles.js");

    assert.match(stylesSource, /PLATFORM_MODAL_STANDARD_MIN_WIDTH = PLATFORM_MODAL_FOOTER_SAFE_MIN_WIDTH/);
    assert.match(stylesSource, /PLATFORM_MODAL_FOOTER_SAFE_MIN_WIDTH = 300/);
    assert.match(stylesSource, /PLATFORM_MODAL_COMPACT_MIN_WIDTH = 300/);
  });

  it("resolvePlatformModalMinWidth enforces standard and compact presets", () => {
    const layoutSource = readSource("./usePlatformModalLayout.js");
    const modalSource = readSource("./PlatformModal.jsx");

    assert.match(layoutSource, /export function resolvePlatformModalMinWidth/);
    assert.match(layoutSource, /PLATFORM_MODAL_STANDARD_MIN_WIDTH/);
    assert.match(modalSource, /layoutPreset = "standard"/);
    assert.match(modalSource, /resolvePlatformModalMinWidth\(layoutPreset, base\.minWidth\)/);
  });

  it("quick create default width can exceed platform minimum", () => {
    assert.ok(getPlatformQuickCreateDefaultBounds(1).width >= 300);
    assert.ok(getPlatformQuickCreateDefaultBounds(6).width >= 420);
  });

  it("footer styles allow narrow modal widths", () => {
    const footerCss = readFileSync(
      join(__dirname, "platformModalFooter.css"),
      "utf8",
    );

    assert.match(footerCss, /flex-wrap: wrap/);
    assert.match(footerCss, /min-width: 88px/);
  });
});
