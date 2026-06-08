import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const componentsDir = dirname(fileURLToPath(import.meta.url));
const rowActionsSource = readFileSync(
  join(componentsDir, "RuntimeRowActions.jsx"),
  "utf8",
);
const rowMenuSource = readFileSync(
  join(componentsDir, "../../../shared/viewEngine/components/ViewEngineRowMenu.jsx"),
  "utf8",
);
const tableViewSource = readFileSync(
  join(componentsDir, "../../objectViews/table/ObjectTableView.jsx"),
  "utf8",
);
const titleChromeSource = readFileSync(
  join(componentsDir, "../../../shared/viewEngine/components/ViewEngineTitleFieldChrome.jsx"),
  "utf8",
);
const cellSource = readFileSync(
  join(componentsDir, "../../../shared/viewEngine/ViewEngineCell.jsx"),
  "utf8",
);
const clickHandlerSource = readFileSync(
  join(componentsDir, "../utils/handleRuntimeRowActionClick.js"),
  "utf8",
);

describe("RuntimeRowActions", () => {
  it("renders nothing when there are no actions", () => {
    assert.match(rowActionsSource, /if \(!Array\.isArray\(actions\) \|\| actions\.length === 0\)/);
    assert.match(rowActionsSource, /return null;/);
  });

  it("uses label_override via resolveRuntimeActionLabel", () => {
    assert.match(rowActionsSource, /resolveRuntimeActionLabel\(action\)/);
  });

  it("uses icon_key via resolveRuntimeActionIcon", () => {
    assert.match(rowActionsSource, /resolveRuntimeActionIcon\(action\)/);
  });

  it("passes runtime context on click without executing", () => {
    assert.match(rowActionsSource, /tenantId/);
    assert.match(rowActionsSource, /objectTypeKey/);
    assert.match(rowActionsSource, /entityId/);
    assert.match(clickHandlerSource, /handleRuntimeActionClick/);
    assert.match(
      readFileSync(
        join(componentsDir, "../utils/notifyRuntimeActionNotImplemented.js"),
        "utf8",
      ),
      /Выполнение действий пока не реализовано/,
    );
  });
});

describe("row_menu integration", () => {
  it("loads row_menu actions once at table level", () => {
    assert.match(tableViewSource, /usePlacedActions\(/);
    assert.match(tableViewSource, /placementKey: "row_menu"/);
    assert.doesNotMatch(rowActionsSource, /usePlacedActions/);
    assert.doesNotMatch(rowMenuSource, /usePlacedActions/);
    assert.doesNotMatch(titleChromeSource, /usePlacedActions/);
    assert.doesNotMatch(cellSource, /usePlacedActions/);
  });

  it("passes shared runtime actions through row renderer context", () => {
    assert.match(tableViewSource, /runtimePlacedActions: runtimeRowMenuActions/);
    assert.match(titleChromeSource, /runtimePlacedActions/);
    assert.match(rowMenuSource, /RuntimeRowActions/);
  });

  it("adds separator only when builtin and runtime actions coexist", () => {
    assert.match(rowMenuSource, /hasBuiltinActions && hasRuntimeActions/);
    assert.match(rowMenuSource, /role="separator"/);
  });

  it("enables row menu when only runtime actions exist", () => {
    assert.match(tableViewSource, /hasRuntimeRowMenuActions/);
    assert.match(titleChromeSource, /hasRuntimePlacedActions/);
    assert.match(titleChromeSource, /showRowMenu/);
  });

  it("passes entityId for future executor context", () => {
    assert.match(cellSource, /entityId=\{row\?\.id/);
    assert.match(rowMenuSource, /runtimeActionContext/);
    assert.match(rowActionsSource, /entityId/);
  });

  it("does not show loading spinner in row menu", () => {
    assert.doesNotMatch(rowMenuSource, /loading/);
    assert.doesNotMatch(rowActionsSource, /loading/);
    assert.doesNotMatch(rowMenuSource, /spinner/);
  });

  it("preserves resolver order without resorting", () => {
    assert.match(rowActionsSource, /actions\.map\(/);
    assert.doesNotMatch(rowActionsSource, /\.sort\(/);
  });
});
