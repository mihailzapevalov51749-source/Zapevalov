import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDesignerContextData,
  buildDesignerYasiiSurfaceValue,
} from "./designer/buildDesignerContextData.js";
import { buildDesignerHostContext } from "./hostContextBuilders.js";
import { buildDesignerContext } from "./embedded/surfaceAdapters.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import "./embedded/surfaceAdapters.js";
import { resolveSurfaceFromRoute } from "./embedded/resolveSurfaceFromRoute.js";

describe("buildDesignerContextData", () => {
  it("builds object type workspace context with fields section", () => {
    const context = buildDesignerContextData({
      pathname: "/designer/tenant/3/object-types/mikhail/fields",
      tenantId: 3,
      userId: "user-1",
      objectTypeName: "Михаил",
    });

    assert.equal(context.designerEntityType, "object_type");
    assert.equal(context.designerEntityName, "Михаил");
    assert.equal(context.metadata.designerSection, "Поля");
    assert.equal(context.metadata.activeTab, "fields");
  });

  it("builds objects catalog context on list route", () => {
    const context = buildDesignerContextData({
      pathname: "/designer/tenant/3/object-types",
      tenantId: 3,
      userId: "user-1",
    });

    assert.equal(context.designerEntityType, "objects_catalog");
    assert.match(context.designerEntityName, /каталог/i);
  });

  it("skips registry data route", () => {
    const context = buildDesignerContextData({
      pathname: "/designer/tenant/3/object-types/mikhail/data",
      tenantId: 3,
    });

    assert.equal(context, null);
  });

  it("skips platform dashboard route inside designer", () => {
    const context = buildDesignerContextData({
      pathname: "/designer/tenant/3/platform/implementation",
      tenantId: 3,
    });

    assert.equal(context, null);
  });
});

describe("buildDesignerHostContext", () => {
  it("maps designer fields to host contract", () => {
    const host = buildDesignerHostContext({
      tenantId: "3",
      userId: "42",
      designerArea: "Объекты",
      designerEntityType: "object_type",
      designerEntityId: "mikhail",
      designerEntityName: "Михаил",
      selectedNodeId: "mikhail:fields",
      selectedNodeName: "Поля",
      selectedScope: "designer:objects:mikhail:fields",
      metadata: {
        designerMode: "designer",
        designerPath: "/designer/tenant/3/object-types/mikhail/fields",
        designerSection: "Поля",
      },
    });

    assert.equal(host.hostSurface, "designer");
    assert.equal(host.designerEntityName, "Михаил");
    assert.equal(host.metadata.designerSection, "Поля");
  });
});

describe("designer surface wiring", () => {
  it("adapter produces designer host context without stub flag", () => {
    const host = buildDesignerContext({
      tenantId: "1",
      designerArea: "Навигация",
      designerEntityType: "navigation",
      designerEntityId: "navigation",
      designerEntityName: "Навигационная структура",
      selectedNodeId: "navigation",
      selectedNodeName: "Навигационная структура",
      selectedScope: "designer:navigation:navigation",
      metadata: {
        designerMode: "designer",
        designerPath: "/designer/tenant/1/navigation",
        designerSection: "Навигация",
      },
    });

    assert.equal(host.hostSurface, "designer");
    assert.equal(host._stubOnly, undefined);
  });

  it("yasii surface value uses designer surface id", () => {
    const value = buildDesignerYasiiSurfaceValue({
      pathname: "/designer/tenant/1/navigation",
      tenantId: 1,
      userId: "1",
    });

    assert.equal(value.surfaceId, EMBEDDED_SURFACE_IDS.DESIGNER);
    assert.equal(value.contextData.designerEntityType, "navigation");
  });

  it("route fallback includes designer host fields", () => {
    const resolved = resolveSurfaceFromRoute("/designer/tenant/1/object-types/demo/general");
    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.DESIGNER);
    assert.equal(resolved.contextData.designerEntityType, "object_type");
    assert.ok(resolved.contextData.designerArea);
  });
});
