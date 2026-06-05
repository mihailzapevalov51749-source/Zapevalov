import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveHierarchyChildUiLabels } from "./hierarchyRelationDisplayLabels.js";
import { DEFAULT_HIERARCHY_LABELS } from "./hierarchyLabels.js";

describe("hierarchyRelationDisplayLabels", () => {
  it("uses hierarchy_labels when configured", () => {
    const labels = resolveHierarchyChildUiLabels({
      key: "task_subtask",
      name: "Подзадача",
      settings_json: {
        semantic_profile: "task_subtask",
        hierarchy_labels: {
          child: "Подзадача",
          children: "Подзадачи",
        },
      },
    });

    assert.equal(labels.groupTitle, "Подзадачи");
    assert.equal(labels.addButtonLabel, "+ подзадачу");
  });

  it("falls back to universal labels without task_subtask wording", () => {
    const labels = resolveHierarchyChildUiLabels({
      key: "task_subtask",
      name: "Подзадача",
      settings_json: { semantic_profile: "task_subtask" },
    });

    assert.equal(labels.groupTitle, DEFAULT_HIERARCHY_LABELS.children);
    assert.equal(labels.addButtonLabel, "+ дочернюю запись");
    assert.ok(!labels.groupTitle.includes("Подзадач"));
  });

  it("allows relation metadata overrides for future card settings", () => {
    const labels = resolveHierarchyChildUiLabels(
      {
        key: "document_subdocument",
        name: "Дочерний документ",
        settings_json: {
          ui_group_title: "Дочерние документы",
          ui_add_button_label: "+ Документ",
        },
      },
      { groupTitle: "Из layout" },
    );

    assert.equal(labels.groupTitle, "Из layout");
    assert.equal(labels.addButtonLabel, "+ Документ");
  });
});
