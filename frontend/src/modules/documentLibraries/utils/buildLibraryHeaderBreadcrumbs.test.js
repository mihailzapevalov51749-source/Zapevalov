import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildLibraryHeaderBreadcrumbItems } from "./buildLibraryHeaderBreadcrumbs.js";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "./buildLibraryHeaderBreadcrumbs.js"),
  "utf8",
);

describe("buildLibraryHeaderBreadcrumbItems", () => {
  it("builds library, folder and document breadcrumb chain", () => {
    const items = buildLibraryHeaderBreadcrumbItems({
      libraryTitle: "Архитектура",
      libraryId: 5,
      portalId: 1,
      folderPath: [{ id: 10, title: "Папка" }],
      documentTitle: "Архитектура.docx",
    });

    assert.equal(items.length, 3);
    assert.equal(items[0].label, "Архитектура");
    assert.equal(items[1].label, "Папка");
    assert.equal(items[2].label, "Архитектура.docx");
    assert.equal(items[2].meta.scope, "document-library-document");
  });

  it("exports helper used by runtime library page", () => {
    assert.match(source, /document-library-document/);
  });
});
