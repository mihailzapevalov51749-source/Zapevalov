import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const stagingAssetsDir = join(
  frontendRoot,
  ".build-staging",
  "template",
  "assets",
);

describe("TEMPLATE production bundle graph (WI-RT-012)", () => {
  it("keeps non-entry chunks independent from entry index chunk", () => {
    const assets = readdirSync(stagingAssetsDir).filter((name) =>
      name.endsWith(".js"),
    );
    const indexChunk = assets.find((name) => /^index-.*\.js$/.test(name));
    assert.ok(indexChunk, "expected staging assets/index-*.js");

    const indexImportPattern = /from["']\.\/index-[^"']+["']/;

    for (const fileName of assets) {
      if (fileName === indexChunk) {
        continue;
      }

      const source = readFileSync(join(stagingAssetsDir, fileName), "utf8");
      assert.doesNotMatch(
        source,
        indexImportPattern,
        `${fileName} must not import entry chunk ${indexChunk}`,
      );
    }
  });
});
