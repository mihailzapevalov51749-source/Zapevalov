import { useEffect, useMemo, useState } from "react";

import PlatformUserAvatar from "../../controlPlane/platformUsers/PlatformUserAvatar.jsx";
import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";
import "../../../shared/avatar/platformAvatarEditor.css";

import { searchUsers } from "../api/chatsApi";
import {
  CHAT_CREATE_MODAL_DEFAULT_BOUNDS,
  CHAT_CREATE_MODAL_KEY,
  CHAT_MODAL_CONTENT_STYLE,
  CHAT_MODAL_VIEWPORT_INSET,
} from "./chatModalKeys.js";
import "./chatCreateModal.css";

const CREATE_CHAT_FORM_ID = "chat-create-modal-form";

function FormField({ id, label, required = false, children }) {
  return (
    <div className="platform-quick-create-modal__field">
      <label className="platform-quick-create-modal__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="platform-quick-create-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="platform-quick-create-modal__control">{children}</div>
    </div>
  );
}

function mergeDisplayUsers(searchResults, selectedUsers) {
  const byId = new Map();

  selectedUsers.forEach((user) => {
    if (user?.id != null) {
      byId.set(String(user.id), user);
    }
  });

  (Array.isArray(searchResults) ? searchResults : []).forEach((user) => {
    if (user?.id != null) {
      byId.set(String(user.id), user);
    }
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftName = String(left.full_name || left.email || "").toLowerCase();
    const rightName = String(right.full_name || right.email || "").toLowerCase();
    return leftName.localeCompare(rightName, "ru");
  });
}

export default function ChatCreateModal({
  isOpen,
  onClose,
  onCreate,
  tenantId,
}) {
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const timeout = setTimeout(async () => {
      try {
        const result = await searchUsers(tenantId, search);
        setUsers(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Ошибка поиска пользователей", error);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setSearch("");
      setUsers([]);
      setSelectedUsers([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  const selectedUserIds = useMemo(
    () => new Set(selectedUsers.map((user) => String(user.id))),
    [selectedUsers],
  );

  const displayUsers = useMemo(
    () => mergeDisplayUsers(users, selectedUsers),
    [users, selectedUsers],
  );

  const isCreateDisabled = !title.trim() || isLoading;

  function toggleUser(user) {
    setSelectedUsers((previous) => {
      const exists = previous.find((item) => String(item.id) === String(user.id));

      if (exists) {
        return previous.filter((item) => String(item.id) !== String(user.id));
      }

      return [...previous, user];
    });
  }

  async function handleCreate(event) {
    event.preventDefault();

    const normalizedTitle = title.trim();

    if (!normalizedTitle || isLoading) return;

    try {
      setIsLoading(true);

      await onCreate?.({
        title: normalizedTitle,
        participant_ids: selectedUsers.map((user) => user.id),
      });

      onClose?.();
    } catch (error) {
      console.error("Ошибка создания чата", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PlatformModal
      modalKey={CHAT_CREATE_MODAL_KEY}
      open={isOpen}
      onClose={onClose}
      title="Создание чата"
      subtitle="Групповой чат сотрудников"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CHAT_MODAL_VIEWPORT_INSET}
      defaultBounds={CHAT_CREATE_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Создание чата"
      contentStyle={CHAT_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              form={CREATE_CHAT_FORM_ID}
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={isCreateDisabled}
            >
              {isLoading ? "Создание..." : "Создать чат"}
            </button>
          </div>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <form
          id={CREATE_CHAT_FORM_ID}
          className="platform-quick-create-modal__form"
          onSubmit={handleCreate}
          noValidate
        >
          <div className="platform-quick-create-modal__fields">
            <FormField id="chat-title" label="Название" required>
              <input
                id="chat-title"
                className="field-editor-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Введите название чата"
                autoFocus
              />
            </FormField>

            <FormField id="chat-participant-search" label="Поиск сотрудников">
              <input
                id="chat-participant-search"
                className="field-editor-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Начните вводить имя или email"
              />
            </FormField>

            <div className="platform-quick-create-modal__field">
              <span className="platform-quick-create-modal__label">
                Участники
                {selectedUsers.length > 0 ? ` · выбрано ${selectedUsers.length}` : ""}
              </span>

              {displayUsers.length === 0 ? (
                <p className="chat-create-modal__empty">Сотрудники не найдены</p>
              ) : (
                <div className="chat-create-modal__users" role="listbox" aria-multiselectable="true">
                  {displayUsers.map((user) => {
                    const isSelected = selectedUserIds.has(String(user.id));

                    return (
                      <button
                        key={user.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`chat-create-modal__user-row${isSelected ? " is-selected" : ""}`}
                        onClick={() => toggleUser(user)}
                      >
                        <PlatformUserAvatar user={user} size={32} />
                        <span className="chat-create-modal__user-text">
                          <span className="chat-create-modal__user-name">
                            {user.full_name || "Без имени"}
                          </span>
                          <span className="chat-create-modal__user-email">
                            {user.email || "—"}
                          </span>
                        </span>
                        <span className="chat-create-modal__user-check" aria-hidden="true">
                          {isSelected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </PlatformModal>
  );
}
