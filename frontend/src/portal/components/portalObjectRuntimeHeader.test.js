import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const headerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "PortalObjectRuntimeHeader.jsx"),
  "utf8",
);

describe("PortalObjectRuntimeHeader", () => {
  it("renders object context menu trigger before object tabs", () => {
    assert.match(headerSource, /ObjectContextMenuTrigger/);
    assert.match(headerSource, /portal-object-runtime-header__context-trigger/);
    assert.match(headerSource, /workspace-runtime-tabs/);
  });
});
