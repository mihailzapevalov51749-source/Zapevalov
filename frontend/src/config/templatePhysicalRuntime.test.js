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
const repoRoot = join(frontendRoot, "..");
const suiteRoot = join(repoRoot, "..");
const runtimeRoot = join(suiteRoot, "runtime", "template");
const runtimeFrontendDir = join(runtimeRoot, "current", "frontend");
const layoutTokensPath = join(
  frontendRoot,
  "src/shared/layout/layoutTokens.ts",
);
const promoteScript = join(
  repoRoot,
  "scripts",
  "runtime",
  "promote_template_frontend.ps1",
);

function readFrontendFile(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function hashRuntimeBundle() {
  const assetsDir = join(runtimeFrontendDir, "assets");
  const bundleName = readdirSync(assetsDir).find(
    (name) => name.startsWith("index-") && name.endsWith(".js"),
  );
  assert.ok(bundleName, "expected runtime template assets/index-*.js");
  const bundlePath = join(assetsDir, bundleName);
  const digest = createHash("sha256")
    .update(readFileSync(bundlePath))
    .digest("hex");
  return { bundlePath, digest };
}

function runPromote(extraArgs = []) {
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      promoteScript,
      ...extraArgs,
    ],
    {
      cwd: repoRoot,
      stdio: "pipe",
      env: process.env,
    },
  );
}

function readCurrentReleaseId() {
  const raw = readFileSync(join(runtimeRoot, "current", "manifest.json"), "utf8").replace(
    /^\uFEFF/,
    "",
  );
  const manifest = JSON.parse(raw);
  return manifest.release_id;
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

describe("TEMPLATE physical runtime slot (WI-RUNTIME-ISOLATION-03B)", () => {
  it("uses build staging inside DEV and external runtime root in manifest", () => {
    const viteConfig = readFrontendFile("vite.config.js");
    const manifest = readFileSync(
      join(repoRoot, "scripts/dev-stack/manifest.yaml"),
      "utf8",
    );

    assert.match(viteConfig, /template:\s*"\.build-staging\/template"/);
    assert.match(manifest, /template_runtime_root:\s+\.\.\/runtime\/template/);
    assert.match(manifest, /runtime_frontend_slot:\s+current\/frontend/);
    assert.doesNotMatch(manifest, /artifact_dir:\s+dist-template/);
  });

  it("isolates physical runtime from DEV source edits until promote", () => {
    const originalLayoutTokens = readFileSync(layoutTokensPath, "utf8");
    try {
      writeFileSync(layoutTokensPath, originalLayoutTokens, "utf8");
      runPromote();
      assert.ok(
        existsSync(join(runtimeFrontendDir, "index.html")),
        "runtime frontend index.html missing",
      );
      assert.ok(
        existsSync(join(runtimeRoot, "current", "manifest.json")),
        "runtime manifest missing",
      );

      const baseline = hashRuntimeBundle();
      patchBrandTitleFontSize(88);
      const afterDevEditWithoutPromote = hashRuntimeBundle();
      assert.equal(
        afterDevEditWithoutPromote.digest,
        baseline.digest,
        "physical runtime changed without promote",
      );

      runPromote();
      const afterPromote = hashRuntimeBundle();
      assert.notEqual(
        afterPromote.digest,
        baseline.digest,
        "physical runtime did not change after promote",
      );

      patchBrandTitleFontSize(77);
      const afterSecondDevEdit = hashRuntimeBundle();
      assert.equal(
        afterSecondDevEdit.digest,
        afterPromote.digest,
        "physical runtime changed without second promote",
      );
    } finally {
      writeFileSync(layoutTokensPath, originalLayoutTokens, "utf8");
    }
  });

  it("supports rollback via SwitchToRelease", () => {
    const originalLayoutTokens = readFileSync(layoutTokensPath, "utf8");
    try {
      writeFileSync(layoutTokensPath, originalLayoutTokens, "utf8");
      runPromote();
      const releaseOneId = readCurrentReleaseId();
      const releaseOneDigest = hashRuntimeBundle().digest;

      patchBrandTitleFontSize(66);
      runPromote();
      const releaseTwoDigest = hashRuntimeBundle().digest;
      assert.notEqual(releaseOneDigest, releaseTwoDigest);

      runPromote(["-SwitchToRelease", releaseOneId]);
      const rolledBackDigest = hashRuntimeBundle().digest;
      assert.equal(rolledBackDigest, releaseOneDigest);
    } finally {
      writeFileSync(layoutTokensPath, originalLayoutTokens, "utf8");
    }
  });
});
