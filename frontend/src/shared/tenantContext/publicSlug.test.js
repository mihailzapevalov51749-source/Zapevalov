import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPublicCompanyUrl, slugifyPublicSlug } from "./publicSlug.js";

describe("publicSlug", () => {
  it("slugifies cyrillic short names with hyphens", () => {
    assert.equal(slugifyPublicSlug("Розетка"), "rozetka");
    assert.equal(slugifyPublicSlug("Розетка СПБ"), "rozetka-spb");
    assert.equal(slugifyPublicSlug("Моя Компания"), "moya-kompaniya");
  });

  it("builds public company url", () => {
    assert.equal(
      buildPublicCompanyUrl("rozetka", { baseUrl: "https://yasnopro.ru" }),
      "https://yasnopro.ru/rozetka",
    );
  });
});
