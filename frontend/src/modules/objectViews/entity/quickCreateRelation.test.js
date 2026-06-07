import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  formatRelationLinkFailuresMessage,
  submitPendingRelationLinksCore,
} from "./submitPendingRelationLinksCore.js";
import {
  normalizeRelationFormValue,
  validateRequiredRelationFormValue,
} from "./relationFormValueUtils.js";

const dir = dirname(fileURLToPath(import.meta.url));

describe("getQuickCreateFields relation support", () => {
  it("maps relation fields for quick create without hard exclusion", () => {
    const quickCreateSource = readFileSync(join(dir, "getQuickCreateFields.js"), "utf8");
    const mapSource = readFileSync(join(dir, "mapFieldForCreateForm.js"), "utf8");

    assert.doesNotMatch(quickCreateSource, /rawType === "relation"/);
    assert.match(quickCreateSource, /mapFieldForCreateForm/);
    assert.match(mapSource, /rawFieldType: "relation"/);
  });
});

describe("buildCreateEntityPayload relation contract", () => {
  it("validates required relation without writing runtime_entity_values", () => {
    const source = readFileSync(join(dir, "buildCreateEntityPayload.js"), "utf8");

    assert.match(source, /validateRequiredRelationFormValue/);
    assert.match(source, /isRelationFieldType\(rawFieldType\)/);
  });
});

describe("relationFormValueUtils", () => {
  it("normalizes one and many selections", () => {
    assert.deepEqual(normalizeRelationFormValue("peer-1"), ["peer-1"]);
    assert.deepEqual(normalizeRelationFormValue(["peer-1", "peer-2", "peer-1"]), [
      "peer-1",
      "peer-2",
    ]);
  });

  it("returns localized required message", () => {
    assert.equal(
      validateRequiredRelationFormValue(
        {
          key: "direction",
          label: "Направление",
          rawFieldType: "relation",
          isRequired: true,
        },
        [],
      ),
      "Поле «Направление» обязательно для заполнения.",
    );
  });
});

describe("submitPendingRelationLinks", () => {
  it("creates one and many relation links via relation-fields API", async () => {
    const calls = [];

    const failures = await submitPendingRelationLinksCore({
      tenantId: 1,
      entityId: "entity-1",
      fields: [
        {
          key: "direction",
          label: "Направление",
          rawFieldType: "relation",
        },
        {
          key: "tags",
          label: "Теги",
          rawFieldType: "relation",
        },
      ],
      formValues: {
        direction: ["peer-1"],
        tags: ["peer-2", "peer-3"],
      },
      createRelationFieldLink: async (tenantId, entityId, fieldKey, payload) => {
        calls.push({ tenantId, entityId, fieldKey, payload });
        return { ok: true };
      },
    });

    assert.deepEqual(calls, [
      {
        tenantId: 1,
        entityId: "entity-1",
        fieldKey: "direction",
        payload: { target_entity_id: "peer-1" },
      },
      {
        tenantId: 1,
        entityId: "entity-1",
        fieldKey: "tags",
        payload: { target_entity_id: "peer-2" },
      },
      {
        tenantId: 1,
        entityId: "entity-1",
        fieldKey: "tags",
        payload: { target_entity_id: "peer-3" },
      },
    ]);
    assert.deepEqual(failures, []);
  });

  it("returns partial failures without throwing", async () => {
    const failures = await submitPendingRelationLinksCore({
      tenantId: 1,
      entityId: "entity-1",
      fields: [
        {
          key: "direction",
          label: "Направление",
          rawFieldType: "relation",
        },
      ],
      formValues: {
        direction: ["peer-1"],
      },
      createRelationFieldLink: async () => {
        throw new Error("link failed");
      },
    });

    assert.equal(failures.length, 1);
    assert.equal(failures[0].fieldLabel, "Направление");
    assert.match(failures[0].message, /link failed/);
    assert.match(
      formatRelationLinkFailuresMessage(failures),
      /Запись создана, но часть связей не была установлена/,
    );
  });
});

describe("QuickCreateRelationField contract", () => {
  it("uses relation peer query and shared cardinality helpers", () => {
    const source = readFileSync(
      join(dir, "../../../shared/fieldEditors/editors/QuickCreateRelationField.jsx"),
      "utf8",
    );

    assert.match(source, /useRelationPeerEntities/);
    assert.match(source, /CreateModePeerSelect/);
    assert.match(source, /\+ Добавить/);
    assert.doesNotMatch(source, /resolveRelationFieldAddLabel/);
    assert.doesNotMatch(source, /emptyLabel=\{placeholder \|\| "Нет связи"\}/);
  });
});

describe("PlatformQuickCreateForm relation contract", () => {
  it("passes createContext into FieldEditor", () => {
    const source = readFileSync(
      join(dir, "../../../shared/quickCreate/PlatformQuickCreateForm.jsx"),
      "utf8",
    );

    assert.match(source, /createContext={createContext}/);
    assert.match(source, /objectTypeKey = null/);
    assert.match(source, /tenantId && objectTypeKey/);
  });
});
