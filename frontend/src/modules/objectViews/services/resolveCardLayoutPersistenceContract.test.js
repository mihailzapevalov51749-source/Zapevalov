import { describe, expect, it } from "vitest";

import { resolveCardLayoutPersistenceContract } from "./resolveCardLayoutPersistenceContract";

describe("resolveCardLayoutPersistenceContract", () => {
  it("uses effective contract when it has viewId", () => {
    const effective = { key: "my_view", meta: { viewId: "42" } };

    expect(
      resolveCardLayoutPersistenceContract({
        effectiveContract: effective,
        isTableBaseStateActive: false,
      }),
    ).toBe(effective);
  });

  it("resolves published default_table when base state is active", () => {
    const published = {
      key: "default_table",
      meta: { viewId: "10", isDefault: true },
    };

    expect(
      resolveCardLayoutPersistenceContract({
        effectiveContract: { key: "__table_all__", meta: { viewId: null } },
        resolvedContract: { key: "__table_all__", meta: { viewId: null } },
        publishedTableViewKey: "default_table",
        isTableBaseStateActive: true,
        viewDefinitions: [{ contract: published }],
      }),
    ).toBe(published);
  });

  it("returns null in base state when no persisted view exists", () => {
    expect(
      resolveCardLayoutPersistenceContract({
        isTableBaseStateActive: true,
        viewDefinitions: [],
      }),
    ).toBeNull();
  });
});
