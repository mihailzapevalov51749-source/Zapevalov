import assert from "node:assert/strict";
import test from "node:test";

import {
  isChatCreator,
  isGroupChat,
  resolveChatCreatorId,
} from "./chatAccessUtils.js";

test("isChatCreator matches created_by_id with string/number ids", () => {
  assert.equal(
    isChatCreator({ type: "group", created_by_id: 12 }, { id: 12 }),
    true,
  );
  assert.equal(
    isChatCreator({ type: "group", created_by_id: "12" }, { id: 12 }),
    true,
  );
  assert.equal(
    isChatCreator({ type: "group", created_by_id: 12 }, { id: 99 }),
    false,
  );
});

test("resolveChatCreatorId supports nested created_by", () => {
  assert.equal(resolveChatCreatorId({ created_by: { id: 7 } }), 7);
  assert.equal(resolveChatCreatorId({ createdById: 8 }), 8);
  assert.equal(resolveChatCreatorId({}), null);
});

test("isGroupChat detects group chats", () => {
  assert.equal(isGroupChat({ type: "group" }), true);
  assert.equal(isGroupChat({ type: "direct" }), false);
});
