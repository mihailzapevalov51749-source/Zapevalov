import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  computeObjectTypePublishFlags,
  hasUnpublishedObjectTypeChanges,
} from "../../utils/objectTypePublishState.js";

const here = dirname(fileURLToPath(import.meta.url));

function read(relativePath) {
  return readFileSync(resolve(here, relativePath), "utf8");
}

describe("Action Engine publish-state wiring", () => {
  it("passes onSchemaChanged from workspace to ObjectActionsTab", () => {
    const workspaceSource = read("../../pages/ObjectTypeWorkspacePage.jsx");
    const tabSource = read("../tabs/ObjectActionsTab.jsx");

    assert.match(
      workspaceSource,
      /ObjectActionsTab[\s\S]*onSchemaChanged=\{handleSchemaChanged\}/,
    );
    assert.match(tabSource, /onSchemaChanged\s*=\s*null/);
  });

  it("calls onSchemaChanged after action definition save", () => {
    const panelSource = read("./ActionDefinitionPropertiesPanel.jsx");

    assert.match(panelSource, /onSchemaChanged\s*=\s*null/);
    assert.match(panelSource, /await onSchemaChanged\?\.\(\)/);
    assert.match(panelSource, /notifySchemaChangedIfNeeded/);
  });

  it("calls onSchemaChanged after action create", () => {
    const modalSource = read("./CreateActionDefinitionModal.jsx");

    assert.match(modalSource, /onSchemaChanged\s*=\s*null/);
    assert.match(modalSource, /await onSchemaChanged\?\.\(\)/);
  });

  it("calls onSchemaChanged after action delete", () => {
    const tabSource = read("../tabs/ObjectActionsTab.jsx");

    assert.match(
      tabSource,
      /deleteActionDefinition[\s\S]*await onSchemaChanged\?\.\(\)/,
    );
  });

  it("guards async load with loadTokenRef to avoid stale overwrites", () => {
    const panelSource = read("./ActionDefinitionPropertiesPanel.jsx");

    assert.match(panelSource, /loadTokenRef/);
    assert.match(panelSource, /token !== loadTokenRef\.current/);
    assert.match(panelSource, /draftTouchedRef/);
    assert.match(panelSource, /formDraftTouchedRef/);
    assert.match(panelSource, /shouldApplyLoadedDraftState/);
    assert.match(panelSource, /shouldApplyLoadedFormDraftState/);
  });

  it("uses split dirty computation without requiring formDraft", () => {
    const panelSource = read("./ActionDefinitionPropertiesPanel.jsx");
    const stateSource = read("./actionDefinitionPanelState.js");

    assert.match(panelSource, /computeActionDefinitionPanelDirty/);
    assert.doesNotMatch(
      panelSource,
      /if \(!draft \|\| readOnly \|\| !formDraft\)/,
    );
    assert.match(stateSource, /definitionDirty/);
    assert.match(stateSource, /placementDirty/);
    assert.match(stateSource, /formDirty/);
  });
});

describe("Action Engine publish-state lifecycle", () => {
  it("shows unpublished changes when updated_at moves past last_published_at", () => {
    const objectType = {
      updated_at: "2026-06-08T15:00:00.000Z",
      last_published_at: "2026-06-08T12:00:00.000Z",
    };

    assert.equal(hasUnpublishedObjectTypeChanges(objectType), true);

    const flags = computeObjectTypePublishFlags(objectType, {
      catalogVersion: 5,
      hasMenuPlacement: true,
    });

    assert.equal(flags.needsPublish, true);
    assert.equal(flags.publishAction, "update-catalog");
  });

  it("clears unpublished changes after publish sync timestamps", () => {
    const objectType = {
      updated_at: "2026-06-08T12:00:00.000Z",
      last_published_at: "2026-06-08T12:00:00.000Z",
    };

    assert.equal(hasUnpublishedObjectTypeChanges(objectType), false);

    const flags = computeObjectTypePublishFlags(objectType, {
      catalogVersion: 5,
      hasMenuPlacement: true,
    });

    assert.equal(flags.needsPublish, false);
    assert.equal(flags.publishAction, "none");
  });
});
