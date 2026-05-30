import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RANK_CONTAINS,
  RANK_EXACT,
  RANK_NO_MATCH,
  RANK_STARTS_WITH,
  getTextMatchRank,
  sortSearchResults,
} from "./textMatchRanking.js";

describe("textMatchRanking", () => {
  it("ranks exact match highest", () => {
    assert.equal(getTextMatchRank("Проект СДС", "проект сдс"), RANK_EXACT);
  });

  it("ranks startsWith before contains", () => {
    assert.equal(getTextMatchRank("Проект СДС", "про"), RANK_STARTS_WITH);
    assert.equal(getTextMatchRank("Инвестиционный проект", "проект"), RANK_CONTAINS);
    assert.equal(getTextMatchRank("Карточка проекта", "екта"), RANK_CONTAINS);
    assert.equal(getTextMatchRank("Договор подряда", "ряд"), RANK_CONTAINS);
  });

  it("returns no match rank for unrelated text", () => {
    assert.equal(getTextMatchRank("Договор", "xyz"), RANK_NO_MATCH);
  });

  it("sorts results by rank then title", () => {
    const sorted = sortSearchResults(
      [
        { id: "2", title: "Инвестиционный проект", rank: RANK_CONTAINS },
        { id: "1", title: "Проект СДС", rank: RANK_STARTS_WITH },
        { id: "3", title: "Проект", rank: RANK_EXACT },
      ],
      "про",
    );

    assert.deepEqual(sorted.map((item) => item.id), ["3", "1", "2"]);
  });
});
