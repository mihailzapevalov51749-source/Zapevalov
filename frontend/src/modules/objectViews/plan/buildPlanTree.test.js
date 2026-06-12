import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildPlanTree } from "./buildPlanTree.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    statusFieldKey: overrides.statusFieldKey ?? null,
    statusField: overrides.statusField ?? null,
    ...overrides,
  };
}

function entity(id, title) {
  return { id, entity_id: id, title, values: { title } };
}

describe("buildPlanTree", () => {
  it("shows orphan records as root nodes when no relation instances exist", () => {
    const items = [entity("e1", "Движок действий")];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    assert.equal(tree.roots.length, 1);
    assert.equal(tree.roots[0]?.title, "Движок действий");
    assert.equal(tree.roots[0]?.children?.length, 0);
  });

  it("nests child under parent via relation instances (source=parent, target=child)", () => {
    const items = [
      entity("parent", "Движок действий"),
      entity("child", "Кнопки действий"),
    ];

    const tree = buildPlanTree({
      items,
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

    assert.equal(tree.roots.length, 1);
    assert.equal(tree.roots[0]?.id, "parent");
    assert.equal(tree.roots[0]?.children?.length, 1);
    assert.equal(tree.roots[0]?.children[0]?.id, "child");
  });

  it("shows linked tree and separate orphan roots", () => {
    const items = [
      entity("parent", "Движок действий"),
      entity("child", "Кнопки действий"),
      entity("orphan", "Права доступа"),
    ];

    const tree = buildPlanTree({
      items,
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

    assert.equal(tree.roots.length, 2);
    const rootIds = tree.roots.map((node) => node.id).sort();
    assert.deepEqual(rootIds, ["orphan", "parent"]);
  });

  it("returns empty roots when no items and no instances", () => {
    const tree = buildPlanTree({
      items: [],
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    assert.equal(tree.roots.length, 0);
  });

  it("rolls up parent status category from children without replacing own status label", () => {
    const items = [
      { id: "parent", values: { title: "Parent", status: "Завершено" } },
      { id: "child", values: { title: "Child", status: "Просрочено" } },
    ];

    const tree = buildPlanTree({
      items,
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

    assert.equal(tree.roots[0]?.statusCategory, "overdue");
    assert.equal(tree.roots[0]?.statusLabel, "Завершено");
    assert.equal(tree.roots[0]?.ownStatusLabel, "Завершено");
    assert.equal(tree.roots[0]?.rollupStatusCategory, "overdue");
    assert.equal(tree.roots[0]?.readiness, 0);
  });

  it("resolves raw option key to display label via field settings", () => {
    const items = [
      {
        id: "child",
        values: { title: "Кнопки действий", status: "option_1780780345" },
      },
    ];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions({ statusFieldKey: "status", statusField: STATUS_FIELD }),
    });

    assert.equal(tree.roots[0]?.statusLabel, "Не начато");
    assert.equal(tree.roots[0]?.statusColor, "#94A3B8");
  });

  it("keeps parent own status label when child has different status", () => {
    const items = [
      {
        id: "parent",
        values: { title: "Движок действий", status: "option_active" },
      },
      {
        id: "child",
        values: { title: "Кнопки действий", status: "option_not_started" },
      },
    ];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: "parent",
          target_entity_id: "child",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions({ statusFieldKey: "status", statusField: STATUS_FIELD }),
    });

    assert.equal(tree.roots[0]?.statusLabel, "Активное");
    assert.equal(tree.roots[0]?.children[0]?.statusLabel, "Не начато");
    assert.equal(tree.roots[0]?.rollupStatusCategory, "not_started");
  });

  it("ignores self-parent relation instances", () => {
    const items = [entity("node-a", "Node A")];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: "node-a",
          target_entity_id: "node-a",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    assert.equal(tree.roots.length, 1);
    assert.equal(tree.roots[0]?.id, "node-a");
    assert.equal(tree.hasCycle, false);
  });

  it("detects cycle A -> B -> A without stack overflow", () => {
    const items = [entity("a", "A"), entity("b", "B")];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: "a",
          target_entity_id: "b",
        },
        {
          relation_key: "podpunkt",
          source_entity_id: "b",
          target_entity_id: "a",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    assert.equal(tree.hasCycle, true);
    assert.ok(tree.roots.length >= 1);
    const cycleNode = [...tree.nodesById.values()].find((node) => node.cycleDetected);
    assert.ok(cycleNode);
  });

  it("detects cycle A -> B -> C -> A without stack overflow", () => {
    const items = [entity("a", "A"), entity("b", "B"), entity("c", "C")];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [
        { relation_key: "podpunkt", source_entity_id: "a", target_entity_id: "b" },
        { relation_key: "podpunkt", source_entity_id: "b", target_entity_id: "c" },
        { relation_key: "podpunkt", source_entity_id: "c", target_entity_id: "a" },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    assert.equal(tree.hasCycle, true);
    assert.ok(tree.roots.length >= 1);
  });

  it("does not render system root anchor as a user node", () => {
    const anchorId = "anchor-1";
    const items = [
      {
        id: anchorId,
        is_system: true,
        values: { title: "__plan_tree_root__#podpunkt" },
      },
      entity("child", "Child"),
    ];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: anchorId,
          target_entity_id: "child",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      rootAnchorId: anchorId,
      ...buildTreeOptions(),
    });

    assert.equal(tree.roots.length, 1);
    assert.equal(tree.roots[0]?.id, "child");
    assert.equal(tree.nodesById.has(anchorId), false);
  });

  it("drops system-to-system hierarchy edges and does not crash", () => {
    const anchorA = "anchor-a";
    const anchorB = "anchor-b";

    const tree = buildPlanTree({
      items: [],
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: anchorA,
          target_entity_id: anchorB,
        },
        {
          relation_key: "podpunkt",
          source_entity_id: anchorB,
          target_entity_id: anchorA,
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      rootAnchorId: anchorA,
      ...buildTreeOptions(),
    });

    assert.equal(tree.roots.length, 0);
    assert.equal(tree.hasCycle, false);
  });

  it("falls back to raw value when field definition is absent", () => {
    const items = [
      {
        id: "child",
        values: { title: "Кнопки действий", status: "option_1780780345" },
      },
    ];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      titleFieldKey: "title",
      statusFieldKey: "status",
    });

    assert.equal(tree.roots[0]?.statusLabel, "option_1780780345");
  });

  it("orders siblings by relation instance created_at ascending", () => {
    const items = [
      entity("parent", "Parent"),
      entity("first", "First"),
      entity("second", "Second"),
    ];

    const tree = buildPlanTree({
      items,
      hierarchyInstances: [
        {
          relation_key: "podpunkt",
          source_entity_id: "parent",
          target_entity_id: "second",
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          relation_key: "podpunkt",
          source_entity_id: "parent",
          target_entity_id: "first",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      catalog: CATALOG,
      planPresentation: PRESENTATION,
      ...buildTreeOptions(),
    });

    assert.deepEqual(
      tree.roots[0]?.children?.map((node) => node.id),
      ["first", "second"],
    );
  });
});

describe("Plan empty state contract", () => {
  it("ObjectPlanView keeps plan shell and root create when data is empty", () => {
    const source = readFileSync(join(__dirname, "ObjectPlanView.jsx"), "utf8");

    assert.match(source, /planEntityCount === 0/);
    assert.match(source, /handleCreateRootRecord/);
    assert.match(source, /openCreateCard/);
    assert.doesNotMatch(source, /PlanViewDataEmptyState/);
  });

  it("ObjectPlanView waits for hierarchy entity hydration before rendering tree", () => {
    const source = readFileSync(join(__dirname, "ObjectPlanView.jsx"), "utf8");

    assert.match(source, /relationsLoading \|\| loading/);
  });
});
