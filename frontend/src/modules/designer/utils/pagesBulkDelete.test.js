import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildBulkDeleteNotice, splitPagesForBulkDelete } from "./pagesBulkDelete.js";

describe("pagesBulkDelete", () => {
  it("splits protected and deletable pages by is_protected", () => {
    const result = splitPagesForBulkDelete([
      { id: 1, title: "Главная", is_protected: true },
      { id: 2, title: "Обычная", is_protected: false },
    ]);

    assert.equal(result.protectedPages.length, 1);
    assert.equal(result.deletablePages.length, 1);
    assert.equal(result.protectedPages[0].id, 1);
    assert.equal(result.deletablePages[0].id, 2);
  });

  it("builds mixed bulk delete notice", () => {
    const notice = buildBulkDeleteNotice({
      deletedCount: 7,
      skipped: [{ title: "Главная" }, { title: "Чат" }, { title: "Уведомления" }],
    });

    assert.equal(
      notice,
      "Удалено: 7. Пропущены системные страницы: Главная, Чат, Уведомления.",
    );
  });

  it("builds protected-only notice", () => {
    const notice = buildBulkDeleteNotice({
      deletedCount: 0,
      skipped: [{ title: "Чат" }],
    });

    assert.equal(notice, "Выбраны только системные страницы. Их нельзя удалить.");
  });
});
