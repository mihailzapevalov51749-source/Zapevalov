import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findMessageElement,
  resolveMessageScrollIntent,
  scrollAssistantMessageToStart,
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

describe("findMessageElement", () => {
  it("returns the last matching node when several share the same id", () => {
    const first = { id: "first" };
    const last = { id: "last" };
    const container = {
      querySelectorAll: (selector) => {
        assert.match(selector, /yasii-3/);
        return [first, last];
      },
    };

    assert.equal(findMessageElement(container, "yasii-3"), last);
  });

  it("returns null when message is missing", () => {
    const container = { querySelectorAll: () => [] };
    assert.equal(findMessageElement(container, "missing"), null);
  });
});

describe("scrollAssistantMessageToStart", () => {
  it("aligns message top with container viewport top", () => {
    const message = {
      getBoundingClientRect: () => ({ top: 280 }),
    };
    const container = {
      contains: () => true,
      getBoundingClientRect: () => ({ top: 120 }),
      scrollTop: 40,
    };

    scrollAssistantMessageToStart(container, message);
    assert.equal(container.scrollTop, 200);
  });

  it("does not scroll when message is outside container", () => {
    const container = {
      contains: () => false,
      scrollTop: 10,
    };

    scrollAssistantMessageToStart(container, { getBoundingClientRect: () => ({ top: 0 }) });
    assert.equal(container.scrollTop, 10);
  });
});
