import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  applySystemMenuSettingsToTree,
} from "./applySystemMenuSettingsToTree.js";
import {
  patchControlPlaneSystemMenuItemSetting,
  readControlPlaneSystemMenuSettings,
} from "../uiStorage/controlPlaneUiStorage.js";
import {
  readSystemMenuSettings,
  writeSystemMenuSettings,
} from "../uiStorage/systemMenuSettingsStorage.js";
import {
  PLATFORM_UI_PREF_KEYS,
  PLATFORM_UI_SCOPES,
  buildPlatformUiStorageKey,
  buildTenantUiStorageKey,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

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

test("persistNavigationMenuBlockMove passes tenantId to navigationService.moveItems", () => {
  const source = readFileSync(
    new URL("./navigationMenuSettings.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /navigationService\.moveItems\(tenantId, customDbPayload\)/);
  assert.match(
    source,
    /didPersist[\s\S]*await reloadNavigation\(\);/,
  );
});

test("readNavigationMenuBlockSettings uses control-plane storage key", () => {
  withMockLocalStorage(() => {
    patchControlPlaneSystemMenuItemSetting("cp-audit-log", {
      color: "#111827",
    });

    const settings = readNavigationMenuBlockSettings({
      menuProfile: "control-plane",
      rootItems: [{ id: "cp-audit-log", title: "Журнал событий" }],
    });

    assert.equal(settings["cp-audit-log"].color, "#111827");

    const tenantKey = buildTenantUiStorageKey(TENANT_ID, UI_PREF_KEYS.SYSTEM_MENU_SETTINGS);
    const controlPlaneKey = buildPlatformUiStorageKey(
      PLATFORM_UI_SCOPES.CONTROL_PLANE,
      PLATFORM_UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
    );
    assert.equal(controlPlaneKey, "ui:platform:controlPlane:systemMenuSettings");
    assert.notEqual(tenantKey, controlPlaneKey);
    assert.equal(readSystemMenuSettings(TENANT_ID)["cp-audit-log"], undefined);
  });
});

test("saved control-plane settings apply after tree rebuild and keep badge_count", () => {
  withMockLocalStorage(() => {
    patchControlPlaneSystemMenuItemSetting("cp-group-releases", {
      color: "#7c3aed",
      icon_file_url: "/uploads/icons/releases.svg",
    });

    const stored = readControlPlaneSystemMenuSettings();
    const tree = [
      {
        id: "cp-group-releases",
        title: "Релизы",
        type: "system_page",
        is_system: true,
        badge_count: 2,
      },
    ];
    const applied = applySystemMenuSettingsToTree(tree, stored);
    const releasesItem = applied.find((item) => item.id === "cp-group-releases");

    assert.ok(releasesItem);
    assert.equal(releasesItem.color, "#7c3aed");
    assert.equal(releasesItem.icon_file_url, "/uploads/icons/releases.svg");
    assert.equal(releasesItem.icon_type, undefined);
    assert.equal(releasesItem.badge_count, 2);
  });
});

test("AppSidebarRenderer persists control-plane menu item settings via patch helper", () => {
  const source = readFileSync(
    new URL(
      "../shell/sidebar/components/AppSidebarRenderer.jsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /patchControlPlaneSystemMenuItemSetting/);
  assert.doesNotMatch(source, /writeControlPlaneSystemMenuSettings\(nextSettings\)/);
});
