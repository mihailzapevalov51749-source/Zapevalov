import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("architecture registry tabs reuse platform workspace tab classes", () => {
  const source = readFileSync(join(__dirname, "ArchitectureRegistryTabs.jsx"), "utf8");
  const pageSource = readFileSync(
    join(__dirname, "../pages/PlatformArchitecturePage.jsx"),
    "utf8",
  );
  const overviewSource = readFileSync(
    join(__dirname, "ArchitectureRegistryOverview.jsx"),
    "utf8",
  );

  assert.match(source, /workspace-runtime-tabs/);
  assert.match(source, /workspace-runtime-tabs__tab/);
  assert.match(source, /workspaceRuntimeTabsBar\.css/);
  assert.match(source, /platform-architecture__registry-tabs-actions/);
  assert.match(source, /Документ/);
  assert.match(source, /Запустить сканирование/);
  assert.match(source, /designer-btn designer-btn--primary/);
  assert.match(pageSource, /onOpenDocument=\{handleOpenDocument\}/);
  assert.match(pageSource, /fetchArchitectureRegistryDocument/);
  assert.match(pageSource, /ArchitectureDocumentModal/);
  assert.match(pageSource, /onScan=\{handleScan\}/);
  assert.match(pageSource, /scanning=\{scanning\}/);
  assert.doesNotMatch(overviewSource, /Запустить сканирование/);
  assert.doesNotMatch(pageSource, /platform-architecture__header/);
  assert.doesNotMatch(pageSource, /platform-architecture__title/);
  assert.doesNotMatch(pageSource, /Последнее сканирование/);
});

test("architecture scan handler refreshes overview, registry and card", () => {
  const pageSource = readFileSync(
    join(__dirname, "../pages/PlatformArchitecturePage.jsx"),
    "utf8",
  );

  assert.match(pageSource, /runArchitectureScan/);
  assert.match(pageSource, /await loadOverview\(\)/);
  assert.match(pageSource, /await loadRegistryElements\(\)/);
  assert.match(pageSource, /fetchArchitectureComponent/);
  assert.match(pageSource, /setCard\(refreshed\)/);
});
