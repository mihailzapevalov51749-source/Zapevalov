import { useRef } from "react";
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

const HEADER_AVATAR_SIZE = 30;
const PROFILE_AVATAR_SIZE = 132;
const DEFAULT_AVATAR_SETTINGS = { x: 0, y: 0, scale: 1 };

function normalizeAvatarSettings(settings) {
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
}

function isZoneInteractive(enabledFlag, capabilityFlag) {
  return enabledFlag !== false && capabilityFlag !== false;
}

export default function AppHeaderRenderer({ contract, onAction }) {
  const invokeAction = createActionInvoker(onAction);
  const leftActions = Array.isArray(contract?.leftActions)
    ? contract.leftActions
    : [];
  const backAction = leftActions.find((action) => getActionKey(action) === "back");
  const mode = contract?.mode || "runtime";
  const tenantId =
    Number(contract?.tenant?.id || contract?.meta?.tenantId || 1) || 1;

  const showBackButton = Boolean(backAction);
  const isBackDisabled = Boolean(backAction?.disabled);
  const title = contract?.title || "";
  const breadcrumbs = Array.isArray(contract?.breadcrumbs)
    ? contract.breadcrumbs
    : Array.isArray(contract?.meta?.breadcrumbs)
      ? contract.meta.breadcrumbs
      : [];
  const rawPathChain =
    Array.isArray(contract?.pathChain) && contract.pathChain.length > 0
      ? contract.pathChain
      : [
          ...(title ? [{ id: "title", label: title }] : []),
          ...breadcrumbs,
        ];
  const pathChain = rawPathChain
    .map((item, index) => {
      const label = String(item?.label || "").trim();
      if (!label) return null;
      return {
        ...item,
        id: item?.id || `path-${index}`,
        label,
      };
    })
    .filter(Boolean);

  const editableTitle = contract?.editableTitle;
  const isPageTitleEditable =
    editableTitle?.enabled &&
    editableTitle?.isEditing &&
    contract?.capabilities?.canEditTitle !== false;
  const pageTitleDraft = editableTitle?.draftValue ?? editableTitle?.value ?? title;

  const search = contract?.search ?? {};
  const searchValue = search.value ?? "";
  const searchInteractive = isZoneInteractive(
    search.enabled,
    contract?.capabilities?.canSearch
  );

  const notifications = contract?.notifications ?? {};
  const notificationsInteractive = isZoneInteractive(
    notifications.enabled,
    contract?.capabilities?.canViewNotifications
  );
  const unreadCount = Number(notifications.unreadCount || 0);
  const notificationItems = Array.isArray(notifications.meta?.notificationItems)
    ? notifications.meta.notificationItems
    : [];
  const onReadNotification = notifications.meta?.onReadNotification;

  const lastValidUserRef = useRef(undefined);
  const nextUser = contract?.user;
  if (nextUser?.id || nextUser?.name || nextUser?.email || nextUser?.avatarUrl) {
    lastValidUserRef.current = nextUser;
  }
  const user = nextUser || lastValidUserRef.current;
  const avatarSettings = normalizeAvatarSettings(contract?.meta?.avatarSettings);
  const avatarRatio = HEADER_AVATAR_SIZE / PROFILE_AVATAR_SIZE;
  const headerAvatarX = (avatarSettings.x || 0) * avatarRatio;
  const headerAvatarY = (avatarSettings.y || 0) * avatarRatio;
  const headerAvatarScale = avatarSettings.scale || 1;

  const editMode = contract?.editMode ?? {};
  const isEditMode = Boolean(editMode.active);
  const editSettingsInteractive =
    editMode.enabled !== false &&
    contract?.capabilities?.canEditPage !== false &&
    contract?.capabilities?.canOpenSettings !== false;
  const editSettingsActionKey = isEditMode
    ? editMode.exitActionKey || "exit-edit-mode"
    : editMode.enterActionKey || "enter-edit-mode";

  return (
    <header
      className="app-header-renderer"
      data-page-top-bar="true"
      data-mode={mode}
    >
      <div className="app-header-renderer__left">
        {showBackButton ? (
          <button
            type="button"
            onClick={(event) => {
              if (isBackDisabled) return;
              invokeAction(event, getActionKey(backAction));
            }}
            title="Назад"
            className="app-header-renderer__back-button"
            disabled={isBackDisabled}
          >
            ◁
          </button>
        ) : null}

        <AppModeSwitch
          tenantId={tenantId}
          variant={mode === "designer" ? "designer" : "runtime"}
          mode={mode}
        />

        <div
          className="app-header-renderer__title-block"
          aria-label="Контекст навигации"
        >
          {pathChain.length > 0 ? (
            <span className="app-header-renderer__breadcrumb-separator">/</span>
          ) : null}
          {pathChain.map((item, index) => {
            const label = String(item?.label || "").trim();
            if (!label) return null;

            const isLast = index === pathChain.length - 1;
            const isActive = item?.active === true || isLast;
            const itemPath = typeof item?.path === "string" ? item.path : "";
            const isClickable = Boolean(itemPath) && !isActive;
            const isPrimary = index === 0;

            return (
              <span
                key={`${item?.id || "chain"}-${index}`}
                className="app-header-renderer__breadcrumb-part"
              >
                {isPrimary && isPageTitleEditable ? (
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
                ) : isClickable ? (
                  <button
                    type="button"
                    className="app-header-renderer__breadcrumb-link"
                    onClick={(event) =>
                      invokeAction(event, "context-path-navigate", {
                        type: "context-path-navigate",
                        path: itemPath,
                        item,
                      })
                    }
                  >
                    {label}
                  </button>
                ) : (
                  <span
                    className={[
                      "app-header-renderer__breadcrumb-text",
                      isActive ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {label}
                  </span>
                )}
                {!isLast ? (
                  <span className="app-header-renderer__breadcrumb-separator">/</span>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>

      <div className="app-header-renderer__right">
        <input
          value={searchValue}
          onChange={(event) => {
            if (!searchInteractive) return;
            invokeAction(
              event,
              search.changeActionKey || search.actionKey || "search-change",
              { value: event.target.value }
            );
          }}
          placeholder={search.placeholder || "Поиск по системе..."}
          className="app-header-renderer__search"
          disabled={!searchInteractive}
          readOnly={!searchInteractive}
          aria-disabled={!searchInteractive}
        />

        <div
          className={[
            "app-header-renderer__notification-wrap",
            !notificationsInteractive ? "is-disabled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-disabled={!notificationsInteractive}
        >
          <NotificationBell
            notifications={notificationItems}
            unreadCount={unreadCount}
            onReadNotification={
              typeof onReadNotification === "function"
                ? onReadNotification
                : () => Promise.resolve()
            }
          />
        </div>

        <button
          type="button"
          onClick={(event) => {
            if (!user) return;
            invokeAction(event, "profile");
          }}
          title="Личный кабинет"
          className="app-header-renderer__avatar"
          disabled={!user}
        >
          {user?.avatarUrl ? (
            <div className="app-header-renderer__avatar-clip">
              <img
                src={user.avatarUrl}
                alt="Аватар"
                draggable={false}
                className="app-header-renderer__avatar-image"
                style={{
                  transform: `translate(${headerAvatarX}px, ${headerAvatarY}px) scale(${headerAvatarScale})`,
                }}
              />
            </div>
          ) : (
            resolveUserInitials(user)
          )}
        </button>

        <button
          type="button"
          onClick={(event) => {
            if (!editSettingsInteractive) return;
            invokeAction(event, editSettingsActionKey);
          }}
          title={
            isEditMode
              ? "Выйти из режима редактирования"
              : "Режим редактирования страницы"
          }
          className={[
            "app-header-renderer__settings-button",
            isEditMode ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!editSettingsInteractive}
        >
          <img
            src={isEditMode ? saveIcon : settingsIcon}
            alt=""
            className="app-header-renderer__settings-icon"
          />
        </button>
      </div>
    </header>
  );
}

