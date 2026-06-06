import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectUnmappedRequiredImportFields,
  hasUnmappedRequiredImportFields,
  isRequiredFieldUnmappedError,
} from "./collectUnmappedRequiredImportFields.js";
import {
  REQUIRED_FIELD_UNMAPPED_CODE,
  REQUIRED_FIELD_UNMAPPED_MESSAGE,
} from "./importReviewConstants.js";

describe("collectUnmappedRequiredImportFields", () => {
  it("collects unique required field labels from unmapped errors", () => {
    const fields = collectUnmappedRequiredImportFields([
      {
        rowNumber: 2,
        column: "Постановщик",
        message: REQUIRED_FIELD_UNMAPPED_MESSAGE,
        code: REQUIRED_FIELD_UNMAPPED_CODE,
      },
      {
        rowNumber: 3,
        column: "Постановщик",
        message: REQUIRED_FIELD_UNMAPPED_MESSAGE,
        code: REQUIRED_FIELD_UNMAPPED_CODE,
      },
      {
        rowNumber: 4,
        column: "Статус",
        message: "Обязательное поле",
      },
    ]);

    assert.deepEqual(fields, ["Постановщик"]);
  });

  it("detects unmapped required errors by message fallback", () => {
    assert.equal(
      isRequiredFieldUnmappedError({
        message: REQUIRED_FIELD_UNMAPPED_MESSAGE,
      }),
      true,
    );
    assert.equal(
      hasUnmappedRequiredImportFields([
        { column: "Ответственный", message: REQUIRED_FIELD_UNMAPPED_MESSAGE },
      ]),
      true,
    );
  });
});
