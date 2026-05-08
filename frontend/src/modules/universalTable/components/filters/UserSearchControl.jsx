import { useEffect, useMemo, useRef, useState } from "react";

import {
  inputStyle,
  userClearButtonStyle,
  userDropdownStyle,
  userEmptyOptionStyle,
  userOptionMetaStyle,
  userOptionNameStyle,
  userOptionStyle,
  userSearchRootStyle,
} from "./filterModalStyles";

import {
  isUserMatchedByQuery,
  normalizeUser,
  normalizeUserValue,
} from "../../services/usersFilterApi";

export default function UserSearchControl({
  users = [],
  value,
  disabled,
  onChange,
  isLoading,
  error,
}) {
  const rootRef = useRef(null);

  const normalizedValue = normalizeUserValue(value);
  const selectedUser =
    typeof normalizedValue === "object" ? normalizedValue : null;

  const [query, setQuery] = useState(selectedUser?.label || "");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);

  const updateDropdownPosition = () => {
    const rect = rootRef.current?.getBoundingClientRect?.();
    if (!rect) return;

    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);

    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedUser) {
      setQuery(selectedUser.label || "");
      return;
    }

    if (!value) setQuery("");
  }, [selectedUser?.id, selectedUser?.label, value]);

  const filteredUsers = useMemo(() => {
    return users
      .map(normalizeUser)
      .filter((user) => isUserMatchedByQuery(user, query))
      .slice(0, 8);
  }, [users, query]);

  const handleSelectUser = (user) => {
    const normalized = normalizeUser(user);

    onChange?.({
      id: normalized.id,
      value: String(normalized.id),
      label: normalized.label,
      name: normalized.label,
      full_name: normalized.label,
      email: normalized.email,
    });

    setQuery(normalized.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} style={userSearchRootStyle}>
      <input
        value={query}
        disabled={disabled}
        onFocus={() => {
          updateDropdownPosition();
          setIsOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          updateDropdownPosition();
          setIsOpen(true);

          if (value) onChange?.("");
        }}
        placeholder={
          isLoading
            ? "Загрузка пользователей..."
            : error
            ? "Пользователи не загружены"
            : "Начните вводить имя или фамилию"
        }
        style={{
          ...inputStyle,
          paddingRight: selectedUser ? 32 : 10,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? "default" : "text",
        }}
      />

      {selectedUser && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          style={userClearButtonStyle}
          title="Очистить пользователя"
        >
          ×
        </button>
      )}

      {isOpen && !disabled && dropdownRect && (
        <div
          style={{
            ...userDropdownStyle,
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
          }}
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.id || user.email || user.label}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelectUser(user);
                }}
                style={userOptionStyle}
              >
                <span style={userOptionNameStyle}>{user.label}</span>

                {user.email && (
                  <span style={userOptionMetaStyle}>{user.email}</span>
                )}
              </button>
            ))
          ) : (
            <div style={userEmptyOptionStyle}>
              {isLoading ? "Загрузка..." : "Пользователь не найден"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}