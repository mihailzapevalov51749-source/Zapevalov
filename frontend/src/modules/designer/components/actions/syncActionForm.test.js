import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildActionFormDraft,
  hasActionFormChanges,
  syncActionForm,
} from "./syncActionForm.js";

describe("syncActionForm", () => {
  it("detects form metadata and field changes", () => {
    const objectFields = [
      { id: "field-1", key: "title", name: "Название", sort_order: 10 },
      { id: "field-2", key: "description", name: "Описание", sort_order: 20 },
    ];
    const savedForm = {
      id: "form-1",
      title: "Создать задачу",
      description: null,
      submit_label: "Создать",
      cancel_label: "Отмена",
      fields: [
        {
          id: "ff-1",
          field_definition_id: "field-1",
          required: true,
          sort_order: 10,
        },
      ],
    };

    const draft = buildActionFormDraft(savedForm, objectFields);
    assert.equal(hasActionFormChanges(draft, savedForm, objectFields), false);

    const changedDraft = {
      ...draft,
      fieldsDraft: draft.fieldsDraft.map((field) =>
        field.field_definition_id === "field-2"
          ? { ...field, enabled: true }
          : field,
      ),
    };

    assert.equal(hasActionFormChanges(changedDraft, savedForm, objectFields), true);
  });

  it("creates form and fields through designer API", async () => {
    const calls = [];

    const api = {
      createActionForm: async (...args) => {
        calls.push(["createActionForm", ...args]);
        return {
          id: "form-1",
          title: args[3].title,
          fields: [],
        };
      },
      createActionFormField: async (...args) => {
        calls.push(["createActionFormField", ...args]);
        return { id: "ff-1", ...args[3] };
      },
      getActionForm: async () => ({
        id: "form-1",
        title: "Создать задачу",
        fields: [{ id: "ff-1", field_definition_id: "field-1", required: true, sort_order: 10 }],
      }),
    };

    await syncActionForm({
      tenantId: 1,
      objectTypeId: "object-1",
      actionDefinitionId: "action-1",
      formDraft: {
        enabled: true,
        title: "Создать задачу",
        description: "",
        submit_label: "Создать",
        cancel_label: "Отмена",
        is_active: true,
        fieldsDraft: [
          {
            field_definition_id: "field-1",
            enabled: true,
            required: true,
            sort_order: 10,
          },
        ],
      },
      savedForm: null,
      api,
    });

    assert.equal(calls[0][0], "createActionForm");
    assert.equal(calls[1][0], "createActionFormField");
  });
});
