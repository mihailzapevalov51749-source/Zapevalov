import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const componentsDir = dirname(fileURLToPath(import.meta.url));
const portalHeaderPath = join(
  componentsDir,
  "../../../portal/components/PortalObjectRuntimeHeader.jsx",
);
const topPanelSource = readFileSync(
  join(componentsDir, "ObjectRuntimeTopPanelActions.jsx"),
  "utf8",
);
const portalHeaderSource = readFileSync(portalHeaderPath, "utf8");

describe("ObjectRuntimeTopPanelActions integration", () => {
  it("renders nothing when there are no actions", () => {
    assert.match(topPanelSource, /if \(!actions\.length\) \{\s*return null;/s);
  });

  it("shows error without throwing", () => {
    const hookSource = readFileSync(
      join(componentsDir, "../hooks/usePlacedActions.js"),
      "utf8",
    );

    assert.match(topPanelSource, /object-runtime-top-panel-actions--error/);
    assert.match(topPanelSource, /\{error\}/);
    assert.match(hookSource, /Не удалось загрузить действия/);
  });

  it("is mounted in portal object runtime header", () => {
    assert.match(portalHeaderSource, /ObjectRuntimeTopPanelActions/);
    assert.match(portalHeaderSource, /placementKey="top_panel"/);
  });
});

describe("RuntimeActionButton click behavior", () => {
  it("uses platform notification for unimplemented execution", () => {
    const buttonSource = readFileSync(
      join(componentsDir, "RuntimeActionButton.jsx"),
      "utf8",
    );

    assert.match(buttonSource, /notifyRuntimeActionNotImplemented/);
    assert.match(
      readFileSync(join(componentsDir, "../utils/notifyRuntimeActionNotImplemented.js"), "utf8"),
      /Выполнение действий пока не реализовано/,
    );
  });
});
