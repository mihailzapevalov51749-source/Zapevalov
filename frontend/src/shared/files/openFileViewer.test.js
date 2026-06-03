import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSE_FILE_VIEWER_EVENT,
  OPEN_FILE_VIEWER_EVENT,
  normalizeOpenFileViewerPayload,
  openFileViewer,
} from "./openFileViewer.js";

test("normalizeOpenFileViewerPayload builds file discussion context", () => {
  const payload = normalizeOpenFileViewerPayload({
    fileId: "abc.pdf",
    fileName: "ТЗ.docx",
    fileUrl: "/files/documents/abc.pdf",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sourceType: "object_entity_attachment",
    sourceId: "entity-1",
    context: {
      tenantId: 1,
      objectTypeKey: "deal",
      fieldKey: "attachments",
    },
  });

  assert.equal(payload.fileId, "abc.pdf");
  assert.equal(payload.sourceType, "object_entity_attachment");
  assert.equal(payload.initialContext.entity_type, "file");
  assert.equal(payload.initialContext.objectTypeKey, "deal");
  assert.equal(payload.initialContext.fieldKey, "attachments");
  assert.equal(payload.presentation, "workspace");
});

test("library-style sources stay overlay presentation", () => {
  const payload = normalizeOpenFileViewerPayload({
    fileId: "doc-1",
    fileUrl: "/files/documents/doc-1",
    sourceType: "library_file",
  });

  assert.equal(payload.presentation, "overlay");
});

test("openFileViewer requires fileUrl or fileId", () => {
  const events = [];

  globalThis.window = {
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };

  try {
    assert.equal(openFileViewer({}), false);
    assert.equal(events.length, 0);

    const ok = openFileViewer({
      fileId: "doc-1",
      fileUrl: "/files/documents/doc-1",
      fileName: "file.docx",
      sourceType: "object_entity_attachment",
      sourceId: "ent-9",
    });

    assert.equal(ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, OPEN_FILE_VIEWER_EVENT);
    assert.equal(events[0].detail.fileId, "doc-1");
    assert.equal(events[0].detail.sourceType, "object_entity_attachment");
  } finally {
    delete globalThis.window;
    void CLOSE_FILE_VIEWER_EVENT;
  }
});
