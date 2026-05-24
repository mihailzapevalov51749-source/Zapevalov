import EmojiIcon from "../../../modules/comments/components/EmojiIcon";

import {
  getAttachmentName,
  getAttachmentKey,
} from "../domain/messageItemUtils";

import {
  editTextareaStyle,
  editToolbarStyle,
  editToolButtonStyle,
  editAttachmentsStyle,
  editAttachmentRowStyle,
  editAttachmentNameStyle,
  editAttachmentDeleteButtonStyle,
  editActionsStyle,
  saveEditButtonStyle,
  cancelEditButtonStyle,
} from "../styles/messageItemStyles";

import paperclipIcon from "../../../assets/icons/paperclip.svg";

export default function MessageEditForm({
  value,
  attachments = [],
  fileInputRef,
  mentionButtonRef,
  emojiButtonRef,
  onChange,
  onFileSelect,
  onDeleteAttachment,
  onToggleMention,
  onToggleEmoji,
  onCancel,
  onSave,
}) {
  return (
    <div>
      <textarea
        value={value}
        style={editTextareaStyle}
        onChange={(event) => onChange?.(event.target.value)}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={onFileSelect}
      />

      <div style={editToolbarStyle}>
        <button
          type="button"
          title="Добавить файл"
          style={editToolButtonStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          <img
            src={paperclipIcon}
            alt=""
            style={{
              width: 16,
              height: 16,
              objectFit: "contain",
            }}
          />
        </button>

        <button
          ref={mentionButtonRef}
          type="button"
          title="Отметить человека"
          style={editToolButtonStyle}
          onClick={onToggleMention}
        >
          @
        </button>

        <button
          ref={emojiButtonRef}
          type="button"
          title="Добавить emoji"
          style={editToolButtonStyle}
          onClick={onToggleEmoji}
        >
          <EmojiIcon emojiKey="smile" size={18} opacity={1} />
        </button>
      </div>

      {!!attachments.length && (
        <div style={editAttachmentsStyle}>
          {attachments.map((file, index) => (
            <div
              key={getAttachmentKey(file, index)}
              style={editAttachmentRowStyle}
            >
              <div style={editAttachmentNameStyle}>
                {getAttachmentName(file)}
              </div>

              <button
                type="button"
                title="Удалить файл"
                style={editAttachmentDeleteButtonStyle}
                onClick={() => onDeleteAttachment?.(file)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={editActionsStyle}>
        <button type="button" style={cancelEditButtonStyle} onClick={onCancel}>
          Отмена
        </button>

        <button type="button" style={saveEditButtonStyle} onClick={onSave}>
          Сохранить
        </button>
      </div>
    </div>
  );
}