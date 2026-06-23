import assert from "node:assert/strict";

import test from "node:test";

import {
  ARCHITECTURE_REGISTRY_TABS,
  normalizeRegistrySearchParams,
  resolveRegistryTab,
  sortRegistriesByTabOrder,
} from "./architectureRegistryConfig.js";

/** WI-ARCH-NAV-ORDER-001 — top-down platform architecture tab order. */
const NAV_ORDER_TAB_KEYS = [
  "overview",
  "core",
  "services",
  "modules",
  "data",
  "interface",
  "components",
  "configuration",
  "standards",
];

test("architecture registry tabs match WI-ARCH-NAV-ORDER-001 model", () => {
  const keys = ARCHITECTURE_REGISTRY_TABS.map((tab) => tab.key);
  assert.deepEqual(keys, NAV_ORDER_TAB_KEYS);
  assert.ok(!keys.includes("publication"));
  assert.ok(!keys.includes("rules"));
  assert.ok(!keys.includes("runtime"));
  assert.equal(keys.indexOf("standards"), keys.length - 1);
  assert.ok(keys.indexOf("core") < keys.indexOf("services"));
  assert.ok(keys.indexOf("services") < keys.indexOf("modules"));
  assert.ok(keys.indexOf("modules") < keys.indexOf("data"));
  assert.ok(keys.indexOf("data") < keys.indexOf("interface"));
  assert.ok(keys.indexOf("interface") < keys.indexOf("components"));
  assert.ok(keys.indexOf("components") < keys.indexOf("configuration"));
});

test("sortRegistriesByTabOrder follows navigator tab order", () => {
  const shuffled = [
    { key: "standards", title: "Стандарты", element_count: 1 },
    { key: "modules", title: "Модули", element_count: 6 },
    { key: "core", title: "Ядро", element_count: 10 },
    { key: "data", title: "Данные", element_count: 4 },
  ];
  const sorted = sortRegistriesByTabOrder(shuffled);
  assert.deepEqual(
    sorted.map((item) => item.key),
    ["core", "modules", "data", "standards"],
  );
});

test("resolveRegistryTab maps legacy runtime to configuration", () => {
  assert.equal(resolveRegistryTab("runtime"), "configuration");
  assert.equal(resolveRegistryTab("configuration"), "configuration");
});

test("resolveRegistryTab maps legacy publication and rules to compositional registries", () => {
  assert.equal(resolveRegistryTab("publication"), "configuration");
  assert.equal(resolveRegistryTab("rules"), "standards");
});

test("normalizeRegistrySearchParams rewrites runtime query param", () => {
  const params = new URLSearchParams("registry=runtime&element=dev-environment");
  const normalized = normalizeRegistrySearchParams(params);
  assert.ok(normalized);
  assert.equal(normalized.get("registry"), "configuration");
  assert.equal(normalized.get("element"), "dev-environment");
});

test("normalizeRegistrySearchParams rewrites legacy publication to configuration", () => {
  const params = new URLSearchParams("registry=publication");
  const normalized = normalizeRegistrySearchParams(params);
  assert.ok(normalized);
  assert.equal(normalized.get("registry"), "configuration");
});

test("normalizeRegistrySearchParams rewrites legacy rules to standards", () => {
  const params = new URLSearchParams("registry=rules");
  const normalized = normalizeRegistrySearchParams(params);
  assert.ok(normalized);
  assert.equal(normalized.get("registry"), "standards");
});
