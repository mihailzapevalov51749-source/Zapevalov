import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("PlatformQuickCreate modal accent", () => {
  it("uses platform accent tokens instead of hardcoded Studio purple", () => {
    const css = readFileSync(join(__dirname, "platformQuickCreateModal.css"), "utf8");

    assert.match(css, /var\(--platform-accent\)/);
    assert.match(css, /var\(--platform-accent-hover\)/);
    assert.doesNotMatch(css, /#7c3aed/);
    assert.doesNotMatch(css, /#6d28d9/);
  });

  it("uses PlatformModal shell for layout and zone inheritance", () => {
    const source = readFileSync(join(__dirname, "PlatformQuickCreateForm.jsx"), "utf8");

    assert.match(source, /PlatformModal/);
    assert.match(source, /canCustomizeLayout={canCustomizeLayout}/);
    assert.match(source, /platform-modal-footer/);
    assert.doesNotMatch(source, /platform-quick-create-modal__footer/);
  });

  it("defines stable Office object record create persist key", () => {
    const keysSource = readFileSync(join(__dirname, "platformQuickCreateModalKeys.js"), "utf8");

    assert.match(keysSource, /buildOfficeObjectRecordCreateModalKey/);
    assert.match(keysSource, /office\.objectRecord\.create/);
  });
});
