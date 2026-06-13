import { describe, expect, it } from "vitest";

import { getToken, logout, setToken } from "../../api/authApi";
import { deleteNavigationItem } from "../../api/navigationApi";

describe("navigationApi delete auth", () => {
  it("deleteNavigationItem rejects when token is missing", async () => {
    logout();

    await expect(deleteNavigationItem(1, 86)).rejects.toThrow(/авторизац/i);
  });

  it("getToken reads legacy access_token key", () => {
    logout();
    localStorage.setItem("access_token", "legacy-token");

    expect(getToken()).toBe("legacy-token");

    logout();
  });

  it("setToken mirrors token into access_token", () => {
    logout();
    setToken("session-token");

    expect(getToken()).toBe("session-token");
    expect(localStorage.getItem("access_token")).toBe("session-token");

    logout();
  });
});
