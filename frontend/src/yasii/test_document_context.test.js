import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDocumentContextData,
  buildDocumentYasiiSurfaceValue,
  resolveDocumentDisplayName,
  resolveDocumentTypeLabel,
} from "./document/buildDocumentContextData.js";
import { buildDocumentHostContext } from "./hostContextBuilders.js";
import { buildDocumentContext } from "./embedded/surfaceAdapters.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import "./embedded/surfaceAdapters.js";
import { getEmbeddedSurfaceConfig } from "./embedded/embeddedEntryRegistry.js";

describe("buildDocumentContextData", () => {
  const sampleRecord = {
    id: 42,
    library_id: 7,
    title: "Регламент по размещению и согласованию ПИР-документации.docx",
    original_filename: "Регламент по размещению и согласованию ПИР-документации.docx",
    document_type: "word",
    file_path: "/media/docs/reglament.docx",
    file_size: 204800,
    status: "published",
  };

  it("normalizes DOCX type and display name", () => {
    assert.equal(resolveDocumentTypeLabel(sampleRecord), "DOCX");
    assert.equal(
      resolveDocumentDisplayName(sampleRecord),
      "Регламент по размещению и согласованию ПИР-документации",
    );
  });

  it("builds host context contract fields", () => {
    const context = buildDocumentContextData({
      tenantId: 1,
      userId: "user-1",
      libraryId: 7,
      libraryName: "Нормативные документы",
      documentRecord: sampleRecord,
      folderPath: [{ title: "ПИР" }],
    });

    assert.equal(context.documentId, "42");
    assert.equal(context.documentType, "DOCX");
    assert.equal(context.documentLibraryName, "Нормативные документы");
    assert.equal(context.metadata.viewerType, "file_viewer");
    assert.equal(context.metadata.fileExtension, "docx");
  });

  it("exposes document surface value", () => {
    const value = buildDocumentYasiiSurfaceValue({
      tenantId: 1,
      userId: "user-1",
      libraryId: 7,
      libraryName: "Нормативные документы",
      documentRecord: {
        id: 99,
        library_id: 7,
        title: "Техническое задание.pdf",
        document_type: "pdf",
      },
    });

    assert.equal(value.surfaceId, EMBEDDED_SURFACE_IDS.DOCUMENT);
    assert.equal(value.contextData.documentType, "PDF");
  });
});

describe("buildDocumentHostContext adapter", () => {
  it("maps adapter to host contract without stub flag", () => {
    const host = buildDocumentContext({
      tenantId: "1",
      userId: "2",
      documentId: "15",
      documentName: "Реестр",
      documentType: "XLSX",
      documentLibraryId: "3",
      documentLibraryName: "Библиотека",
      selectedScope: "document:3:15",
      metadata: {
        fileExtension: "xlsx",
        viewerType: "file_viewer",
      },
    });

    assert.equal(host.hostSurface, "document");
    assert.equal(host.documentName, "Реестр");
    assert.equal(host._stubOnly, undefined);
  });

  it("registers enabled document surface", () => {
    const config = getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.DOCUMENT);
    assert.equal(config.enabled, true);
    assert.equal(config.stubOnly, false);
  });
});
