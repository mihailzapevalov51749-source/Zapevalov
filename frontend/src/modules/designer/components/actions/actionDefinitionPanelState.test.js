import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDraftFromAction,
  computeActionDefinitionPanelDirty,
  hasDefinitionChanges,
  reconcileFormDraftWithObjectFields,
  shouldApplyLoadedDraftState,
  shouldApplyLoadedFormDraftState,
} from "./actionDefinitionPanelState.js";
import { buildActionFormDraft } from "./syncActionForm.js";

const baseAction = {
  id: "action-1",
  key: "create_task",
  name: "Создать задачу",
  description: null,
  action_type_key: "create_record",
  is_active: true,
};

describe("actionDefinitionPanelState", () => {
  it("detects definition dirty while form is still loading", () => {
    const draft = buildDraftFromAction(baseAction, []);
    draft.name = "Новое имя";

    assert.equal(
      computeActionDefinitionPanelDirty({
        draft,
        action: baseAction,
        formDraft: null,
        savedForm: null,
        objectFields: [],
        savedPlacementKeys: [],
      }),
      true,
    );
  });

  it("detects placement dirty while form is still loading", () => {
    const draft = buildDraftFromAction(baseAction, ["top_panel"]);

    assert.equal(
      computeActionDefinitionPanelDirty({
        draft,
        action: baseAction,
        formDraft: null,
        savedForm: null,
        objectFields: [],
        savedPlacementKeys: [],
      }),
      true,
    );
  });

  it("detects form metadata dirty when form draft is available", () => {
    const objectFields = [
      { id: "field-1", key: "title", name: "Название", sort_order: 10 },
    ];
    const savedForm = {
      id: "form-1",
      title: "Создать задачу",
      description: null,
      submit_label: "Создать",
      cancel_label: "Отмена",
      fields: [],
    };
    const formDraft = buildActionFormDraft(savedForm, objectFields);
    formDraft.title = "Другой заголовок";

    assert.equal(
      computeActionDefinitionPanelDirty({
        draft: buildDraftFromAction(baseAction, []),
        action: baseAction,
        formDraft,
        savedForm,
        objectFields,
        savedPlacementKeys: [],
      }),
      true,
    );
  });

  it("detects form field dirty state", () => {
    const objectFields = [
      { id: "field-1", key: "title", name: "Название", sort_order: 10 },
      { id: "field-2", key: "description", name: "Описание", sort_order: 20 },
    ];
    const savedForm = {
      id: "form-1",
      title: "Создать задачу",
      fields: [
        {
          id: "ff-1",
          field_definition_id: "field-1",
          required: true,
          sort_order: 10,
        },
      ],
    };
    const formDraft = buildActionFormDraft(savedForm, objectFields);
    const descriptionField = formDraft.fieldsDraft.find(
      (field) => field.field_definition_id === "field-2",
    );
    descriptionField.enabled = true;

    assert.equal(
      computeActionDefinitionPanelDirty({
        draft: buildDraftFromAction(baseAction, []),
        action: baseAction,
        formDraft,
        savedForm,
        objectFields,
        savedPlacementKeys: [],
      }),
      true,
    );
  });

  it("does not apply loaded draft state after user started editing", () => {
    assert.equal(shouldApplyLoadedDraftState(false), true);
    assert.equal(shouldApplyLoadedDraftState(true), false);
  });

  it("does not apply loaded form draft after user started editing", () => {
    assert.equal(shouldApplyLoadedFormDraftState(false), true);
    assert.equal(shouldApplyLoadedFormDraftState(true), false);
  });

  it("clears definition dirty after values match saved action", () => {
    const draft = buildDraftFromAction(baseAction, []);
    assert.equal(hasDefinitionChanges(draft, baseAction), false);
  });

  it("detects target object dirty state", () => {
    const action = {
      ...baseAction,
      target_object_type_id: "source-object-id",
    };
    const draft = buildDraftFromAction(action, []);
    draft.target_object_type_id = "target-object-id";

    assert.equal(hasDefinitionChanges(draft, action), true);
  });

  it("reconciles form draft when target object fields change", () => {
    const formDraft = {
      enabled: true,
      title: "Создать задачу",
      description: "",
      submit_label: "Создать",
      cancel_label: "Отмена",
      is_active: true,
      fieldsDraft: [
        {
          field_definition_id: "field-1",
          field_key: "title",
          field_name: "Название",
          enabled: true,
          required: true,
          sort_order: 10,
          form_field_id: "ff-1",
        },
        {
          field_definition_id: "field-2",
          field_key: "priority",
          field_name: "Приоритет",
          enabled: true,
          required: false,
          sort_order: 20,
          form_field_id: "ff-2",
        },
      ],
    };

    const { formDraft: reconciled, removedEnabledFields } =
      reconcileFormDraftWithObjectFields(formDraft, [
        { id: "field-1", key: "title", name: "Название", sort_order: 10 },
      ]);

    assert.equal(removedEnabledFields, 1);
    assert.equal(
      reconciled.fieldsDraft.find((field) => field.field_definition_id === "field-2")
        ?.enabled,
      false,
    );
  });
});
