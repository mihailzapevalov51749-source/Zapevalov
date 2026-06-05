import { describe, expect, it } from "vitest";

import { TABLE_BASE_STATE_KEY } from "./tableBaseState";
import { mergePublishedAndUserTableViews } from "./mergePublishedAndUserTableViews";

describe("mergePublishedAndUserTableViews default flags", () => {
  const userState = {
    views: [
      {
        id: "uv-1",
        key: "my_tasks",
        name: "Мои задачи",
        isDefault: true,
        settings_json: {},
      },
      {
        id: "uv-2",
        key: "postavlennye",
        name: "Поставленные",
        isDefault: false,
        settings_json: {},
      },
    ],
    defaultViewKey: "my_tasks",
    defaultViewId: "uv-1",
  };

  it("marks only default_view_key as isDefault in merged contracts", () => {
    const merged = mergePublishedAndUserTableViews([], userState);

    const myTasks = merged.find((item) => item.contract.key === "my_tasks");
    const postavlennye = merged.find((item) => item.contract.key === "postavlennye");

    expect(myTasks?.contract?.meta?.isDefault).toBe(true);
    expect(postavlennye?.contract?.meta?.isDefault).toBe(false);
  });

  it("active base state and default user view are independent concepts", () => {
    const activeViewKey = TABLE_BASE_STATE_KEY;
    const merged = mergePublishedAndUserTableViews([], userState);
    const defaultView = merged.find((item) => item.contract.meta?.isDefault);

    expect(activeViewKey).toBe("__table_all__");
    expect(defaultView?.contract?.key).toBe("my_tasks");
    expect(activeViewKey === defaultView?.contract?.key).toBe(false);
  });
});
