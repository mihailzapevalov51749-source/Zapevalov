import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildRegistryHostContext,
  buildRegistryScopeKey,
  formatRegistryFilterConditions,
  formatRegistrySortRules,
} from "./hostContextBuilders.js";
import { buildRegistryContext } from "./embedded/surfaceAdapters.js";
import "./embedded/surfaceAdapters.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("buildRegistryHostContext", () => {
  it("builds registry HostContext with filters, sorts and metadata", () => {
    const hostContext = buildRegistryHostContext({
      tenantId: "2",
      userId: "7",
      registryId: "projects",
      registryName: "Проекты",
      viewId: "default_table",
      viewName: "Таблица",
      selectedCount: 2,
      activeFilters: "Статус равно В работе",
      activeSorts: "Дата создания DESC",
      metadata: {
        recordCount: "245",
        visibleColumns: "Название|Статус",
      },
    });

    assert.equal(hostContext.hostSurface, "registry");
    assert.equal(hostContext.registryId, "projects");
    assert.equal(hostContext.registryName, "Проекты");
    assert.equal(hostContext.viewName, "Таблица");
    assert.equal(hostContext.selectedCount, "2");
    assert.equal(hostContext.metadata.recordCount, "245");
  });

  it("formats filter and sort helpers for readable HostContext", () => {
    const filters = formatRegistryFilterConditions(
      [{ fieldKey: "status", operator: "eq", value: "active" }],
      { status: "Статус" },
    );
    const sorts = formatRegistrySortRules(
      [{ field: "created_at", order: "desc" }],
      { created_at: "Дата создания" },
    );

    assert.match(filters[0], /Статус/);
    assert.match(sorts[0], /Дата создания DESC/);
  });

  it("builds stable registry scope keys when filters change", () => {
    const baseKey = buildRegistryScopeKey({
      registryId: "projects",
      viewId: "default",
      selectedScope: "registry:projects:default",
      activeFilters: "",
      activeSorts: "Дата создания DESC",
    });
    const filteredKey = buildRegistryScopeKey({
      registryId: "projects",
      viewId: "default",
      selectedScope: "registry:projects:default",
      activeFilters: "Статус равно active",
      activeSorts: "Дата создания DESC",
    });

    assert.notEqual(baseKey, filteredKey);
  });
});

describe("registry surface adapter wiring", () => {
  it("builds registry HostContext through adapter without stub flag", () => {
    const hostContext = buildRegistryContext({
      registryId: "projects",
      registryName: "Проекты",
      viewId: "default",
      viewName: "Таблица",
      metadata: { recordCount: "10" },
    });

    assert.equal(hostContext.hostSurface, "registry");
    assert.equal(hostContext._stubOnly, undefined);
  });

  it("publishes registry context through YasiiSurfaceContextProvider", () => {
    const source = readFileSync(
      join(__dirname, "../modules/objectViews/table/ObjectTableView.jsx"),
      "utf8",
    );

    assert.match(source, /YasiiSurfaceContextProvider/);
    assert.match(source, /EMBEDDED_SURFACE_IDS\.REGISTRY/);
    assert.match(source, /registrySurfaceContext/);
    assert.match(source, /registryName/);
    assert.match(source, /activeFilters/);
  });
});
