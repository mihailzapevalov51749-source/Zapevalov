import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createRelationTableValue,
  formatRelationTableDisplayLabel,
  isRelationTableValue,
} from "./relationTableValue.js";

describe("relationTableValue", () => {
  it("marks enriched relation cell values", () => {
    const value = createRelationTableValue({
      items: [{ entity_id: "e1", title: "Проект А" }],
      cardinality: "one",
    });

    assert.equal(isRelationTableValue(value), true);
    assert.equal(isRelationTableValue(null), false);
    assert.equal(isRelationTableValue("text"), false);
  });

  it("formats cardinality one as single title", () => {
    const display = formatRelationTableDisplayLabel([
      { entity_id: "e1", title: "Проект А" },
    ]);

    assert.equal(display.mode, "one");
    assert.equal(display.items[0].title, "Проект А");
  });

  it("formats few many links inline", () => {
    const display = formatRelationTableDisplayLabel([
      { entity_id: "e1", title: "Проект А" },
      { entity_id: "e2", title: "Проект Б" },
    ]);

    assert.equal(display.mode, "many_inline");
    assert.equal(display.items.length, 2);
  });

  it("formats many links as compact overflow", () => {
    const display = formatRelationTableDisplayLabel([
      { entity_id: "e1", title: "Проект А" },
      { entity_id: "e2", title: "Проект Б" },
      { entity_id: "e3", title: "Проект В" },
    ]);

    assert.equal(display.mode, "many_compact");
    assert.equal(display.items[0].title, "Проект А");
    assert.equal(display.overflowCount, 2);
  });
});
