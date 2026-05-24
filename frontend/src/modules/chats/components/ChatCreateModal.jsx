import { useEffect, useState } from "react";

import { searchUsers } from "../api/chatsApi";

import { chatLayoutStyles } from "../styles/corporateChatStyles";

import searchIcon from "../../../assets/icons/search.png";

export default function ChatCreateModal({
  isOpen,
  onClose,
  onCreate,
}) {
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(async () => {
      try {
        const result = await searchUsers(search);

        setUsers(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Ошибка поиска пользователей", error);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setSearch("");
      setUsers([]);
      setSelectedUsers([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  const isCreateDisabled = !title.trim() || isLoading;

  function toggleUser(user) {
    setSelectedUsers((prev) => {
      const exists = prev.find((item) => item.id === user.id);

      if (exists) {
        return prev.filter((item) => item.id !== user.id);
      }

      return [...prev, user];
    });
  }

  async function handleCreate() {
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

  if (!isOpen) return null;

  return (
    <div style={chatLayoutStyles.chatModalOverlay}>
      <div style={chatLayoutStyles.chatModal}>
        <div style={chatLayoutStyles.chatModalHeader}>
          <div>
            <div style={chatLayoutStyles.chatModalTitle}>
              Создание чата
            </div>

            <div style={chatLayoutStyles.chatModalSubtitle}>
              Групповой чат сотрудников
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={chatLayoutStyles.chatModalCloseButton}
          >
            ×
          </button>
        </div>

        <div style={chatLayoutStyles.chatModalBody}>
          <div style={chatLayoutStyles.chatModalField}>
            <div style={chatLayoutStyles.chatModalLabel}>
              Название
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Введите название чата"
              style={chatLayoutStyles.chatModalInput}
            />
          </div>

          <div style={chatLayoutStyles.chatModalField}>
            <div style={chatLayoutStyles.chatModalLabel}>
              Участники
            </div>

            <div style={chatLayoutStyles.chatModalSearchBox}>
              <img
                src={searchIcon}
                alt=""
                style={chatLayoutStyles.chatModalSearchIcon}
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск сотрудников"
                style={chatLayoutStyles.chatModalSearchInput}
              />
            </div>

            <div style={chatLayoutStyles.chatModalUsersList}>
              {users.map((user) => {
                const isSelected = selectedUsers.some(
                  (item) => item.id === user.id
                );

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user)}
                    style={{
                      ...chatLayoutStyles.chatModalUserButton,
                      ...(isSelected
                        ? chatLayoutStyles.chatModalUserButtonActive
                        : {}),
                    }}
                  >
                    <div style={chatLayoutStyles.chatModalUserAvatar}>
                      {String(user.full_name || "П")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div style={chatLayoutStyles.chatModalUserInfo}>
                      <div style={chatLayoutStyles.chatModalUserName}>
                        {user.full_name}
                      </div>

                      <div style={chatLayoutStyles.chatModalUserEmail}>
                        {user.email}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={chatLayoutStyles.chatModalFooter}>
          <button
            type="button"
            onClick={onClose}
            style={chatLayoutStyles.chatModalCancelButton}
          >
            Отмена
          </button>

          <button
            type="button"
            disabled={isCreateDisabled}
            onClick={handleCreate}
            style={{
              ...chatLayoutStyles.chatModalCreateButton,
              ...(isCreateDisabled
                ? {
                    opacity: 0.5,
                    cursor: "not-allowed",
                  }
                : {}),
            }}
          >
            {isLoading ? "Создание..." : "Создать чат"}
          </button>
        </div>
      </div>
    </div>
  );
}