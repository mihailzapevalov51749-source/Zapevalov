import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const modalSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "CreateRelationDefinitionModal.jsx"),
  "utf8",
);

const keysSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "createRelationDefinitionModalKeys.js"),
  "utf8",
);

describe("CreateRelationDefinitionModal platform UI", () => {
  it("uses PlatformModal with layout customization and default bounds", () => {
    assert.match(modalSource, /PlatformModal/);
    assert.match(modalSource, /canCustomizeLayout/);
    assert.match(modalSource, /keepFullyVisible/);
    assert.match(modalSource, /CREATE_RELATION_DEFINITION_MODAL_VIEWPORT_INSET/);
    assert.match(modalSource, /CREATE_RELATION_DEFINITION_MODAL_KEY/);
  });

  it("defines product width near 600px", () => {
    assert.match(keysSource, /width:\s*600/);
    assert.match(keysSource, /modal_v2/);
  });

  it("separates footer actions from scrollable body", () => {
    assert.match(modalSource, /designer-create-relation-definition-modal__footer/);
    assert.match(modalSource, /designer-create-relation-definition-modal__body/);
    assert.match(modalSource, /Создать/);
  });

  it("always renders Cancel and Create in footer without conditional hide", () => {
    assert.match(modalSource, /Отмена/);
    assert.match(modalSource, /designer-create-relation-definition-modal__btn-create/);
    assert.doesNotMatch(modalSource, /canSubmit\s*&&/);
  });

  it("allows selecting current object type as relation target (self-relation)", () => {
    assert.doesNotMatch(modalSource, /String\(item\.id\)\s*!==\s*sourceId/);
    assert.match(modalSource, /self-relation/i);
  });

  it("keeps scroll in body and reserves platform footer for actions", () => {
    assert.match(modalSource, /overflow:\s*"hidden"/);
    assert.match(modalSource, /footer=\{/);
    assert.doesNotMatch(modalSource, /designer-create-relation-definition-modal__actions/);
  });

  it("renders reverse_name field when bidirectional is enabled", () => {
    assert.match(modalSource, /Обратное название/);
    assert.match(modalSource, /reverse_name/);
    assert.match(modalSource, /Название связи при просмотре с обратной стороны/);
  });
});
