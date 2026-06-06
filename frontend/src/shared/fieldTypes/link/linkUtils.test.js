import { describe, expect, it } from "vitest";

import {
  isSafeLinkHref,
  normalizeLinkStorageValue,
  resolveLinkHref,
} from "./linkUtils";

describe("linkUtils", () => {
  it("normalizes bare domain to https href", () => {
    expect(resolveLinkHref("example.com")).toBe("https://example.com");
    expect(resolveLinkHref("www.example.com")).toBe("https://www.example.com");
  });

  it("keeps explicit http/https URLs", () => {
    expect(resolveLinkHref("https://example.com")).toBe("https://example.com");
    expect(resolveLinkHref("http://example.com")).toBe("http://example.com");
  });

  it("blocks dangerous schemes", () => {
    expect(resolveLinkHref("javascript:alert(1)")).toBe("");
    expect(resolveLinkHref("data:text/html,hello")).toBe("");
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
  });

  it("normalizes storage value from string and legacy object", () => {
    expect(normalizeLinkStorageValue(" https://example.com ")).toBe(
      "https://example.com",
    );
    expect(
      normalizeLinkStorageValue({ label: "Docs", url: "https://docs.example.com" }),
    ).toBe("https://docs.example.com");
  });
});
