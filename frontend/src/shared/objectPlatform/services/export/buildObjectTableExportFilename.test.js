import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildObjectTableExportFilename,
  sanitizeExportFilenamePart,
} from "./buildObjectTableExportFilename.js";

describe("buildObjectTableExportFilename", () => {
  it("builds filename with object and view names", () => {
    const filename = buildObjectTableExportFilename({
      objectName: "Задачник",
      viewName: "Все задачи",
    });

    assert.match(filename, /^Задачник_Все задачи_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("omits view segment when view name is empty", () => {
    const filename = buildObjectTableExportFilename({
      objectName: "Задачник",
      viewName: null,
    });

    assert.match(filename, /^Задачник_\d{4}-\d{2}-\d{2}\.xlsx$/);
    assert.doesNotMatch(filename, /Все задачи/);
  });

  it("sanitizes unsafe filename characters", () => {
    assert.equal(
      sanitizeExportFilenamePart('Объект: "тест"'),
      'Объект_ _тест_',
    );
  });
});
