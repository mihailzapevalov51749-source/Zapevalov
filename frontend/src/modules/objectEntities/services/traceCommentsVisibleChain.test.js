import { describe, expect, it } from "vitest";

import {
  isCommentsSectionVisible,
  normalizeObjectEntityCardUtLayout,
} from "./objectEntityCardSectionsLayout";
import {
  extractCardLayoutFromCatalogView,
  resolveEntityCardLayoutForRender,
} from "./resolveEntityCardPresentationLayout";
import { normalizeObjectViewDefinition } from "../../objectViews/services/normalizeObjectViewDefinition";
import { TABLE_BASE_STATE_KEY } from "../../objectViews/table/preferences/tableBaseState";

/** Mirrors DB snapshot for zadachnik/default_table (tenant 1, catalog v35). */
const ZADACHNIK_CATALOG_VIEW = {
  key: "default_table",
  settings_json: {
    objectView: {
      schemaVersion: 1,
      key: "default_table",
      presentation: {
        card: {
          sections: [
            { id: "parent", visible: true, order: 0, fieldKeys: [] },
            { id: "main", visible: true, order: 1, fieldKeys: ["title"] },
            { id: "fields", visible: true, order: 2, fieldKeys: [] },
            { id: "tabs", visible: true, order: 3, fieldKeys: [], tabIds: ["notes"] },
            { id: "attachments", visible: true, order: 4, fieldKeys: [] },
            { id: "comments", visible: false, order: 5, fieldKeys: [] },
          ],
          tabs: [{ id: "notes", visible: true, order: 0 }],
          hiddenFieldKeys: [],
        },
      },
    },
  },
};

function commentsVisibleFromCard(card) {
  const section = (card?.sections || []).find((s) => s?.id === "comments");
  if (!section) {
    return "section_missing";
  }
  return section.visible;
}

describe("traceCommentsVisibleChain (zadachnik)", () => {
  it("reports values at each pipeline stage for Office TABLE_BASE_STATE", () => {
    const saveCard = extractCardLayoutFromCatalogView(ZADACHNIK_CATALOG_VIEW);
    expect(commentsVisibleFromCard(saveCard)).toBe(false);

    const publishCard = saveCard;
    expect(commentsVisibleFromCard(publishCard)).toBe(false);

    const catalogCard = extractCardLayoutFromCatalogView(ZADACHNIK_CATALOG_VIEW);
    expect(commentsVisibleFromCard(catalogCard)).toBe(false);

    const runtimeContract = normalizeObjectViewDefinition(ZADACHNIK_CATALOG_VIEW, {
      viewKey: "default_table",
      isPublished: true,
    });
    expect(commentsVisibleFromCard(runtimeContract.presentation?.card)).toBe(false);

    const officeBaseContract = normalizeObjectViewDefinition(null, {
      viewKey: TABLE_BASE_STATE_KEY,
      isPublished: true,
    });
    expect(commentsVisibleFromCard(officeBaseContract.presentation?.card)).toBe(
      "section_missing",
    );

    const officeResolvedCard = runtimeContract.presentation?.card;
    const officeLayout = resolveEntityCardLayoutForRender({
      effectiveCardLayout: officeBaseContract.presentation?.card,
      persistenceCardLayout: null,
      catalog: {
        object_types: [{ key: "zadachnik", views: [ZADACHNIK_CATALOG_VIEW] }],
      },
      objectTypeKey: "zadachnik",
      publishedViewKey: "default_table",
    });
    expect(commentsVisibleFromCard(officeLayout)).toBe(false);

    const utLayout = normalizeObjectEntityCardUtLayout(officeLayout, [], null, []);
    expect(isCommentsSectionVisible(utLayout)).toBe(false);
  });
});
