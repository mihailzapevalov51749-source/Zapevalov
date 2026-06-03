import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getExpandToggleLabel,
  isFileLikeColumn,
  shouldCollapseCell,
} from "./expandableCellUtils.js";

describe("expandableCellUtils", () => {
  it("detects file columns", () => {
    assert.equal(isFileLikeColumn({ type: "file" }), true);
    assert.equal(isFileLikeColumn({ type: "text" }), false);
  });

  it("collapses multi-file cells", () => {
    assert.equal(
      shouldCollapseCell({
        column: { type: "file" },
        value: [{ name: "a.docx" }, { name: "b.docx" }],
        readOnly: true,
      }),
      true,
    );
  });

  it("uses universal toggle labels", () => {
    assert.equal(
      getExpandToggleLabel({ isExpanded: false, isFiles: true }),
      "Показать все",
    );
    assert.equal(
      getExpandToggleLabel({ isExpanded: true, isFiles: false }),
      "Скрыть",
    );
  });
});
