import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

describe("PlatformConfirmModal", () => {
  it("uses PlatformModal with compact layout preset", () => {
    const source = readSource("./PlatformConfirmModal.jsx");

    assert.match(source, /import PlatformModal from "\.\/PlatformModal"/);
    assert.match(source, /layoutPreset="compact"/);
    assert.match(source, /variant = "default"/);
  });

  it("supports danger and warning confirm variants", () => {
    const source = readSource("./PlatformConfirmModal.jsx");

    assert.match(source, /danger:/);
    assert.match(source, /warning:/);
    assert.match(source, /#dc2626/);
    assert.match(source, /#d97706/);
  });
});

describe("PlatformConfirmProvider", () => {
  it("exposes async confirm through context", () => {
    const providerSource = readSource("./PlatformConfirmProvider.jsx");
    const hookSource = readSource("./usePlatformConfirm.js");

    assert.match(providerSource, /new Promise/);
    assert.match(providerSource, /PlatformConfirmContext/);
    assert.match(providerSource, /finish\(true\)/);
    assert.match(providerSource, /finish\(false\)/);
    assert.match(hookSource, /PlatformConfirmContext/);
    assert.match(hookSource, /PlatformConfirmProvider/);
  });
});
