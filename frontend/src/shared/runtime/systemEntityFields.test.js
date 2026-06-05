import { describe, expect, it } from "vitest";

import {
  excludeTableDedicatedRecordNumberFieldKeys,
  orderUserThenSystemFieldKeys,
  SYSTEM_ENTITY_FIELD_KEYS,
} from "./systemEntityFields";

describe("orderUserThenSystemFieldKeys", () => {
  it("places title first among user fields, then system fields in canonical order", () => {
    const keys = orderUserThenSystemFieldKeys(
      [
        { key: "__system_id", name: "ID", is_system: true },
        { key: "title", name: "Название" },
        { key: "__system_created_by", name: "Создал", is_system: true },
        { key: "priority", name: "Приоритет" },
        { key: "__system_record_version", name: "Версия записи", is_system: true },
        { key: "__system_created_at", name: "Дата создания", is_system: true },
        { key: "__system_updated_by", name: "Изменил", is_system: true },
        { key: "__system_updated_at", name: "Дата изменения", is_system: true },
      ],
      "title",
    );

    expect(keys).toEqual([
      "title",
      "priority",
      "__system_record_version",
      "__system_created_by",
      "__system_created_at",
      "__system_updated_by",
      "__system_updated_at",
      "__system_id",
    ]);
  });

  it("excludes record_number from table projection system field order", () => {
    const keys = orderUserThenSystemFieldKeys(
      [
        { key: "title", name: "Название" },
        {
          key: SYSTEM_ENTITY_FIELD_KEYS.recordNumber,
          name: "№ записи",
          is_system: true,
        },
        { key: SYSTEM_ENTITY_FIELD_KEYS.id, name: "ID", is_system: true },
      ],
      "title",
    );

    expect(keys).not.toContain(SYSTEM_ENTITY_FIELD_KEYS.recordNumber);
    expect(keys).toEqual(["title", SYSTEM_ENTITY_FIELD_KEYS.id]);
  });

  it("excludeTableDedicatedRecordNumberFieldKeys strips legacy and namespaced keys", () => {
    expect(
      excludeTableDedicatedRecordNumberFieldKeys([
        "title",
        "record_number",
        SYSTEM_ENTITY_FIELD_KEYS.recordNumber,
        "status",
      ]),
    ).toEqual(["title", "status"]);
  });
});
