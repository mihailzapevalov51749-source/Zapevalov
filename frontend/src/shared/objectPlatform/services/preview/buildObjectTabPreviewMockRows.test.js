import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildObjectTabPreviewMockRows } from "./buildObjectTabPreviewMockRows.js";

describe("buildObjectTabPreviewMockRows", () => {
  it("generates seven demo rows with hierarchy children", () => {
    const result = buildObjectTabPreviewMockRows({
      fields: [
        { key: "title", name: "Название", field_type: "text" },
        { key: "status", name: "Статус", field_type: "status", settings_json: { options: [{ label: "Новый", value: "new" }] } },
      ],
      visibleFieldKeys: ["title", "status"],
      titleFieldKey: "title",
      objectTypeName: "Задачник",
      hierarchyEnabled: true,
    });

    assert.equal(result.items.length, 7);
    assert.equal(result.items[0].values.title, "Пример Задачник 1");
    assert.equal(result.items[2].values.title, "Пример подзаписи 2.1");
    assert.equal(result.hierarchyInstances.length, 2);
    assert.equal(result.items[0].record_number, 1);
    assert.equal(result.pagination.has_more, false);
  });
});
