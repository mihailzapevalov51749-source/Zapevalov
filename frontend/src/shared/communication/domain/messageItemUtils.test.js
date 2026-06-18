import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { API_BASE_URL } from "../../../config/apiConfig.js";
import { getMessageAvatarUrl } from "./messageItemUtils.js";

describe("getMessageAvatarUrl", () => {
  it("remaps legacy /files/avatars paths to public /uploads/avatars", () => {
    assert.equal(
      getMessageAvatarUrl({
        author: {
          avatar_url: "/files/avatars/user.png",
        },
      }),
      `${API_BASE_URL}/uploads/avatars/user.png`,
    );
  });
});

describe("MessageAvatar", () => {
  it("applies buildAvatarUrl before rendering img src", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/MessageAvatar.jsx"),
      "utf8",
    );

    assert.match(source, /buildAvatarUrl/);
    assert.match(source, /src=\{resolvedAvatarUrl\}/);
  });
});
