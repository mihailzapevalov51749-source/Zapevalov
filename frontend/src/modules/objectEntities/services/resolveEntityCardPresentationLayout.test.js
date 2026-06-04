import { describe, expect, it } from "vitest";

import {
  resolveEntityCardLayoutForRender,
  resolveEntityCardPresentationLayout,
} from "./resolveEntityCardPresentationLayout";

describe("resolveEntityCardPresentationLayout", () => {
  it("prefers effective card layout when present", () => {
    const effective = { sections: [{ id: "main" }] };

    expect(
      resolveEntityCardPresentationLayout({
        effectiveCardLayout: effective,
        catalog: null,
        objectTypeKey: "tasks",
      }),
    ).toBe(effective);
  });

  it("falls back to published default_table card layout (legacy top-level presentation)", () => {
    const publishedCard = { sections: [{ id: "main", fieldKeys: ["name"] }] };

    const layout = resolveEntityCardPresentationLayout({
      effectiveCardLayout: null,
      catalog: {
        object_types: [
          {
            key: "tasks",
            views: [
              {
                key: "default_table",
                presentation: { card: publishedCard },
              },
            ],
          },
        ],
      },
      objectTypeKey: "tasks",
      publishedViewKey: "default_table",
    });

    expect(layout).toEqual(publishedCard);
  });

  it("reads card from settings_json.objectView.presentation (published catalog shape)", () => {
    const publishedCard = {
      sections: [
        { id: "comments", visible: false, order: 5, fieldKeys: [] },
        { id: "main", visible: true, order: 1, fieldKeys: ["title"] },
      ],
      hiddenFieldKeys: [],
      tabs: [],
    };

    const layout = resolveEntityCardPresentationLayout({
      effectiveCardLayout: null,
      catalog: {
        object_types: [
          {
            key: "zadachnik",
            views: [
              {
                key: "default_table",
                settings_json: {
                  objectView: {
                    presentation: { card: publishedCard },
                  },
                },
              },
            ],
          },
        ],
      },
      objectTypeKey: "zadachnik",
      publishedViewKey: "default_table",
    });

    expect(layout).toEqual(publishedCard);
    expect(layout.sections.find((s) => s.id === "comments")?.visible).toBe(false);
  });

  it("resolveEntityCardLayoutForRender prefers Studio persistence card over catalog", () => {
    const persistenceCard = {
      sections: [
        { id: "comments", visible: false, order: 5, fieldKeys: [] },
        { id: "main", visible: true, order: 1, fieldKeys: ["title"] },
      ],
      hiddenFieldKeys: [],
      tabs: [],
    };
    const catalogCard = {
      sections: [{ id: "comments", visible: true, order: 5, fieldKeys: [] }],
      hiddenFieldKeys: [],
      tabs: [],
    };

    const layout = resolveEntityCardLayoutForRender({
      effectiveCardLayout: null,
      persistenceCardLayout: persistenceCard,
      catalog: {
        object_types: [
          {
            key: "tasks",
            views: [
              {
                key: "default_table",
                presentation: { card: catalogCard },
              },
            ],
          },
        ],
      },
      objectTypeKey: "tasks",
      publishedViewKey: "default_table",
    });

    expect(layout).toBe(persistenceCard);
    expect(layout.sections.find((s) => s.id === "comments")?.visible).toBe(false);
  });
});
