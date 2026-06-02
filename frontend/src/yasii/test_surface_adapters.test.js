import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEmbeddedSurface } from "./embedded/embeddedEntryRegistry.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import {
  buildDashboardContext,
  buildDesignerContext,
  buildDocumentContext,
  buildGlobalContext,
  buildObjectCardContext,
  buildProcessContext,
  buildRegistryContext,
} from "./embedded/surfaceAdapters.js";
import "./embedded/surfaceAdapters.js";

describe("surfaceAdapters", () => {
  it("builds dashboard HostContext through adapter", () => {
    const hostContext = buildDashboardContext({
      tenantId: "3",
      userId: "9",
      widgetId: "implementation",
      selectedScope: "ai-native-layer",
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.dashboardId, "platform_dev");
    assert.equal(hostContext.tenantId, "3");
    assert.equal(hostContext.userId, "9");
    assert.equal(hostContext.widgetId, "implementation");
    assert.equal(hostContext.selectedScope, "ai-native-layer");
  });

  it("builds global HostContext for global entry point", () => {
    const hostContext = buildGlobalContext({
      userId: "11",
      selectedScope: "global-entry",
      widgetId: "global-entry",
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.userId, "11");
    assert.equal(hostContext.widgetId, "global-entry");
  });

  it("builds object card HostContext through adapter", () => {
    const objectCard = buildObjectCardContext({
      tenantId: "7",
      userId: "42",
      objectTypeId: "contacts",
      objectTypeName: "Контрагент",
      objectId: "obj-101",
      objectTitle: "ООО Ромашка",
      activeTab: "documents",
      metadata: {
        objectStatus: "active",
        objectOwner: "owner-1",
      },
    });

    assert.equal(objectCard.hostSurface, "object_card");
    assert.equal(objectCard.objectTypeId, "contacts");
    assert.equal(objectCard.objectTypeName, "Контрагент");
    assert.equal(objectCard.objectId, "obj-101");
    assert.equal(objectCard.objectTitle, "ООО Ромашка");
    assert.equal(objectCard.activeTab, "documents");
    assert.equal(objectCard.metadata.objectStatus, "active");
  });

  it("builds registry HostContext through adapter", () => {
    const registry = buildRegistryContext({
      registryId: "projects",
      registryName: "Проекты",
      viewId: "default",
      viewName: "Таблица",
      metadata: { recordCount: "12" },
    });

    assert.equal(registry.hostSurface, "registry");
    assert.equal(registry.registryName, "Проекты");
    assert.equal(registry.metadata.recordCount, "12");
    assert.equal(registry._stubOnly, undefined);
  });

  it("builds designer host context through adapter", () => {
    const designer = buildDesignerContext({
      tenantId: "1",
      designerArea: "Объекты",
      designerEntityType: "object_type",
      designerEntityId: "mikhail",
      designerEntityName: "Михаил",
      selectedNodeId: "mikhail:fields",
      selectedNodeName: "Поля",
      selectedScope: "designer:objects:mikhail:fields",
      metadata: {
        designerMode: "designer",
        designerPath: "/designer/tenant/1/object-types/mikhail/fields",
        designerSection: "Поля",
      },
    });

    assert.equal(designer.hostSurface, "designer");
    assert.equal(designer.designerEntityName, "Михаил");
    assert.equal(designer._stubOnly, undefined);
  });

  it("builds document host context with required fields", () => {
    const document = buildDocumentContext({
      documentId: "10",
      documentName: "Техническое задание",
      documentType: "PDF",
      documentLibraryId: "3",
      documentLibraryName: "Библиотека",
      selectedScope: "document:3:10",
      metadata: { viewerType: "file_viewer", fileExtension: "pdf" },
    });

    assert.equal(document.hostSurface, "document");
    assert.equal(document.documentType, "PDF");
    assert.equal(document._stubOnly, undefined);
  });

  it("builds process host context with required fields", () => {
    const process = buildProcessContext({
      processId: "wf-1",
      processName: "Согласование документации",
      processType: "workflow",
      processStatus: "active",
      activeStepName: "Проверка документации",
      selectedScope: "process:wf-1:step-review",
    });
    assert.equal(process.hostSurface, "process");
    assert.equal(process.processName, "Согласование документации");
    assert.equal(process._stubOnly, undefined);
  });

  it("wires dashboard adapter into registry", () => {
    const surface = resolveEmbeddedSurface(EMBEDDED_SURFACE_IDS.DASHBOARD);
    const hostContext = surface.buildHostContext({
      tenantId: "1",
      userId: "2",
      widgetId: "architecture",
      selectedScope: "architecture",
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.selectedScope, "architecture");
  });
});
