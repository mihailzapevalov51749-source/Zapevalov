import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

test("ObjectTypeWorkspaceActionsMenu uses portal and minimal actions", () => {
  const source = readFileSync(
    resolve(here, "ObjectTypeWorkspaceActionsMenu.jsx"),
    "utf8",
  );

  assert.match(source, /createPortal/);
  assert.match(source, /designer-object-type-actions-menu__panel/);
  assert.match(source, /Переименовать/);
  assert.match(source, /Дублировать/);
  assert.match(source, /Удалить/);
  assert.doesNotMatch(source, /showManagePublication/);
});

test("ObjectTypeWorkspacePage wires delete confirm modal", () => {
  const source = readFileSync(
    resolve(here, "../../pages/ObjectTypeWorkspacePage.jsx"),
    "utf8",
  );

  assert.match(source, /ObjectTypeDeleteConfirmModal/);
  assert.match(source, /getObjectTypeDeletePreview/);
  assert.match(source, /handleOpenDeleteModal/);
});
