import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveMessageScrollIntent,
  scrollContainerToBottom,
} from "./yasiiChatScroll.js";

describe("resolveMessageScrollIntent", () => {
  it("returns bottom intent when user message is added", () => {
    const messages = [
      { id: "welcome", role: "yasii", text: "Hi" },
      { id: "user-1", role: "user", text: "Question" },
    ];

    assert.deepEqual(resolveMessageScrollIntent(1, messages), { type: "bottom" });
  });

  it("returns assistant-start intent when assistant message is added", () => {
    const messages = [
      { id: "user-1", role: "user", text: "Question" },
      { id: "yasii-1", role: "yasii", text: "Answer" },
    ];

    assert.deepEqual(resolveMessageScrollIntent(1, messages), {
      type: "assistant-start",
      messageId: "yasii-1",
    });
  });

  it("ignores welcome-only growth", () => {
    const messages = [{ id: "yasii-embedded-welcome", role: "yasii", text: "Hi" }];

    assert.equal(resolveMessageScrollIntent(0, messages), null);
  });

  it("returns null when message count is unchanged", () => {
    const messages = [{ id: "user-1", role: "user", text: "Question" }];

    assert.equal(resolveMessageScrollIntent(1, messages), null);
  });
});

describe("scrollContainerToBottom", () => {
  it("sets scrollTop to scrollHeight", () => {
    const container = {
      scrollHeight: 420,
      scrollTop: 0,
    };

    scrollContainerToBottom(container);
    assert.equal(container.scrollTop, 420);
  });
});
