import { describe, expect, it } from "vitest";

import { buildObjectViewPayload } from "./buildObjectViewPayload";
import { createEmptyObjectViewContract } from "./objectViewContract";
import { resolvePanelColumnOrder } from "./columnPresentationUtils";
import {
  canMoveTableColumn,
  normalizeTableDisplayFieldKeys,
  preserveUserViewColumnOrder,
} from "./tableColumnOrder";
import { normalizeObjectViewDefinition } from "./normalizeObjectViewDefinition";
import { userViewRecordToRawView } from "../table/preferences/objectTableUserViewsStorage";

function buildUserViewContract(columnOrder) {
  const contract = createEmptyObjectViewContract({
    key: "my_tasks",
    name: "Мои задачи",
    projection: {
      fieldKeys: ["title", "status", "description", "finish_date"],
      fieldOrder: columnOrder,
      titleFieldKey: "title",
    },
    presentation: {
      table: {
        hiddenFieldKeys: [],
        columnOrder,
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

  return contract;
}

describe("office user view column order", () => {
  it("office user view reorder column up", () => {
    const order = ["title", "status", "description", "finish_date"];
    const moveOptions = { preserveExactOrder: true };

    expect(
      canMoveTableColumn("description", "up", order, "title", moveOptions),
    ).toBe(true);

    const index = order.indexOf("description");
    const next = [...order];
    next[index] = next[index - 1];
    next[index - 1] = "description";

    expect(next).toEqual(["title", "description", "status", "finish_date"]);
  });

  it("office user view reorder column down", () => {
    const order = ["title", "status", "description", "finish_date"];
    const moveOptions = { preserveExactOrder: true };

    expect(
      canMoveTableColumn("status", "down", order, "title", moveOptions),
    ).toBe(true);

    const index = order.indexOf("status");
    const next = [...order];
    next[index] = next[index + 1];
    next[index + 1] = "status";

    expect(next).toEqual(["title", "description", "status", "finish_date"]);
  });

  it("office user view save column order", () => {
    const columnOrder = ["title", "description", "status", "finish_date"];
    const contract = buildUserViewContract(columnOrder);
    const payload = buildObjectViewPayload(contract, { mode: "update" });

    expect(payload.settings_json.columns.map((item) => item.fieldKey)).toEqual(
      columnOrder,
    );
    expect(payload.settings_json.projection.field_order).toEqual(columnOrder);
    expect(
      payload.settings_json.objectView.presentation.table.columnOrder,
    ).toEqual(columnOrder);
  });

  it("office user view load column order", () => {
    const columnOrder = ["title", "finish_date", "description", "status"];
    const contract = buildUserViewContract(columnOrder);
    const payload = buildObjectViewPayload(contract, { mode: "update" });

    const record = {
      id: "uv-test-1",
      key: "my_tasks",
      name: "Мои задачи",
      isDefault: false,
      isVisible: true,
      settings_json: payload.settings_json,
      filters_json: payload.filters_json,
      layout_json: {},
      visibility_json: {},
    };

    const loaded = normalizeObjectViewDefinition(userViewRecordToRawView(record), {
      viewKey: record.key,
      isPublished: true,
    });

    expect(loaded.presentation.table.columnOrder).toEqual([
      "__table_row_number",
      ...columnOrder,
    ]);
    expect(loaded.projection.fieldOrder).toEqual(columnOrder);
  });

  it("runtime table applies user view column order", () => {
    const columnOrder = ["title", "finish_date", "description", "status"];
    const contract = buildUserViewContract(columnOrder);

    const panelOrder = resolvePanelColumnOrder(contract);
    const visibleOrder = panelOrder.filter(
      (key) => !contract.presentation.table.hiddenFieldKeys.includes(key),
    );

    expect(visibleOrder).toEqual(["__table_row_number", ...columnOrder]);
  });

  it("system all keeps canonical order", () => {
    const allOrder = normalizeTableDisplayFieldKeys(
      ["finish", "title", "description", "record_version", "created_by"],
      {
        titleFieldKey: "title",
        isAllMode: true,
      },
    );

    expect(allOrder[0]).toBe("title");
    expect(allOrder.indexOf("record_version")).toBeGreaterThan(
      allOrder.indexOf("description"),
    );
  });

  it("user A column order does not affect user B", () => {
    const userAOrder = ["title", "description", "status"];
    const userBOrder = ["title", "status", "description"];

    const userA = preserveUserViewColumnOrder(userAOrder, [
      "title",
      "status",
      "description",
    ]);
    const userB = preserveUserViewColumnOrder(userBOrder, [
      "title",
      "status",
      "description",
    ]);

    expect(userA).toEqual(userAOrder);
    expect(userB).toEqual(userBOrder);
    expect(userA).not.toEqual(userB);
  });
});
