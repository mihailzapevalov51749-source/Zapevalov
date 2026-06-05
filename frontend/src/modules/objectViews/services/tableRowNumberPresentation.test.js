import { describe, expect, it } from "vitest";

import { createEmptyObjectViewContract } from "./objectViewContract";
import {
  resolvePanelColumnOrder,
  resolveVisibleFieldKeys,
} from "./columnPresentationUtils";
import {
  TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
  TABLE_ROW_NUMBER_PRESENTATION_LABEL,
} from "../../../shared/runtime/systemEntityFields";
import { projectionToColumns } from "../table/services/adapters/projectionToColumns";

describe("table row number presentation field", () => {
  const projectionKeys = ["title", "status", "created_at"];

  function buildContract(hiddenFieldKeys = []) {
    return createEmptyObjectViewContract({
      key: "my_view",
      name: "Моё представление",
      projection: {
        fieldKeys: projectionKeys,
        fieldOrder: projectionKeys,
        titleFieldKey: "title",
      },
      presentation: {
        table: {
          hiddenFieldKeys,
          columnOrder: projectionKeys,
          columnWidths: {},
          density: "compact",
        },
        card: null,
      },
      meta: {
        isUserView: true,
        isSystem: false,
        isPublished: true,
      },
    });
  }

  it("includes № in panel column order by default", () => {
    const panelOrder = resolvePanelColumnOrder(buildContract());

    expect(panelOrder[0]).toBe(TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY);
    expect(panelOrder).toContain("title");
  });

  it("hides № from runtime table when marked hidden", () => {
    const visibleKeys = resolveVisibleFieldKeys(
      buildContract([TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY]),
    );

    expect(visibleKeys).not.toContain(TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY);
    expect(visibleKeys).toEqual(["title", "status", "created_at"]);
  });

  it("builds presentation column for № in projectionToColumns", () => {
    const columns = projectionToColumns({
      projection: {
        field_order: [TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY, "title"],
        visible_fields: [TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY, "title"],
        title_field: "title",
      },
      fields: [{ key: "title", name: "Название", field_type: "text" }],
      options: {
        titleFieldKey: "title",
        isAllMode: false,
      },
    });

    expect(columns.map((column) => column.key)).toEqual([
      TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
      "title",
    ]);
    expect(columns[0].label).toBe(TABLE_ROW_NUMBER_PRESENTATION_LABEL);
    expect(columns[0].isSystem).toBe(true);
  });
});
