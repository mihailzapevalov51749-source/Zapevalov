import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PAGE_LAYOUT_PAGE_TYPE } from "../appShell/pageLayoutContract/pageLayoutContractTypes.js";
import {
  buildWorkspaceTabPayload,
  resolveCurrentWorkspaceTabDescriptor,
} from "./resolveCurrentWorkspaceTabDescriptor.js";
import { resolveWorkspaceTabDisplayTitle } from "./resolveWorkspaceTabDisplayTitle.js";
import {
  resolveStudioSectionTitleFromPathname,
} from "./studioSectionTitles.js";

const SECTION_CASES = [
  ["/designer/tenant/1/navigation", "Навигация"],
  ["/designer/tenant/1/relations", "Связи"],
  ["/designer/tenant/1/views", "Представления"],
  ["/designer/tenant/1/processes", "Бизнес-процессы"],
  ["/designer/tenant/1/publishing", "Публикация"],
];

describe("studio section titles", () => {
  for (const [pathname, expectedTitle] of SECTION_CASES) {
    it(`resolves ${pathname} as Студия: ${expectedTitle}`, () => {
      assert.equal(resolveStudioSectionTitleFromPathname(pathname), expectedTitle);

      const descriptor = resolveCurrentWorkspaceTabDescriptor({
        pathname,
        search: "",
        hash: "",
      });

      assert.equal(descriptor.context.sectionTitle, expectedTitle);

      const payload = buildWorkspaceTabPayload(descriptor, {
        pageTitle: expectedTitle,
        context: descriptor.context,
      });

      assert.equal(payload.title, `Студия: ${expectedTitle}`);
      assert.equal(payload.context_json.sectionTitle, expectedTitle);
    });
  }

  it("re-resolves legacy stored title Студия: Раздел from route", () => {
    const title = resolveWorkspaceTabDisplayTitle({
      title: "Студия: Раздел",
      route: "/designer/tenant/1/navigation",
      module_key: "studio",
      page_type: "generic",
      context_json: {
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
        sectionKey: "navigation",
        sectionTitle: "Навигация",
      },
    });

    assert.equal(title, "Студия: Навигация");
  });
});
