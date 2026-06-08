import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CREATE_RECORD_ACTION_TYPE,
  executeCreateRecordActionCore,
} from "./createRecordExecutorCore.js";

const createRecordAction = {
  action_type_key: CREATE_RECORD_ACTION_TYPE,
  key: "create_task",
  name: "Создать задачу",
};

describe("executeCreateRecordAction", () => {
  it("creates record successfully", async () => {
    const calls = [];

    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: createRecordAction,
      formValues: { title: "Новая задача" },
      fields: [{ key: "title", rawFieldType: "text", isRequired: true }],
      buildPayload: () => ({
        values: { title: "Новая задача" },
        fieldErrors: {},
      }),
      createEntity: async (params) => {
        calls.push(["createEntity", params]);
        return { id: "entity-1", values: { title: "Новая задача" } };
      },
      submitRelationLinks: async () => [],
    });

    assert.equal(result.success, true);
    assert.equal(result.entityId, "entity-1");
    assert.deepEqual(calls[0][1], {
      tenantId: 1,
      objectTypeKey: "zadachi",
      values: { title: "Новая задача" },
    });
  });

  it("returns error and keeps modal flow on API failure", async () => {
    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: createRecordAction,
      formValues: { title: "Новая задача" },
      fields: [{ key: "title", rawFieldType: "text", isRequired: true }],
      buildPayload: () => ({
        values: { title: "Новая задача" },
        fieldErrors: {},
      }),
      createEntity: async () => {
        const error = new Error("create failed");
        error.response = { status: 500, data: { detail: "server error" } };
        throw error;
      },
      submitRelationLinks: async () => [],
    });

    assert.equal(result.success, false);
    assert.equal(result.entityId, null);
    assert.equal(result.error, "server error");
  });

  it("uses existing relation link flow after entity create", async () => {
    const calls = [];

    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: createRecordAction,
      formValues: {
        title: "Задача",
        project: "project-1",
      },
      fields: [
        { key: "title", rawFieldType: "text", isRequired: true },
        { key: "project", rawFieldType: "relation", isRequired: false },
      ],
      buildPayload: () => ({
        values: { title: "Задача" },
        fieldErrors: {},
      }),
      createEntity: async () => ({ id: "entity-2" }),
      submitRelationLinks: async (params) => {
        calls.push(["submitRelationLinks", params]);
        return [];
      },
    });

    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1].entityId, "entity-2");
    assert.equal(calls[0][1].fields.length, 2);
  });

  it("creates auto link after record create when source entity id is present", async () => {
    const calls = [];

    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: {
        ...createRecordAction,
        auto_link_enabled: true,
        auto_link_relation_key: "project_tasks",
      },
      sourceEntityId: "project-1",
      formValues: { title: "Задача" },
      fields: [{ key: "title", rawFieldType: "text", isRequired: true }],
      buildPayload: () => ({
        values: { title: "Задача" },
        fieldErrors: {},
      }),
      createEntity: async () => ({ id: "task-1" }),
      submitRelationLinks: async () => [],
      submitAutoLinkRelation: async (params) => {
        calls.push(params);
        return { linked: true, skipped: false };
      },
    });

    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].sourceEntityId, "project-1");
    assert.equal(calls[0].targetEntityId, "task-1");
  });

  it("skips auto link without source entity id and keeps success", async () => {
    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: {
        ...createRecordAction,
        auto_link_enabled: true,
        auto_link_relation_key: "project_tasks",
      },
      sourceEntityId: null,
      formValues: { title: "Задача" },
      fields: [{ key: "title", rawFieldType: "text", isRequired: true }],
      buildPayload: () => ({
        values: { title: "Задача" },
        fieldErrors: {},
      }),
      createEntity: async () => ({ id: "task-1" }),
      submitRelationLinks: async () => [],
      submitAutoLinkRelation: async () => ({ linked: false, skipped: true }),
    });

    assert.equal(result.success, true);
    assert.equal(result.warning, undefined);
  });

  it("returns warning when auto link fails but record remains created", async () => {
    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: {
        ...createRecordAction,
        auto_link_enabled: true,
        auto_link_relation_key: "project_tasks",
      },
      sourceEntityId: "project-1",
      formValues: { title: "Задача" },
      fields: [{ key: "title", rawFieldType: "text", isRequired: true }],
      buildPayload: () => ({
        values: { title: "Задача" },
        fieldErrors: {},
      }),
      createEntity: async () => ({ id: "task-1" }),
      submitRelationLinks: async () => [],
      submitAutoLinkRelation: async () => ({
        linked: false,
        skipped: false,
        warning: "Запись создана, но связь не была создана.",
      }),
    });

    assert.equal(result.success, true);
    assert.equal(result.entityId, "task-1");
    assert.equal(result.warning, "Запись создана, но связь не была создана.");
  });

  it("rejects non create_record actions", async () => {
    const result = await executeCreateRecordActionCore({
      tenantId: 1,
      objectTypeKey: "zadachi",
      action: { action_type_key: "update_record" },
      formValues: {},
      fields: [],
      buildPayload: () => ({ values: {}, fieldErrors: {} }),
      createEntity: async () => {
        throw new Error("should not be called");
      },
      submitRelationLinks: async () => [],
    });

    assert.equal(result.success, false);
    assert.match(String(result.error || ""), /create_record/);
  });
});
