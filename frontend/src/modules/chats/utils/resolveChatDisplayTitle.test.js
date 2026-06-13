import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DIRECT_CHAT_FALLBACK_TITLE,
  GROUP_CHAT_FALLBACK_TITLE,
  resolveChatDisplayTitle,
} from "./resolveChatDisplayTitle.js";

describe("resolveChatDisplayTitle", () => {
  const currentUser = { id: 1 };

  test("direct chat title resolves to other participant full_name", () => {
    const title = resolveChatDisplayTitle(
      {
        id: 10,
        type: "direct",
        title: DIRECT_CHAT_FALLBACK_TITLE,
        participants: [
          { user_id: 1, user: { id: 1, full_name: "Current User" } },
          {
            user_id: 2,
            user: { id: 2, full_name: "Николаевич Запевалов", email: "z@example.com" },
          },
        ],
      },
      currentUser,
    );

    assert.equal(title, "Николаевич Запевалов");
  });

  test("direct chat title falls back to other participant email", () => {
    const title = resolveChatDisplayTitle(
      {
        id: 11,
        type: "direct",
        title: DIRECT_CHAT_FALLBACK_TITLE,
        participants: [
          { user_id: 1, user: { id: 1, full_name: "Current User" } },
          { user_id: 2, user: { id: 2, full_name: null, email: "companion@example.com" } },
        ],
      },
      currentUser,
    );

    assert.equal(title, "companion@example.com");
  });

  test('direct chat title falls back to "Личная переписка" if no other participant', () => {
    const title = resolveChatDisplayTitle(
      {
        id: 12,
        type: "direct",
        title: DIRECT_CHAT_FALLBACK_TITLE,
        participants: [{ user_id: 1, user: { id: 1, full_name: "Current User" } }],
      },
      currentUser,
    );

    assert.equal(title, DIRECT_CHAT_FALLBACK_TITLE);
  });

  test("direct chat uses backend-resolved title when participants are absent", () => {
    const title = resolveChatDisplayTitle(
      {
        id: 13,
        type: "direct",
        title: "Николаевич Запевалов",
      },
      currentUser,
    );

    assert.equal(title, "Николаевич Запевалов");
  });

  test("group chat title uses chat.title", () => {
    const title = resolveChatDisplayTitle(
      {
        id: 20,
        type: "group",
        title: "Команда проекта",
      },
      currentUser,
    );

    assert.equal(title, "Команда проекта");
  });

  test('group chat title fallback "Групповой чат"', () => {
    const title = resolveChatDisplayTitle(
      {
        id: 21,
        type: "group",
        title: "",
      },
      currentUser,
    );

    assert.equal(title, GROUP_CHAT_FALLBACK_TITLE);
  });
});
