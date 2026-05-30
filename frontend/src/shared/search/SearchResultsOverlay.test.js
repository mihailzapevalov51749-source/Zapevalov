import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const overlaySource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "SearchResultsOverlay.jsx"),
  "utf8",
);
const anchorSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useSearchInputAnchor.js"),
  "utf8",
);
const workspaceTopBarSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../portal/components/WorkspaceTopBar.jsx",
  ),
  "utf8",
);
const headerRendererSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../shell/header/components/AppHeaderRenderer.jsx",
  ),
  "utf8",
);

describe("SearchResultsOverlay contract", () => {
  it("returns null when overlay is not visible", () => {
    assert.match(overlaySource, /if \(!isVisible\) \{\s*\n\s*return null;/);
  });

  it("anchors dropdown under header search input", () => {
    assert.match(overlaySource, /useSearchInputAnchor\(isVisible\)/);
    assert.match(anchorSource, /\.app-header-renderer__search/);
    assert.match(overlaySource, /anchorRect\.top/);
    assert.match(overlaySource, /anchorRect\.left/);
    assert.match(overlaySource, /anchorRect\.width/);
  });

  it("shows loading and empty states", () => {
    assert.match(overlaySource, /Поиск\.\.\./);
    assert.match(overlaySource, /Ничего не найдено/);
  });

  it("navigates and closes on result click", () => {
    assert.match(overlaySource, /navigate\(result\.path\)/);
    assert.match(overlaySource, /onClose\?\.\(\)/);
  });

  it("closes on Escape key", () => {
    assert.match(overlaySource, /event\.key === "Escape"/);
    assert.match(overlaySource, /event\.preventDefault\(\)/);
  });
});

describe("Enter and live search wiring", () => {
  it("routes Enter to open-first action", () => {
    assert.match(headerRendererSource, /search-open-first/);
    assert.match(headerRendererSource, /event\.preventDefault\(\)/);
  });

  it("navigates first result on Enter when path exists", () => {
    assert.match(workspaceTopBarSource, /case "search-open-first"/);
    assert.match(workspaceTopBarSource, /onOpenFirstResult\?\.\(\)/);
    assert.match(workspaceTopBarSource, /navigate\(firstPath\)/);
    assert.match(workspaceTopBarSource, /onCloseSearchResults\?\.\(\)/);
  });

  it("routes search-change to onQueryChange", () => {
    assert.match(workspaceTopBarSource, /onQueryChange\?\.\(String\(payload\?\.value/);
  });
});
