import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { resolveWorkspaceTabDisplayTitle } from "../shared/workspaceTabs/resolveWorkspaceTabDisplayTitle.js";
import {
  PROFILE_PANEL_PAGE_TYPE,
  buildProfilePanelRoute,
  buildProfilePanelWorkspaceTabPayload,
  isProfilePanelWorkspaceTab,
  readProfilePanelStateFromTab,
  resolveProfileDisplayName,
} from "./profilePanelWorkspaceTab.js";

const profileDir = dirname(fileURLToPath(import.meta.url));

describe("profilePanelWorkspaceTab", () => {
  it("builds profile panel route and payload", () => {
    const user = { id: 7, full_name: "Михаил Запевалов" };

    assert.equal(buildProfilePanelRoute(7), "__panel__/profile/7");
    assert.equal(resolveProfileDisplayName(user), "Михаил Запевалов");

    const payload = buildProfilePanelWorkspaceTabPayload({
      user,
      panelState: { activeTab: "contacts", isEdit: false },
      sortOrder: 120,
    });

    assert.equal(payload.page_type, PROFILE_PANEL_PAGE_TYPE);
    assert.equal(payload.module_key, "settings");
    assert.equal(payload.route, "__panel__/profile/7");
    assert.equal(payload.is_minimized, true);
    assert.equal(payload.context_json.panelType, PROFILE_PANEL_PAGE_TYPE);
    assert.equal(payload.context_json.userId, 7);
    assert.equal(payload.context_json.userName, "Михаил Запевалов");
    assert.deepEqual(payload.context_json.panelState, {
      activeTab: "contacts",
      isEdit: false,
    });
    assert.equal(payload.title, "Профиль: Михаил Запевалов");
  });

  it("detects profile panel tabs and restores panel state", () => {
    const tab = {
      id: "tab-1",
      route: "__panel__/profile/7",
      page_type: PROFILE_PANEL_PAGE_TYPE,
      context_json: {
        panelType: PROFILE_PANEL_PAGE_TYPE,
        userId: 7,
        userName: "Михаил Запевалов",
        panelState: { activeTab: "activity", isEdit: true },
      },
    };

    assert.equal(isProfilePanelWorkspaceTab(tab), true);
    assert.deepEqual(readProfilePanelStateFromTab(tab), {
      userId: 7,
      panelState: { activeTab: "activity", isEdit: true },
    });

    assert.equal(
      resolveWorkspaceTabDisplayTitle(tab),
      "Профиль: Михаил Запевалов",
    );
  });
});

describe("profile overlay integration", () => {
  it("opens profile via side panel provider instead of /profile route", () => {
    const appSource = readFileSync(join(profileDir, "../App.jsx"), "utf8");
    const designerShellSource = readFileSync(
      join(profileDir, "../modules/designer/components/shell/DesignerShell.jsx"),
      "utf8",
    );
    const workspaceTopBarSource = readFileSync(
      join(profileDir, "../portal/components/WorkspaceTopBar.jsx"),
      "utf8",
    );
    const providerSource = readFileSync(
      join(profileDir, "ProfileSidePanelProvider.jsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      join(profileDir, "components/ProfileSidePanel.jsx"),
      "utf8",
    );

    assert.doesNotMatch(appSource, /path="\/profile"/);
    assert.doesNotMatch(appSource, /ProfilePage/);
    assert.match(appSource, /ProfileSidePanelProvider/);
    assert.match(designerShellSource, /openProfileSidePanel\(\)/);
    assert.match(workspaceTopBarSource, /openProfileSidePanel\(\)/);
    assert.doesNotMatch(designerShellSource, /navigate\("\/profile"\)/);
    assert.match(providerSource, /buildProfilePanelWorkspaceTabPayload/);
    assert.match(panelSource, /AppShellPageMinimizeButton/);
    assert.match(panelSource, /profile-side-panel__header-actions/);
    assert.match(panelSource, /app-shell-page-minimize-control__button/);
    assert.match(panelSource, /onMinimize/);
    assert.doesNotMatch(panelSource, /presentation="page"/);
  });
});
