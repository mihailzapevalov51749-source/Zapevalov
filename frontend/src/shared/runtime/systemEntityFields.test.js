import { describe, expect, it } from "vitest";

import { orderUserThenSystemFieldKeys } from "./systemEntityFields";

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
});
