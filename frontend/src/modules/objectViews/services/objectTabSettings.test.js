import { describe, expect, it } from "vitest";

import {
  DEFAULT_OBJECT_TAB_SETTINGS,
  mergeObjectTabSettingsIntoViewSettings,
  parseViewSettingsJson,
  readObjectTabSettings,
  readViewSettingsJsonFromPublishedView,
} from "./objectTabSettings";

describe("objectTabSettings", () => {
  it("defaults menuInTab to false", () => {
    expect(readObjectTabSettings(null)).toEqual(DEFAULT_OBJECT_TAB_SETTINGS);
    expect(readObjectTabSettings({})).toEqual(DEFAULT_OBJECT_TAB_SETTINGS);
    expect(readObjectTabSettings({ projection: {} })).toEqual(DEFAULT_OBJECT_TAB_SETTINGS);
  });

  it("reads menuInTab from tabSettings", () => {
    expect(
      readObjectTabSettings({
        tabSettings: { menuInTab: true },
      }),
    ).toEqual({ menuInTab: true });
  });

  it("merges tabSettings into view settings_json", () => {
    expect(
      mergeObjectTabSettingsIntoViewSettings(
        { projection: { visible_fields: ["name"] } },
        { menuInTab: true },
      ),
    ).toEqual({
      projection: { visible_fields: ["name"] },
      tabSettings: { menuInTab: true },
    });
  });

  it("parses settings_json stored as JSON string", () => {
    expect(
      readObjectTabSettings(
        JSON.stringify({ tabSettings: { menuInTab: true } }),
      ),
    ).toEqual({ menuInTab: true });
  });

  it("reads tabSettings from published view row", () => {
    expect(
      readViewSettingsJsonFromPublishedView({
        settings_json: { tabSettings: { menuInTab: true } },
      }).tabSettings,
    ).toEqual({ menuInTab: true });
  });
});
