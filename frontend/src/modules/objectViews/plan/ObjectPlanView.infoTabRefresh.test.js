import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import test from "node:test";

const planDir = dirname(fileURLToPath(import.meta.url));

test("Info tab post-save uses background hierarchy refresh before clearing entity patches", () => {
  const source = readFileSync(join(planDir, "ObjectPlanView.jsx"), "utf8");

  const handlerMatch = source.match(
    /const handlePlanFieldEntityUpdated = useCallback\(\s*async \(entityId\) => \{([\s\S]*?)\},\s*\[refreshPlanDataAfterInfoFieldSave\],/,
  );

  assert.ok(
    handlerMatch,
    "handlePlanFieldEntityUpdated must depend on refreshPlanDataAfterInfoFieldSave",
  );

  const handlerBody = handlerMatch[1];
  const refreshIndex = handlerBody.indexOf("await refreshPlanDataAfterInfoFieldSave();");
  const patchIndex = handlerBody.indexOf("setEntityPatches");

  assert.ok(refreshIndex >= 0, "handler must call refreshPlanDataAfterInfoFieldSave");
  assert.ok(patchIndex >= 0, "handler must clear entity patches");
  assert.ok(
    refreshIndex < patchIndex,
    "refreshPlanDataAfterInfoFieldSave must run before clearing patches",
  );
  assert.doesNotMatch(
    handlerBody,
    /refreshPlanData\(/,
    "info tab save must not use full refreshPlanData",
  );
});

test("refreshPlanDataAfterInfoFieldSave reloads query and revalidates tree in background", () => {
  const planViewSource = readFileSync(join(planDir, "ObjectPlanView.jsx"), "utf8");
  const hierarchySource = readFileSync(join(planDir, "usePlanHierarchy.js"), "utf8");

  const refreshMatch = planViewSource.match(
    /const refreshPlanDataAfterInfoFieldSave = useCallback\(async \(\) => \{([\s\S]*?)\}, \[query, reloadHierarchy\]\);/,
  );

  assert.ok(refreshMatch, "refreshPlanDataAfterInfoFieldSave must exist");

  const refreshBody = refreshMatch[1];
  assert.match(refreshBody, /await query\?\.reload\?\.\(\);/);
  assert.match(refreshBody, /await reloadHierarchy\(\{[\s\S]*background:\s*true[\s\S]*invalidateCache:\s*true/);

  assert.match(hierarchySource, /background: Boolean\(options\.background\)/);
});

test("selection guard skips auto-reset while plan tree is loading", () => {
  const source = readFileSync(join(planDir, "ObjectPlanView.jsx"), "utf8");

  assert.match(
    source,
    /useEffect\(\(\) => \{[\s\S]*if \(loading\) \{[\s\S]*return;[\s\S]*\}, \[tree\.roots, tree\.nodesById, selectedNodeId, loading\]\);/,
  );
});

test("refreshPlanData keeps foreground hierarchy reload for structural changes", () => {
  const planViewSource = readFileSync(join(planDir, "ObjectPlanView.jsx"), "utf8");

  const refreshMatch = planViewSource.match(
    /const refreshPlanData = useCallback\(async \(\) => \{([\s\S]*?)\}, \[query, reloadHierarchy\]\);/,
  );

  assert.ok(refreshMatch, "refreshPlanData must reload query and hierarchy");

  const refreshBody = refreshMatch[1];
  const reloadIndex = refreshBody.indexOf("await query?.reload?.();");
  const hierarchyIndex = refreshBody.indexOf("await reloadHierarchy();");

  assert.ok(reloadIndex >= 0, "refreshPlanData must call query.reload");
  assert.ok(hierarchyIndex >= 0, "refreshPlanData must call reloadHierarchy");
  assert.ok(reloadIndex < hierarchyIndex, "query.reload must run before reloadHierarchy");
});
