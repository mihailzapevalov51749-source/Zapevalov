import assert from "node:assert/strict";
import test from "node:test";

import {
  patchControlPlaneSystemMenuOrder,
  patchControlPlaneSystemMenuItemSetting,
  readControlPlaneSystemMenuSettings,
  writeControlPlaneSystemMenuSettings,
} from "./controlPlaneUiStorage.js";
import {
  PLATFORM_UI_PREF_KEYS,
  PLATFORM_UI_SCOPES,
  buildPlatformUiStorageKey,
} from "./uiStorageKeys.js";

const storageKey = buildPlatformUiStorageKey(
  PLATFORM_UI_SCOPES.CONTROL_PLANE,
  PLATFORM_UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
);

function withMockLocalStorage(run) {
  const store = new Map();
  const previous = globalThis.localStorage;

  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };

  try {
    run();
  } finally {
    globalThis.localStorage = previous;
  }
}

test("patchControlPlaneSystemMenuOrder persists sort_order by menu item id", () => {
  withMockLocalStorage(() => {
    writeControlPlaneSystemMenuSettings({});

    patchControlPlaneSystemMenuOrder([
      { id: "cp-group-companies", parent_id: null, sort_order: 0, block_id: 4 },
      { id: "cp-overview", parent_id: null, sort_order: 1, block_id: 2 },
    ]);

    const settings = readControlPlaneSystemMenuSettings();
    assert.equal(settings["cp-group-companies"].sort_order, 0);
    assert.equal(settings["cp-group-companies"].block_id, 4);
    assert.equal(settings["cp-overview"].sort_order, 1);
    assert.equal(settings["cp-overview"].block_id, 1);
    assert.equal(storageKey, "ui:platform:controlPlane:systemMenuSettings");
  });
});

test("patchControlPlaneSystemMenuItemSetting persists uploaded icon and color by item id", () => {
  withMockLocalStorage(() => {
    patchControlPlaneSystemMenuItemSetting("cp-group-companies", {
      block_id: 2,
      sort_order: 10,
    });

    patchControlPlaneSystemMenuItemSetting("cp-group-companies", {
      icon_file_url: "/uploads/icons/companies.svg",
      color: "#2563eb",
    });

    const settings = readControlPlaneSystemMenuSettings();
    assert.equal(settings["cp-group-companies"].block_id, 2);
    assert.equal(settings["cp-group-companies"].sort_order, 10);
    assert.equal(settings["cp-group-companies"].icon_file_url, "/uploads/icons/companies.svg");
    assert.equal(settings["cp-group-companies"].icon_type, undefined);
    assert.equal(settings["cp-group-companies"].color, "#2563eb");
    assert.equal(localStorage.getItem(storageKey).includes("cp-group-companies"), true);
  });
});

test("readControlPlaneSystemMenuSettings migrates legacy cp-releases settings", () => {
  withMockLocalStorage(() => {
    writeControlPlaneSystemMenuSettings({
      "cp-releases": {
        block_id: 3,
        sort_order: 7,
      },
    });

    const settings = readControlPlaneSystemMenuSettings();
    assert.equal(settings["cp-group-releases"].block_id, 3);
    assert.equal(settings["cp-group-releases"].sort_order, 7);
    assert.equal(settings["cp-releases"], undefined);
  });
});

test("readControlPlaneSystemMenuSettings does not write during read", () => {
  withMockLocalStorage(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        "cp-releases": {
          block_id: 3,
          sort_order: 7,
        },
      }),
    );

    let writeCount = 0;
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key, value) => {
      if (key === storageKey) {
        writeCount += 1;
      }
      originalSetItem(key, value);
    };

    const settings = readControlPlaneSystemMenuSettings();
    assert.equal(settings["cp-group-releases"].sort_order, 7);
    assert.equal(writeCount, 0);
  });
});

test("writeControlPlaneSystemMenuSettings skips write and event when data unchanged", () => {
  withMockLocalStorage(() => {
    const payload = {
      "cp-overview": {
        block_id: 1,
        sort_order: 0,
      },
    };

    writeControlPlaneSystemMenuSettings(payload);
    const storedAfterFirstWrite = localStorage.getItem(storageKey);

    let eventCount = 0;
    const handleChanged = () => {
      eventCount += 1;
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "yasnopro:control-plane-system-menu-settings-changed",
        handleChanged,
      );
    }

    try {
      writeControlPlaneSystemMenuSettings(payload);
      assert.equal(localStorage.getItem(storageKey), storedAfterFirstWrite);
      assert.equal(eventCount, 0);
    } finally {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "yasnopro:control-plane-system-menu-settings-changed",
          handleChanged,
        );
      }
    }
  });
});

test("patchControlPlaneSystemMenuItemSetting clears uploaded icon on removal", () => {
  withMockLocalStorage(() => {
    patchControlPlaneSystemMenuItemSetting("cp-group-releases", {
      color: "#dc2626",
      icon_file_url: "/uploads/icons/releases.svg",
    });

    patchControlPlaneSystemMenuItemSetting("cp-group-releases", {
      icon_file_url: null,
    });

    const settings = readControlPlaneSystemMenuSettings();
    assert.equal(settings["cp-group-releases"].color, "#dc2626");
    assert.equal(settings["cp-group-releases"].icon_file_url, null);
    assert.equal(settings["cp-group-releases"].icon_type, undefined);
  });
});
