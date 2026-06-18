import assert from "node:assert/strict";
import test from "node:test";

import { applyProfileGeneralSlugSync } from "./profileGeneralSlugSync.js";

test("applyProfileGeneralSlugSync updates publicSlug for platform and tenant when unlocked", () => {
  const previous = {
    platformShortName: "ЯсноПро",
    publicSlug: "yasnopro",
    publicSlugLocked: false,
  };

  const next = applyProfileGeneralSlugSync(
    previous,
    "platformShortName",
    "Ясно Платформа",
  );

  assert.equal(next.publicSlug, "yasno-platforma");
  assert.equal(next.publicSlugLocked, false);
});

test("applyProfileGeneralSlugSync keeps publicSlug when locked", () => {
  const previous = {
    platformShortName: "ЯсноПро",
    publicSlug: "yasnopro",
    publicSlugLocked: true,
  };

  const next = applyProfileGeneralSlugSync(
    previous,
    "platformShortName",
    "Ясно Платформа",
  );

  assert.equal(next.publicSlug, "yasnopro");
});

test("applyProfileGeneralSlugSync locks slug after manual publicSlug edit", () => {
  const previous = {
    publicSlug: "yasnopro",
    publicSlugLocked: false,
  };

  const next = applyProfileGeneralSlugSync(previous, "publicSlug", "custom-slug");

  assert.equal(next.publicSlug, "custom-slug");
  assert.equal(next.publicSlugLocked, true);
});
