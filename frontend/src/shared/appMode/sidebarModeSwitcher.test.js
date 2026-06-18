import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APP_MODES,
  buildSidebarModeSwitcherOptions,
  detectAppMode,
  resolveModeSwitcherAccess,
} from "./sidebarModeSwitcherCore.js";

describe("sidebarModeSwitcher", () => {
  it("detectAppMode resolves office, studio and platform routes", () => {
    assert.equal(detectAppMode("/portal/1/page/2"), APP_MODES.OFFICE);
    assert.equal(detectAppMode("/designer/tenant/1/object-types"), APP_MODES.STUDIO);
    assert.equal(detectAppMode("/control-plane/releases"), APP_MODES.PLATFORM);
  });

  it("resolveModeSwitcherAccess uses designer and control plane gates", () => {
    assert.deepEqual(resolveModeSwitcherAccess(null), {
      hasStudio: false,
      hasPlatform: false,
    });

    assert.deepEqual(
      resolveModeSwitcherAccess({ role: "admin", tenant_id: 1 }),
      {
        hasStudio: true,
        hasPlatform: false,
      },
    );

    assert.deepEqual(resolveModeSwitcherAccess({ role: "admin" }), {
      hasStudio: true,
      hasPlatform: true,
    });

    assert.deepEqual(
      resolveModeSwitcherAccess({ role: "platform_designer" }),
      {
        hasStudio: true,
        hasPlatform: false,
      },
    );
  });

  it("office only access hides switcher options", () => {
    const access = { hasStudio: false, hasPlatform: false };
    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.OFFICE, access }),
      [],
    );
  });

  it("office + studio shows studio in office and office in studio", () => {
    const access = { hasStudio: true, hasPlatform: false };

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.OFFICE, access }),
      [{ key: APP_MODES.STUDIO, label: "Студия" }],
    );

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.STUDIO, access }),
      [{ key: APP_MODES.OFFICE, label: "Офис" }],
    );
  });

  it("office + platform shows platform in office and office in platform", () => {
    const access = { hasStudio: false, hasPlatform: true };

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.OFFICE, access }),
      [{ key: APP_MODES.PLATFORM, label: "Платформа" }],
    );

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.PLATFORM, access }),
      [{ key: APP_MODES.OFFICE, label: "Офис" }],
    );
  });

  it("office + studio + platform shows both targets except current mode", () => {
    const access = { hasStudio: true, hasPlatform: true };

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.OFFICE, access }),
      [
        { key: APP_MODES.STUDIO, label: "Студия" },
        { key: APP_MODES.PLATFORM, label: "Платформа" },
      ],
    );

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.STUDIO, access }),
      [
        { key: APP_MODES.OFFICE, label: "Офис" },
        { key: APP_MODES.PLATFORM, label: "Платформа" },
      ],
    );

    assert.deepEqual(
      buildSidebarModeSwitcherOptions({ currentMode: APP_MODES.PLATFORM, access }),
      [
        { key: APP_MODES.OFFICE, label: "Офис" },
        { key: APP_MODES.STUDIO, label: "Студия" },
      ],
    );
  });
});
