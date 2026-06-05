import { describe, expect, it } from "vitest";

import { createEmptyObjectViewContract } from "./objectViewContract";
import {
  getViewIdentity,
  resolveActiveTableView,
} from "./resolveActiveView";
import {
  mergeEffectiveContract,
  isObjectViewQueryDirty,
} from "./mergeEffectiveContract";

describe("office user view UI state", () => {
  const publishedViews = [
    {
      raw: { key: "default_table" },
      contract: createEmptyObjectViewContract({
        key: "default_table",
        name: "Таблица",
      }),
    },
  ];

  const userViews = [
    {
      raw: { key: "my_tasks", settings_json: {} },
      contract: createEmptyObjectViewContract({
        key: "my_tasks",
        name: "Мои задачи",
        meta: { isUserView: true, userViewId: "uv-1" },
        projection: {
          fieldKeys: ["title", "status"],
          fieldOrder: ["title", "status"],
          titleFieldKey: "title",
        },
        presentation: {
          table: {
            hiddenFieldKeys: [],
            columnOrder: ["title", "status"],
            columnWidths: {},
            density: "compact",
          },
          card: null,
        },
      }),
    },
  ];

  it("resolves Office user view from merged views, not published-only list", () => {
    const fromPublishedOnly = resolveActiveTableView(publishedViews, "my_tasks");
    const fromMerged = resolveActiveTableView(
      [...publishedViews, ...userViews],
      "my_tasks",
    );

    expect(fromPublishedOnly?.contract?.key).toBe("default_table");
    expect(fromMerged?.contract?.key).toBe("my_tasks");
    expect(fromMerged?.contract?.meta?.isUserView).toBe(true);
  });

  it("column reorder marks view dirty", () => {
    const baseline = userViews[0].contract;
    const effective = mergeEffectiveContract(baseline, {
      columnOrder: ["status", "title"],
    });

    expect(isObjectViewQueryDirty(baseline, effective)).toBe(true);
    expect(effective.presentation.table.columnOrder).toEqual(["status", "title"]);
    expect(effective.projection.fieldOrder).toEqual(["status", "title"]);
  });

  it("selected user view slot is active by stable key", () => {
    const view = userViews[0];
    const activeViewKey = "my_tasks";

    expect(getViewIdentity(view)).toBe("my_tasks");
    expect(getViewIdentity(view) === activeViewKey).toBe(true);
  });

  it("switching user views updates active slot identity", () => {
    const viewA = userViews[0];
    const viewB = {
      ...userViews[0],
      contract: createEmptyObjectViewContract({
        key: "urgent",
        name: "Срочные",
        meta: { isUserView: true, userViewId: "uv-2" },
      }),
    };

    expect(getViewIdentity(viewA) === "my_tasks").toBe(true);
    expect(getViewIdentity(viewB) === "urgent").toBe(true);
    expect(getViewIdentity(viewA) === getViewIdentity(viewB)).toBe(false);
  });

  it("system all and user views do not both appear active", () => {
    const allKey = "__table_all__";
    const userKey = "my_tasks";

    expect(allKey === userKey).toBe(false);
    expect(getViewIdentity(userViews[0]) === allKey).toBe(false);
    expect(getViewIdentity(userViews[0]) === userKey).toBe(true);
  });
});
