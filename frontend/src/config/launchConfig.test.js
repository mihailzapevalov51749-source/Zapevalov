import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { loadEnv } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readFrontendFile(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const LAUNCH_MATRIX = [
  {
    mode: "development",
    script: "dev",
    frontendPort: 5173,
    envFile: ".env.development",
    backendUrl: "http://127.0.0.1:8010",
  },
  {
    mode: "template",
    script: "dev:template",
    previewScript: "preview:template",
    frontendPort: 5174,
    envFile: ".env.template",
    backendUrl: "http://127.0.0.1:8011",
    artifactOutDir: ".build-staging/template",
    runtimeFrontendSlot: "current/frontend",
  },
  {
    mode: "client",
    script: "dev:client",
    frontendPort: 5175,
    envFile: ".env.client",
    backendUrl: "http://127.0.0.1:8012",
  },
];

describe("multi-frontend launch matrix", () => {
  it("maps vite modes to dedicated frontend ports", () => {
    const source = readFrontendFile("vite.config.js");

    for (const item of LAUNCH_MATRIX) {
      assert.match(
        source,
        new RegExp(`${item.mode}:\\s*${item.frontendPort}`),
        `expected port ${item.frontendPort} for mode ${item.mode}`,
      );
    }

    assert.match(source, /strictPort:\s*true/);
  });

  it("exposes npm scripts for all environments", () => {
    const packageJson = JSON.parse(readFrontendFile("package.json"));

    for (const item of LAUNCH_MATRIX) {
      assert.equal(typeof packageJson.scripts[item.script], "string");
      assert.match(packageJson.scripts[item.script], new RegExp(`--mode ${item.mode}`));
    }
  });

  it("exposes TEMPLATE staging build and external runtime slot config", () => {
    const packageJson = JSON.parse(readFrontendFile("package.json"));
    const viteConfig = readFrontendFile("vite.config.js");
    const manifest = readFileSync(
      join(frontendRoot, "..", "scripts/dev-stack/manifest.yaml"),
      "utf8",
    );
    const template = LAUNCH_MATRIX.find((item) => item.mode === "template");

    assert.equal(typeof packageJson.scripts[template.previewScript], "string");
    assert.match(packageJson.scripts[template.previewScript], /--mode template/);
    assert.match(
      viteConfig,
      new RegExp(`${template.mode}:\\s*"${template.artifactOutDir.replace("/", "\\/")}"`),
    );
    assert.match(manifest, /template_runtime_root:\s+\.\.\/runtime\/template/);
    assert.match(
      manifest,
      new RegExp(`runtime_frontend_slot:\\s+${template.runtimeFrontendSlot}`),
    );
  });

  it("loads isolated backend URLs per vite mode", () => {
    const savedApiBaseUrl = process.env.VITE_API_BASE_URL;
    delete process.env.VITE_API_BASE_URL;
    try {
      for (const item of LAUNCH_MATRIX) {
        const env = loadEnv(item.mode, frontendRoot, "");
        assert.equal(
          env.VITE_API_BASE_URL,
          item.backendUrl,
          `unexpected API base for mode ${item.mode}`,
        );
      }
    } finally {
      if (savedApiBaseUrl === undefined) {
        delete process.env.VITE_API_BASE_URL;
      } else {
        process.env.VITE_API_BASE_URL = savedApiBaseUrl;
      }
    }
  });
});
