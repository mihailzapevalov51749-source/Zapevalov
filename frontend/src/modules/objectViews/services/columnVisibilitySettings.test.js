import { describe, expect, it } from "vitest";

import { buildObjectViewPayload } from "./buildObjectViewPayload";
import { createEmptyObjectViewContract } from "./objectViewContract";
import {
  contractToDisplayProjection,
  resolvePanelColumnOrder,
  resolveVisibleFieldKeys,
} from "./columnPresentationUtils";
import {
  extractTablePresentationFromColumnsSettings,
  filterVisibleColumnKeys,
  hiddenFieldKeysFromColumnsSettings,
  mergeTablePresentationWithColumnsSettings,
} from "./columnVisibilitySettings";
import {
  isObjectViewQueryDirty,
  mergeEffectiveContract,
} from "./mergeEffectiveContract";
import { normalizeObjectViewDefinition } from "./normalizeObjectViewDefinition";
import { TABLE_BASE_STATE_KEY } from "../table/preferences/tableBaseState";
import { userViewRecordToRawView } from "../table/preferences/objectTableUserViewsStorage";

describe("office user view column visibility", () => {
  const projectionKeys = [
    "title",
    "status",
    "created_by",
    "created_at",
    "updated_by",
    "updated_at",
    "id",
  ];

  function buildContract(hiddenFieldKeys = []) {
    return createEmptyObjectViewContract({
      key: "my_tasks",
      name: "Мои задачи",
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

  it("toggle column visibility marks user view dirty", () => {
    const baseline = buildContract([]);
    const effective = mergeEffectiveContract(baseline, {
      hiddenFieldKeys: ["created_by", "created_at", "id"],
    });

    expect(isObjectViewQueryDirty(baseline, effective)).toBe(true);
    expect(effective.presentation.table.hiddenFieldKeys).toEqual([
      "created_by",
      "created_at",
      "id",
    ]);
  });

  it("save sends visible false in payload", () => {
    const contract = buildContract([
      "created_by",
      "created_at",
      "updated_by",
      "updated_at",
      "id",
    ]);
    const payload = buildObjectViewPayload(contract, { mode: "update" });

    const hiddenColumns = payload.settings_json.columns.filter(
      (column) => column.visible === false,
    );

    expect(hiddenColumns.map((column) => column.fieldKey)).toEqual([
      "created_by",
      "created_at",
      "updated_by",
      "updated_at",
      "id",
    ]);
  });

  it("runtime table excludes visible false columns", () => {
    const contract = buildContract(["created_by", "created_at", "id"]);
    const visibleKeys = resolveVisibleFieldKeys(contract);

    expect(visibleKeys).toEqual([
      "__table_row_number",
      "title",
      "status",
      "updated_by",
      "updated_at",
    ]);
  });

  it("hidden columns remain in settings panel order", () => {
    const contract = buildContract(["created_by", "created_at"]);
    const panelOrder = resolvePanelColumnOrder(contract);

    expect(panelOrder[0]).toBe("__table_row_number");
    expect(panelOrder.slice(1)).toEqual(projectionKeys);
    expect(filterVisibleColumnKeys(panelOrder, contract.presentation.table.hiddenFieldKeys)).toEqual(
      ["__table_row_number", "title", "status", "updated_by", "updated_at", "id"],
    );
  });

  it("reload keeps hidden columns hidden from settings_json.columns", () => {
    const contract = buildContract([
      "created_by",
      "created_at",
      "updated_by",
      "updated_at",
      "id",
    ]);
    const payload = buildObjectViewPayload(contract, { mode: "update" });

    const record = {
      id: "uv-vis-1",
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

    expect(loaded.presentation.table.hiddenFieldKeys).toEqual([
      "created_by",
      "created_at",
      "updated_by",
      "updated_at",
      "id",
    ]);

    const visibleAfterReload = resolveVisibleFieldKeys(loaded);
    expect(visibleAfterReload).toEqual(["__table_row_number", "title", "status"]);
  });

  it("All state ignores user view hidden columns", () => {
    const allContract = createEmptyObjectViewContract({
      key: TABLE_BASE_STATE_KEY,
      name: "Все",
      projection: {
        fieldKeys: projectionKeys,
        fieldOrder: projectionKeys,
        titleFieldKey: "title",
      },
      presentation: {
        table: {
          hiddenFieldKeys: [],
          columnOrder: projectionKeys,
          columnWidths: {},
          density: "compact",
        },
        card: null,
      },
    });

    const visibleKeys = resolveVisibleFieldKeys(allContract);
    const projection = contractToDisplayProjection(allContract);

    expect(visibleKeys).toContain("created_by");
    expect(visibleKeys).toContain("id");
    expect(projection?.visible_fields).toContain("created_by");
  });

  it("system fields can be hidden in user view", () => {
    expect(
      hiddenFieldKeysFromColumnsSettings([
        { fieldKey: "created_by", visible: false },
        { fieldKey: "created_at", visible: false },
        { fieldKey: "id", visible: false },
      ]),
    ).toEqual(["created_by", "created_at", "id"]);

    const merged = mergeTablePresentationWithColumnsSettings(
      { columnOrder: ["title", "created_by", "created_at", "id"] },
      {
        columns: [
          { fieldKey: "title", visible: true },
          { fieldKey: "created_by", visible: false },
          { fieldKey: "created_at", visible: false },
          { fieldKey: "id", visible: false },
        ],
      },
    );

    expect(merged.hiddenFieldKeys).toEqual(["created_by", "created_at", "id"]);
  });
});
