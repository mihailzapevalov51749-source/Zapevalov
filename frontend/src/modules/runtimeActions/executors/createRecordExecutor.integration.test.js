import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const rootDir = dirname(fileURLToPath(import.meta.url));

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

describe("create_record executor integration", () => {
  it("wires session submit to executeCreateRecordAction", () => {
    const sessionSource = read("../hooks/useRuntimeActionFormSession.js");

    assert.match(sessionSource, /executeCreateRecordAction/);
    assert.match(sessionSource, /requestRuntimeEntityDataReload/);
    assert.match(sessionSource, /showPlatformNotification/);
    assert.match(sessionSource, /Запись успешно создана/);
    assert.doesNotMatch(sessionSource, /notifyRuntimeActionExecutionNotImplemented/);
  });

  it("refreshes table through runtime entity reload bridge", () => {
    const tableSource = read("../../objectViews/table/ObjectTableView.jsx");
    const bridgeSource = read(
      "../../../shared/objectPlatform/runtimeEntityDataReloadBridge.js",
    );

    assert.match(bridgeSource, /subscribeRuntimeEntityDataReload/);
    assert.match(bridgeSource, /requestRuntimeEntityDataReload/);
    assert.match(tableSource, /subscribeRuntimeEntityDataReload/);
    assert.match(tableSource, /handleEntityCreated/);
  });

  it("supports top_panel and row_menu through shared form session", () => {
    const topPanelSource = read("../components/ObjectRuntimeTopPanelActions.jsx");
    const tableSource = read("../../objectViews/table/ObjectTableView.jsx");

    assert.match(topPanelSource, /useRuntimeActionFormSession/);
    assert.match(topPanelSource, /submitError=\{runtimeActionForm\.submitError\}/);
    assert.match(tableSource, /useRuntimeActionFormSession/);
    assert.match(tableSource, /onRuntimeActionClick: runtimeActionForm.handleActionClick/);
  });

  it("shows creating state and keeps modal open on submit error", () => {
    const modalSource = read("../components/RuntimeActionFormModal.jsx");
    const sessionSource = read("../hooks/useRuntimeActionFormSession.js");

    assert.match(modalSource, /Создание…/);
    assert.match(modalSource, /submitError/);
    assert.match(sessionSource, /setSubmitError/);
    assert.match(sessionSource, /closeActionForm\(\)/);
  });

  it("uses existing runtime create flow helpers", () => {
    const executorSource = read("./createRecordExecutor.js");

    assert.match(executorSource, /buildCreateEntityPayload/);
    assert.match(executorSource, /executeCreateRecordActionCore/);
    assert.match(executorSource, /runtimeWriteGateway\.createEntity/);
    assert.match(executorSource, /submitPendingRelationLinks/);
    assert.doesNotMatch(executorSource, /action_executor/);
  });
});
