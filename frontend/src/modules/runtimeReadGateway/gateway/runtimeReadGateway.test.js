import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  OBJECT_TYPE_KEY_REQUIRED,
  assertObjectTypeKey,
} from "./runtimeReadGatewayGuards.js";

const gatewaySource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "runtimeReadGateway.js"),
  "utf8",
);

describe("runtimeReadGateway guards", () => {
  it("throws when objectTypeKey is missing", () => {
    assert.throws(
      () => assertObjectTypeKey(""),
      (error) => error.code === OBJECT_TYPE_KEY_REQUIRED,
    );
  });
});

describe("runtimeReadGateway contract", () => {
  it("uses queryReadProvider only", () => {
    assert.match(gatewaySource, /queryReadProvider/);
    assert.doesNotMatch(gatewaySource, /legacyTableReadProvider/);
    assert.doesNotMatch(gatewaySource, /legacyViewReadProvider/);
    assert.doesNotMatch(gatewaySource, /enableLegacyFallback/);
  });

  it("has no legacy fallback branches", () => {
    assert.doesNotMatch(gatewaySource, /getLegacyTable/);
    assert.doesNotMatch(gatewaySource, /canUseLegacyFallback/);
  });
});
