import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { filterAutoLinkRelations } from "./actionDefinitionPanelState.js";

const componentsDir = dirname(fileURLToPath(import.meta.url));
const formSource = readFileSync(
  join(componentsDir, "ActionDefinitionPropertiesForm.jsx"),
  "utf8",
);
const panelSource = readFileSync(
  join(componentsDir, "ActionDefinitionPropertiesPanel.jsx"),
  "utf8",
);

describe("filterAutoLinkRelations", () => {
  it("returns only relations between source and target object types", () => {
    const relations = [
      {
        id: "rel-1",
        key: "project_tasks",
        name: "Проект → Задачи",
        source_object_type_id: "source-1",
        target_object_type_id: "target-1",
        is_active: true,
      },
      {
        id: "rel-2",
        key: "project_contacts",
        name: "Проект → Контакты",
        source_object_type_id: "source-1",
        target_object_type_id: "other-1",
        is_active: true,
      },
    ];

    const filtered = filterAutoLinkRelations(relations, "source-1", "target-1");

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "rel-1");
  });
});

describe("ActionDefinition auto link UI", () => {
  it("renders auto link section for create_record actions", () => {
    assert.match(formSource, /Связь после создания/);
    assert.match(formSource, /auto_link_enabled/);
    assert.match(formSource, /auto_link_relation_id/);
  });

  it("loads relations and passes filtered options to the form", () => {
    assert.match(panelSource, /listRelations/);
    assert.match(panelSource, /filterAutoLinkRelations/);
    assert.match(panelSource, /auto_link_enabled/);
    assert.match(panelSource, /auto_link_relation_id/);
  });
});
