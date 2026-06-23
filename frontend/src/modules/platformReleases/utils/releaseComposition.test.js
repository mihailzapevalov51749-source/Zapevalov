import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canCreateReleaseFromDiff,
  countSelectedFiles,
  mapDiffElementsToRows,
} from "./releaseComposition.js";

describe("releaseComposition", () => {
  const elements = [
    {
      component_key: "entity-engine",
      title: "Entity Engine",
      registry: "core",
      files_count: 8,
    },
    {
      component_key: "platform-modal",
      title: "Platform Modal",
      registry: "components",
      files_count: 4,
    },
  ];

  it("maps diff elements to display rows", () => {
    const rows = mapDiffElementsToRows(elements);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].registryLabel, "Ядро");
  });

  it("counts selected files", () => {
    assert.equal(countSelectedFiles(elements, ["entity-engine", "platform-modal"]), 12);
    assert.equal(countSelectedFiles(elements, []), 0);
  });

  it("blocks create without compare selection", () => {
    assert.equal(canCreateReleaseFromDiff({ has_changes: true, changed_files: 2 }, []), false);
    assert.equal(canCreateReleaseFromDiff({ has_changes: false }, ["entity-engine"]), false);
    assert.equal(canCreateReleaseFromDiff({ has_changes: true }, ["entity-engine"]), true);
  });
});
