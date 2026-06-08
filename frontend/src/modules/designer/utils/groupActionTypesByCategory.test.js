import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupActionTypesByCategory } from "./groupActionTypesByCategory.js";

describe("groupActionTypesByCategory", () => {
  it("groups action types under sorted categories", () => {
    const grouped = groupActionTypesByCategory(
      [
        { key: "relations", name: "Связи", sort_order: 20 },
        { key: "crud", name: "CRUD", sort_order: 10 },
      ],
      [
        { key: "delete_relation", name: "Удалить связь", category_key: "relations" },
        { key: "create_record", name: "Создать запись", category_key: "crud" },
        { key: "update_record", name: "Изменить запись", category_key: "crud" },
      ],
    );

    assert.equal(grouped.length, 2);
    assert.equal(grouped[0].category.key, "crud");
    assert.equal(grouped[0].actionTypes.length, 2);
    assert.equal(grouped[1].category.key, "relations");
    assert.equal(grouped[1].actionTypes[0].key, "delete_relation");
  });
});
