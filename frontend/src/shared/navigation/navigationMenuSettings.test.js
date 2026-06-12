import assert from "node:assert/strict";
import test from "node:test";

import {
  mapDesignerMenuSettingsToItemIds,
  readNavigationMenuBlockSettings,
} from "./navigationMenuSettings.js";
import {
  getDesignerSystemMenuSettings,
  resetDesignerSystemMenuSettingsCache,
  saveDesignerSystemMenuSettings,
} from "../shell/sidebar/designerSystemMenuSettings.js";
import {
  readSystemMenuSettings,
  writeSystemMenuSettings,
} from "../uiStorage/systemMenuSettingsStorage.js";

const TENANT_ID = 9911;

const DESIGNER_ITEMS = [
  {
    id: "system-designer-objects",
    title: "Объекты",
    system_key: "objects",
  },
  {
    id: "system-designer-pages",
    title: "Страницы",
    system_key: "pages",
  },
];

function withMockLocalStorage(run) {
  const store = new Map();
  const previousLocalStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;

  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
  globalThis.window = {
    dispatchEvent: () => {},
  };

  try {
    resetDesignerSystemMenuSettingsCache();
    run();
  } finally {
    resetDesignerSystemMenuSettingsCache();
    globalThis.localStorage = previousLocalStorage;
    globalThis.window = previousWindow;
  }
}

test("mapDesignerMenuSettingsToItemIds maps designer keys to menu item ids", () => {
  withMockLocalStorage(() => {
    saveDesignerSystemMenuSettings(TENANT_ID, {
      objects: { block_id: 2, sort_order: 1 },
      pages: { block_id: 3, sort_order: 0 },
    });

    const mapped = mapDesignerMenuSettingsToItemIds(DESIGNER_ITEMS, TENANT_ID);

    assert.equal(mapped["system-designer-objects"].block_id, 2);
    assert.equal(mapped["system-designer-pages"].sort_order, 0);
  });
});

test("readNavigationMenuBlockSettings merges tenant and designer layout settings", () => {
  withMockLocalStorage(() => {
    writeSystemMenuSettings(TENANT_ID, {
      42: { block_id: 4, sort_order: 0 },
    });
    saveDesignerSystemMenuSettings(TENANT_ID, {
      objects: { block_id: 2, sort_order: 1 },
    });

    const settings = readNavigationMenuBlockSettings({
      menuProfile: "designer",
      tenantId: TENANT_ID,
      rootItems: [...DESIGNER_ITEMS, { id: 42, title: "Пользовательская страница" }],
    });

    assert.equal(settings["system-designer-objects"].block_id, 2);
    assert.equal(settings[42].block_id, 4);
  });
});

test("readNavigationMenuBlockSettings uses tenant settings for platform profile", () => {
  withMockLocalStorage(() => {
    writeSystemMenuSettings(TENANT_ID, {
      7: { block_id: 3, sort_order: 2 },
    });

    const settings = readNavigationMenuBlockSettings({
      menuProfile: "platform",
      tenantId: TENANT_ID,
      rootItems: [{ id: 7, title: "Раздел" }],
    });

    assert.equal(settings[7].block_id, 3);
    assert.equal(getDesignerSystemMenuSettings(TENANT_ID).objects, undefined);
  });
});
