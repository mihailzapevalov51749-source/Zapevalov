import { describe, expect, it } from "vitest";

import { buildPlanTree } from "./buildPlanTree.js";

const CATALOG = {
  relations: [
    {
      key: "podpunkt",
      source_object_type_key: "napravleniya",
      target_object_type_key: "napravleniya",
      settings_json: {},
    },
  ],
};

const PRESENTATION = {
  hierarchyRelationKey: "podpunkt",
};

const STATUS_FIELD = {
  key: "status",
  field_type: "status",
  settings_json: {
    options: [
      { key: "option_1780780345", label: "Не начато", color: "#94A3B8" },
      { key: "option_active", label: "Активное", color: "#3B82F6" },
      { key: "option_not_started", label: "Не начато", color: "#94A3B8" },
    ],
  },
};

function buildTreeOptions(overrides = {}) {
  return {
    titleFieldKey: "title",
    statusFieldKey: overrides.statusFieldKey ?? "status",
    statusField: overrides.statusField ?? STATUS_FIELD,
    ...overrides,
  };
}

describe("buildPlanTree status display", () => {
  it("resolves raw option key to display label via field settings", () => {
    const tree = buildPlanTree({
      items: [
        {
          id: "child",
          values: { title: "Кнопки действий", status: "option_1780780345" },
        },
      ],
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    expect(tree.roots[0]?.statusLabel).toBe("Не начато");
    expect(tree.roots[0]?.statusColor).toBe("#94A3B8");
  });

  it("keeps parent own status label when child has different status", () => {
    const tree = buildPlanTree({
      items: [
        {
          id: "parent",
          values: { title: "Движок действий", status: "option_active" },
        },
        {
          id: "child",
          values: { title: "Кнопки действий", status: "option_not_started" },
        },
      ],
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: "parent",
          target_entity_id: "child",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    expect(tree.roots[0]?.statusLabel).toBe("Активное");
    expect(tree.roots[0]?.children[0]?.statusLabel).toBe("Не начато");
    expect(tree.roots[0]?.rollupStatusCategory).toBe("not_started");
  });

  it("falls back to raw value when field definition is absent", () => {
    const tree = buildPlanTree({
      items: [
        {
          id: "child",
          values: { title: "Кнопки действий", status: "option_1780780345" },
        },
      ],
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      titleFieldKey: "title",
      statusFieldKey: "status",
    });

    expect(tree.roots[0]?.statusLabel).toBe("option_1780780345");
  });

  it("rolls up category without replacing parent own status label", () => {
    const tree = buildPlanTree({
      items: [
        { id: "parent", values: { title: "Parent", status: "Завершено" } },
        { id: "child", values: { title: "Child", status: "Просрочено" } },
      ],
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: "parent",
          target_entity_id: "child",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      titleFieldKey: "title",
      statusFieldKey: "status",
    });

    expect(tree.roots[0]?.statusCategory).toBe("overdue");
    expect(tree.roots[0]?.statusLabel).toBe("Завершено");
    expect(tree.roots[0]?.ownStatusLabel).toBe("Завершено");
    expect(tree.roots[0]?.rollupStatusCategory).toBe("overdue");
  });
});
