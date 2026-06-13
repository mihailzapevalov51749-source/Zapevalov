import { useEffect, useState } from "react";

import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";

import { deleteChat } from "../api/chatsApi";

import ChatAvatarEditor, {
  DEFAULT_AVATAR_SETTINGS,
  normalizeAvatarSettings,
} from "./ChatAvatarEditor";
import {
  CHAT_MODAL_CONTENT_STYLE,
  CHAT_MODAL_VIEWPORT_INSET,
  CHAT_SETTINGS_MODAL_DEFAULT_BOUNDS,
  CHAT_SETTINGS_MODAL_KEY,
} from "./chatModalKeys.js";
import "./chatSettingsModal.css";

const CHAT_SETTINGS_FORM_ID = "chat-settings-modal-form";

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

export default function ChatSettingsModal({
  chat,
  isOpen,
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarSettings, setAvatarSettings] = useState(DEFAULT_AVATAR_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !chat) return;

    setTitle(chat.title || "");
    setAvatarUrl(chat.avatar_url || chat.avatarUrl || "");
    setAvatarSettings(
      normalizeAvatarSettings(chat.avatar_settings || chat.avatarSettings),
    );
    setIsSaving(false);
    setIsDeleteConfirmOpen(false);
  }, [isOpen, chat]);

  async function handleSave(event) {
    event.preventDefault();

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

  return (
    <PlatformModal
      modalKey={CHAT_SETTINGS_MODAL_KEY}
      open={isOpen && Boolean(chat)}
      onClose={onClose}
      title="Настройки чата"
      subtitle={chat?.title || "Групповой чат"}
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CHAT_MODAL_VIEWPORT_INSET}
      defaultBounds={CHAT_SETTINGS_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Настройки чата"
      contentStyle={CHAT_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--danger"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isSaving}
            >
              Удалить
            </button>
          </div>
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button
              type="submit"
              form={CHAT_SETTINGS_FORM_ID}
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <form
          id={CHAT_SETTINGS_FORM_ID}
          className="platform-quick-create-modal__form"
          onSubmit={handleSave}
          noValidate
        >
          <div className="platform-quick-create-modal__fields">
            <div className="chat-settings-modal__avatar-field">
              <span className="platform-quick-create-modal__label">Аватар чата</span>
              <ChatAvatarEditor
                avatarUrl={avatarUrl}
                avatarSettings={avatarSettings}
                onChange={(nextAvatar) => {
                  setAvatarUrl(
                    nextAvatar?.avatar_url || nextAvatar?.avatarUrl || "",
                  );
                  setAvatarSettings(
                    normalizeAvatarSettings(
                      nextAvatar?.avatar_settings || nextAvatar?.avatarSettings,
                    ),
                  );
                }}
              />
            </div>

            <FormField id="chat-settings-title" label="Название чата" required>
              <input
                id="chat-settings-title"
                className="field-editor-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Название чата"
              />
            </FormField>
          </div>

          {isDeleteConfirmOpen ? (
            <div className="chat-settings-modal__delete-confirm" role="alert">
              <p className="chat-settings-modal__delete-confirm-title">
                Удалить чат?
              </p>
              <p className="chat-settings-modal__delete-confirm-text">
                Чат «{chat?.title || title}» будет удалён без возможности восстановления.
              </p>
              <div className="chat-settings-modal__delete-confirm-actions">
                <button
                  type="button"
                  className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={isSaving}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="platform-quick-create-modal__btn platform-quick-create-modal__btn--danger"
                  onClick={handleDeleteChat}
                  disabled={isSaving}
                >
                  {isSaving ? "Удаление..." : "Удалить"}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
