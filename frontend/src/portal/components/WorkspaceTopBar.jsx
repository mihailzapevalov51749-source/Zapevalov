import { useEffect, useState } from "react";

import { getMe } from "../../api/authApi";
import settingsIcon from "../../assets/icons/settings.gif";
import saveIcon from "../../assets/icons/save.gif";
import ProfileSidePanel from "../../profile/components/ProfileSidePanel";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const HEADER_AVATAR_SIZE = 36;
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
  searchQuery,
  onChangeSearchQuery,
  isEditMode,
  onEnterEditMode,
  onExitEditMode,
}) {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 56,
          display: "grid",
          gridTemplateColumns: "1fr minmax(420px, 650px) 1fr",
          alignItems: "center",
          padding: "0 32px",
          boxSizing: "border-box",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div />

        <input
          value={searchQuery}
          onChange={(event) => onChangeSearchQuery(event.target.value)}
          placeholder="Поиск по системе..."
          style={{
            width: "100%",
            height: 36,
            padding: "0 14px",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            outline: "none",
            fontSize: 14,
            background: "#ffffff",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            title="Личный кабинет"
            style={{
              width: HEADER_AVATAR_SIZE,
              height: HEADER_AVATAR_SIZE,
              padding: 0,
              border: "1px solid #cbd5e1",
              borderRadius: "50%",
              background: "#f8fafc",
              color: "#0f172a",
              cursor: "pointer",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {user?.avatar_url ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={user.avatar_url}
                  alt="Аватар"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    userSelect: "none",
                    pointerEvents: "none",
                    transform: `translate(${headerAvatarX}px, ${headerAvatarY}px) scale(${headerAvatarScale})`,
                    transformOrigin: "center center",
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
                ? "Сохранить настройки страницы"
                : "Настройки страницы"
            }
            style={{
              width: 34,
              height: 34,
              padding: 5,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: isEditMode ? "#e0f2fe" : "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={isEditMode ? saveIcon : settingsIcon}
              alt={
                isEditMode
                  ? "Сохранить настройки страницы"
                  : "Настройки страницы"
              }
              style={{
                width: 22,
                height: 22,
                objectFit: "contain",
                display: "block",
              }}
            />
          </button>
        </div>
      </div>

      <ProfileSidePanel
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          loadUser();
        }}
      />
    </>
  );
}