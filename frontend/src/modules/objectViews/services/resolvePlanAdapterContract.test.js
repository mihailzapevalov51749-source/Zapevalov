import { describe, expect, it } from "vitest";

import { TABLE_BASE_STATE_KEY } from "../table/preferences/tableBaseState";
import { normalizeObjectViewDefinition } from "./normalizeObjectViewDefinition";
import {
  isPlanContractMismatch,
  resolvePlanAdapterContract,
} from "./resolvePlanAdapterContract";

const planRawView = {
  key: "idei_razvitiya",
  name: "План развития",
  view_type: "plan",
  settings_json: {
    projection: {
      visible_fields: ["name"],
      field_order: ["name"],
      title_field: "name",
    },
    objectView: {
      schemaVersion: 1,
      key: "idei_razvitiya",
      viewType: "plan",
      projection: {
        fieldKeys: ["name"],
        fieldOrder: ["name"],
        titleFieldKey: "name",
      },
      presentation: {
        plan: {
          hierarchyRelationKey: "ierarhiya_idey",
        },
      },
    },
  },
};

const tableRawView = {
  key: "default_table",
  name: "Таблица",
  view_type: "table",
  settings_json: {
    projection: {
      visible_fields: [],
      field_order: [],
    },
    objectView: {
      schemaVersion: 1,
      key: "default_table",
      viewType: "table",
      projection: {
        fieldKeys: [],
        fieldOrder: [],
      },
    },
  },
};

function buildTabLookupViews(rawViews) {
  return rawViews.map((raw) => ({
    raw,
    contract: normalizeObjectViewDefinition(raw, {
      viewKey: raw.key,
      isPublished: true,
    }),
  }));
}

describe("resolvePlanAdapterContract", () => {
  it("detects mismatch when plan viewType receives default_table contract", () => {
    const tableContract = normalizeObjectViewDefinition(tableRawView, {
      viewKey: "default_table",
      isPublished: true,
    });

    expect(
      isPlanContractMismatch({
        viewType: "plan",
        objectTabKey: "idei_razvitiya",
        contract: tableContract,
        activeViewKey: TABLE_BASE_STATE_KEY,
      }),
    ).toBe(true);
  });

  it("recovers plan contract from tabLookupViews by objectTabKey", () => {
    const tableContract = normalizeObjectViewDefinition(tableRawView, {
      viewKey: "default_table",
      isPublished: true,
    });
    const tabLookupViews = buildTabLookupViews([tableRawView, planRawView]);

    const result = resolvePlanAdapterContract({
      viewType: "plan",
      objectTabKey: "idei_razvitiya",
      contract: tableContract,
      tabLookupViews,
      activeViewKey: TABLE_BASE_STATE_KEY,
    });

    expect(result.viewType).toBe("plan");
    expect(result.recovered).toBe(true);
    expect(result.contract.key).toBe("idei_razvitiya");
    expect(result.contract.viewType).toBe("plan");
    expect(result.contract.presentation.plan.hierarchyRelationKey).toBe(
      "ierarhiya_idey",
    );
  });

  it("keeps aligned plan contract without recovery", () => {
    const planContract = normalizeObjectViewDefinition(planRawView, {
      viewKey: "idei_razvitiya",
      isPublished: true,
    });
    const tabLookupViews = buildTabLookupViews([planRawView]);

    const result = resolvePlanAdapterContract({
      viewType: "plan",
      objectTabKey: "idei_razvitiya",
      contract: planContract,
      tabLookupViews,
      activeViewKey: "idei_razvitiya",
    });

    expect(result.viewType).toBe("plan");
    expect(result.recovered).toBe(false);
    expect(result.blocked).toBe(false);
    expect(result.contract.presentation.plan.hierarchyRelationKey).toBe(
      "ierarhiya_idey",
    );
  });
});
