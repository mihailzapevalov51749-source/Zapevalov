import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveHierarchyChildUiLabels } from "./hierarchyRelationDisplayLabels.js";

describe("hierarchyRelationDisplayLabels", () => {
  it("uses task_subtask defaults for Задачник", () => {
    const labels = resolveHierarchyChildUiLabels({
      key: "task_subtask",
      name: "Подзадача",
      settings_json: { semantic_profile: "task_subtask" },
    });

    assert.equal(labels.groupTitle, "Подзадачи");
    assert.equal(labels.addButtonLabel, "+ Подзадачу");
    assert.equal(labels.unlinkLabel, "Убрать из подзадач");
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
