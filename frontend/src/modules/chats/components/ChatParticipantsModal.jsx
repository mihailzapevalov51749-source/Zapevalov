import { useEffect, useMemo, useState } from "react";

import PlatformUserAvatar from "../../controlPlane/platformUsers/PlatformUserAvatar.jsx";
import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";
import "../../../shared/avatar/platformAvatarEditor.css";

import {
  addChatParticipant,
  getChatParticipants,
  getUsers,
  removeChatParticipant,
  searchUsers,
} from "../api/chatsApi";
import { resolveChatCreatorId } from "../utils/chatAccessUtils";
import {
  CHAT_MODAL_CONTENT_STYLE,
  CHAT_MODAL_VIEWPORT_INSET,
  CHAT_PARTICIPANTS_MODAL_DEFAULT_BOUNDS,
  CHAT_PARTICIPANTS_MODAL_KEY,
} from "./chatModalKeys.js";
import "./chatParticipantsModal.css";

function normalizeUsersResponse(result) {
  if (Array.isArray(result)) return result;

  return result?.items || result?.users || result?.data || [];
}

function getFullName(user) {
  return user?.full_name || user?.name || user?.email || "Пользователь";
}

function UserStatus({ text, color = "#22c55e" }) {
  return (
    <div className="chat-participants-modal__user-status">
      <span
        className="chat-participants-modal__user-status-dot"
        style={{ background: color }}
        aria-hidden="true"
      />
      {text}
    </div>
  );
}

function ParticipantUserRow({ user, statusText, statusColor, action, opacity = 1 }) {
  return (
    <div className="chat-participants-modal__user-row" style={{ opacity }}>
      <PlatformUserAvatar user={user} size={32} />
      <div style={{ minWidth: 0 }}>
        <div className="chat-participants-modal__user-name">{getFullName(user)}</div>
        <UserStatus text={statusText} color={statusColor} />
      </div>
      {action}
    </div>
  );
}

export default function ChatParticipantsModal({
  chat,
  isOpen,
  onClose,
  tenantId,
}) {
  const [participants, setParticipants] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [foundUsers, setFoundUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const participantIds = useMemo(
    () => new Set(participants.map((item) => item.user_id)),
    [participants],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      setFoundUsers([]);
      setParticipants([]);
      return;
    }

    if (!chat?.id) return;

    loadParticipants();
  }, [isOpen, chat?.id]);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);

        const query = searchValue.trim();
        const result = query
          ? await searchUsers(tenantId, query)
          : await getUsers(tenantId);

        setFoundUsers(normalizeUsersResponse(result));
      } catch (error) {
        console.error("Ошибка поиска пользователей", error);
        setFoundUsers([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [isOpen, searchValue, tenantId]);

  async function loadParticipants() {
    try {
      setIsLoading(true);

      const data = await getChatParticipants(chat.id);
      setParticipants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки участников", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddUser(user) {
    try {
      await addChatParticipant(chat.id, {
        user_id: user.id,
        role: "member",
      });

      await loadParticipants();
    } catch (error) {
      console.error("Ошибка добавления участника", error);
    }
  }

  async function handleRemoveUser(userId) {
    try {
      await removeChatParticipant(chat.id, userId);
      await loadParticipants();
    } catch (error) {
      console.error("Ошибка удаления участника", error);
    }
  }

  return (
    <PlatformModal
      modalKey={CHAT_PARTICIPANTS_MODAL_KEY}
      open={isOpen && Boolean(chat)}
      onClose={onClose}
      title="Участники чата"
      subtitle={chat?.title || "Групповой чат"}
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CHAT_MODAL_VIEWPORT_INSET}
      defaultBounds={CHAT_PARTICIPANTS_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Участники чата"
      contentStyle={CHAT_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <div className="platform-quick-create-modal__fields">
          <div className="platform-quick-create-modal__field">
            <label className="platform-quick-create-modal__label" htmlFor="chat-participants-search">
              Поиск сотрудников
            </label>
            <div className="platform-quick-create-modal__control">
              <input
                id="chat-participants-search"
                className="field-editor-input"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Начните вводить имя или email"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="chat-participants-modal__empty">Загрузка участников...</p>
          ) : null}

          {!isLoading ? (
            <>
              <div>
                <h3 className="chat-participants-modal__section-title">
                  Участники чата ({participants.length})
                </h3>
                <div className="chat-participants-modal__users">
                  {participants.length === 0 ? (
                    <p className="chat-participants-modal__empty">Участники не найдены</p>
                  ) : (
                    participants.map((item) => {
                      const user = item.user || {};
                      const isCreator =
                        String(user?.id) === String(resolveChatCreatorId(chat));

                      return (
                        <ParticipantUserRow
                          key={user.id || item.user_id}
                          user={user}
                          statusText={isCreator ? "Создатель" : "Онлайн"}
                          statusColor="#22c55e"
                          action={
                            !isCreator ? (
                              <button
                                type="button"
                                className="chat-participants-modal__action-btn"
                                onClick={() => handleRemoveUser(user.id)}
                                title="Удалить участника"
                              >
                                ×
                              </button>
                            ) : (
                              <span />
                            )
                          }
                        />
                      );
                    })
                  )}
                </div>
              </div>

              <div className="chat-participants-modal__divider" />

              <div>
                <h3 className="chat-participants-modal__section-title">
                  Пользователи компании
                  {isSearching ? " · поиск..." : ""}
                </h3>
                <div className="chat-participants-modal__users">
                  {foundUsers.length === 0 ? (
                    <p className="chat-participants-modal__empty">Сотрудники не найдены</p>
                  ) : (
                    foundUsers.map((user) => {
                      const isAdded = participantIds.has(user.id);

                      return (
                        <ParticipantUserRow
                          key={user.id}
                          user={user}
                          statusText={isAdded ? "Уже в чате" : "Добавить"}
                          statusColor={isAdded ? "#94a3b8" : "#6366f1"}
                          opacity={isAdded ? 0.55 : 1}
                          action={
                            <button
                              type="button"
                              className="chat-participants-modal__action-btn"
                              disabled={isAdded}
                              onClick={() => handleAddUser(user)}
                              title="Добавить участника"
                            >
                              +
                            </button>
                          }
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </PlatformModal>
  );
}
