import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyChatReadLocally,
  buildUnreadByChatId,
  getChatUnreadCount,
  getLatestMessageId,
  mergeChatPollingFields,
  mergeIncomingChatList,
  sumChatUnreadCounts,
  upsertChatInUnreadList,
} from "./chatUnreadUtils.js";

describe("chatUnreadUtils", () => {
  test("sumChatUnreadCounts aggregates unread across chats", () => {
    const total = sumChatUnreadCounts([
      { id: 1, unread_count: 2 },
      { id: 2, unreadCount: 5 },
      { id: 3, unread_count: 1 },
    ]);

    assert.equal(total, 8);
  });

  test("applyChatReadLocally resets only selected chat", () => {
    const next = applyChatReadLocally(
      [
        { id: 1, unread_count: 5 },
        { id: 2, unread_count: 3 },
      ],
      1,
    );

    assert.equal(getChatUnreadCount(next[0]), 0);
    assert.equal(getChatUnreadCount(next[1]), 3);
    assert.equal(sumChatUnreadCounts(next), 3);
  });

  test("buildUnreadByChatId maps chat ids to unread counts", () => {
    const map = buildUnreadByChatId([
      { id: 10, unread_count: 4 },
      { id: 11, unread_count: 0 },
    ]);

    assert.deepEqual(map, {
      10: 4,
      11: 0,
    });
  });

  test("upsertChatInUnreadList inserts and updates chats", () => {
    const inserted = upsertChatInUnreadList([], { id: 5, unread_count: 2 });
    assert.equal(inserted.length, 1);

    const updated = upsertChatInUnreadList(inserted, {
      id: 5,
      unread_count: 7,
      title: "Updated",
    });

    assert.equal(updated.length, 1);
    assert.equal(updated[0].title, "Updated");
    assert.equal(getChatUnreadCount(updated[0]), 7);
  });

  test("getLatestMessageId returns max message id", () => {
    const latestId = getLatestMessageId([
      { id: 3 },
      { id: 12 },
      { id: 7 },
    ]);

    assert.equal(latestId, 12);
  });

  test("background unread refresh does not replace unchanged chat objects", () => {
    const existingChat = {
      id: 1,
      title: "Alice",
      unread_count: 2,
      updated_at: "2026-06-13T10:00:00.000Z",
      last_message: { id: 10, content: "Hi", created_at: "2026-06-13T10:00:00.000Z" },
    };

    const merged = mergeIncomingChatList([existingChat], [
      {
        id: 1,
        title: "Alice",
        unread_count: 2,
        updated_at: "2026-06-13T10:00:00.000Z",
        last_message: { id: 10, content: "Hi", created_at: "2026-06-13T10:00:00.000Z" },
      },
    ]);

    assert.equal(merged[0], existingChat);
  });

  test("background unread refresh preserves chat order when timestamps unchanged", () => {
    const chatA = {
      id: 1,
      unread_count: 1,
      updated_at: "2026-06-13T10:00:00.000Z",
      last_message: { id: 10, content: "A", created_at: "2026-06-13T10:00:00.000Z" },
    };
    const chatB = {
      id: 2,
      unread_count: 0,
      updated_at: "2026-06-13T09:00:00.000Z",
      last_message: { id: 9, content: "B", created_at: "2026-06-13T09:00:00.000Z" },
    };

    const merged = mergeIncomingChatList([chatA, chatB], [
      {
        id: 2,
        unread_count: 0,
        updated_at: "2026-06-13T09:00:00.000Z",
        last_message: { id: 9, content: "B", created_at: "2026-06-13T09:00:00.000Z" },
      },
      {
        id: 1,
        unread_count: 3,
        updated_at: "2026-06-13T10:00:00.000Z",
        last_message: { id: 10, content: "A", created_at: "2026-06-13T10:00:00.000Z" },
      },
    ]);

    assert.deepEqual(
      merged.map((chat) => chat.id),
      [1, 2],
    );
    assert.equal(getChatUnreadCount(merged[0]), 3);
  });

  test("mergeChatPollingFields updates unread without replacing unchanged chats", () => {
    const existingChat = {
      id: 5,
      title: "Team",
      unread_count: 1,
      updated_at: "2026-06-13T10:00:00.000Z",
      last_message: { id: 11, content: "Ping", created_at: "2026-06-13T10:00:00.000Z" },
    };

    const merged = mergeChatPollingFields(existingChat, {
      id: 5,
      title: "Team",
      unread_count: 0,
      updated_at: "2026-06-13T10:00:00.000Z",
      last_message: { id: 11, content: "Ping", created_at: "2026-06-13T10:00:00.000Z" },
    });

    assert.notEqual(merged, existingChat);
    assert.equal(getChatUnreadCount(merged), 0);
  });
});
