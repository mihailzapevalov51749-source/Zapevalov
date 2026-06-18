import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const layoutTokensPath = join(
  frontendRoot,
  "src/shared/layout/layoutTokens.ts",
);
const artifactDir = join(frontendRoot, "dist-template");
const viteBin = join(frontendRoot, "node_modules/vite/bin/vite.js");

function readFrontendFile(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function hashArtifactBundle() {
  const assetsDir = join(artifactDir, "assets");
  const bundleName = readdirSync(assetsDir).find((name) => name.startsWith("index-") && name.endsWith(".js"));
  assert.ok(bundleName, "expected dist-template/assets/index-*.js");
  const bundlePath = join(assetsDir, bundleName);
  const digest = createHash("sha256").update(readFileSync(bundlePath)).digest("hex");
  return { bundlePath, digest };
}

function runTemplateBuild() {
  execFileSync(process.execPath, [viteBin, "build", "--mode", "template"], {
    cwd: frontendRoot,
    stdio: "pipe",
    env: process.env,
  });
}

function patchBrandTitleFontSize(value) {
  const source = readFileSync(layoutTokensPath, "utf8");
  const next = source.replace(
    /brandTitleFontSize:\s*\d+/,
    `brandTitleFontSize: ${value}`,
  );
  assert.notEqual(source, next, "layoutTokens brandTitleFontSize patch failed");
  writeFileSync(layoutTokensPath, next, "utf8");
  return source;
}

describe("TEMPLATE artifact runtime spike (WI-RUNTIME-ISOLATION-02)", () => {
  it("maps template mode to dist-template outDir and preview script", () => {
    const viteConfig = readFrontendFile("vite.config.js");
    const packageJson = JSON.parse(readFrontendFile("package.json"));

    assert.match(viteConfig, /template:\s*"dist-template"/);
    assert.equal(typeof packageJson.scripts["preview:template"], "string");
    assert.match(packageJson.scripts["preview:template"], /--mode template/);
    assert.equal(typeof packageJson.scripts["build:template"], "string");
  });

  it("keeps DEV and CLIENT on live vite dev scripts", () => {
    const packageJson = JSON.parse(readFrontendFile("package.json"));
    assert.match(packageJson.scripts.dev, /--mode development/);
    assert.match(packageJson.scripts["dev:client"], /--mode client/);
    assert.doesNotMatch(packageJson.scripts.dev, /preview/);
  });

  it("isolates TEMPLATE bundle from DEV source edits until rebuild", () => {
    const originalLayoutTokens = readFileSync(layoutTokensPath, "utf8");
    try {
      writeFileSync(layoutTokensPath, originalLayoutTokens, "utf8");
      runTemplateBuild();
      assert.ok(existsSync(join(artifactDir, "index.html")), "dist-template/index.html missing");

      const baseline = hashArtifactBundle();
      patchBrandTitleFontSize(99);
      const afterSourceEditWithoutRebuild = hashArtifactBundle();
      assert.equal(
        afterSourceEditWithoutRebuild.digest,
        baseline.digest,
        "TEMPLATE artifact changed without rebuild",
      );

      runTemplateBuild();
      const afterRebuild = hashArtifactBundle();
      assert.notEqual(
        afterRebuild.digest,
        baseline.digest,
        "TEMPLATE artifact did not change after rebuild",
      );
    } finally {
      writeFileSync(layoutTokensPath, originalLayoutTokens, "utf8");
    }
  });
});
