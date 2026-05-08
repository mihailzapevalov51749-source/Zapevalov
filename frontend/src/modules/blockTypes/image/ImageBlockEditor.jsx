import { useEffect, useState } from "react";

export default function ImageBlockEditor({
  block,
  title,
  setTitle,
  showTitle,
  setShowTitle,
  onSave,
  onClose,
  uploadFile,
  styles,
}) {
  const {
    inputStyle,
    checkboxStyle,
    saveButtonStyle,
    smallButtonStyle,
    dangerSmallButtonStyle,
  } = styles;

  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!block) return;

    setFileName(block.content?.image_name || block.content?.file_name || "");
    setFileUrl(block.content?.image_url || block.content?.file_url || "");
    setSelectedFile(null);
  }, [block]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    let uploadedUrl = fileUrl;

    if (selectedFile) {
      uploadedUrl = await uploadFile(selectedFile, "image");
    }

    await onSave({
      title,
      content: {
        ...(block.content || {}),
        image_name: fileName,
        image_url: uploadedUrl,
        file_name: fileName,
        file_url: uploadedUrl,
      },
      settings: {
        ...(block.settings || {}),
        show_title: showTitle,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Редактирование изображения</h3>

        {onClose && (
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            ×
          </button>
        )}
      </div>

      <Field label="Название">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={inputStyle}
        />
      </Field>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={showTitle}
          onChange={(event) => setShowTitle(event.target.checked)}
        />
        Показывать название
      </label>

      <Field label="Название файла">
        <input
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Изображение">
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.gif,image/png,image/jpeg,image/svg+xml,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setSelectedFile(file);
            setFileName(file.name);
          }}
          style={{ color: "#cbd5e1", fontSize: 12 }}
        />
      </Field>

      {(fileUrl || selectedFile) && (
        <div style={previewBoxStyle}>
          {fileUrl && !selectedFile ? (
            <img
              src={normalizePreviewUrl(fileUrl)}
              alt=""
              style={previewImageStyle}
            />
          ) : (
            <div style={previewPlaceholderStyle} />
          )}

          <div style={previewTextStyle}>
            {selectedFile?.name || fileName || fileUrl}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setFileUrl("");
              setFileName("");
            }}
            style={dangerSmallButtonStyle}
          >
            Удалить
          </button>
        </div>
      )}

      <button type="submit" style={saveButtonStyle}>
        Сохранить
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      {children}
    </label>
  );
}

function normalizePreviewUrl(url) {
  const API_BASE_URL = "http://127.0.0.1:8010";

  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  color: "#e5f0ff",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: "#ffffff",
};

const previewBoxStyle = {
  display: "grid",
  gridTemplateColumns: "48px 1fr auto",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderRadius: 8,
  background: "#0f1b2d",
  border: "1px solid #24364f",
};

const previewImageStyle = {
  width: 40,
  height: 40,
  objectFit: "contain",
  borderRadius: 6,
};

const previewPlaceholderStyle = {
  width: 40,
  height: 40,
  borderRadius: 6,
  background: "#1e293b",
};

const previewTextStyle = {
  color: "#94a3b8",
  fontSize: 12,
  overflowWrap: "anywhere",
};