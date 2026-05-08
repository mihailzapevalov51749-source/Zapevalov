import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getUsers } from "../../../../api/authApi";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const AVATAR_SIZE = 24;
const PROFILE_AVATAR_SIZE = 132;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const getAlignItemsByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const getShowAvatar = (column) => {
  if (column?.lookup?.showAvatar === false) return false;
  if (column?.settings?.lookup?.showAvatar === false) return false;
  return true;
};

const getIsMultiple = (column) => {
  return Boolean(column?.multiple);
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

const normalizeUserValue = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return {
      userId: value.userId ?? value.user_id ?? value.id ?? null,
      full_name: value.full_name ?? value.fullName ?? value.name ?? "",
      email: value.email ?? "",
      avatar_url: value.avatar_url ?? value.avatarUrl ?? "",
      avatar_settings: normalizeAvatarSettings(
        value.avatar_settings ?? value.avatarSettings
      ),
    };
  }

  return {
    userId: value,
    full_name: "",
    email: "",
    avatar_url: "",
    avatar_settings: DEFAULT_AVATAR_SETTINGS,
  };
};

const normalizeMultipleUsers = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => normalizeUserValue(item)).filter(Boolean);
  }

  const single = normalizeUserValue(value);

  return single ? [single] : [];
};

const normalizeUserOption = (user) => ({
  userId: user.id,
  full_name: user.full_name || user.email || "Без имени",
  email: user.email || "",
  avatar_url: user.avatar_url || "",
  avatar_settings: normalizeAvatarSettings(user.avatar_settings),
});

const getInitials = (user) => {
  const source = user?.full_name || user?.email || "?";
  return source.trim().charAt(0).toUpperCase();
};

const getDropdownPosition = (rect) => {
  if (!rect) {
    return {
      top: 8,
      left: 8,
      width: 260,
    };
  }

  const width = Math.max(260, rect.width);
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + width > viewportWidth - 8) {
    left = viewportWidth - width - 8;
  }

  if (left < 8) {
    left = 8;
  }

  if (top + 260 > viewportHeight - 8) {
    top = Math.max(8, rect.top - 266);
  }

  return {
    top,
    left,
    width,
  };
};

function UserAvatar({ user, size = AVATAR_SIZE }) {
  const avatarSettings = normalizeAvatarSettings(user?.avatar_settings);

  const avatarRatio = size / PROFILE_AVATAR_SIZE;
  const avatarX = (avatarSettings.x || 0) * avatarRatio;
  const avatarY = (avatarSettings.y || 0) * avatarRatio;
  const avatarScale = avatarSettings.scale || 1;

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#e2e8f0",
        border: "1px solid #cbd5e1",
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        getInitials(user)
      )}
    </div>
  );
}

export default function UserCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
}) {
  const rootRef = useRef(null);

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);
  const alignItems = getAlignItemsByAlign(align);

  const showAvatar = getShowAvatar(column);
  const isMultiple = getIsMultiple(column);

  const selectedUsers = normalizeMultipleUsers(value);
  const selectedUser = selectedUsers[0] || null;

  const [users, setUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      String(a.full_name || a.email || "").localeCompare(
        String(b.full_name || b.email || ""),
        "ru"
      )
    );
  }, [users]);

  useEffect(() => {
    if (readOnly) return;

    let isMounted = true;

    const loadUsers = async () => {
      try {
        setIsLoading(true);

        const data = await getUsers();
        const list = Array.isArray(data) ? data : data?.items || [];

        if (isMounted) {
          setUsers(list.map(normalizeUserOption));
        }
      } catch (error) {
        console.error("Не удалось загрузить пользователей:", error);

        if (isMounted) {
          setUsers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [readOnly]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      setAnchorRect(rootRef.current?.getBoundingClientRect() || null);
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      const isInsideRoot = rootRef.current?.contains(event.target);
      const isInsideDropdown = event.target.closest?.(
        "[data-user-cell-dropdown='true']"
      );

      if (!isInsideRoot && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const openDropdown = () => {
    setAnchorRect(rootRef.current?.getBoundingClientRect() || null);
    setIsOpen((current) => !current);
  };

  const isSelected = (user) => {
    return selectedUsers.some(
      (selected) => String(selected?.userId) === String(user?.userId)
    );
  };

  const handleSelectUser = (user) => {
    const normalizedUser = {
      userId: user.userId,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
      avatar_settings: user.avatar_settings,
    };

    if (isMultiple) {
      const alreadySelected = isSelected(user);

      if (alreadySelected) {
        const nextUsers = selectedUsers.filter(
          (selected) => String(selected?.userId) !== String(user?.userId)
        );

        onChange?.(nextUsers);

        return;
      }

      onChange?.([...selectedUsers, normalizedUser]);

      return;
    }

    onChange?.(normalizedUser);

    setIsOpen(false);
  };

  const handleClear = (event) => {
    event.stopPropagation();

    if (isMultiple) {
      onChange?.([]);
    } else {
      onChange?.(null);
    }

    setIsOpen(false);
  };

  const renderMultipleUsers = () => {
    if (selectedUsers.length === 0) {
      return (
        <span
          style={{
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          Выбрать пользователей
        </span>
      );
    }

    return (
      <div
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems,
          gap: 6,
          padding: "4px 0",
        }}
      >
        {selectedUsers.map((user) => (
          <div
            key={user.userId}
            style={{
              width: "100%",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent,
              gap: showAvatar ? 7 : 0,
              overflow: "hidden",
            }}
          >
            {showAvatar && <UserAvatar user={user} />}

            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: isPrimary ? 13 : 12,
                fontWeight: isPrimary ? 700 : 500,
                color: "#0f172a",
              }}
            >
              {user.full_name || user.email}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const readOnlyContent =
    isMultiple ? (
      <div
        title={selectedUsers
          .map((user) => user.full_name || user.email)
          .join(", ")}
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          alignItems: selectedUsers.length > 0 ? alignItems : "center",
          justifyContent,
          overflow: "visible",
          textAlign: align,
        }}
      >
        {renderMultipleUsers()}
      </div>
    ) : selectedUser ? (
      <div
        title={selectedUser.full_name || selectedUser.email}
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent,
          gap: showAvatar ? 7 : 0,
          overflow: "hidden",
          textAlign: align,
        }}
      >
        {showAvatar && <UserAvatar user={selectedUser} />}

        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: isPrimary ? 13 : 12,
            fontWeight: isPrimary ? 700 : 500,
            color: "#0f172a",
          }}
        >
          {selectedUser.full_name || selectedUser.email}
        </span>
      </div>
    ) : (
      <span
        style={{
          width: "100%",
          display: "flex",
          justifyContent,
          color: "#94a3b8",
          fontSize: 12,
          textAlign: align,
        }}
      >
        —
      </span>
    );

  if (readOnly) {
    return readOnlyContent;
  }

  const dropdownPosition = getDropdownPosition(anchorRect);

  const dropdown = isOpen
    ? createPortal(
        <div
          data-table-action="true"
          data-user-cell-dropdown="true"
          style={{
            position: "fixed",
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: 260,
            overflowY: "auto",
            padding: 6,
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #dbe3ef",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
            zIndex: 99999,
            boxSizing: "border-box",
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {isLoading && (
            <div
              style={{
                padding: "8px 10px",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Загрузка пользователей...
            </div>
          )}

          {!isLoading && sortedUsers.length === 0 && (
            <div
              style={{
                padding: "8px 10px",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Пользователи не найдены
            </div>
          )}

          {!isLoading &&
            sortedUsers.map((user) => {
              const active = isSelected(user);

              return (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  style={{
                    width: "100%",
                    minWidth: 0,
                    minHeight: 34,
                    padding: "6px 8px",
                    border: 0,
                    borderRadius: 8,
                    background: active ? "#eff6ff" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                  }}
                >
                  {isMultiple && <input type="checkbox" checked={active} readOnly />}

                  <UserAvatar user={user} />

                  <span
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {user.full_name || user.email}
                    </span>

                    {user.email && (
                      <span
                        style={{
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {user.email}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={rootRef}
        style={{
          position: "relative",
          width: "100%",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={openDropdown}
          style={{
            width: "100%",
            minWidth: 0,
            minHeight: isMultiple && selectedUsers.length > 0 ? 34 : 30,
            height: isMultiple && selectedUsers.length > 0 ? "auto" : 30,
            padding: isMultiple && selectedUsers.length > 0 ? "2px 8px" : "0 8px",
            border: "1px solid transparent",
            borderRadius: 8,
            background: isOpen ? "#f8fafc" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: isMultiple && selectedUsers.length > 0 ? "flex-start" : "center",
            justifyContent,
            gap: showAvatar ? 7 : 0,
            textAlign: align,
            boxSizing: "border-box",
          }}
        >
          {isMultiple ? (
            renderMultipleUsers()
          ) : selectedUser ? (
            <>
              {showAvatar && <UserAvatar user={selectedUser} />}

              <span
                style={{
                  minWidth: 0,
                  maxWidth: align === "center" ? "70%" : "100%",
                  flex: align === "left" ? 1 : "0 1 auto",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: isPrimary ? 13 : 12,
                  fontWeight: isPrimary ? 700 : 500,
                  color: "#0f172a",
                }}
              >
                {selectedUser.full_name || selectedUser.email}
              </span>

              <span
                onClick={handleClear}
                title="Очистить"
                style={{
                  width: 18,
                  height: 18,
                  minWidth: 18,
                  borderRadius: "50%",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </span>
            </>
          ) : (
            <span
              style={{
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#94a3b8",
                fontSize: 12,
              }}
            >
              Выбрать пользователя
            </span>
          )}
        </button>
      </div>

      {dropdown}
    </>
  );
}