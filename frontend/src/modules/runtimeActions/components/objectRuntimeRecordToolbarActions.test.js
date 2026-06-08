import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const componentsDir = dirname(fileURLToPath(import.meta.url));
const recordToolbarSource = readFileSync(
  join(componentsDir, "ObjectRuntimeRecordToolbarActions.jsx"),
  "utf8",
);
const topPanelSource = readFileSync(
  join(componentsDir, "ObjectRuntimeTopPanelActions.jsx"),
  "utf8",
);
const planWorkAreaSource = readFileSync(
  join(componentsDir, "../../objectViews/plan/PlanWorkArea.jsx"),
  "utf8",
);

describe("ObjectRuntimeRecordToolbarActions", () => {
  it("reuses top panel actions with record_toolbar placement", () => {
    assert.match(recordToolbarSource, /ObjectRuntimeTopPanelActions/);
    assert.match(recordToolbarSource, /placementKey="record_toolbar"/);
    assert.match(recordToolbarSource, /requireEntityId/);
  });

  it("requires entityId before enabling runtime fetch", () => {
    assert.match(topPanelSource, /requireEntityId/);
    assert.match(topPanelSource, /!requireEntityId \|\| Boolean\(normalizedEntityId\)/);
  });

  it("passes entityId into action click context", () => {
    assert.match(topPanelSource, /handleActionClick\(\{[\s\S]*entityId: normalizedEntityId/s);
  });
});

describe("PlanWorkArea record_toolbar integration", () => {
  it("mounts record toolbar actions next to record title", () => {
    assert.match(planWorkAreaSource, /ObjectRuntimeRecordToolbarActions/);
    assert.match(planWorkAreaSource, /entityId=\{runtimeEntityId\}/);
    assert.match(planWorkAreaSource, /selectedNode\?\.id/);
  });

  it("hides record toolbar in preview mode", () => {
    assert.match(planWorkAreaSource, /!previewMode \? \(/);
    assert.match(planWorkAreaSource, /ObjectRuntimeRecordToolbarActions/);
  });
});
