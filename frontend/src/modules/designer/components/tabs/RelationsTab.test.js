import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("RelationsTab publish state", () => {
  it("calls onSchemaChanged after relation save", () => {
    const source = readFileSync(resolve(here, "RelationsTab.jsx"), "utf8");
    const workspaceSource = readFileSync(
      resolve(here, "../../pages/ObjectTypeWorkspacePage.jsx"),
      "utf8",
    );

    expect(source).toContain("onSchemaChanged");
    expect(source).toMatch(/await onSchemaChanged\?\.\(\)/);
    expect(workspaceSource).toContain("onSchemaChanged={handleSchemaChanged}");
  });
});

describe("RelationsTab compact layout", () => {
  it("uses compact relation properties grid", () => {
    const formSource = readFileSync(
      resolve(here, "../relations/RelationPropertiesForm.jsx"),
      "utf8",
    );
    const editorSource = readFileSync(
      resolve(here, "../relations/RelationHierarchyLabelsEditor.jsx"),
      "utf8",
    );
    const cssSource = readFileSync(
      resolve(here, "../relations/relationPropertiesPanel.css"),
      "utf8",
    );

    expect(formSource).toContain("designer-relation-form__identity");
    expect(formSource).toContain("designer-relation-form__flags");
    expect(formSource).toContain("RelationHierarchyLabelsEditor");
    expect(editorSource).toContain("designer-relation-hierarchy__parent");
    expect(editorSource).toContain("designer-relation-hierarchy__child-terms");
    expect(editorSource).toContain("designer-relation-hierarchy__inflections");
    expect(editorSource).toContain("вручную");
    expect(editorSource).toContain("авто");
    expect(editorSource).toContain("Поля с меткой «авто»");
    expect(editorSource).toContain("Род. мн.");
    expect(cssSource).toContain("designer-relation-hierarchy__badge--manual");
    expect(cssSource).toContain("designer-relation-hierarchy__badge--auto");
    expect(cssSource).toMatch(/grid-template-columns: repeat\(2, 1fr\)/);
  });
});
