import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getActiveChatMessageSignature,
  hasActiveChatMessageActivityChanged,
  isMessagesContainerNearBottom,
  mergeChatMessages,
  shouldRefreshActiveChatMessages,
} from "./chatMessageUtils.js";

describe("chatMessageUtils", () => {
  test("background polling updates active chat messages when last_message_at changes", () => {
    const previousChat = {
      id: 1,
      last_message: {
        id: 10,
        content: "Hi",
        created_at: "2026-06-13T10:00:00.000Z",
      },
      updated_at: "2026-06-13T10:00:00.000Z",
    };
    const nextChat = {
      id: 1,
      last_message: {
        id: 11,
        content: "New",
        created_at: "2026-06-13T10:05:00.000Z",
      },
      updated_at: "2026-06-13T10:05:00.000Z",
    };

    assert.equal(hasActiveChatMessageActivityChanged(previousChat, nextChat), true);
    assert.notEqual(
      getActiveChatMessageSignature(previousChat),
      getActiveChatMessageSignature(nextChat),
    );
    assert.equal(
      shouldRefreshActiveChatMessages({
        activeChat: nextChat,
        localMessages: [{ id: 10 }],
      }),
      true,
    );
  });

  test("active chat message list merges new message by id", () => {
    const merged = mergeChatMessages(
      [
        { id: 1, content: "A", created_at: "2026-06-13T10:00:00.000Z" },
        { id: 2, content: "B", created_at: "2026-06-13T10:01:00.000Z" },
      ],
      [
        { id: 2, content: "B edited", created_at: "2026-06-13T10:01:00.000Z" },
        { id: 3, content: "C", created_at: "2026-06-13T10:02:00.000Z" },
      ],
    );

    assert.deepEqual(
      merged.map((message) => message.id),
      [1, 2, 3],
    );
    assert.equal(merged[1].content, "B edited");
  });

  test("active chat does not duplicate messages", () => {
    const merged = mergeChatMessages(
      [{ id: 5, content: "Ping", created_at: "2026-06-13T10:00:00.000Z" }],
      [{ id: 5, content: "Ping", created_at: "2026-06-13T10:00:00.000Z" }],
    );

    assert.equal(merged.length, 1);
  });

  test("inactive chat only updates unread badge and last message preview", () => {
    const activeChat = {
      id: 1,
      last_message: { id: 10, created_at: "2026-06-13T10:00:00.000Z" },
    };
    const inactiveChat = {
      id: 2,
      last_message: { id: 20, created_at: "2026-06-13T10:05:00.000Z" },
    };

    assert.equal(
      shouldRefreshActiveChatMessages({
        activeChat,
        localMessages: [{ id: 10 }],
      }),
      false,
    );
    assert.equal(
      hasActiveChatMessageActivityChanged(activeChat, inactiveChat),
      false,
    );
  });

  test("active chat unread badge clears after messages refresh", () => {
    assert.equal(
      shouldRefreshActiveChatMessages({
        activeChat: {
          id: 1,
          unread_count: 1,
          last_message: { id: 12, created_at: "2026-06-13T10:05:00.000Z" },
        },
        localMessages: [{ id: 11 }],
      }),
      true,
    );
  });

  test("isMessagesContainerNearBottom detects bottom position", () => {
    assert.equal(
      isMessagesContainerNearBottom({
        scrollHeight: 1000,
        scrollTop: 920,
        clientHeight: 80,
      }),
      true,
    );
    assert.equal(
      isMessagesContainerNearBottom({
        scrollHeight: 1000,
        scrollTop: 100,
        clientHeight: 80,
      }),
      false,
    );
  });
});
