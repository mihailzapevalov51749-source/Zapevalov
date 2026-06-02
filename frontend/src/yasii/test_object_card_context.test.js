import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildObjectCardHostContext } from "./hostContextBuilders.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("buildObjectCardHostContext", () => {
  it("builds object card HostContext with minimal object metadata", () => {
    const hostContext = buildObjectCardHostContext({
      tenantId: "1",
      userId: "9",
      objectTypeId: "contacts",
      objectTypeName: "Контрагент",
      objectId: "obj-7",
      objectTitle: "ООО Ромашка",
      activeTab: "documents",
      metadata: {
        objectStatus: "active",
        objectOwner: "owner-1",
      },
    });

    assert.equal(hostContext.hostSurface, "object_card");
    assert.equal(hostContext.objectTypeId, "contacts");
    assert.equal(hostContext.objectTypeName, "Контрагент");
    assert.equal(hostContext.objectId, "obj-7");
    assert.equal(hostContext.objectTitle, "ООО Ромашка");
    assert.equal(hostContext.activeTab, "documents");
    assert.equal(hostContext.metadata.objectStatus, "active");
  });
});

describe("object card surface provider wiring", () => {
  it("provides object_card context through YasiiSurfaceContextProvider", () => {
    const source = readFileSync(
      join(__dirname, "../modules/objectViews/table/ObjectTableView.jsx"),
      "utf8",
    );

    assert.match(source, /YasiiSurfaceContextProvider/);
    assert.match(source, /EMBEDDED_SURFACE_IDS\.OBJECT_CARD/);
    assert.match(source, /objectTypeId/);
    assert.match(source, /objectTitle/);
    assert.match(source, /activeTab/);
  });
});
