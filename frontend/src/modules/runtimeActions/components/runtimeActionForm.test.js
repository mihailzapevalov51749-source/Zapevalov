import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const componentsDir = dirname(fileURLToPath(import.meta.url));

describe("Runtime Action Form", () => {
  it("uses PlatformModal for runtime action form", () => {
    const source = readFileSync(join(componentsDir, "RuntimeActionFormModal.jsx"), "utf8");

    assert.match(source, /PlatformModal/);
    assert.match(source, /canCustomizeLayout/);
    assert.match(source, /platform-modal-footer/);
    assert.match(source, /FieldEditor/);
  });

  it("opens form when action has published form fields", () => {
    const clickSource = readFileSync(
      join(componentsDir, "../utils/handleRuntimeActionClick.js"),
      "utf8",
    );
    const sessionSource = readFileSync(
      join(componentsDir, "../hooks/useRuntimeActionFormSession.js"),
      "utf8",
    );

    assert.match(clickSource, /action\?\.form\?\.fields/);
    assert.match(clickSource, /openActionForm/);
    assert.match(sessionSource, /executeCreateRecordAction/);
    assert.doesNotMatch(sessionSource, /notifyRuntimeActionExecutionNotImplemented/);
  });

  it("wires top panel and row menu click handlers to form session", () => {
    const topPanelSource = readFileSync(
      join(componentsDir, "ObjectRuntimeTopPanelActions.jsx"),
      "utf8",
    );
    const tableSource = readFileSync(
      join(componentsDir, "../../objectViews/table/ObjectTableView.jsx"),
      "utf8",
    );

    assert.match(topPanelSource, /useRuntimeActionFormSession/);
    assert.match(topPanelSource, /RuntimeActionFormModal/);
    assert.match(tableSource, /onRuntimeActionClick: runtimeActionForm.handleActionClick/);
    assert.match(tableSource, /RuntimeActionFormModal/);
  });
});
