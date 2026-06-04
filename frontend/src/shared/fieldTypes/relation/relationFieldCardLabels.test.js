import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRelationFieldAddLabel } from "./relationFieldCardLabels.js";

describe("relationField card labels", () => {
  it("uses replace label for cardinality one with existing link", () => {
    assert.equal(
      resolveRelationFieldAddLabel({ cardinality: "one", hasLinks: true }),
      "Заменить связь",
    );
  });

  it("uses add label for empty one field", () => {
    assert.equal(
      resolveRelationFieldAddLabel({ cardinality: "one", hasLinks: false }),
      "Добавить связь",
    );
  });

  it("uses many label always", () => {
    assert.equal(
      resolveRelationFieldAddLabel({ cardinality: "many", hasLinks: true }),
      "+ Добавить связь",
    );
  });
});
