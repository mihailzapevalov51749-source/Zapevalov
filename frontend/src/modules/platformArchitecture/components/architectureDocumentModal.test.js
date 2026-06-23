import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("architecture registry document api uses registry key endpoint", () => {
  const apiSource = readFileSync(
    join(__dirname, "../api/platformArchitectureApi.js"),
    "utf8",
  );

  assert.match(apiSource, /fetchArchitectureRegistryDocument/);
  assert.match(apiSource, /\/dev\/architecture\/registries\/\$\{encodeURIComponent\(registryKey\)\}\/document/);
});

test("architecture document modal shows source path and updated metadata", () => {
  const modalSource = readFileSync(join(__dirname, "ArchitectureDocumentModal.jsx"), "utf8");

  assert.match(modalSource, /PlatformModal/);
  assert.match(modalSource, /documentData\?\.document_path/);
  assert.match(modalSource, /documentData\?\.updated_at/);
  assert.match(modalSource, /registryLabel/);
  assert.match(modalSource, /platform-architecture__document-content/);
});
