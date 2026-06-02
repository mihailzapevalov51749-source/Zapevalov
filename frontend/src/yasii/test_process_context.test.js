import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProcessContextData,
  buildProcessYasiiSurfaceValue,
} from "./process/buildProcessContextData.js";
import { buildProcessHostContext } from "./hostContextBuilders.js";
import { buildProcessContext } from "./embedded/surfaceAdapters.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import { resolveSurfaceFromRoute } from "./embedded/resolveSurfaceFromRoute.js";
import "./embedded/surfaceAdapters.js";
import { getEmbeddedSurfaceConfig } from "./embedded/embeddedEntryRegistry.js";

describe("buildProcessContextData", () => {
  it("builds full process host context contract", () => {
    const context = buildProcessContextData({
      tenantId: 1,
      userId: "user-1",
      processId: "wf-42",
      processName: "Согласование документации",
      processType: "approval",
      processStatus: "in_progress",
      activeStepId: "step-review",
      activeStepName: "Проверка документации",
      metadata: {
        processVersion: "3",
        processPath: "/processes/wf-42",
        processOwner: "Иванов",
      },
    });

    assert.equal(context.processId, "wf-42");
    assert.equal(context.processName, "Согласование документации");
    assert.equal(context.activeStepName, "Проверка документации");
    assert.equal(context.metadata.processVersion, "3");
  });

  it("builds integration-ready context without fake process instance", () => {
    const context = buildProcessContextData({
      tenantId: 1,
      userId: "user-1",
      metadata: { integrationReady: "true" },
    });

    assert.equal(context.processId, "");
    assert.equal(context.processName, "");
    assert.equal(context.metadata.integrationReady, "true");
  });

  it("exposes process surface value for future BPMN screens", () => {
    const value = buildProcessYasiiSurfaceValue({
      tenantId: 1,
      userId: "user-1",
      processId: "wf-1",
      processName: "Согласование документации",
      activeStepName: "Проверка документации",
    });

    assert.equal(value.surfaceId, EMBEDDED_SURFACE_IDS.PROCESS);
    assert.equal(value.contextData.processName, "Согласование документации");
  });
});

describe("process surface registration", () => {
  it("maps adapter to host contract without stub flag", () => {
    const host = buildProcessContext({
      processId: "wf-9",
      processName: "Согласование",
      processType: "workflow",
      processStatus: "active",
      activeStepName: "Проверка документации",
      selectedScope: "process:wf-9:step-review",
    });

    assert.equal(host.hostSurface, "process");
    assert.equal(host.processName, "Согласование");
    assert.equal(host._stubOnly, undefined);
  });

  it("registers enabled process surface", () => {
    const config = getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.PROCESS);
    assert.equal(config.enabled, true);
    assert.equal(config.stubOnly, false);
  });

  it("keeps designer /processes on designer surface", () => {
    const resolved = resolveSurfaceFromRoute("/designer/tenant/1/processes");
    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.DESIGNER);
  });

  it("resolves standalone processes route to process contract", () => {
    const resolved = resolveSurfaceFromRoute("/portal/1/processes");
    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.PROCESS);
    assert.equal(resolved.contextData.metadata.integrationReady, "true");
  });
});

describe("buildProcessHostContext", () => {
  it("normalizes process fields for ACE handoff", () => {
    const host = buildProcessHostContext({
      tenantId: "1",
      userId: "2",
      processId: "wf-42",
      processName: "Согласование документации",
      processStatus: "running",
      activeStepName: "Проверка документации",
    });

    assert.equal(host.hostSurface, "process");
    assert.equal(host.activeStepName, "Проверка документации");
  });
});
