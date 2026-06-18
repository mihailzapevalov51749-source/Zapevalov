import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BROWSER_TITLE_FALLBACK,
  BROWSER_TITLE_SEPARATOR,
  buildBrowserTitle,
} from "./buildBrowserTitle.js";

describe("buildBrowserTitle", () => {
  it("joins page title and scope name", () => {
    assert.equal(
      buildBrowserTitle("Главная", "ЯсноПро"),
      `Главная${BROWSER_TITLE_SEPARATOR}ЯсноПро`,
    );
  });

  it("returns scope name only when page title is empty", () => {
    assert.equal(buildBrowserTitle("", "ООО Розетка"), "ООО Розетка");
  });

  it("returns page title only when scope name is empty", () => {
    assert.equal(buildBrowserTitle("Компании", ""), "Компании");
  });

  it("falls back to YasnoPro", () => {
    assert.equal(buildBrowserTitle("", ""), BROWSER_TITLE_FALLBACK);
  });
});
