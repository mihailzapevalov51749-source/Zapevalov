import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolveOfficeObjectTabSelectionKey,
} from "./objectTabKeys.js";
import { TABLE_BASE_STATE_KEY } from "../table/preferences/tableBaseState.js";
import { normalizeObjectViewDefinition } from "./normalizeObjectViewDefinition.js";
import { resolvePlanPresentationFromContract } from "../plan/planViewContract.js";

describe("resolveOfficeObjectTabSelectionKey", () => {
  it("maps default_table tab to table base state", () => {
    assert.equal(resolveOfficeObjectTabSelectionKey("default_table"), TABLE_BASE_STATE_KEY);
    assert.equal(resolveOfficeObjectTabSelectionKey(null), TABLE_BASE_STATE_KEY);
  });

  it("keeps custom object tab keys such as architecture plan tab", () => {
    assert.equal(resolveOfficeObjectTabSelectionKey("architecture"), "architecture");
  });
});

describe("office plan published contract", () => {
  it("preserves hierarchyRelationKey from published plan view settings", () => {
    const rawView = {
      key: "architecture",
      name: "Архитектура",
      view_type: "plan",
      settings_json: {
        objectView: {
          schemaVersion: 1,
          key: "architecture",
          viewType: "plan",
          presentation: {
            plan: {
              hierarchyRelationKey: "podpunkt",
              titleFieldKey: "name",
            },
          },
        },
      },
    };

    const contract = normalizeObjectViewDefinition(rawView, {
      viewKey: "architecture",
      isPublished: true,
    });

    const plan = resolvePlanPresentationFromContract(contract);

    assert.equal(contract.viewType, "plan");
    assert.equal(plan.hierarchyRelationKey, "podpunkt");
  });
});
