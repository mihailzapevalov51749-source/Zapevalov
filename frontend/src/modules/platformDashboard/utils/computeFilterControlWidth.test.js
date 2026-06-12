import assert from "node:assert/strict";
import test from "node:test";

import {
  computeDateFilterWidth,
  computeFixedDateFilterWidth,
  computeSelectWidth,
  getMaxLabelWidth,
  MAX_DATE_RANGE_LABEL,
} from "./computeFilterControlWidth.js";

test("computeSelectWidth grows with longer option labels", () => {
  const narrow = computeSelectWidth(["Все", "Pages"]);
  const wide = computeSelectWidth([
    "Все",
    "Изменение рабочего пространства",
    "Создание владельца платформы",
  ]);

  assert.ok(wide > narrow);
});

test("computeDateFilterWidth grows for date range label", () => {
  const single = computeDateFilterWidth("10.06.2026", true);
  const range = computeDateFilterWidth("10.06.2026 — 11.06.2026", true);
  const empty = computeDateFilterWidth("", false);

  assert.ok(range > single);
  assert.ok(single > empty);
});

test("computeFixedDateFilterWidth uses the widest date range label", () => {
  const fixed = computeFixedDateFilterWidth();
  const maxRange = computeDateFilterWidth(MAX_DATE_RANGE_LABEL, true);
  const single = computeDateFilterWidth("10.06.2026", true);

  assert.equal(fixed, maxRange);
  assert.ok(fixed > single);
});

test("getMaxLabelWidth uses longest label", () => {
  const width = getMaxLabelWidth(["A", "Изменение рабочего пространства", "B"]);
  const longest = getMaxLabelWidth(["Изменение рабочего пространства"]);

  assert.equal(width, longest);
});
