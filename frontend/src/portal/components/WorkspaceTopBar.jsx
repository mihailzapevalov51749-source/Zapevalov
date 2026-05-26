import { useEffect, useState } from "react";

import { getMe } from "../../api/authApi";

import settingsIcon from "../../assets/icons/settings.gif";
import saveIcon from "../../assets/icons/save.gif";

import ProfileSidePanel from "../../profile/components/ProfileSidePanel";

import AppModeSwitch from "../../shared/appMode/AppModeSwitch";

import useNotifications from "../../modules/notifications/hooks/useNotifications";
import NotificationBell from "../../modules/notifications/components/NotificationBell";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const HEADER_AVATAR_SIZE = 30;
const PROFILE_AVATAR_SIZE = 132;

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
}) {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { notifications, unreadCount, markAsRead } = useNotifications();

 const pathname = window.location.pathname;

const isRootPage =
  pathname === "/" ||
  pathname === "/admin";

const effectiveShowBackButton =
  showBackButton || !isRootPage;

    const handleBack = () => {
  if (onBack) {
    onBack();
    return;
  }

  window.history.back();
};

  const loadUser = async () => {
    try {
      const data = await getMe();

      setUser({
        ...data,
        avatar_settings: normalizeAvatarSettings(data.avatar_settings),
      });
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const initials =
    user?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    "?";

  const avatarSettings = normalizeAvatarSettings(user?.avatar_settings);

  const avatarRatio = HEADER_AVATAR_SIZE / PROFILE_AVATAR_SIZE;
  const headerAvatarX = (avatarSettings.x || 0) * avatarRatio;
  const headerAvatarY = (avatarSettings.y || 0) * avatarRatio;
  const headerAvatarScale = avatarSettings.scale || 1;

  return (
    <>
      <div style={topBarStyle} data-page-top-bar="true">
        <div style={leftSideStyle}>
          {effectiveShowBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              title="Назад"
              style={backButtonStyle}
            >
              ←
            </button>
          ) : null}

          <AppModeSwitch tenantId={tenantId} variant="runtime" />

          <div style={titleBlockStyle}>
            {isPageTitleEditable ? (
              <input
                value={pageTitleDraft}
                onChange={(event) => onChangePageTitleDraft?.(event.target.value)}
                onBlur={() => onSavePageTitle?.()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSavePageTitle?.();
                  }
                }}
                style={pageTitleInputStyle}
                placeholder="Название страницы"
              />
            ) : title ? (
              <div style={pageTitleStyle}>{title}</div>
            ) : null}
            {subtitle ? <div style={pageSubtitleStyle}>{subtitle}</div> : null}
          </div>
        </div>

        <div style={rightControlsStyle}>
          <input
            value={searchQuery}
            onChange={(event) => onChangeSearchQuery(event.target.value)}
            placeholder="Поиск по системе..."
            style={searchInputStyle}
          />

          <div style={notificationWrapperStyle}>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onReadNotification={markAsRead}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            title="Личный кабинет"
            style={avatarButtonStyle}
          >
            {user?.avatar_url ? (
              <div style={avatarClipStyle}>
                <img
                  src={user.avatar_url}
                  alt="Аватар"
                  draggable={false}
                  style={{
                    ...avatarImageStyle,
                    transform: `translate(${headerAvatarX}px, ${headerAvatarY}px) scale(${headerAvatarScale})`,
                  }}
                />
              </div>
            ) : (
              initials
            )}
          </button>

          <button
            type="button"
            onClick={isEditMode ? onExitEditMode : onEnterEditMode}
            title={
              isEditMode
                ? "Выйти из режима редактирования"
                : "Режим редактирования страницы"
            }
            style={{
              ...settingsButtonStyle,
              background: isEditMode ? "#E0F2FE" : "#FFFFFF",
            }}
          >
            <img
              src={isEditMode ? saveIcon : settingsIcon}
              alt=""
              style={settingsImageStyle}
            />
          </button>
        </div>
      </div>

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

const topBarStyle = {
  position: "sticky",
  top: 0,
  zIndex: 20,

  height: 56,

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",

  gap: 24,

  padding: "0 20px",
  boxSizing: "border-box",

  background: "#FFFFFF",
  borderBottom: "1px solid #E2E8F0",
};

const leftSideStyle = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
};


const backButtonStyle = {
  height: 32,

  padding: "0 6px 0 0",

  border: "none",
  outline: "none",

  background: "transparent",
  color: "#1E3A8A",

  cursor: "pointer",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,

  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1,

  flexShrink: 0,
};

const titleBlockStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
};

const pageTitleStyle = {
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.2,
  color: "#0F172A",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const pageTitleInputStyle = {
  width: "100%",
  maxWidth: 420,
  height: 32,
  padding: "0 10px",
  border: "1px solid #93C5FD",
  borderRadius: 8,
  outline: "none",
  fontSize: 16,
  fontWeight: 800,
  color: "#0F172A",
  background: "#F8FAFC",
  boxSizing: "border-box",
};

const pageSubtitleStyle = {
  marginTop: 3,
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.2,
  color: "#64748B",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rightControlsStyle = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexShrink: 0,
};

const searchInputStyle = {
  width: 420,
  height: 32,

  padding: "0 12px",

  border: "1px solid #CBD5E1",
  borderRadius: 8,

  outline: "none",

  fontSize: 13,

  background: "#FFFFFF",

  boxSizing: "border-box",
};

const notificationWrapperStyle = {
  width: 30,
  height: 30,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  transform: "scale(0.88)",
  transformOrigin: "center center",
};

const avatarButtonStyle = {
  width: HEADER_AVATAR_SIZE,
  height: HEADER_AVATAR_SIZE,

  padding: 0,

  border: "1px solid #CBD5E1",
  borderRadius: "50%",

  background: "#F8FAFC",
  color: "#0F172A",

  cursor: "pointer",
  overflow: "hidden",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
};

const avatarClipStyle = {
  width: "100%",
  height: "100%",

  borderRadius: "50%",
  overflow: "hidden",

  background: "#E2E8F0",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const avatarImageStyle = {
  width: "100%",
  height: "100%",

  objectFit: "contain",

  display: "block",

  userSelect: "none",
  pointerEvents: "none",

  transformOrigin: "center center",
};

const settingsButtonStyle = {
  width: 30,
  height: 30,

  padding: 5,

  border: "1px solid #CBD5E1",
  borderRadius: 8,

  cursor: "pointer",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const settingsImageStyle = {
  width: 18,
  height: 18,

  objectFit: "contain",

  display: "block",

  opacity: 0.82,
};