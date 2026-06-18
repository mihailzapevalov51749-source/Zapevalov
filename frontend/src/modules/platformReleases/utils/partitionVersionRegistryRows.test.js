import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { partitionVersionRegistryRows } from "./partitionVersionRegistryRows.js";

describe("partitionVersionRegistryRows", () => {
  it("splits contour slots and client fleet", () => {
    const rows = [
      { id: 3, environment_key: "CLIENT", tenant_id: 21, tenant_name: "Розетка" },
      { id: 1, environment_key: "DEV", tenant_id: 1, tenant_name: "Разработка" },
      { id: 2, environment_key: "TEMPLATE", tenant_id: 2, tenant_name: "Эталон", platform_version: "1.0.0" },
      { id: 4, environment_key: "CLIENT", tenant_id: 30, tenant_name: "СДС" },
    ];

    const result = partitionVersionRegistryRows(rows);

    assert.equal(result.contourSlots.length, 2);
    assert.equal(result.contourSlots[0].key, "DEV");
    assert.equal(result.contourSlots[1].key, "TEMPLATE");
    assert.equal(result.contourSlots[1].row?.platform_version, "1.0.0");
    assert.equal(result.clientRows.length, 2);
    assert.equal(result.clientRows[0].tenant_name, "Розетка");
    assert.equal(result.clientRows[1].tenant_name, "СДС");
    assert.equal(result.templateVersion, "1.0.0");
  });

  it("returns empty slots when registry is empty", () => {
    const result = partitionVersionRegistryRows([]);

    assert.equal(result.contourSlots.every((slot) => slot.row === null), true);
    assert.equal(result.clientRows.length, 0);
    assert.equal(result.templateVersion, null);
  });
});
