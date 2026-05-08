import attachmentIcon from "../../../../assets/icons/Paperclip.svg";
import uploadIcon from "../../../../assets/icons/Paperclip.svg";

import {
  entityCardAttachmentsStyle,
  entityCardAttachmentsHeaderStyle,
  entityCardAttachmentsTitleStyle,
  entityCardAttachmentsListStyle,
  entityCardAttachmentCardStyle,
  entityCardAttachmentLeftStyle,
  entityCardAttachmentIconStyle,
  entityCardAttachmentInfoStyle,
  entityCardAttachmentNameStyle,
  entityCardAttachmentMetaStyle,
  entityCardUploadButtonStyle,
} from "./styles/entityCardAttachmentsStyles";

const FILE_COLUMN_TYPES = ["file", "files", "attachment", "attachments"];

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

const isFileColumn = (column) => {
  const type = String(column?.type || "").toLowerCase();
  return FILE_COLUMN_TYPES.includes(type);
};

const normalizeAttachments = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (parsed && typeof parsed === "object") return [parsed];
    } catch {
      return [
        {
          id: value,
          name: value,
          url: value,
        },
      ];
    }
  }

  if (typeof value === "object") return [value];

  return [];
};

const getFileName = (file) => {
  return (
    file?.name ||
    file?.fileName ||
    file?.filename ||
    file?.originalName ||
    file?.original_name ||
    file?.title ||
    "Файл"
  );
};

const getFileSize = (file) => {
  return file?.size || file?.fileSize || file?.file_size || "—";
};

const getFileKey = (file, index) => {
  return file?.id || file?.fileId || file?.file_id || file?.url || index;
};

const getFileUrl = (file) => {
  return file?.url || file?.fileUrl || file?.file_url || file?.downloadUrl || "";
};

export default function EntityCardAttachments({
  row,
  columns = [],
  onUpload,
}) {
  const attachmentColumn = columns.find(isFileColumn);
  const attachmentColumnId = getColumnId(attachmentColumn);

  const attachmentsFromColumn = attachmentColumnId
    ? normalizeAttachments(row?.values?.[attachmentColumnId])
    : [];

  const attachments = attachmentsFromColumn.length
    ? attachmentsFromColumn
    : normalizeAttachments(row?.attachments);

  return (
    <div style={entityCardAttachmentsStyle}>
      <div style={entityCardAttachmentsHeaderStyle}>
        <div style={entityCardAttachmentsTitleStyle}>Вложения</div>
      </div>

      <div style={entityCardAttachmentsListStyle}>
        {attachments.map((file, index) => {
          const fileUrl = getFileUrl(file);

          return (
            <div
              key={getFileKey(file, index)}
              style={entityCardAttachmentCardStyle}
            >
              <div style={entityCardAttachmentLeftStyle}>
                <img
                  src={attachmentIcon}
                  alt=""
                  style={entityCardAttachmentIconStyle}
                />

                <div style={entityCardAttachmentInfoStyle}>
                  {fileUrl ? (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...entityCardAttachmentNameStyle,
                        textDecoration: "none",
                      }}
                    >
                      {getFileName(file)}
                    </a>
                  ) : (
                    <div style={entityCardAttachmentNameStyle}>
                      {getFileName(file)}
                    </div>
                  )}

                  <div style={entityCardAttachmentMetaStyle}>
                    {getFileSize(file)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!attachments.length && (
          <div
            style={{
              ...entityCardAttachmentMetaStyle,
              fontSize: 11,
            }}
          >
            Нет вложений
          </div>
        )}

        <button
          type="button"
          onClick={onUpload}
          style={{
            ...entityCardUploadButtonStyle,
            marginLeft: "auto",
          }}
        >
          <img
            src={uploadIcon}
            alt=""
            style={{
              ...entityCardAttachmentIconStyle,
              width: 14,
              height: 14,
            }}
          />

          Добавить файл
        </button>
      </div>
    </div>
  );
}