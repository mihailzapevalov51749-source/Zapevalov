import bellIcon from "../../../../assets/icons/bell.png";
import settingsIcon from "../../../../assets/icons/settings.gif";
import saveIcon from "../../../../assets/icons/save.gif";
import AppModeSwitch from "../../../appMode/AppModeSwitch";
import NotificationBell from "../../../../modules/notifications/components/NotificationBell";
import "./appHeaderRenderer.css";

function getActionKey(action) {
  return action?.actionKey || action?.onClickKey || action?.id || "";
}

function createActionInvoker(onAction) {
  return (event, actionKey, payload) => {
    if (!actionKey || typeof onAction !== "function") return;
    event.preventDefault();
    event.stopPropagation();
    onAction(actionKey, payload);
  };
}

function resolveUserInitials(user) {
  const name = user?.name?.trim();
  const email = user?.email?.trim();
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

function formatNotificationBadge(unreadCount) {
  if (unreadCount > 99) return "99+";
  return String(unreadCount);
}

const HEADER_AVATAR_SIZE = 30;
const PROFILE_AVATAR_SIZE = 132;

function normalizeAvatarSettings(settings) {
  const fallback = { x: 0, y: 0, scale: 1 };
  if (!settings || typeof settings !== "object") return fallback;
  return {
    ...fallback,
    ...settings,
  };
}

export default function AppHeaderRenderer({ contract, onAction }) {
  console.log("[RENDER AppHeaderRenderer]", {
    mode: contract?.mode,
    title: contract?.title,
    subtitle: contract?.subtitle,
  });
  const invokeAction = createActionInvoker(onAction);
  const leftActions = Array.isArray(contract?.leftActions)
    ? contract.leftActions
    : [];
  const backAction = leftActions.find((action) => getActionKey(action) === "back");
  const mode = contract?.mode || "runtime";
  const tenantId =
    Number(contract?.tenant?.id || contract?.meta?.tenantId || 1) || 1;

  const showBackButton = Boolean(backAction);
  const title = contract?.title || "";
  const subtitle = contract?.subtitle || "";

  const editableTitle = contract?.editableTitle;
  const isPageTitleEditable = editableTitle?.enabled && editableTitle?.isEditing;
  const pageTitleDraft = editableTitle?.draftValue ?? editableTitle?.value ?? title;

  const search = contract?.search;
  const showSearch = search?.enabled !== false && contract?.capabilities?.canSearch !== false;
  const searchValue = search?.value ?? "";

  const notifications = contract?.notifications;
  const showNotifications =
    notifications?.enabled !== false &&
    contract?.capabilities?.canViewNotifications !== false;
  const unreadCount = Number(notifications?.unreadCount || 0);
  const notificationItems = notifications?.meta?.notificationItems || [];
  const onReadNotification = notifications?.meta?.onReadNotification;

  const user = contract?.user;
  const avatarSettings = normalizeAvatarSettings(contract?.meta?.avatarSettings);
  const avatarRatio = HEADER_AVATAR_SIZE / PROFILE_AVATAR_SIZE;
  const headerAvatarX = (avatarSettings.x || 0) * avatarRatio;
  const headerAvatarY = (avatarSettings.y || 0) * avatarRatio;
  const headerAvatarScale = avatarSettings.scale || 1;
  const isEditMode = Boolean(contract?.editMode?.active);
  const showEditSettings =
    contract?.editMode?.enabled !== false &&
    contract?.capabilities?.canEditPage !== false &&
    contract?.capabilities?.canOpenSettings !== false;
  const editSettingsActionKey = isEditMode
    ? contract?.editMode?.exitActionKey || "exit-edit-mode"
    : contract?.editMode?.enterActionKey || "enter-edit-mode";

  return (
    <header className="app-header-renderer" data-page-top-bar="true">
      <div className="app-header-renderer__left">
        {showBackButton ? (
          <button
            type="button"
            onClick={(event) => invokeAction(event, getActionKey(backAction))}
            title="Назад"
            className="app-header-renderer__back-button"
          >
            ←
          </button>
        ) : null}

        <AppModeSwitch tenantId={tenantId} variant={mode === "designer" ? "designer" : "runtime"} />

        <div className="app-header-renderer__title-block">
          {isPageTitleEditable ? (
            <input
              value={pageTitleDraft}
              onChange={(event) =>
                invokeAction(event, "edit-title-draft", {
                  value: event.target.value,
                })
              }
              onBlur={(event) =>
                invokeAction(event, editableTitle?.saveActionKey || "save-title")
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  invokeAction(event, editableTitle?.saveActionKey || "save-title");
                }
              }}
              className="app-header-renderer__title-input"
              placeholder={editableTitle?.placeholder || "Название страницы"}
            />
          ) : title ? (
            <div className="app-header-renderer__title">{title}</div>
          ) : null}
          {subtitle ? <div className="app-header-renderer__subtitle">{subtitle}</div> : null}
        </div>
      </div>

      <div className="app-header-renderer__right">
        {showSearch ? (
          <input
            value={searchValue}
            onChange={(event) =>
              invokeAction(
                event,
                search?.changeActionKey || search?.actionKey || "search-change",
                { value: event.target.value }
              )
            }
            placeholder={search?.placeholder || "Поиск по системе..."}
            className="app-header-renderer__search"
          />
        ) : null}

        {showNotifications ? (
          <div className="app-header-renderer__notification-wrap">
            {Array.isArray(notificationItems) && typeof onReadNotification === "function" ? (
              <NotificationBell
                notifications={notificationItems}
                unreadCount={unreadCount}
                onReadNotification={onReadNotification}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={(event) =>
                    invokeAction(event, notifications?.actionKey || "notifications")
                  }
                  title="Уведомления"
                  className="app-header-renderer__notification-button"
                >
                  <img src={bellIcon} alt="" className="app-header-renderer__notification-icon" />
                </button>
                {unreadCount > 0 && notifications?.badge !== false ? (
                  <span className="app-header-renderer__notification-badge">
                    {formatNotificationBadge(unreadCount)}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {user ? (
          <button
            type="button"
            onClick={(event) => invokeAction(event, "profile")}
            title="Личный кабинет"
            className="app-header-renderer__avatar"
          >
            {user.avatarUrl ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={user.avatarUrl}
                  alt="Аватар"
                  draggable={false}
                  className="app-header-renderer__avatar-image"
                  style={{
                    transform: `translate(${headerAvatarX}px, ${headerAvatarY}px) scale(${headerAvatarScale})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            ) : (
              resolveUserInitials(user)
            )}
          </button>
        ) : null}

        {showEditSettings ? (
          <button
            type="button"
            onClick={(event) => invokeAction(event, editSettingsActionKey)}
            title={isEditMode ? "Выйти из режима редактирования" : "Режим редактирования страницы"}
            className="app-header-renderer__settings-button"
            style={{ background: isEditMode ? "#E0F2FE" : "#FFFFFF" }}
          >
            <img
              src={isEditMode ? saveIcon : settingsIcon}
              alt=""
              className="app-header-renderer__settings-icon"
            />
          </button>
        ) : null}
      </div>
    </header>
  );
}

