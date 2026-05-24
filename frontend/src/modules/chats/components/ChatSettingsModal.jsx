import { useEffect, useRef, useState } from "react";

import { deleteChat } from "../api/chatsApi";

import ChatAvatarEditor, {
  DEFAULT_AVATAR_SETTINGS,
  normalizeAvatarSettings,
} from "./ChatAvatarEditor";

import deleteIcon from "../../../assets/icons/delet.png";
import saveIcon from "../../../assets/icons/save.gif";

import { chatModalStyles } from "../styles/chatModalStyles";

export default function ChatSettingsModal({
  chat,
  isOpen,
  anchorRect,
  onClose,
  onSave,
}) {
  const modalRef = useRef(null);

  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarSettings, setAvatarSettings] = useState(
    DEFAULT_AVATAR_SETTINGS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  useEffect(() => {
    if (!isOpen || !chat) return;

    setTitle(chat.title || "");
    setAvatarUrl(chat.avatar_url || chat.avatarUrl || "");
    setAvatarSettings(
      normalizeAvatarSettings(
        chat.avatar_settings || chat.avatarSettings
      )
    );
    setIsSaving(false);
    setIsDeleteConfirmOpen(false);
  }, [isOpen, chat]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target)
      ) {
        onClose?.();
      }
    }

    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !chat) return null;

  async function handleSave() {
    if (!title.trim() || isSaving) return;

    try {
      setIsSaving(true);

      await onSave?.({
        title: title.trim(),
        avatar_url: avatarUrl || null,
        avatar_settings: normalizeAvatarSettings(avatarSettings),
      });

      onClose?.();
    } catch (error) {
      console.error("Ошибка сохранения настроек чата", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteChat() {
    if (!chat?.id || isSaving) return;

    try {
      setIsSaving(true);

      await deleteChat(chat.id);

      onClose?.();

      window.location.reload();
    } catch (error) {
      console.error("Ошибка удаления чата", error);
    } finally {
      setIsSaving(false);
      setIsDeleteConfirmOpen(false);
    }
  }

  const top = (anchorRect?.bottom || 64) + 40;

  const right = Math.max(
    12,
    window.innerWidth - (anchorRect?.right || window.innerWidth) - 36
  );

  return (
    <div
      ref={modalRef}
      style={{
        ...chatModalStyles.popover,
        top,
        right,
      }}
    >
      <div style={chatModalStyles.header}>
        <div style={chatModalStyles.title}>Настройки чата</div>

        <div style={chatModalStyles.headerActions}>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={isSaving}
            title="Удалить чат"
            style={chatModalStyles.iconButton}
          >
            <img
              src={deleteIcon}
              alt=""
              style={{
                ...chatModalStyles.headerIcon,
                filter: chatModalStyles.filters.red,
              }}
            />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            title="Сохранить"
            style={{
              ...chatModalStyles.iconButton,
              opacity: isSaving || !title.trim() ? 0.45 : 1,
            }}
          >
            <img
              src={saveIcon}
              alt=""
              style={chatModalStyles.headerIcon}
            />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            style={chatModalStyles.closeButton}
          >
            ×
          </button>
        </div>
      </div>

      <div style={chatModalStyles.contentRow}>
        <ChatAvatarEditor
          avatarUrl={avatarUrl}
          avatarSettings={avatarSettings}
          title={title}
          onChange={(nextAvatar) => {
            setAvatarUrl(
              nextAvatar?.avatar_url ||
                nextAvatar?.avatarUrl ||
                ""
            );

            setAvatarSettings(
              normalizeAvatarSettings(
                nextAvatar?.avatar_settings ||
                  nextAvatar?.avatarSettings
              )
            );
          }}
        />

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Название чата"
          style={chatModalStyles.titleInput}
        />
      </div>

      {isDeleteConfirmOpen && (
        <div style={chatModalStyles.confirmBox}>
          <div style={chatModalStyles.confirmTitle}>
            Удалить чат?
          </div>

          <div style={chatModalStyles.confirmText}>
            Чат «{chat.title || title}» будет удалён без возможности
            восстановления.
          </div>

          <div style={chatModalStyles.confirmActions}>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isSaving}
              style={chatModalStyles.confirmCancelButton}
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={handleDeleteChat}
              disabled={isSaving}
              style={chatModalStyles.confirmDeleteButton}
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}