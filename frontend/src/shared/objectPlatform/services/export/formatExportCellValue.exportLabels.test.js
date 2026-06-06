import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { normalizeChoiceValue } from "../../../fieldTypes/choice/choiceUtils.js";

const formatSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "formatExportCellValue.js"),
  "utf8",
);

const choiceColumn = {
  key: "priority",
  type: "choice",
  fieldDef: {
    key: "priority",
    type: "choice",
    rawFieldType: "select",
    options: [
      { key: "sredniy", label: "Средний" },
      { key: "vysokiy", label: "Высокий" },
    ],
    settings: {
      options: [
        { key: "sredniy", label: "Средний" },
        { key: "vysokiy", label: "Высокий" },
      ],
    },
  },
};

const statusColumn = {
  key: "status",
  type: "choice",
  fieldDef: {
    key: "status",
    type: "choice",
    rawFieldType: "status",
    options: [
      { key: "v_rabote", label: "В работе" },
      { key: "ne_nachato", label: "Не начато" },
    ],
    settings: {
      options: [
        { key: "v_rabote", label: "В работе" },
        { key: "ne_nachato", label: "Не начато" },
      ],
    },
  },
};

describe("formatExportCellValue choice and status labels", () => {
  it("uses normalizeChoiceValue for choice-like field types", () => {
    assert.match(formatSource, /normalizeChoiceValue\(value, column\)/);
    assert.match(formatSource, /rawType === "status"/);
  });

  it("maps select key to label via fieldDef.options", () => {
    assert.equal(normalizeChoiceValue("sredniy", choiceColumn).label, "Средний");
  });

  it("maps status key to label via fieldDef.options", () => {
    assert.equal(normalizeChoiceValue("v_rabote", statusColumn).label, "В работе");
    assert.equal(normalizeChoiceValue("ne_nachato", statusColumn).label, "Не начато");
  });

  it("supports legacy value/name option shape", () => {
    const legacyColumn = {
      key: "legacy",
      type: "choice",
      fieldDef: {
        type: "choice",
        rawFieldType: "select",
        options: [{ value: "sredniy", name: "Средний" }],
        settings: {
          options: [{ value: "sredniy", name: "Средний" }],
        },
      },
    };

    assert.equal(normalizeChoiceValue("sredniy", legacyColumn).label, "Средний");
  });
});
