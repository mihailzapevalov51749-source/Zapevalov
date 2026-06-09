import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { showPlatformNotification } from "../shared/platformNotification/PlatformNotification";
import { useGlobalWorkspaceTabs } from "../shared/workspaceTabs/GlobalWorkspaceTabsProvider";
import { resolveNextWorkspaceTabSortOrder } from "../shared/workspaceTabs/workspaceTabsOrder.js";
import * as workspaceTabsApi from "../shared/workspaceTabs/workspaceTabsApi";
import ProfileSidePanel from "./components/ProfileSidePanel";
import {
  buildProfilePanelWorkspaceTabPayload,
  readProfilePanelStateFromTab,
} from "./profilePanelWorkspaceTab.js";

const ProfileSidePanelContext = createContext(null);

export function ProfileSidePanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelState, setPanelState] = useState({});
  const { tabs, reloadTabs, registerProfilePanelHandlers } = useGlobalWorkspaceTabs();

  const openProfileSidePanel = useCallback((options = {}) => {
    setPanelState(options.panelState || {});
    setIsOpen(true);
  }, []);

  const closeProfileSidePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const minimizeProfileSidePanel = useCallback(
    async (snapshot) => {
      try {
        const user = snapshot?.user;
        if (!user?.id) {
          showPlatformNotification({
            message: "Не удалось свернуть профиль",
            variant: "warning",
          });
          return;
        }

        const panelStateSnapshot = {
          activeTab: snapshot.activeTab || "contacts",
          isEdit: Boolean(snapshot.isEdit),
        };

        const payload = buildProfilePanelWorkspaceTabPayload({
          user,
          panelState: panelStateSnapshot,
          sortOrder: resolveNextWorkspaceTabSortOrder(tabs),
        });

        await workspaceTabsApi.createWorkspaceTab(payload);
        await reloadTabs();
        setIsOpen(false);
      } catch (err) {
        showPlatformNotification({
          message:
            err?.response?.data?.detail || err?.message || "Не удалось свернуть профиль",
          variant: "warning",
        });
      }
    },
    [reloadTabs, tabs],
  );

  useEffect(() => {
    return registerProfilePanelHandlers({
      open: openProfileSidePanel,
      close: closeProfileSidePanel,
      openFromTab: (tab) => {
        const { panelState: restoredPanelState } = readProfilePanelStateFromTab(tab);
        openProfileSidePanel({ panelState: restoredPanelState });
      },
    });
  }, [
    closeProfileSidePanel,
    openProfileSidePanel,
    registerProfilePanelHandlers,
  ]);

  const value = useMemo(
    () => ({
      isOpen,
      openProfileSidePanel,
      closeProfileSidePanel,
      minimizeProfileSidePanel,
    }),
    [
      closeProfileSidePanel,
      isOpen,
      minimizeProfileSidePanel,
      openProfileSidePanel,
    ],
  );

  return (
    <ProfileSidePanelContext.Provider value={value}>
      {children}
      <ProfileSidePanel
        isOpen={isOpen}
        onClose={closeProfileSidePanel}
        initialPanelState={panelState}
        onMinimize={minimizeProfileSidePanel}
      />
    </ProfileSidePanelContext.Provider>
  );
}

export function useProfileSidePanel() {
  const context = useContext(ProfileSidePanelContext);

  if (!context) {
    throw new Error("useProfileSidePanel must be used within ProfileSidePanelProvider");
  }

  return context;
}
