import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveRuntimeCalendarPageId,
  resolveRuntimeChatPageId,
} from "./resolveRuntimeNavigationPageId.js";

describe("resolveRuntimeNavigationPageId", () => {
  const navigation = [
    {
      system_key: "runtime.chat",
      page_id: 35,
      children: [],
    },
    {
      system_key: "runtime.calendar",
      page_id: 48,
      children: [],
    },
  ];

  it("resolves chat and calendar page ids by system_key", () => {
    assert.equal(resolveRuntimeChatPageId(navigation), 35);
    assert.equal(resolveRuntimeCalendarPageId(navigation), 48);
  });

  it("walks nested navigation items", () => {
    const nested = [
      {
        children: [
          {
            system_key: "runtime.calendar",
            page_id: 77,
          },
        ],
      },
    ];

    assert.equal(resolveRuntimeCalendarPageId(nested), 77);
  });
});
