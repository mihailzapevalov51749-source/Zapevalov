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

  it("shows inactive-only message and relations management action", () => {
    assert.match(source, /только неактивные связи/);
    assert.match(source, /Управление связями/);
  });
});
