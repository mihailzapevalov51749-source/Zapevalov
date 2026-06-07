import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "RelationFieldSettings.jsx"),
  "utf8",
);

describe("RelationFieldSettings UX", () => {
  it("offers create relation CTA instead of relations tab hint", () => {
    assert.match(source, /Создать связь/);
    assert.doesNotMatch(source, /Создайте связь на вкладке «Связи»/);
    assert.match(source, /CreateRelationDefinitionModal/);
  });

  it("shows read-only role and cardinality instead of manual selects", () => {
    assert.match(source, /Роль текущего объекта/);
    assert.match(source, /Кардинальность поля/);
    assert.doesNotMatch(source, /Выберите роль/);
    assert.doesNotMatch(source, /Выберите кардинальность/);
  });
});
