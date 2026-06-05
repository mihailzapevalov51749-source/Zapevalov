import { describe, expect, it } from "vitest";

import { TABLE_BASE_STATE_KEY } from "../preferences/tableBaseState";
import {
  buildColumnWidthsStorageKey,
  resolveColumnWidthsViewKey,
} from "./objectTableColumnWidthsStorage";

describe("objectTableColumnWidthsStorage", () => {
  it("resolves All mode to stable __table_all__ key", () => {
    expect(resolveColumnWidthsViewKey(TABLE_BASE_STATE_KEY)).toBe("__table_all__");
    expect(resolveColumnWidthsViewKey("default_table")).toBe("__table_all__");
  });

  it("builds scoped storage key with tenant, object type, view and user", () => {
    expect(
      buildColumnWidthsStorageKey({
        tenantId: "t1",
        objectTypeKey: "tasks",
        viewKey: "my_tasks",
        userId: "u1",
      }),
    ).toBe("objectTableColumnWidths:t1:tasks:my_tasks:u1");
  });

  it("builds storage key without user id when unavailable", () => {
    expect(
      buildColumnWidthsStorageKey({
        tenantId: "t1",
        objectTypeKey: "tasks",
        viewKey: "__table_all__",
        userId: "",
      }),
    ).toBe("objectTableColumnWidths:t1:tasks:__table_all__");
  });
});
