import { describe, expect, it } from "vitest";

import { attachUserViewMeta, reapplyUserViewMeta } from "./objectTableUserViewsStorage.js";

describe("reapplyUserViewMeta", () => {
  it("restores isUserView and userViewId after normalize strips them", () => {
    const source = attachUserViewMeta(
      {
        key: "my_tasks",
        name: "Мои задачи",
        meta: {},
      },
      { userViewId: "uv-test-1" },
    );

    const normalized = {
      key: "my_tasks",
      name: "Мои задачи",
      meta: {
        isUserView: false,
        isSystem: false,
        viewId: "uv-test-1",
        userViewId: null,
      },
    };

    const restored = reapplyUserViewMeta(normalized, source);

    expect(restored.meta.isUserView).toBe(true);
    expect(restored.meta.userViewId).toBe("uv-test-1");
    expect(restored.meta.viewId).toBeNull();
  });
});
