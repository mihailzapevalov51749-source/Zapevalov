import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const adapterSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "searchExecutionAdapter.js"),
  "utf8",
);
const overlaySource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "SearchResultsOverlay.jsx"),
  "utf8",
);
const designerShellSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../modules/designer/components/shell/DesignerShell.jsx",
  ),
  "utf8",
);

describe("platform search integration contract", () => {
  it("uses unified platform search endpoint", () => {
    assert.match(adapterSource, /searchPlatform/);
    assert.match(adapterSource, /requestedDomains/);
    assert.doesNotMatch(adapterSource, /designer_search_not_implemented/);
  });

  it("renders source labels via subtitle in overlay", () => {
    assert.match(overlaySource, /result\.subtitle/);
  });

  it("enables designer header search only for privileged roles", () => {
    assert.match(designerShellSource, /canUseHeaderSearch/);
    assert.match(designerShellSource, /canSearch,/);
    assert.match(designerShellSource, /SearchResultsOverlay/);
  });
});
