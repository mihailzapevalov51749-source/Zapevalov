import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const modalSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "./FileViewerModal.jsx"),
  "utf8",
);
const workspaceSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "./FileViewerWorkspace.jsx"),
  "utf8",
);
const toolbarSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "./FileViewerActionsToolbar.jsx"),
  "utf8",
);
const documentWorkspaceSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../modules/documentLibraries/components/DocumentWorkspaceView.jsx",
  ),
  "utf8",
);

describe("file viewer actions toolbar contract", () => {
  it("uses shared toolbar in modal and workspace", () => {
    assert.match(modalSource, /FileViewerWorkspace/);
    assert.match(workspaceSource, /FileViewerActionsToolbar/);
    assert.match(toolbarSource, /chat\.png/);
    assert.match(toolbarSource, /x\.svg/);
  });

  it("keeps close before comments in toolbar", () => {
    const closeIndex = toolbarSource.indexOf('title="Закрыть"');
    const commentsIndex = toolbarSource.indexOf("Комментарии к документу");
    assert.ok(closeIndex >= 0);
    assert.ok(commentsIndex >= 0);
    assert.ok(closeIndex < commentsIndex);
  });

  it("passes onClose from library document workspace", () => {
    assert.match(documentWorkspaceSource, /onClose={onClose}/);
    assert.match(documentWorkspaceSource, /showClose={typeof onClose === "function"}/);
  });
});
