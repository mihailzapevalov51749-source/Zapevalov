import { describe, expect, it } from "vitest";

import { resolveOfficeDefaultViewKey } from "./resolveOfficeDefaultView";

describe("resolveOfficeDefaultViewKey", () => {
  it("prefers default_view_key from API state", () => {
    const key = resolveOfficeDefaultViewKey({
      defaultViewKey: "postavlennye",
      defaultViewId: "uuid-1",
      views: [
        { id: "uuid-1", key: "postavlennye", isDefault: true },
        { id: "uuid-2", key: "my_tasks", isDefault: false },
      ],
    });

    expect(key).toBe("postavlennye");
  });

  it("falls back to default_view_id when key missing", () => {
    const key = resolveOfficeDefaultViewKey({
      defaultViewKey: null,
      defaultViewId: "uuid-2",
      views: [
        { id: "uuid-1", key: "postavlennye", isDefault: false },
        { id: "uuid-2", key: "my_tasks", isDefault: true },
      ],
    });

    expect(key).toBe("my_tasks");
  });

  it("returns null when no default configured", () => {
    const key = resolveOfficeDefaultViewKey({
      defaultViewKey: null,
      defaultViewId: null,
      views: [{ id: "uuid-1", key: "postavlennye", isDefault: false }],
    });

    expect(key).toBeNull();
  });
});
