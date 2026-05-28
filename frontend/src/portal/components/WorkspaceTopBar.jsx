import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMe } from "../../api/authApi";

import ProfileSidePanel from "../../profile/components/ProfileSidePanel";

import useNotifications from "../../modules/notifications/hooks/useNotifications";
import {
  AppHeaderRenderer,
  createRuntimeHeaderContract,
} from "../../shared/shell/header";
import {
  getDesignerPath,
  getLastRuntimePath,
} from "../../shared/appMode/appModeStorage";
import { emitRuntimeShadowSnapshot } from "../../shared/shell/shadow/runtime";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};
const HEADER_USER_CACHE_KEY = "__YASNOPRO_HEADER_USER_CACHE__";

const getCachedHeaderUser = () => window[HEADER_USER_CACHE_KEY] ?? null;

const setCachedHeaderUser = (nextUser) => {
  if (!nextUser) return;
  window[HEADER_USER_CACHE_KEY] = nextUser;
};

const buildRuntimePathChain = ({ pathname, sectionTitle, breadcrumbItems }) => {
  const chain = [];
  const hasSemanticPath = Array.isArray(breadcrumbItems) && breadcrumbItems.length > 0;

  if (!hasSemanticPath && sectionTitle) {
    chain.push({
      id: "runtime-section",
      label: String(sectionTitle),
      path: pathname,
    });
  }

  if (Array.isArray(breadcrumbItems) && breadcrumbItems.length > 0) {
    breadcrumbItems.forEach((item, index) => {
      const label = String(item?.label || "").trim();
      if (!label) return;
      chain.push({
        id: item?.id || `runtime-inner-${index}`,
        label,
        path: typeof item?.path === "string" ? item.path : undefined,
        meta: item?.meta,
      });
    });
  }

  return chain;
};

const normalizeAvatarSettings = (settings) => {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
};

export default function WorkspaceTopBar({
  title,
  subtitle,
  sectionTitle,
  breadcrumbItems,
  searchQuery,
  onChangeSearchQuery,
  isEditMode,
  isPageTitleEditable = false,
  pageTitleDraft = "",
  onChangePageTitleDraft,
  onSavePageTitle,
  onEnterEditMode,
  onExitEditMode,
  showBackButton = false,
  onBack,
  tenantId = 1,
  inlineRender = true,
  onUnifiedHeaderModel,
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCachedHeaderUser());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { notifications, unreadCount, markAsRead } = useNotifications();

 const pathname = window.location.pathname;
const effectiveShowBackButton = true;

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }

    window.history.back();
  }, [onBack]);

  const loadUser = async () => {
    try {
      const data = await getMe();

      const nextUser = {
        ...data,
        avatar_settings: normalizeAvatarSettings(data.avatar_settings),
      };
      setCachedHeaderUser(nextUser);
      setUser(nextUser);
    } catch {
      setUser((previous) => previous ?? getCachedHeaderUser());
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    emitRuntimeShadowSnapshot({
      pathname: window.location.pathname,
      user,
      search: {
        enabled: true,
        value: String(searchQuery ?? ""),
      },
      notifications: {
        enabled: true,
        unreadCount: Number(unreadCount ?? 0),
      },
      timestamp: Date.now(),
    });
  }, [user, searchQuery, unreadCount]);

  const avatarSettings = useMemo(
    () => normalizeAvatarSettings(user?.avatar_settings),
    [user?.avatar_settings]
  );

  const runtimeHeaderContract = useMemo(
    () =>
      createRuntimeHeaderContract({
        pathname,
        subtitle,
        user: {
          id: user?.id,
          name: user?.full_name,
          email: user?.email,
          avatarUrl: user?.avatar_url,
        },
        tenantId,
        showBackButton: effectiveShowBackButton,
        searchQuery,
        isEditMode,
        isPageTitleEditable,
        pageTitleDraft,
        notificationUnreadCount: unreadCount,
        notificationItems: notifications,
        onReadNotification: markAsRead,
        avatarSettings,
        title: sectionTitle ?? title,
        pathChain: buildRuntimePathChain({
          pathname,
          sectionTitle: sectionTitle ?? title,
          breadcrumbItems,
        }),
        meta: {
          canGoBack: window.history.length > 1,
          requestedShowBackButton: showBackButton,
        },
      }),
    [
      pathname,
      title,
      subtitle,
      sectionTitle,
      breadcrumbItems,
      user?.id,
      user?.full_name,
      user?.email,
      user?.avatar_url,
      tenantId,
      effectiveShowBackButton,
      showBackButton,
      searchQuery,
      isEditMode,
      isPageTitleEditable,
      pageTitleDraft,
      unreadCount,
      notifications,
      markAsRead,
      avatarSettings,
    ]
  );

  const handleHeaderAction = useCallback(
    (actionKey, payload) => {
      switch (actionKey) {
        case "back":
          handleBack();
          return;
        case "app-mode-switch":
          if (pathname.startsWith("/designer")) {
            navigate(getLastRuntimePath());
          } else {
            navigate(getDesignerPath(tenantId));
          }
          return;
        case "search-change":
        case "search":
          onChangeSearchQuery?.(String(payload?.value ?? ""));
          return;
        case "search-clear":
          onChangeSearchQuery?.("");
          return;
        case "context-path-navigate":
          if (payload?.item?.meta?.scope === "document-library-root") {
            window.dispatchEvent(
              new CustomEvent("yasnopro:library:go-root", {
                detail: {
                  libraryId: Number(payload?.item?.meta?.libraryId) || null,
                },
              })
            );
            return;
          }
          if (
            payload?.item?.meta?.scope === "document-library-folder" &&
            Number.isFinite(Number(payload?.item?.meta?.folderId))
          ) {
            window.dispatchEvent(
              new CustomEvent("yasnopro:library:go-folder", {
                detail: {
                  libraryId: Number(payload?.item?.meta?.libraryId) || null,
                  folderId: Number(payload?.item?.meta?.folderId),
                },
              })
            );
            return;
          }
          if (typeof payload?.path === "string" && payload.path.trim().length > 0) {
            navigate(payload.path);
          }
          return;
        case "breadcrumb-navigate":
          if (typeof payload?.path === "string" && payload.path.trim().length > 0) {
            navigate(payload.path);
          }
          return;
        case "profile":
          setIsProfileOpen(true);
          return;
        case "enter-edit-mode":
          onEnterEditMode?.();
          return;
        case "exit-edit-mode":
          onExitEditMode?.();
          return;
        case "save-title":
          onSavePageTitle?.();
          return;
        case "edit-title":
          onEnterEditMode?.();
          return;
        case "edit-title-draft":
          onChangePageTitleDraft?.(String(payload?.value ?? ""));
          return;
        case "cancel-title-edit":
          onExitEditMode?.();
          return;
        default:
          return;
      }
    },
    [
      handleBack,
      tenantId,
      navigate,
      onChangeSearchQuery,
      onEnterEditMode,
      onExitEditMode,
      onSavePageTitle,
      onChangePageTitleDraft,
      pathname,
    ]
  );

  const headerActionRef = useRef(handleHeaderAction);
  headerActionRef.current = handleHeaderAction;

  const stableHeaderAction = useCallback((actionKey, payload) => {
    headerActionRef.current?.(actionKey, payload);
  }, []);

  const unifiedHeaderModelRef = useRef(null);

  useEffect(() => {
    if (typeof onUnifiedHeaderModel !== "function") {
      return;
    }

    const nextModel = {
      contract: runtimeHeaderContract,
      onAction: stableHeaderAction,
    };

    const previousModel = unifiedHeaderModelRef.current;
    if (previousModel?.contract === nextModel.contract) {
      return;
    }

    unifiedHeaderModelRef.current = nextModel;
    onUnifiedHeaderModel(nextModel);
  }, [onUnifiedHeaderModel, runtimeHeaderContract, stableHeaderAction]);

  return (
    <>
      {inlineRender && runtimeHeaderContract ? (
        <AppHeaderRenderer
          contract={runtimeHeaderContract}
          onAction={handleHeaderAction}
        />
      ) : null}

      <ProfileSidePanel
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          loadUser();
          window.dispatchEvent(new CustomEvent("user:profile-updated"));
        }}
      />
    </>
  );
}